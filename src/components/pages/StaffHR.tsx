import React, { useState, useEffect } from 'react'
import {
  Users,
  Briefcase,
  UserPlus,
  ClipboardCheck,
  Clock4,
  AlertTriangle,
  Shield,
  Award,
  TrendingUp,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'

interface Staff {
  id: string
  name: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'on_leave'
  email: string
  phone: string
  hireDate: string
  createdAt: string
  updatedAt: string
}

export function StaffHR() {
  const [staffRecords, setStaffRecords] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/tenant/staff')
        if (!response.ok) {
          throw new Error('Failed to fetch staff records')
        }
        const result = await response.json()
        setStaffRecords(result.data || [])
      } catch (err) {
        console.error('Error fetching staff:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch staff records')
      } finally {
        setLoading(false)
      }
    }

    fetchStaffData()
  }, [])

  // Compute statistics from fetched data
  const totalStaff = staffRecords.length
  const departmentDistribution: Record<string, number> = {}
  const inactiveStaff = staffRecords.filter(s => s.status === 'inactive').length
  const onLeaveStaff = staffRecords.filter(s => s.status === 'on_leave').length
  
  staffRecords.forEach((staff) => {
    departmentDistribution[staff.department] = (departmentDistribution[staff.department] || 0) + 1
  })

  // Convert to percentage-based distribution for display
  const headcountDistribution = Object.entries(departmentDistribution)
    .map(([label, count]) => ({
      label,
      value: totalStaff > 0 ? Math.round((count / totalStaff) * 100) : 0,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const summaryStats = [
    {
      label: 'Total staff',
      value: totalStaff.toString(),
      detail: `${inactiveStaff} inactive`,
      tone: 'text-blue-600',
      icon: Users,
    },
    {
      label: 'Open roles',
      value: inactiveStaff.toString(),
      detail: 'Unfilled positions',
      tone: 'text-amber-600',
      icon: Briefcase,
    },
    {
      label: 'On leave',
      value: onLeaveStaff.toString(),
      detail: 'Currently absent',
      tone: 'text-emerald-600',
      icon: UserPlus,
    },
    {
      label: 'Active staff',
      value: (totalStaff - inactiveStaff - onLeaveStaff).toString(),
      detail: 'Available now',
      tone: 'text-purple-600',
      icon: Clock4,
    },
  ]

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Tenant HR</p>
            <h1 className="text-2xl font-bold text-gray-900">Staff & HR workspace</h1>
            <p className="text-sm text-gray-600">Monitor hiring, onboarding flows, leave coverage, and compliance guardrails.</p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-700">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Tenant HR</p>
          <h1 className="text-2xl font-bold text-gray-900">Staff & HR workspace</h1>
          <p className="text-sm text-gray-600">Monitor hiring, onboarding flows, leave coverage, and compliance guardrails.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" /> Issue offer
          </Button>
          <Button variant="outline">
            <ClipboardCheck className="h-4 w-4 mr-2" /> Bulk approvals
          </Button>
          <Button>
            <TrendingUp className="h-4 w-4 mr-2" /> Publish headcount report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.tone}`}>{stat.detail}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Onboarding runway</CardTitle>
            <CardDescription>Track new hires through provisioning milestones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center py-8 text-center">
              <div>
                <UserPlus className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No onboarding data yet.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Headcount mix</CardTitle>
            <CardDescription>Departmental allocation snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {headcountDistribution.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <span className="text-xs text-gray-500">{item.value}% ({item.count})</span>
                </div>
                <Progress value={item.value} className="mt-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leave & coverage planner</CardTitle>
            <CardDescription>Ensure no classes are unattended</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center py-8 text-center">
              <div>
                <Clock4 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No leave data yet.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance focus</CardTitle>
            <CardDescription>Live view of review cycle guardrails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-8 text-center">
              <div>
                <TrendingUp className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No performance data yet.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Compliance campaigns
            </CardTitle>
            <CardDescription>Automated attestations & training</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-8 text-center">
              <div>
                <Shield className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No compliance data yet.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              Recognition queue
            </CardTitle>
            <CardDescription>Nomination and kudos backlog</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="font-semibold text-gray-900">STEM Excellence Spotlight</p>
              <p className="text-xs text-gray-500">Voting closes in 2 days</p>
              <Button variant="ghost" size="sm" className="text-blue-600 mt-2">
                Review nominations
              </Button>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="font-semibold text-gray-900">Guardian kudos feed</p>
              <p className="text-xs text-gray-500">12 shout-outs pending verification</p>
              <Button variant="ghost" size="sm" className="text-blue-600 mt-2">
                Moderate feed
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Incident log
            </CardTitle>
            <CardDescription>Keep tabs on HR escalations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center py-8 text-center">
              <div>
                <AlertTriangle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No incidents logged yet.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default StaffHR;
