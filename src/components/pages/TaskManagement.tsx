import React, { useState, useEffect } from 'react'
import { ClipboardList, Users, CheckCircle2, AlertTriangle, Plus, CalendarClock, Kanban, Send, Edit3, Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  assigned_to: string | null
  assigned_to_name: string | null
  due_date: string | null
}

interface Squad {
  id: string
  squad_name: string
  owner: string
  focus: string | null
  risk: string
  task_count: number
}

interface Workstream {
  id: string
  label: string
  progress: number
  blockers: number
  next_milestone: string | null
}

interface Reminder {
  id: string
  message: string
  severity: string
  due_date: string
}

interface TaskStats {
  totalTasks: number
  openTasks: number
  inProgressTasks: number
  completedTasks: number
  highPriorityTasks: number
  dueToday: number
  overdueTasks: number
  completionRateThisWeek: number
  totalSquads: number
  onTrackSquads: number
  atRiskSquads: number
}

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  'In progress': 'default',
  Queued: 'secondary',
  Scheduled: 'secondary',
  'Pending review': 'warning',
}

const priorityPill: Record<string, 'default' | 'warning' | 'destructive'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'default',
}

const riskBadge: Record<string, 'default' | 'warning' | 'destructive'> = {
  low: 'default',
  medium: 'warning',
  high: 'destructive',
}

