import React, { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  Check,
  X,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Crown,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { useToast } from '../ui/use-toast'
import { PLAN_CONFIG, PLAN_RATES, PlanType, PlanFeatures } from '../../lib/plans'

interface PlanConfigRow {
  planName: string
  features: PlanFeatures
  rate: number
  isActive: boolean
  updatedAt: string
}

const planIcons: Record<string, React.ReactNode> = {
  starter: <Sparkles className="h-4 w-4" />,
  standard: <CreditCard className="h-4 w-4" />,
  premium: <Crown className="h-4 w-4" />,
}

const planColors: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  starter: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', accent: 'text-gray-600' },
  standard: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', accent: 'text-blue-600' },
  premium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', accent: 'text-amber-600' },
}

const categoryLabels: Record<string, string> = {
  admissions: 'Admissions',
  studentManagement: 'Student Management',
  academicStructure: 'Academic Structure',
  attendance: 'Attendance',
  results: 'Results & Assessment',
  exams: 'CBT & Examinations',
  scheduling: 'Scheduling',
  digitalLearning: 'Digital Learning',
  finance: 'Finance & Fees',
  hr: 'Staff & HR',
  communication: 'Communication',
  analytics: 'Analytics',
  security: 'Security & Compliance',
  admin: 'Administration',
  support: 'Support',
}

function getFeatureKeys(features: PlanFeatures): string[] {
  return Object.keys(features)
}

function toggleFeature(features: PlanFeatures, category: string, feature: string): PlanFeatures {
  return {
    ...features,
    [category]: {
      ...(features as any)[category],
      [feature]: !((features as any)[category]?.[feature] ?? false),
    },
  }
}

function setAllInCategory(features: PlanFeatures, category: string, value: boolean): PlanFeatures {
  const cat = (features as any)[category]
  if (!cat) return features
  const updated: Record<string, boolean> = {}
  Object.keys(cat).forEach((k) => (updated[k] = value))
  return { ...features, [category]: updated }
}

