import { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { PLAN_CONFIG, PlanFeatures, PlanType } from '../lib/plans';

let cachedDbConfig: Record<string, PlanFeatures> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000;

/**
 * Hook to check if the current tenant has access to a specific feature
 * based on their subscription plan.
 * Fetches plan config from the API (with caching) so superadmin changes take effect.
 */
export function usePlanAccess() {
  const { subscriptionPlan } = useTenant();
  const currentPlan = (subscriptionPlan || 'starter').toLowerCase() as PlanType;

  const [dbFeatures, setDbFeatures] = useState<PlanFeatures | null>(null);

  useEffect(() => {
    const now = Date.now();
    if (cachedDbConfig && now - cacheTimestamp < CACHE_TTL) {
      setDbFeatures(cachedDbConfig[currentPlan] || null);
      return;
    }

    fetch('/api/admin/plans', {
      headers: { 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const config: Record<string, PlanFeatures> = {};
          for (const plan of data.data) {
            config[plan.planName] = plan.features;
          }
          cachedDbConfig = config;
          cacheTimestamp = Date.now();
          setDbFeatures(config[currentPlan] || null);
        }
      })
      .catch(() => {
        // Fallback to static config
        setDbFeatures(null);
      });
  }, [currentPlan]);

  const features = dbFeatures || PLAN_CONFIG[currentPlan] || PLAN_CONFIG.starter;

  /**
   * Check access for a category or a specific feature within a category
   * @param category The feature category (e.g., 'finance', 'exams')
   * @param feature Optional specific feature within that category
   */
  const hasAccess = (category: keyof PlanFeatures, feature?: string): boolean => {
    if (!features[category]) return false;
    
    if (!feature) {
      // If only category is provided, check if any feature in that category is enabled
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
