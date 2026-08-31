import { useTenant } from '../contexts/TenantContext';
import { PLAN_CONFIG, PlanFeatures, PlanType } from '../lib/plans';

/**
 * Hook to check if the current tenant has access to a specific feature
 * based on their subscription plan.
 */
export function usePlanAccess() {
  const { subscriptionPlan } = useTenant();
  
  // Default to 'starter' if no plan is found
  const currentPlan = (subscriptionPlan || 'starter').toLowerCase() as PlanType;
  const features = PLAN_CONFIG[currentPlan] || PLAN_CONFIG.starter;

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
