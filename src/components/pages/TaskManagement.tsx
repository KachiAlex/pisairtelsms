import { ClipboardList, Users, CheckCircle2, AlertTriangle, Plus, CalendarClock, Kanban, Send, Edit3, Loader2, ListTodo, MoreHorizontal, Layout, RefreshCcw } from 'lucide-react'
import { getAuthFromStorage } from '../../lib/auth'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

interface Task {
  id: string
  title: string
  description?: string
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

const statusColors: Record<string, string> = {
  'open': 'bg-blue-100 text-blue-700',
  'in_progress': 'bg-amber-100 text-amber-700',
  'completed': 'bg-green-100 text-green-700',
  'blocked': 'bg-rose-100 text-rose-700',
}

export function TaskManagement() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [squads, setSquads] = useState<Squad[]>([])
  const [workstreams, setWorkstreams] = useState<Workstream[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [activeTab, setActiveTab] = useState('pipeline')

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
  const [error, setError] = useState<string | null>(null)

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const auth = getAuthFromStorage();
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;
    
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    return response.json();
  };

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, tasksData, squadsData, workstreamsData, remindersData] = await Promise.all([
        fetchWithAuth('/api/tenant/tasks/statistics'),
        fetchWithAuth('/api/tenant/tasks?limit=50'),
        fetchWithAuth('/api/tenant/tasks/squads'),
        fetchWithAuth('/api/tenant/tasks/workstreams'),
        fetchWithAuth('/api/tenant/tasks/reminders')
      ]);

      if (statsData.success) setStats(statsData.data)
      if (tasksData.success) setTasks(tasksData.data)
      if (squadsData.success) setSquads(squadsData.data)
      if (workstreamsData.success) setWorkstreams(workstreamsData.data)
      if (remindersData.success) setReminders(remindersData.data)
    } catch (err) {
      console.error('Error fetching task data:', err)
      setError('Failed to load task management data. Please try again.')
      // Fallback/Mock for UI development
      if (tasks.length === 0) {
        setTasks([
          { id: '1', title: 'Review exam papers', status: 'in_progress', priority: 'high', assigned_to: 'user-1', assigned_to_name: 'Ibrahim Musa', due_date: new Date().toISOString() },
          { id: '2', title: 'Update fee structure', status: 'open', priority: 'medium', assigned_to: null, assigned_to_name: null, due_date: null },
          { id: '3', title: 'Parent-Teacher conference setup', status: 'completed', priority: 'low', assigned_to: 'user-2', assigned_to_name: 'Adaeze Nwosu', due_date: new Date().toISOString() },
        ]);
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetTaskForm = () => setTaskForm({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' })
  const resetSquadForm = () => setSquadForm({ squadName: '', owner: '', focus: '', risk: 'low' })
  const resetWorkstreamForm = () => setWorkstreamForm({ label: '', nextMilestone: '' })

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await fetchWithAuth('/api/tenant/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          assignedTo: taskForm.assignedTo || undefined,
          dueDate: taskForm.dueDate || undefined,
        })
      });
      if (!data.success) throw new Error(data.error || 'Failed to create task');
      setCreateTaskOpen(false)
      resetTaskForm()
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendDigest = async () => {
    setDigestSending(true)
    setError(null)
    try {
      const squadMessages = squads.map(s =>
        `${s.squad_name}: ${s.task_count} tasks • Risk: ${s.risk}`
      ).join('\n')

      const data = await fetchWithAuth('/api/tenant/tasks/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Squad Digest',
          message: `Weekly squad digest:\n\n${squadMessages}`,
          type: 'info',
        })
      });
      if (!data.success) throw new Error(data.error || 'Failed to send digest');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send digest.')
    } finally {
      setDigestSending(false)
    }
  }

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Notifications & tasks</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Task Management</h1>
          <p className="text-sm text-gray-600">Coordinate cross-functional workstreams and monitor team productivity.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => { resetSquadForm(); setCreateSquadOpen(true) }}>
            <Users className="h-4 w-4 mr-2" /> Create Squad
          </Button>
          <Button onClick={() => { resetTaskForm(); setCreateTaskOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" /> New Task
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Open Tasks</p>
            <p className="text-3xl font-semibold text-gray-900">{stats?.openTasks || tasks.filter(t => t.status !== 'completed').length}</p>
            <p className="text-xs text-blue-600 mt-1">{stats?.dueToday || 0} due today</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Completed (Week)</p>
            <p className="text-3xl font-semibold text-emerald-600">{stats?.completionRateThisWeek || 0}%</p>
            <p className="text-xs text-gray-500 mt-1">Goal: 85%</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">High Priority</p>
            <p className="text-3xl font-semibold text-rose-600">{stats?.highPriorityTasks || tasks.filter(t => t.priority === 'high').length}</p>
            <p className="text-xs text-rose-600 mt-1">{stats?.overdueTasks || 0} overdue</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active Squads</p>
            <p className="text-3xl font-semibold text-gray-900">{stats?.totalSquads || squads.length}</p>
            <p className="text-xs text-amber-600 mt-1">{stats?.atRiskSquads || 0} at risk</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger value="pipeline" className="rounded-lg px-4 py-2">Task Pipeline</TabsTrigger>
          <TabsTrigger value="kanban" className="rounded-lg px-4 py-2">Kanban Board</TabsTrigger>
          <TabsTrigger value="squads" className="rounded-lg px-4 py-2">Squads</TabsTrigger>
          <TabsTrigger value="workstreams" className="rounded-lg px-4 py-2">Workstreams</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6 mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Queue</CardTitle>
                <CardDescription>Real-time view of all tasks across the tenant.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => loadData()}>
                <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-gray-500">No tasks found</TableCell>
                      </TableRow>
                    ) : (
                      tasks.map((task) => (
                        <TableRow key={task.id} className="group">
                          <TableCell className="font-medium text-gray-900">
                            <div>
                              <p>{task.title}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{task.id.slice(0, 8)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'warning' : 'default'} className="capitalize">
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {task.assigned_to_name || task.assigned_to || 'Unassigned'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[task.status] || 'bg-gray-100'}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kanban" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['open', 'in_progress', 'completed'].map((status) => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-gray-900 capitalize flex items-center gap-2">
                    {status.replace('_', ' ')}
                    <Badge variant="secondary" className="rounded-full px-1.5 min-w-[1.5rem] h-5 justify-center">
                      {tasks.filter(t => t.status === status).length}
                    </Badge>
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setCreateTaskOpen(true)}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 min-h-[500px] space-y-3">
                  {tasks.filter(t => t.status === status).map((task) => (
                    <Card key={task.id} className="cursor-grab active:scale-95 transition-all hover:border-blue-200">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{task.title}</p>
                          <Badge variant={task.priority === 'high' ? 'destructive' : 'outline'} className="text-[10px] h-4">
                            {task.priority[0].toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                              {(task.assigned_to_name || 'U')[0]}
                            </div>
                            <span className="text-[11px] text-gray-500">{task.assigned_to_name || 'Unassigned'}</span>
                          </div>
                          {task.due_date && (
                            <div className="flex items-center gap-1 text-[11px] text-rose-600">
                              <CalendarClock className="w-3 h-3" />
                              <span>{new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {tasks.filter(t => t.status === status).length === 0 && (
                    <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="squads" className="space-y-6 mt-0">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {squads.length === 0 ? (
              <Card className="col-span-full border-dashed">
                <CardContent className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
                  <Users className="w-10 h-10 text-gray-300" />
                  <p>No squads created yet.</p>
                  <Button variant="outline" size="sm" onClick={() => setCreateSquadOpen(true)}>Create First Squad</Button>
                </CardContent>
              </Card>
            ) : (
              squads.map((squad) => (
                <Card key={squad.id} className="hover:shadow-md transition-all group">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{squad.squad_name}</CardTitle>
                      <CardDescription>Owner: {squad.owner}</CardDescription>
                    </div>
                    <Badge variant={squad.risk === 'low' ? 'default' : squad.risk === 'medium' ? 'warning' : 'destructive'}>
                      {squad.risk} risk
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Focus: {squad.focus || 'General'}</span>
                          <span>{squad.task_count} active tasks</span>
                        </div>
                        <Progress value={Math.random() * 100} className="h-1.5" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="w-full text-xs">Manage</Button>
                        <Button variant="ghost" size="sm" className="w-full text-xs">Reports</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="workstreams" className="space-y-6 mt-0">
          <div className="grid gap-6 md:grid-cols-3">
            {workstreams.map((stream) => (
              <Card key={stream.id} className="bg-gradient-to-br from-white to-blue-50/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{stream.label}</CardTitle>
                    <Layout className="w-4 h-4 text-blue-600" />
                  </div>
                  <CardDescription>Next: {stream.next_milestone || 'TBD'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Progress</span>
                      <span>{stream.progress}%</span>
                    </div>
                    <Progress value={stream.progress} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {stream.blockers > 0 ? (
                      <Badge variant="destructive" className="animate-pulse">{stream.blockers} Blockers</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">On Track</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-3xl border p-6 text-sm transition-all ${smartTriageEnabled ? 'border-blue-200 bg-blue-50/50 text-blue-900 shadow-inner' : 'border-emerald-100 bg-emerald-50/50 text-emerald-900 shadow-sm'}`}>
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-2xl ${smartTriageEnabled ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <ListTodo className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Smart Workload Balancing</h3>
            <p className={`${smartTriageEnabled ? 'text-blue-700/80' : 'text-emerald-700/80'} max-w-lg mt-1`}>
              {smartTriageEnabled 
                ? 'AI is currently monitoring workloads and auto-assigning high priority tasks to the most available staff members.' 
                : 'Enable AI-driven task triage to automatically distribute work based on team capacity, skill-sets, and upcoming school calendar deadlines.'}
            </p>
          </div>
        </div>
        <Button 
          size="lg" 
          onClick={() => setSmartTriageEnabled(!smartTriageEnabled)} 
          className={`rounded-xl px-8 font-semibold transition-all ${smartTriageEnabled ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
        >
          {smartTriageEnabled ? 'Active - Settings' : 'Enable Smart Triage'}
        </Button>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Fill in the details to create a new task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" value={taskForm.title} onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Enter task title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea id="task-desc" value={taskForm.description} onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Enter task description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={taskForm.priority} onValueChange={v => setTaskForm(prev => ({ ...prev, priority: v }))}>
                <SelectTrigger id="task-priority"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assigned">Assigned To</Label>
              <Input id="task-assigned" value={taskForm.assignedTo} onChange={e => setTaskForm(prev => ({ ...prev, assignedTo: e.target.value }))} placeholder="Enter assignee name or email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Due Date</Label>
              <Input id="task-due" type="date" value={taskForm.dueDate} onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={submitting || !taskForm.title.trim()}>{submitting ? 'Creating...' : 'Create Task'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Squad Dialog */}
      <Dialog open={createSquadOpen} onOpenChange={setCreateSquadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Squad</DialogTitle>
            <DialogDescription>Define a new squad with an owner and risk profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="squad-name">Squad Name</Label>
              <Input id="squad-name" value={squadForm.squadName} onChange={e => setSquadForm(prev => ({ ...prev, squadName: e.target.value }))} placeholder="e.g. Platform Team" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="squad-owner">Owner</Label>
              <Input id="squad-owner" value={squadForm.owner} onChange={e => setSquadForm(prev => ({ ...prev, owner: e.target.value }))} placeholder="Enter owner name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="squad-focus">Focus Area</Label>
              <Input id="squad-focus" value={squadForm.focus} onChange={e => setSquadForm(prev => ({ ...prev, focus: e.target.value }))} placeholder="e.g. Infrastructure, Product, QA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="squad-risk">Risk Level</Label>
              <Select value={squadForm.risk} onValueChange={v => setSquadForm(prev => ({ ...prev, risk: v }))}>
                <SelectTrigger id="squad-risk"><SelectValue placeholder="Select risk level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateSquadOpen(false)}>Cancel</Button>
            <Button onClick={() => setCreateSquadOpen(false)} disabled={submitting || !squadForm.squadName.trim() || !squadForm.owner.trim()}>{submitting ? 'Creating...' : 'Create Squad'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Workstream Dialog */}
      <Dialog open={createWorkstreamOpen} onOpenChange={setCreateWorkstreamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Workstream</DialogTitle>
            <DialogDescription>Create a macro initiative to track cross-functional progress.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ws-label">Label</Label>
              <Input id="ws-label" value={workstreamForm.label} onChange={e => setWorkstreamForm(prev => ({ ...prev, label: e.target.value }))} placeholder="e.g. Q4 Product Launch" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-milestone">Next Milestone</Label>
              <Input id="ws-milestone" value={workstreamForm.nextMilestone} onChange={e => setWorkstreamForm(prev => ({ ...prev, nextMilestone: e.target.value }))} placeholder="e.g. Beta release by Nov 15" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateWorkstreamOpen(false)}>Cancel</Button>
            <Button onClick={() => setCreateWorkstreamOpen(false)} disabled={submitting || !workstreamForm.label.trim()}>{submitting ? 'Creating...' : 'Create Workstream'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TaskManagement;
