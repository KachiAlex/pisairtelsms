import { ClipboardCheck, ShieldCheck, Timer, AlertTriangle, Filter, CheckCircle2, CalendarClock, Loader2, UserCheck, BarChart3, RefreshCcw, XCircle, MoreHorizontal } from 'lucide-react'
import { getAuthFromStorage } from '../../lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

interface ApprovalStream {
  id: string
  surface: string
  owner: string
  sla_hours: number
  risk: string
  pending: number
}

interface ApprovalRequest {
  id: string
  type: string
  requester: string
  submitted_at: string
  sla_deadline: string | null
  status: string
  description?: string
}

interface SlaBreach {
  id: string
  label: string
  owner: string
  severity: string
}

interface ReviewerWorkload {
  id: string
  reviewer: string
  pending_count: number
  eta: string | null
}

interface ApprovalStats {
  itemsAwaitingAction: number
  withinSla: number
  escalationsOpen: number
  fastestStream: string
  avgTurnaround: string
}

const statusColors: Record<string, string> = {
  'In review': 'bg-blue-100 text-blue-700',
  'Pending finance': 'bg-purple-100 text-purple-700',
  'Escalated': 'bg-rose-100 text-rose-700',
  'Queued': 'bg-gray-100 text-gray-700',
  'approved': 'bg-emerald-100 text-emerald-700',
}

export function PendingApprovals() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ApprovalStats | null>(null)
  const [streams, setStreams] = useState<ApprovalStream[]>([])
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [breaches, setBreaches] = useState<SlaBreach[]>([])
  const [workloads, setWorkloads] = useState<ReviewerWorkload[]>([])
  const [activeTab, setActiveTab] = useState('queue')
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
      const [statsData, streamsData, requestsData, breachesData, workloadsData] = await Promise.all([
        fetchWithAuth('/api/tenant/approvals/statistics'),
        fetchWithAuth('/api/tenant/approvals/streams'),
        fetchWithAuth('/api/tenant/approvals?limit=50'),
        fetchWithAuth('/api/tenant/approvals/breaches'),
        fetchWithAuth('/api/tenant/approvals/workloads')
      ]);

      if (statsData.success) setStats(statsData.data)
      if (streamsData.success) setStreams(streamsData.data)
      if (requestsData.success) setRequests(requestsData.data)
      if (breachesData.success) setBreaches(breachesData.data)
      if (workloadsData.success) setWorkloads(workloadsData.data)
    } catch (err) {
      console.error('Error fetching approval data:', err)
      setError('Failed to load approval queues. Please try again.')
      // Mock data for UI development
      if (requests.length === 0) {
        setRequests([
          { id: 'APP-001', type: 'Fee Waiver', requester: 'Lola Balogun', submitted_at: new Date().toISOString(), sla_deadline: new Date(Date.now() + 86400000).toISOString(), status: 'In review', description: 'SS3 Mock exam fee waiver for merit student.' },
          { id: 'APP-002', type: 'Leave Request', requester: 'Tunde Ajayi', submitted_at: new Date().toISOString(), sla_deadline: null, status: 'Queued', description: 'Annual leave request for April.' },
        ]);
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading && requests.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Pending Approvals</h1>
          <p className="text-sm text-gray-600">Review and authorize administrative, financial, and academic requests.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" /> Filter Queue
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <ClipboardCheck className="h-4 w-4 mr-2" /> Bulk Action
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Awaiting Action</p>
            <p className="text-3xl font-semibold text-gray-900">{stats?.itemsAwaitingAction || requests.length}</p>
            <p className="text-xs text-blue-600 mt-1">Updated real-time</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Within SLA</p>
            <p className="text-3xl font-semibold text-emerald-600">{stats?.withinSla || 94}%</p>
            <p className="text-xs text-gray-500 mt-1">Target: 98%</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Escalations</p>
            <p className="text-3xl font-semibold text-rose-600">{stats?.escalationsOpen || 0}</p>
            <p className="text-xs text-rose-600 mt-1">Requires leadership</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Avg. Turnaround</p>
            <p className="text-3xl font-semibold text-gray-900">{stats?.avgTurnaround || '4.2h'}</p>
            <p className="text-xs text-gray-500 mt-1">Across all streams</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger value="queue" className="rounded-lg px-4 py-2">Approval Queue</TabsTrigger>
          <TabsTrigger value="streams" className="rounded-lg px-4 py-2">Stream Analytics</TabsTrigger>
          <TabsTrigger value="workload" className="rounded-lg px-4 py-2">Reviewer Workload</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-6 mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Decision Queue</CardTitle>
                <CardDescription>Items prioritized by submission time and SLA risk.</CardDescription>
              </div>
              <Button variant="ghost" size="sm"><Timer className="w-4 h-4 mr-2" /> SLA Timeline</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>SLA Deadline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-gray-500">No pending approvals</TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <TableRow key={request.id} className="group cursor-pointer hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-medium text-gray-900">
                            <div>
                              <p className="line-clamp-1">{request.description || request.type}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{request.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{request.type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{request.requester}</TableCell>
                          <TableCell>
                            {request.sla_deadline ? (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                                <Timer className="w-3.5 h-3.5" />
                                <span>{new Date(request.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[request.status] || 'bg-gray-100'}`}>
                              {request.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"><XCircle className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 text-gray-400"><MoreHorizontal className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {breaches.length > 0 && (
            <Card className="border-rose-200 bg-rose-50/10">
              <CardHeader>
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="w-5 h-5" />
                  <CardTitle className="text-lg">Critical SLA Breaches</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {breaches.map((breach) => (
                  <div key={breach.id} className="p-4 bg-white border border-rose-100 rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-bold text-gray-900">{breach.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Owner: {breach.owner}</p>
                    </div>
                    <Badge variant="destructive">P0</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="streams" className="space-y-6 mt-0">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {streams.map((stream) => (
              <Card key={stream.id} className="hover:border-blue-200 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{stream.surface}</CardTitle>
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                  </div>
                  <CardDescription>SLA: {stream.sla_hours} hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold text-gray-900">{stream.pending}</p>
                      <Badge variant={stream.risk === 'low' ? 'default' : 'warning'}>{stream.risk} risk</Badge>
                    </div>
                    <div className="pt-2 border-t text-xs text-gray-500">
                      Primary Reviewer: <span className="text-gray-900 font-medium">{stream.owner}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="workload" className="space-y-6 mt-0">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workloads.map((wl) => (
              <Card key={wl.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{wl.reviewer}</CardTitle>
                      <CardDescription>Senior Approver</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Queue Depth</span>
                    <span className="font-bold">{wl.pending_count} items</span>
                  </div>
                  <Progress value={(wl.pending_count / 10) * 100} className="h-1.5" />
                  <div className="flex justify-between items-center text-xs pt-2">
                    <span className="text-gray-500">Current ETA</span>
                    <Badge variant="secondary">{wl.eta || 'Ready'}</Badge>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">Reassign Items</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-amber-100 rounded-2xl text-amber-600">
            <CalendarClock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 text-lg leading-tight">Monthly Compliance Certification</h3>
            <p className="text-amber-800/80 text-sm max-w-md mt-1">
              Monthly audit window begins in <span className="font-bold">3 days</span>. ISO 27001 requires all access requests to be certified with comments.
            </p>
          </div>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-6">
          Review Audit Pack
        </Button>
      </div>
    </div>
  )
}

export default PendingApprovals;
