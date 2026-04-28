/**
 * Question Statistics Service
 * Provides comprehensive statistics with caching and performance optimization
 */

import { Pool } from 'pg';

export interface QuestionStats {
  total: number;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
  bySubject: Record<string, number>;
  byTag?: Record<string, number>;
  averageDifficulty?: number;
  createdToday?: number;
  createdThisWeek?: number;
  createdThisMonth?: number;
  lastUpdated?: Date;
}

export interface DetailedStats extends QuestionStats {
  topSubjects: Array<{ subject: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  difficultyDistribution: Array<{ difficulty: string; percentage: number }>;
  typeDistribution: Array<{ type: string; percentage: number }>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * In-memory cache for statistics
 * In production, consider using Redis or similar
 */
class StatisticsCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const cache = new StatisticsCache();

/**
 * Get basic question statistics with caching
 */
export async function getQuestionStatistics(
  pool: Pool,
  tenantId: string,
  useCache: boolean = true
): Promise<QuestionStats> {
  const cacheKey = `stats:basic:${tenantId}`;

  // Check cache first
  if (useCache) {
    const cached = cache.get<QuestionStats>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const result = await pool.query(
    `SELECT 
       COUNT(*) as total,
       difficulty,
       type,
       subject
     FROM questions_bank
     WHERE tenant_id = $1 AND deleted_at IS NULL
     GROUP BY difficulty, type, subject`,
    [tenantId]
  );

  const stats: QuestionStats = {
    total: 0,
    byDifficulty: {},
    byType: {},
    bySubject: {},
  };

  for (const row of result.rows) {
    const count = parseInt(row.total, 10);
    stats.total += count;
    stats.byDifficulty[row.difficulty] = (stats.byDifficulty[row.difficulty] || 0) + count;
    stats.byType[row.type] = (stats.byType[row.type] || 0) + count;
    stats.bySubject[row.subject] = (stats.bySubject[row.subject] || 0) + count;
  }

  stats.lastUpdated = new Date();

  // Cache the result
  if (useCache) {
    cache.set(cacheKey, stats);
  }

  return stats;
}

/**
 * Get detailed statistics with distributions and trends
 */
export async function getDetailedStatistics(
  pool: Pool,
  tenantId: string,
  useCache: boolean = true
): Promise<DetailedStats> {
  const cacheKey = `stats:detailed:${tenantId}`;

  // Check cache first
  if (useCache) {
    const cached = cache.get<DetailedStats>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Get basic stats
  const basicStats = await getQuestionStatistics(pool, tenantId, false);

  // Get top subjects
  const subjectResult = await pool.query(
    `SELECT subject, COUNT(*) as count
     FROM questions_bank
     WHERE tenant_id = $1 AND deleted_at IS NULL
     GROUP BY subject
     ORDER BY count DESC
     LIMIT 10`,
    [tenantId]
  );

  const topSubjects = subjectResult.rows.map(row => ({
    subject: row.subject,
    count: parseInt(row.count, 10),
  }));

  // Get top tags
  const tagResult = await pool.query(
    `SELECT jsonb_array_elements(tags)::text as tag, COUNT(*) as count
     FROM questions_bank
     WHERE tenant_id = $1 AND deleted_at IS NULL AND tags IS NOT NULL
     GROUP BY tag
     ORDER BY count DESC
     LIMIT 10`,
    [tenantId]
  );

  const topTags = tagResult.rows.map(row => ({
    tag: row.tag,
    count: parseInt(row.count, 10),
  }));

  // Calculate distributions
  const difficultyDistribution = Object.entries(basicStats.byDifficulty).map(([difficulty, count]) => ({
    difficulty,
    percentage: basicStats.total > 0 ? Math.round((count / basicStats.total) * 100) : 0,
  }));

  const typeDistribution = Object.entries(basicStats.byType).map(([type, count]) => ({
    type,
    percentage: basicStats.total > 0 ? Math.round((count / basicStats.total) * 100) : 0,
  }));

  const stats: DetailedStats = {
    ...basicStats,
    topSubjects,
    topTags,
    difficultyDistribution,
    typeDistribution,
  };

  // Cache the result
  if (useCache) {
    cache.set(cacheKey, stats);
  }

  return stats;
}

/**
 * Get time-based statistics (today, this week, this month)
 */
export async function getTimeBasedStatistics(
  pool: Pool,
  tenantId: string,
  useCache: boolean = true
): Promise<{
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
}> {
  const cacheKey = `stats:timebased:${tenantId}`;

  // Check cache first
  if (useCache) {
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const result = await pool.query(
    `SELECT 
       COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as today,
       COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week,
       COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as this_month,
       COUNT(*) as all_time
     FROM questions_bank
     WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId]
  );

  const row = result.rows[0];
  const stats = {
    today: parseInt(row.today, 10),
    thisWeek: parseInt(row.this_week, 10),
    thisMonth: parseInt(row.this_month, 10),
    allTime: parseInt(row.all_time, 10),
  };

  // Cache the result
  if (useCache) {
    cache.set(cacheKey, stats);
  }

  return stats;
}

/**
 * Get statistics by subject with detailed breakdown
 */
export async function getStatisticsBySubject(
  pool: Pool,
  tenantId: string,
  subject: string,
  useCache: boolean = true
): Promise<{
  subject: string;
  total: number;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
  percentage: number;
}> {
  const cacheKey = `stats:subject:${tenantId}:${subject}`;

  // Check cache first
  if (useCache) {
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Get total for percentage calculation
  const totalResult = await pool.query(
    `SELECT COUNT(*) as total FROM questions_bank WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId]
  );
  const totalQuestions = parseInt(totalResult.rows[0].total, 10);

  // Get subject-specific stats
  const result = await pool.query(
    `SELECT 
       COUNT(*) as total,
       difficulty,
       type
     FROM questions_bank
     WHERE tenant_id = $1 AND subject = $2 AND deleted_at IS NULL
     GROUP BY difficulty, type`,
    [tenantId, subject]
  );

  const stats = {
    subject,
    total: 0,
    byDifficulty: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    percentage: 0,
  };

  for (const row of result.rows) {
    const count = parseInt(row.total, 10);
    stats.total += count;
    stats.byDifficulty[row.difficulty] = (stats.byDifficulty[row.difficulty] || 0) + count;
    stats.byType[row.type] = (stats.byType[row.type] || 0) + count;
  }

  stats.percentage = totalQuestions > 0 ? Math.round((stats.total / totalQuestions) * 100) : 0;

  // Cache the result
  if (useCache) {
    cache.set(cacheKey, stats);
  }

  return stats;
}

/**
 * Get statistics for exam preparation
 * Shows what questions are available for exam creation
 */
export async function getExamPreparationStats(
  pool: Pool,
  tenantId: string,
  useCache: boolean = true
): Promise<{
  totalAvailable: number;
  byDifficulty: Record<string, number>;
  bySubject: Record<string, { total: number; byDifficulty: Record<string, number> }>;
  readyForExam: boolean;
  recommendations: string[];
}> {
  const cacheKey = `stats:exam-prep:${tenantId}`;

  // Check cache first
  if (useCache) {
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const result = await pool.query(
    `SELECT 
       COUNT(*) as total,
       difficulty,
       subject
     FROM questions_bank
     WHERE tenant_id = $1 AND deleted_at IS NULL
     GROUP BY difficulty, subject`,
    [tenantId]
  );

  const stats = {
    totalAvailable: 0,
    byDifficulty: {} as Record<string, number>,
    bySubject: {} as Record<string, { total: number; byDifficulty: Record<string, number> }>,
    readyForExam: false,
    recommendations: [] as string[],
  };

  for (const row of result.rows) {
    const count = parseInt(row.total, 10);
    stats.totalAvailable += count;

    // By difficulty
    stats.byDifficulty[row.difficulty] = (stats.byDifficulty[row.difficulty] || 0) + count;

    // By subject
    if (!stats.bySubject[row.subject]) {
      stats.bySubject[row.subject] = { total: 0, byDifficulty: {} };
    }
    stats.bySubject[row.subject].total += count;
    stats.bySubject[row.subject].byDifficulty[row.difficulty] =
      (stats.bySubject[row.subject].byDifficulty[row.difficulty] || 0) + count;
  }

  // Check if ready for exam
  stats.readyForExam = stats.totalAvailable >= 10;

  // Generate recommendations
  if (stats.totalAvailable < 10) {
    stats.recommendations.push(`Add at least ${10 - stats.totalAvailable} more questions`);
  }

  if (!stats.byDifficulty['Easy'] || stats.byDifficulty['Easy'] < 3) {
    stats.recommendations.push('Add more Easy difficulty questions');
  }

  if (!stats.byDifficulty['Medium'] || stats.byDifficulty['Medium'] < 3) {
    stats.recommendations.push('Add more Medium difficulty questions');
  }

  if (!stats.byDifficulty['Hard'] || stats.byDifficulty['Hard'] < 2) {
    stats.recommendations.push('Add more Hard difficulty questions');
  }

  if (Object.keys(stats.bySubject).length < 2) {
    stats.recommendations.push('Add questions from multiple subjects');
  }

  // Cache the result
  if (useCache) {
    cache.set(cacheKey, stats);
  }

  return stats;
}

/**
 * Invalidate statistics cache for a tenant
 * Call this after creating, updating, or deleting questions
 */
export function invalidateStatisticsCache(tenantId: string): void {
  cache.invalidatePattern(`stats:.*:${tenantId}`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: string[];
} {
  return {
    size: (cache as any).cache.size,
    entries: Array.from((cache as any).cache.keys()),
  };
}

/**
 * Clear all statistics cache
 */
export function clearStatisticsCache(): void {
  cache.clear();
}
