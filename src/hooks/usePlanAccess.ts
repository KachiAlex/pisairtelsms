import { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { PLAN_CONFIG, PlanFeatures, PlanType } from '../lib/plans';
import { getAuthFromStorage } from '../lib/auth';

let cachedFeatures: PlanFeatures | null = null;
let cachedPlan: PlanType | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000;
const LS_FEATURES_KEY = 'planFeatures';
const LS_PLAN_KEY = 'subscriptionPlan';

function readCachedFeatures(): { plan: PlanType | null; features: PlanFeatures | null } {
  try {
    const raw = localStorage.getItem(LS_FEATURES_KEY);
    if (!raw) return { plan: null, features: null };
    const parsed = JSON.parse(raw);
    return { plan: parsed.plan || null, features: parsed.features || null };
  } catch {
    return { plan: null, features: null };
  }
}

/**
 * Hook to check if the current tenant has access to a specific feature
 * based on their subscription plan.
 * Fetches the tenant's resolved feature matrix from /api/tenant/plan
 * (DB-backed, same source enforcePlan uses) with localStorage persistence
 * so nav renders correctly on first paint.
 * On fetch failure the UI fails open (shows nav items) — the API gate
 * remains the authoritative enforcement point.
 */
export function usePlanAccess() {
  const { subscriptionPlan, setSubscriptionPlan } = useTenant();
  const stored = readCachedFeatures();
  const currentPlan = ((cachedPlan || subscriptionPlan || stored.plan || 'starter') as string).toLowerCase() as PlanType;

  const [dbFeatures, setDbFeatures] = useState<PlanFeatures | null>(
    cachedFeatures || stored.features
  );

  useEffect(() => {
    const now = Date.now();
    if (cachedFeatures && now - cacheTimestamp < CACHE_TTL) {
      return;
    }

    const auth = getAuthFromStorage();
    if (!auth) {
      return;
    }

    fetch('/api/tenant/plan', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.features) {
          const plan = (data.plan || 'starter').toLowerCase() as PlanType;
          cachedFeatures = data.features as PlanFeatures;
          cachedPlan = plan;
          cacheTimestamp = Date.now();
          setDbFeatures(cachedFeatures);
          try {
            localStorage.setItem(LS_FEATURES_KEY, JSON.stringify({ plan, features: data.features }));
          } catch { /* storage full — non-fatal */ }
          if (plan !== subscriptionPlan) setSubscriptionPlan(plan);
        }
      })
      .catch(() => {
        // Fail open: keep existing/static features, API gate still enforces.
      });
  }, []);

  const features = dbFeatures || PLAN_CONFIG[currentPlan] || PLAN_CONFIG.starter;

  /**
   * Check access for a category or a specific feature within a category
   * @param category The feature category (e.g., 'finance', 'exams')
   * @param feature Optional specific feature within that category
   */
  const hasAccess = (category: keyof PlanFeatures, feature?: string): boolean => {
    if (!features[category]) return false;

    if (!feature) {
      return Object.values(features[category]).some(val => val === true);
    }

    return (features[category] as any)[feature] === true;
  };

  return {
    hasAccess,
    currentPlan,
    planName: currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1),
    isStarter: currentPlan === 'starter',
    isStandard: currentPlan === 'standard',
    isPremium: currentPlan === 'premium',
  };
}