export function TaskManagement() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [squads, setSquads] = useState<Squad[]>([])
  const [workstreams, setWorkstreams] = useState<Workstream[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])

  // Modal states
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [createSquadOpen, setCreateSquadOpen] = useState(false)
  const [createWorkstreamOpen, setCreateWorkstreamOpen] = useState(false)
  const [digestSending, setDigestSending] = useState(false)
  const [smartTriageEnabled, setSmartTriageEnabled] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
  })

  const [squadForm, setSquadForm] = useState({
    squadName: '',
    owner: '',
    focus: '',
    risk: 'low',
  })

  const [workstreamForm, setWorkstreamForm] = useState({
    label: '',
    nextMilestone: '',
  })

  const fetchTenantId = () => {
    // In a real app, this would come from auth context or localStorage
    return localStorage.getItem('tenantId') || 'default-tenant'
  }

  const fetchData = async () => {
    setLoading(true)
    const tenantId = fetchTenantId()
    
    try {
      // Fetch statistics
      const statsRes = await fetch(`/api/tenant/tasks/statistics?tenantId=${tenantId}`)
      const statsData = await statsRes.json()
      if (statsData.success) setStats(statsData.data)

      // Fetch tasks
      const tasksRes = await fetch(`/api/tenant/tasks?tenantId=${tenantId}&limit=10`)
      const tasksData = await tasksRes.json()
      if (tasksData.success) setTasks(tasksData.data)

      // Fetch squads
      const squadsRes = await fetch(`/api/tenant/tasks/squads?tenantId=${tenantId}`)
      const squadsData = await squadsRes.json()
      if (squadsData.success) setSquads(squadsData.data)

      // Fetch workstreams
      const workstreamsRes = await fetch(`/api/tenant/tasks/workstreams?tenantId=${tenantId}`)
      const workstreamsData = await workstreamsRes.json()
      if (workstreamsData.success) setWorkstreams(workstreamsData.data)

      // Fetch reminders
      const remindersRes = await fetch(`/api/tenant/tasks/reminders?tenantId=${tenantId}`)
      const remindersData = await remindersRes.json()
      if (remindersData.success) setReminders(remindersData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const resetTaskForm = () => setTaskForm({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' })
  const resetSquadForm = () => setSquadForm({ squadName: '', owner: '', focus: '', risk: 'low' })
  const resetWorkstreamForm = () => setWorkstreamForm({ label: '', nextMilestone: '' })

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return
    setSubmitting(true)
    const tenantId = fetchTenantId()
    try {
      await fetch('/api/tenant/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          assignedTo: taskForm.assignedTo || undefined,
          dueDate: taskForm.dueDate || undefined,
        })
      })
      setCreateTaskOpen(false)
      resetTaskForm()
      fetchData()
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateSquad = async () => {
    if (!squadForm.squadName.trim() || !squadForm.owner.trim()) return
    setSubmitting(true)
    const tenantId = fetchTenantId()
    try {
      await fetch('/api/tenant/tasks/squads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          squadName: squadForm.squadName,
          owner: squadForm.owner,
          focus: squadForm.focus || undefined,
          risk: squadForm.risk,
        })
      })
      setCreateSquadOpen(false)
      resetSquadForm()
      fetchData()
    } catch (error) {
      console.error('Error creating squad:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateWorkstream = async () => {
    if (!workstreamForm.label.trim()) return
    setSubmitting(true)
    const tenantId = fetchTenantId()
    try {
      await fetch('/api/tenant/tasks/workstreams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          label: workstreamForm.label,
          nextMilestone: workstreamForm.nextMilestone || undefined,
          progress: 0,
          blockers: 0,
        })
      })
      setCreateWorkstreamOpen(false)
      resetWorkstreamForm()
      fetchData()
    } catch (error) {
      console.error('Error creating workstream:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendDigest = async () => {
    setDigestSending(true)
    const tenantId = fetchTenantId()
    try {
      // Create a notification digest for each squad owner
      const squadMessages = squads.map(s =>
        `${s.squad_name}: ${s.task_count} tasks • Risk: ${s.risk} • Focus: ${s.focus || 'N/A'}`
      ).join('\n')

      await fetch('/api/tenant/tasks/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          title: 'Squad Digest',
          message: `Weekly squad digest:\n\n${squadMessages}`,
          type: 'info',
        })
      })
    } catch (error) {
      console.error('Error sending digest:', error)
    } finally {
      setDigestSending(false)
    }
  }

  const handleExportCalendar = () => {
    const upcoming = tasks.filter(t => t.due_date && new Date(t.due_date) >= new Date())
    if (upcoming.length === 0) {
      alert('No upcoming deadlines to export')
      return
    }
    const csv = [
      'Title,Owner,Due Date,Priority,Status',
      ...upcoming.map(t =>
        `"${t.title}","${t.assigned_to_name || t.assigned_to || 'Unassigned'}","${t.due_date ? new Date(t.due_date).toLocaleDateString() : ''}","${t.priority}","${t.status}"`
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `task-calendar-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleEnableSmartTriage = () => {
    setSmartTriageEnabled(prev => !prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Notifications & tasks</p>
          <h1 className="text-2xl font-bold text-gray-900">Task management</h1>
          <p className="text-sm text-gray-600">Coordinate cross-functional workstreams, monitor blockers, and broadcast nudges.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => { resetSquadForm(); setCreateSquadOpen(true) }}>
            <Edit3 className="h-4 w-4 mr-2" /> Create squad
          </Button>
          <Button onClick={() => { resetTaskForm(); setCreateTaskOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" /> New task
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Open tasks</p>
            <p className="text-3xl font-semibold text-gray-900">{stats?.openTasks || 0}</p>
            <p className="text-xs text-gray-500">{stats?.dueToday || 0} due today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Completed this week</p>
            <p className="text-3xl font-semibold text-emerald-600">{stats?.completionRateThisWeek || 0}%</p>
            <p className="text-xs text-gray-500">Real-time data</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">High priority</p>
            <p className="text-3xl font-semibold text-rose-600">{stats?.highPriorityTasks || 0}</p>
            <p className="text-xs text-gray-500">{stats?.overdueTasks || 0} overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">On-track squads</p>
            <p className="text-3xl font-semibold text-gray-900">{stats?.onTrackSquads || 0}</p>
            <p className="text-xs text-gray-500">{stats?.atRiskSquads || 0} at risk</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Squad board</CardTitle>
          <CardDescription>Who owns what and where risks sit.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {squads.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-full">No squads created yet</p>
          ) : (
            squads.map((squad) => (
              <div key={squad.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{squad.squad_name}</p>
                  <Badge variant={squad.risk === 'low' ? 'default' : squad.risk === 'medium' ? 'warning' : 'destructive'}>Risk: {squad.risk}</Badge>
                </div>
                <p className="text-sm text-gray-500">Owner: {squad.owner}</p>
                <p className="text-xs text-gray-400">{squad.task_count} tasks • Focus: {squad.focus || 'N/A'}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Task pipeline</CardTitle>
            <CardDescription>Real-time workflow board condensed into a table.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <Kanban className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">No tasks found</TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium text-gray-900">{task.id.slice(0, 8)}</TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>
                      <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'warning' : 'default'}>{task.priority}</Badge>
                    </TableCell>
                    <TableCell>{task.assigned_to_name || task.assigned_to || 'Unassigned'}</TableCell>
                    <TableCell>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</TableCell>
                    <TableCell>
                      <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in_progress' ? 'default' : 'secondary'}>{task.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Workstreams</CardTitle>
            <CardDescription>Macro initiatives with progress bars and next milestones.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => { resetWorkstreamForm(); setCreateWorkstreamOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" /> New workstream
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {workstreams.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-full">No workstreams created yet</p>
          ) : (
            workstreams.map((stream) => (
              <div key={stream.id} className="rounded-xl border border-gray-100 p-4">
                <p className="font-medium text-gray-900">{stream.label}</p>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>{stream.progress}% complete</span>
                    <span>{stream.blockers} blockers</span>
                  </div>
                  <Progress value={stream.progress} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Next: {stream.next_milestone || 'No milestone set'}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reminders & nudges</CardTitle>
            <CardDescription>Automations keep everyone accountable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reminders.length === 0 ? (
              <p className="text-sm text-gray-500">No active reminders</p>
            ) : (
              reminders.map((reminder) => (
                <div key={reminder.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={reminder.severity === 'destructive' ? 'destructive' : 'warning'}>Alert</Badge>
                    <p className="text-sm text-gray-700">{reminder.message}</p>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={handleSendDigest} disabled={digestSending || squads.length === 0}>
              <Send className="h-4 w-4 mr-2" /> {digestSending ? 'Sending...' : 'Send digest'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ownership calendar</CardTitle>
            <CardDescription>Upcoming deadlines that need executives looped in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.filter(t => t.due_date && new Date(t.due_date) >= new Date()).slice(0, 2).map((task) => (
              <div key={task.id} className="rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-500">{task.assigned_to_name || 'Unassigned'} • {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</p>
                </div>
                <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>{task.priority}</Badge>
              </div>
            ))}
            {tasks.filter(t => t.due_date && new Date(t.due_date) >= new Date()).length === 0 && (
              <p className="text-sm text-gray-500">No upcoming deadlines</p>
            )}
            <Button variant="ghost" size="sm" className="w-full" onClick={handleExportCalendar}>
              <CalendarClock className="h-4 w-4 mr-2" /> Export calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border p-4 text-sm transition-colors ${smartTriageEnabled ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-green-100 bg-green-50 text-green-900'}`}>
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5" />
          <p>{smartTriageEnabled ? 'Smart triage is active. Tasks will be auto-assigned based on workload, due dates, and skill tags.' : 'Enable "smart triage" to auto-assign tasks based on workload, due dates, and skill tags.'}</p>
        </div>
        <Button size="sm" onClick={handleEnableSmartTriage} variant={smartTriageEnabled ? 'secondary' : 'default'}>
          <Users className="h-4 w-4 mr-2" /> {smartTriageEnabled ? 'Disable smart triage' : 'Turn on smart triage'}
        </Button>
      </div>
    </div>
  )
}
export default TaskManagement;
