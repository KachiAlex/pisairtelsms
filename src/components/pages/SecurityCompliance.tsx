import { Shield, ShieldCheck, Lock, Activity, AlertTriangle, RefreshCcw, Loader2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { getAuthFromStorage } from '../../lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';

interface SecurityOverview {
  activeSessions: number;
  privilegedIdentities: number;
  mfaCoverage: number;
  encryptionCoverage: number;
  criticalAlerts: number;
  pendingReviews: number;
  backupSuccessRate: number;
  complianceTasks: number;
}

const complianceFrameworks = [
  {
    id: 'iso27001',
    name: 'ISO/IEC 27001',
    description: 'Information security management systems',
    progress: 82,
    controls: 114,
    implemented: 93,
    status: 'In Progress'
  },
  {
    id: 'gdpr',
    name: 'GDPR',
    description: 'General Data Protection Regulation',
    progress: 95,
    controls: 99,
    implemented: 94,
    status: 'Compliant'
  },
  {
    id: 'nist',
    name: 'NIST CSF',
    description: 'Cybersecurity Framework',
    progress: 68,
    controls: 108,
    implemented: 73,
    status: 'Action Required'
  }
];

export function SecurityCompliance() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchWithAuth = async (url: string) => {
    const auth = getAuthFromStorage();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch data');
    return response.json();
  };

  const loadOverview = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchWithAuth('/api/tenant/security/overview');
      setOverview(data.data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load security overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="text-gray-700 font-medium">Failed to load security data</p>
        <p className="text-sm text-gray-500">{loadError}</p>
        <button
          onClick={loadOverview}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Security & compliance</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Security Posture</h1>
          <p className="text-sm text-gray-600">Monitor access control, encryption, and global compliance standards.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadOverview}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button>
            <ShieldCheck className="h-4 w-4 mr-2" /> Compliance Audit
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="frameworks" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Compliance Frameworks</TabsTrigger>
          <TabsTrigger value="incidents" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Active Sessions</p>
                    <p className="text-3xl font-semibold text-gray-900">{overview?.activeSessions || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Privileged Roles</p>
                    <p className="text-3xl font-semibold text-gray-900">{overview?.privilegedIdentities || 0}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">MFA Coverage</p>
                    <p className="text-3xl font-semibold text-gray-900">{overview?.mfaCoverage || 0}%</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl text-green-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Encryption</p>
                    <p className="text-3xl font-semibold text-gray-900">{overview?.encryptionCoverage || 0}%</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-l-4 border-l-red-500 bg-red-50/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Security Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">{overview?.criticalAlerts || 0} Critical</p>
                    <Button variant="link" className="p-0 h-auto text-xs text-red-600 hover:text-red-700" onClick={() => navigate('/tenant/incident-management')}>
                      View response queue →
                    </Button>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl text-red-600">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 bg-amber-50/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Access Reviews</p>
                    <p className="text-2xl font-bold text-gray-900">{overview?.pendingReviews || 0} Pending</p>
                    <Button variant="link" className="p-0 h-auto text-xs text-amber-600 hover:text-amber-700" onClick={() => navigate('/tenant/access-control')}>
                      Launch review cycle →
                    </Button>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                    <Shield className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Quick Actions</CardTitle>
              <CardDescription>Direct management of security subsystems.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="h-auto py-6 flex flex-col gap-3 rounded-2xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all group" onClick={() => navigate('/tenant/access-control')}>
                  <Shield className="w-8 h-8 text-gray-400 group-hover:text-blue-600" />
                  <div className="text-center">
                    <span className="block font-semibold">Access Control</span>
                    <span className="text-xs text-gray-500 group-hover:text-blue-500">RBAC & MFA Policies</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto py-6 flex flex-col gap-3 rounded-2xl hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700 transition-all group" onClick={() => navigate('/tenant/session-management')}>
                  <Activity className="w-8 h-8 text-gray-400 group-hover:text-sky-600" />
                  <div className="text-center">
                    <span className="block font-semibold">Sessions</span>
                    <span className="text-xs text-gray-500 group-hover:text-sky-500">Anomaly Detection</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto py-6 flex flex-col gap-3 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all group" onClick={() => navigate('/tenant/data-encryption')}>
                  <Lock className="w-8 h-8 text-gray-400 group-hover:text-indigo-600" />
                  <div className="text-center">
                    <span className="block font-semibold">Encryption</span>
                    <span className="text-xs text-gray-500 group-hover:text-indigo-500">Key Management</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto py-6 flex flex-col gap-3 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all group" onClick={() => navigate('/tenant/backup-restore')}>
                  <RefreshCcw className="w-8 h-8 text-gray-400 group-hover:text-emerald-600" />
                  <div className="text-center">
                    <span className="block font-semibold">Backups</span>
                    <span className="text-xs text-gray-500 group-hover:text-emerald-500">Disaster Recovery</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frameworks" className="space-y-6">
          <div className="grid gap-6">
            {complianceFrameworks.map((fw) => (
              <Card key={fw.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{fw.name}</CardTitle>
                      <CardDescription>{fw.description}</CardDescription>
                    </div>
                    <Badge variant={fw.status === 'Compliant' ? 'default' : fw.status === 'In Progress' ? 'secondary' : 'destructive'}>
                      {fw.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Implementation Progress</span>
                    <span className="font-semibold text-blue-600">{fw.progress}%</span>
                  </div>
                  <Progress value={fw.progress} className="h-2" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    <div className="space-y-1 text-center border-r">
                      <p className="text-xs text-gray-500 uppercase">Total Controls</p>
                      <p className="text-lg font-bold">{fw.controls}</p>
                    </div>
                    <div className="space-y-1 text-center border-r">
                      <p className="text-xs text-gray-500 uppercase">Implemented</p>
                      <p className="text-lg font-bold text-green-600">{fw.implemented}</p>
                    </div>
                    <div className="space-y-1 text-center border-r">
                      <p className="text-xs text-gray-500 uppercase">Gap Analysis</p>
                      <p className="text-lg font-bold text-amber-600">{fw.controls - fw.implemented}</p>
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-xs text-gray-500 uppercase">Next Review</p>
                      <p className="text-lg font-bold">Mar 2026</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" size="sm">Download Evidence</Button>
                    <Button size="sm">Self-Assessment</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incident Response Queue</CardTitle>
              <CardDescription>Track and resolve security events in real-time.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: 'INC-2026-001', title: 'Brute force attempt detected', severity: 'High', status: 'Active', time: '10 mins ago', actor: 'System' },
                  { id: 'INC-2026-002', title: 'Unauthorized file access attempt', severity: 'Critical', status: 'Triage', time: '45 mins ago', actor: 'System' },
                  { id: 'INC-2026-003', title: 'Bulk data export initiated', severity: 'Medium', status: 'Review', time: '2 hours ago', actor: 'Adaeze Nwosu' }
                ].map((inc) => (
                  <div key={inc.id} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${inc.severity === 'Critical' ? 'bg-red-50 text-red-600' : inc.severity === 'High' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{inc.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="font-mono">{inc.id}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {inc.time}</span>
                          <span>Actor: {inc.actor}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={inc.status === 'Active' ? 'destructive' : 'secondary'}>{inc.status}</Badge>
                      <Button variant="outline" size="sm" onClick={() => navigate('/tenant/incident-management')}>Manage</Button>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-gray-500 text-sm">View incident archive →</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* GDPR / Privacy Banner */}
      <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-100 rounded-2xl text-indigo-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 text-lg">Global Data Privacy</h3>
            <p className="text-indigo-700/80 text-sm max-w-md">
              Manage GDPR Right to Erasure, data portability, and regional residency settings for international students.
            </p>
          </div>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6" onClick={() => navigate('/tenant/privacy-center')}>
          Privacy Center
        </Button>
      </div>
    </div>
  );
}

export default SecurityCompliance;
