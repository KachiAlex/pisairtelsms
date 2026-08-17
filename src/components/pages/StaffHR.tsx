import React, { useState, useEffect } from 'react'
import { Users, UserCheck, Clock, DollarSign, TrendingUp, Briefcase } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Progress } from '../ui/progress'
import { StaffDirectory } from './staff/StaffDirectory'
import { StaffAttendance } from './staff/StaffAttendance'
import { LeaveManagement } from './staff/LeaveManagement'
import { PayrollManagement } from './staff/PayrollManagement'

interface Staff {
  id: string
  name: string
  department: string
  status: 'active' | 'inactive' | 'on_leave'
  salary?: number
}

export function StaffHR({ initialTab = 'overview' }: { initialTab?: string }) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    const headers: Record<string, string> = {
            ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
    fetch('/api/tenant/staff', { headers })
      .then(r => r.json())
      .then(d => setStaff(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const totalStaff = staff.length
  const activeStaff = staff.filter(s => s.status === 'active').length
  const onLeave = staff.filter(s => s.status === 'on_leave').length
  const inactive = staff.filter(s => s.status === 'inactive').length

  const deptMap: Record<string, number> = {}
  staff.forEach(s => { deptMap[s.department] = (deptMap[s.department] || 0) + 1 })
  const deptDistribution = Object.entries(deptMap)
    .map(([dept, count]) => ({ dept, count, pct: totalStaff > 0 ? Math.round((count / totalStaff) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)

  const stats = [
    { label: 'Total Staff', value: totalStaff, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active', value: activeStaff, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'On Leave', value: onLeave, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Inactive', value: inactive, icon: Briefcase, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">HR Management</p>
        <h1 className="text-2xl font-bold text-gray-900">Staff & HR</h1>
        <p className="text-sm text-gray-600 mt-1">Manage staff records, attendance, leave, and payroll</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="directory">Staff Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map(stat => {
              const Icon = stat.icon
              return (
                <Card key={stat.label}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`rounded-full ${stat.bg} p-3`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {loading ? '—' : stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Department Distribution */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Department Distribution</h3>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-200 rounded" />)}
                  </div>
                ) : deptDistribution.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No staff data yet</p>
                ) : (
                  <div className="space-y-4">
                    {deptDistribution.map(d => (
                      <div key={d.dept}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900">{d.dept}</span>
                          <span className="text-gray-500">{d.pct}% ({d.count})</span>
                        </div>
                        <Progress value={d.pct} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Staff Status Breakdown</h3>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-200 rounded" />)}
                  </div>
                ) : totalStaff === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No staff data yet</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-green-700">Active</span>
                        <span className="text-gray-500">{totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 0}% ({activeStaff})</span>
                      </div>
                      <Progress value={totalStaff > 0 ? (activeStaff / totalStaff) * 100 : 0} className="[&>div]:bg-green-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-yellow-700">On Leave</span>
                        <span className="text-gray-500">{totalStaff > 0 ? Math.round((onLeave / totalStaff) * 100) : 0}% ({onLeave})</span>
                      </div>
                      <Progress value={totalStaff > 0 ? (onLeave / totalStaff) * 100 : 0} className="[&>div]:bg-yellow-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-red-700">Inactive</span>
                        <span className="text-gray-500">{totalStaff > 0 ? Math.round((inactive / totalStaff) * 100) : 0}% ({inactive})</span>
                      </div>
                      <Progress value={totalStaff > 0 ? (inactive / totalStaff) * 100 : 0} className="[&>div]:bg-red-500" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => setActiveTab('directory')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors">
                  <Users className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Add Staff</span>
                </button>
                <button onClick={() => setActiveTab('attendance')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors">
                  <UserCheck className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Mark Attendance</span>
                </button>
                <button onClick={() => setActiveTab('leave')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors">
                  <Clock className="w-6 h-6 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">Leave Request</span>
                </button>
                <button onClick={() => setActiveTab('payroll')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Run Payroll</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Directory Tab */}
        <TabsContent value="directory" className="space-y-4">
          <StaffDirectory />
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <StaffAttendance />
        </TabsContent>

        {/* Leave Tab */}
        <TabsContent value="leave" className="space-y-4">
          <LeaveManagement />
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <PayrollManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StaffHR
