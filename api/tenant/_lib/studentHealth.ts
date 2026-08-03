import { queryAll, queryOne } from '../cbt/_lib/db.js';

export interface StudentHealthPayload {
  summaryStats: SummaryStat[];
  screeningQueue: ScreeningItem[];
  counselingPipeline: CounselingColumn[];
  incidentFeed: IncidentItem[];
  wellnessTasks: WellnessTask[];
}

export interface SummaryStat {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: 'screening' | 'counseling' | 'alerts' | 'incidents';
}

export interface ScreeningItem {
  student: string;
  cohort: string;
  type: string;
  due: string;
  owner: string;
  status: string;
}

export interface CounselingCase {
  student: string;
  topic: string;
  owner: string;
  nextStep: string;
}

export interface CounselingColumn {
  stage: string;
  color: string;
  cases: CounselingCase[];
}

export interface IncidentItem {
  title: string;
  student: string;
  time: string;
  detail: string;
  severity: string;
}

export interface WellnessTask {
  task: string;
  owner: string;
  due: string;
  status: string;
}

export async function fetchStudentHealthData(tenantId: string): Promise<StudentHealthPayload> {
  try {
    const rows = await queryAll<any>(
      `SELECT * FROM student_health_records WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );

    const screenings = rows.filter(r => r.record_type === 'screening');
    const counselings = rows.filter(r => r.record_type === 'counseling');
    const incidents = rows.filter(r => r.record_type === 'incident');
    const wellness = rows.filter(r => r.record_type === 'wellness_task');

    const screeningQueue: ScreeningItem[] = screenings.map(r => ({
      student: r.student_name || '',
      cohort: r.cohort || '',
      type: r.details || '',
      due: r.due_date ? new Date(r.due_date).toISOString().split('T')[0] : '',
      owner: r.owner || '',
      status: r.status || 'pending',
    }));

    const counselingColumns: CounselingColumn[] = [
      { stage: 'Assessment', color: 'bg-blue-100 text-blue-700', cases: counselings.filter(r => r.status === 'assessment').map(r => ({
        student: r.student_name || '', topic: r.details || '', owner: r.owner || '', nextStep: 'Schedule follow-up',
      }))},
      { stage: 'Active sessions', color: 'bg-amber-100 text-amber-700', cases: counselings.filter(r => r.status === 'active').map(r => ({
        student: r.student_name || '', topic: r.details || '', owner: r.owner || '', nextStep: 'Continue sessions',
      }))},
      { stage: 'Resolved', color: 'bg-emerald-100 text-emerald-700', cases: counselings.filter(r => r.status === 'resolved').map(r => ({
        student: r.student_name || '', topic: r.details || '', owner: r.owner || '', nextStep: 'Closed',
      }))},
    ];

    const incidentFeed: IncidentItem[] = incidents.map(r => ({
      title: r.details || 'Incident',
      student: r.student_name || '',
      time: r.created_at?.toISOString?.() || String(r.created_at || ''),
      detail: r.details || '',
      severity: r.severity || 'Low',
    }));

    const wellnessTasks: WellnessTask[] = wellness.map(r => ({
      task: r.details || '',
      owner: r.owner || '',
      due: r.due_date ? new Date(r.due_date).toISOString().split('T')[0] : '',
      status: r.status || 'pending',
    }));

    const summaryStats: SummaryStat[] = [
      { label: 'Screenings due', value: String(screeningQueue.filter(s => s.status === 'pending').length), detail: `${screeningQueue.length} total`, tone: 'text-blue-600', icon: 'screening' },
      { label: 'Counseling cases', value: String(counselings.length), detail: `${counselings.filter(c => c.status === 'active').length} active`, tone: 'text-amber-600', icon: 'counseling' },
      { label: 'Active alerts', value: String(incidents.filter(i => i.severity === 'High').length), detail: `${incidents.length} total incidents`, tone: 'text-rose-600', icon: 'alerts' },
      { label: 'Wellness tasks', value: String(wellnessTasks.filter(t => t.status === 'pending').length), detail: `${wellnessTasks.length} total`, tone: 'text-emerald-600', icon: 'incidents' },
    ];

    return { summaryStats, screeningQueue, counselingPipeline: counselingColumns, incidentFeed, wellnessTasks };
  } catch (error) {
    console.error('Error fetching student health data:', error);
    return { summaryStats: [], screeningQueue: [], counselingPipeline: [], incidentFeed: [], wellnessTasks: [] };
  }
}

export async function createHealthRecord(
  tenantId: string,
  data: { studentName: string; recordType: string; details?: string; owner?: string; status?: string; dueDate?: string; severity?: string; location?: string; cohort?: string }
): Promise<any> {
  const row = await queryOne<any>(
    `INSERT INTO student_health_records (tenant_id, student_name, cohort, record_type, details, owner, status, due_date, severity, location)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      tenantId,
      data.studentName,
      data.cohort || '',
      data.recordType,
      data.details || '',
      data.owner || '',
      data.status || 'pending',
      data.dueDate || null,
      data.severity || 'Low',
      data.location || '',
    ]
  );
  return row;
}