export function PlansTab() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<PlanConfigRow[]>([])
  const [originalPlans, setOriginalPlans] = useState<PlanConfigRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [dirtyPlans, setDirtyPlans] = useState<Set<string>>(new Set())

  const fetchPlans = useCallback(async () => {
    try {
      const authRaw = localStorage.getItem('auth')
      const token = authRaw ? JSON.parse(authRaw).token : null
      const res = await fetch('/api/admin/plans', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPlans(data.data)
        setOriginalPlans(data.data)
      } else {
        // Fallback to static config
        const fallback: PlanConfigRow[] = (Object.keys(PLAN_CONFIG) as PlanType[]).map((plan) => ({
          planName: plan,
          features: PLAN_CONFIG[plan],
          rate: PLAN_RATES[plan],
          isActive: true,
          updatedAt: new Date().toISOString(),
        }))
        setPlans(fallback)
        setOriginalPlans(fallback)
      }
    } catch (e) {
      console.error('Failed to load plans:', e)
      const fallback: PlanConfigRow[] = (Object.keys(PLAN_CONFIG) as PlanType[]).map((plan) => ({
        planName: plan,
        features: PLAN_CONFIG[plan],
        rate: PLAN_RATES[plan],
        isActive: true,
        updatedAt: new Date().toISOString(),
      }))
      setPlans(fallback)
      setOriginalPlans(fallback)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  function updatePlanFeatures(planName: string, features: PlanFeatures) {
    setPlans((prev) => prev.map((p) => (p.planName === planName ? { ...p, features } : p)))
    setDirtyPlans((prev) => new Set(prev).add(planName))
  }

  function updatePlanRate(planName: string, rate: number) {
    setPlans((prev) => prev.map((p) => (p.planName === planName ? { ...p, rate } : p)))
    setDirtyPlans((prev) => new Set(prev).add(planName))
  }

  async function savePlan(planName: string) {
    const plan = plans.find((p) => p.planName === planName)
    if (!plan) return
    setSaving(planName)
    try {
      const authRaw = localStorage.getItem('auth')
      const token = authRaw ? JSON.parse(authRaw).token : null
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ planName, features: plan.features, rate: plan.rate }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save')
      setOriginalPlans((prev) => prev.map((p) => (p.planName === planName ? data.data : p)))
      setDirtyPlans((prev) => {
        const next = new Set(prev)
        next.delete(planName)
        return next
      })
      toast({ title: 'Plan saved', description: `${planName.charAt(0).toUpperCase() + planName.slice(1)} plan updated successfully.` })
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  async function resetPlan(planName: string) {
    setResetting(planName)
    try {
      const staticConfig = PLAN_CONFIG[planName as PlanType]
      const staticRate = PLAN_RATES[planName as PlanType]
      const authRaw = localStorage.getItem('auth')
      const token = authRaw ? JSON.parse(authRaw).token : null
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ planName, features: staticConfig, rate: staticRate }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reset')
      setPlans((prev) => prev.map((p) => (p.planName === planName ? { ...p, features: staticConfig, rate: staticRate } : p)))
      setOriginalPlans((prev) => prev.map((p) => (p.planName === planName ? data.data : p)))
      setDirtyPlans((prev) => {
        const next = new Set(prev)
        next.delete(planName)
        return next
      })
      toast({ title: 'Plan reset', description: `${planName.charAt(0).toUpperCase() + planName.slice(1)} restored to defaults.` })
    } catch (err: any) {
      toast({ title: 'Reset failed', description: err.message, variant: 'destructive' })
    } finally {
      setResetting(null)
    }
  }

  function toggleCategory(key: string) {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#d5cfc0] border-t-[#e31e24] rounded-full animate-spin" />
          <p className="text-sm text-[#5b5c63]">Loading plan configurations...</p>
        </div>
      </div>
    )
  }

  const allCategories = plans.length > 0 ? getFeatureKeys(plans[0].features) : []

  return (
    <div className="space-y-6">
      {/* Plan Cards Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const colors = planColors[plan.planName] || planColors.starter
          const featureCount = Object.values(plan.features).reduce((acc, cat) => acc + Object.values(cat).filter(Boolean).length, 0)
          const totalFeatures = Object.values(plan.features).reduce((acc, cat) => acc + Object.keys(cat).length, 0)
          const isDirty = dirtyPlans.has(plan.planName)

          return (
            <div
              key={plan.planName}
              className={`rounded-2xl border ${colors.border} bg-white p-5 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                    {planIcons[plan.planName] || <CreditCard className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#15161a]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}>
                      {plan.planName.charAt(0).toUpperCase() + plan.planName.slice(1)}
                    </h3>
                    <p className="text-xs text-[#9b9a94]">{featureCount}/{totalFeatures} features enabled</p>
                  </div>
                </div>
                {isDirty && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">Unsaved</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <DollarSign className="h-4 w-4 text-[#5b5c63]" />
                <input
                  type="number"
                  value={plan.rate}
                  onChange={(e) => updatePlanRate(plan.planName, parseFloat(e.target.value) || 0)}
                  className="text-2xl font-semibold text-[#15161a] bg-transparent border-none outline-none w-24 p-0 focus:ring-0"
                  style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}
                />
                <span className="text-sm text-[#9b9a94]">/term</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-[#15161a] hover:bg-[#15161a]/90 text-white rounded-lg gap-2"
                  disabled={!isDirty || saving === plan.planName}
                  onClick={() => savePlan(plan.planName)}
                >
                  {saving === plan.planName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#d5cfc0] text-[#5b5c63] rounded-lg gap-2"
                  disabled={resetting === plan.planName}
                  onClick={() => resetPlan(plan.planName)}
                >
                  {resetting === plan.planName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Reset
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Feature Configuration Matrix */}
      <div className="rounded-2xl border border-[#e6e2d8] bg-white overflow-hidden">
        <div className="p-6 border-b border-[#e6e2d8]">
          <h2 className="text-lg font-semibold text-[#15161a]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}>
            Feature Configuration
          </h2>
          <p className="text-sm text-[#5b5c63] mt-1">Toggle features on or off for each subscription plan. Click a category to expand its features.</p>
        </div>

        {/* Header row with plan names */}
        <div className="sticky top-0 bg-[#f3f1ea] border-b border-[#e6e2d8] z-10">
          <div className="grid grid-cols-[1fr_repeat(3,minmax(100px,1fr))] gap-2 px-6 py-3">
            <div className="text-xs font-medium text-[#9b9a94] uppercase tracking-wide">Category / Feature</div>
            {plans.map((plan) => (
              <div key={plan.planName} className="text-center">
                <span className={`text-sm font-medium capitalize ${planColors[plan.planName]?.accent || 'text-[#5b5c63]'}`}>
                  {plan.planName}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#e6e2d8]">
          {allCategories.map((category) => {
            const isExpanded = expandedCategories[category] ?? false
            const featuresInCategory = plans[0] ? Object.keys((plans[0].features as any)[category]) : []

            return (
              <div key={category}>
                {/* Category row */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full grid grid-cols-[1fr_repeat(3,minmax(100px,1fr))] gap-2 px-6 py-3 hover:bg-[#f3f1ea]/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-[#9b9a94]" /> : <ChevronRight className="h-4 w-4 text-[#9b9a94]" />}
                    <span className="text-sm font-medium text-[#15161a]">{categoryLabels[category] || category}</span>
                  </div>
                  {plans.map((plan) => {
                    const cat = (plan.features as any)[category]
                    const enabled = cat ? Object.values(cat).filter(Boolean).length : 0
                    const total = cat ? Object.keys(cat).length : 0
                    return (
                      <div key={plan.planName} className="text-center">
                        <span className="text-xs text-[#5b5c63]">{enabled}/{total}</span>
                      </div>
                    )
                  })}
                </button>

                {/* Feature rows */}
                {isExpanded && (
                  <div className="bg-[#f9f8f4]">
                    {/* Bulk toggle row */}
                    <div className="grid grid-cols-[1fr_repeat(3,minmax(100px,1fr))] gap-2 px-6 py-2 border-b border-[#e6e2d8]">
                      <div className="text-xs text-[#9b9a94] italic">Toggle all in category</div>
                      {plans.map((plan) => (
                        <div key={plan.planName} className="flex justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-emerald-600 hover:bg-emerald-50 rounded"
                            onClick={() => updatePlanFeatures(plan.planName, setAllInCategory(plan.features, category, true))}
                          >
                            All on
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-[#e31e24] hover:bg-[#e31e24]/5 rounded"
                            onClick={() => updatePlanFeatures(plan.planName, setAllInCategory(plan.features, category, false))}
                          >
                            All off
                          </Button>
                        </div>
                      ))}
                    </div>

                    {featuresInCategory.map((feature) => (
                      <div
                        key={feature}
                        className="grid grid-cols-[1fr_repeat(3,minmax(100px,1fr))] gap-2 px-6 py-2.5 hover:bg-white/50 transition-colors"
                      >
                        <div className="text-sm text-[#5b5c63] pl-6">
                          {feature.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </div>
                        {plans.map((plan) => {
                          const isEnabled = (plan.features as any)[category]?.[feature] === true
                          return (
                            <div key={plan.planName} className="flex justify-center">
                              <button
                                onClick={() => updatePlanFeatures(plan.planName, toggleFeature(plan.features, category, feature))}
                                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                                  isEnabled
                                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                {isEnabled ? <Check className="h-4 w-4" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Save all bar */}
      {dirtyPlans.size > 0 && (
        <div className="sticky bottom-4 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-200 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">{dirtyPlans.size} plan(s) with unsaved changes</p>
              <p className="text-xs text-amber-700">Changes affect what features tenants can access immediately after saving.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100 rounded-lg"
              onClick={() => {
                setPlans(originalPlans)
                setDirtyPlans(new Set())
              }}
            >
              Discard all
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg gap-2"
              onClick={async () => {
                for (const planName of dirtyPlans) {
                  await savePlan(planName)
                }
              }}
            >
              <Save className="h-3.5 w-3.5" />
              Save all changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
