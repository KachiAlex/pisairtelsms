import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Bell, 
  ClipboardCheck, 
  AlertTriangle, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  LayoutDashboard,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { getAuthFromStorage } from '../../lib/auth';

interface ActionItem {
  id: string;
  source: 'notification' | 'task' | 'approval' | 'system';
  title: string;
  subtitle: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  link: string;
}

export function UnifiedActionCenter({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [urgentItems, setUrgentItems] = useState<ActionItem[]>([]);
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    activeIncidents: 0,
    overdueTasks: 0,
    unreadNotifications: 0
  });

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuthFromStorage();
      const headers: Record<string, string> = {};
      if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

      const [approvalsRes, alertsRes, tasksRes, notifsRes] = await Promise.all([
        fetch('/api/tenant/approvals?limit=50', { headers }),
        fetch('/api/tenant/alerts?status=active', { headers }),
        fetch('/api/tenant/tasks?limit=50', { headers }),
        fetch('/api/tenant/notifications', { headers }),
      ]);

      const approvals = approvalsRes.ok ? (await approvalsRes.json()).data || [] : [];
      const alerts = alertsRes.ok ? (await alertsRes.json()).data || [] : [];
      const tasks = tasksRes.ok ? (await tasksRes.json()).data || [] : [];
      const notifications = notifsRes.ok ? (await notifsRes.json()).data || [] : [];

      const pendingApprovals = approvals.filter((a: any) => ['pending', 'in_review', 'escalated'].includes(a.status));
      const overdueTasks = tasks.filter((t: any) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date());
      const unread = notifications.filter((n: any) => n.status === 'unread');

      const items: ActionItem[] = [
        ...alerts.map((a: any): ActionItem => ({
          id: `alert-${a.id}`,
          source: 'system',
          title: a.title,
          subtitle: a.impact ? `Impact: ${a.impact}` : 'System alert',
          severity: a.severity === 'high' || a.severity === 'critical' ? 'high' : a.severity === 'medium' ? 'medium' : 'low',
          timestamp: a.created_at,
          link: 'system-alerts',
        })),
        ...pendingApprovals.map((a: any): ActionItem => ({
          id: `approval-${a.id}`,
          source: 'approval',
          title: `${a.type} (${a.requester || 'Unknown'})`,
          subtitle: a.sla_deadline && new Date(a.sla_deadline) < new Date() ? 'SLA breached' : `Status: ${a.status}`,
          severity: a.sla_deadline && new Date(a.sla_deadline) < new Date() ? 'high' : 'medium',
          timestamp: a.submitted_at,
          link: 'pending-approvals',
        })),
        ...overdueTasks.map((t: any): ActionItem => ({
          id: `task-${t.id}`,
          source: 'task',
          title: t.title,
          subtitle: `Overdue since ${new Date(t.due_date).toLocaleDateString()}`,
          severity: t.priority === 'high' ? 'high' : 'medium',
          timestamp: t.due_date,
          link: 'task-management',
        })),
        ...unread.slice(0, 5).map((n: any): ActionItem => ({
          id: `notif-${n.id}`,
          source: 'notification',
          title: n.title,
          subtitle: n.message?.slice(0, 80) || '',
          severity: 'low',
          timestamp: n.createdAt,
          link: 'notifications',
        })),
      ];

      setUrgentItems(items);
      setStats({
        pendingApprovals: pendingApprovals.length,
        activeIncidents: alerts.length,
        overdueTasks: overdueTasks.length,
        unreadNotifications: unread.length,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load action center data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <p className="text-xs uppercase tracking-widest text-blue-600 font-bold">Executive Command</p>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 font-heading tracking-tight">For You</h1>
          <p className="text-sm text-gray-600">Consolidated overview of everything requiring your attention today.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl border-gray-200" onClick={fetchSummary}>
            <TrendingUp className="h-4 w-4 mr-2 text-blue-600" /> Insights
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200">
            Quick Action <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Urgent Approvals', value: stats.pendingApprovals, icon: ClipboardCheck, color: 'blue', link: 'pending-approvals' },
          { label: 'System Incidents', value: stats.activeIncidents, icon: ShieldAlert, color: 'rose', link: 'system-alerts' },
          { label: 'Overdue Tasks', value: stats.overdueTasks, icon: Clock, color: 'amber', link: 'task-management' },
          { label: 'Unread Alerts', value: stats.unreadNotifications, icon: Bell, color: 'indigo', link: 'notifications' },
        ].map((item, idx) => (
          <Card key={idx} className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-none ring-1 ring-gray-100" onClick={() => onNavigate(item.link)}>
            <CardContent className="p-6">
              <div className={`p-3 w-fit rounded-2xl mb-4 bg-${item.color}-50 text-${item.color}-600 group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">{item.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{item.value}</span>
                <span className={`text-xs font-bold text-${item.color}-600`}>Required</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Critical Queue
              <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-[10px] animate-pulse">Action Needed</Badge>
            </h2>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50" onClick={() => onNavigate('notifications')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {urgentItems.length === 0 && !error && (
              <Card className="border-dashed">
                <CardContent className="h-32 flex flex-col items-center justify-center text-gray-500 gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p className="text-sm">You're all caught up. Nothing needs your attention.</p>
                </CardContent>
              </Card>
            )}
            {urgentItems.map((item) => (
              <Card key={item.id} className={`group border-l-4 transition-all hover:bg-gray-50/50 ${
                item.severity === 'high' ? 'border-l-rose-500' : 
                item.severity === 'medium' ? 'border-l-amber-500' : 'border-l-blue-500'
              }`}>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl ${
                      item.source === 'system' ? 'bg-rose-50 text-rose-600' :
                      item.source === 'approval' ? 'bg-blue-50 text-blue-600' :
                      item.source === 'task' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-600'
                    }`}>
                      {item.source === 'system' && <ShieldAlert className="w-5 h-5" />}
                      {item.source === 'approval' && <ClipboardCheck className="w-5 h-5" />}
                      {item.source === 'task' && <Clock className="w-5 h-5" />}
                      {item.source === 'notification' && <Bell className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{item.title}</h4>
                      <p className="text-sm text-gray-600 mt-0.5">{item.subtitle}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                          {item.source}
                        </Badge>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white hover:shadow-md" onClick={() => onNavigate(item.link)}>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Queue Summary</h2>
          <Card className="border-none ring-1 ring-gray-100 shadow-sm">
            <CardContent className="p-6 space-y-4">
              {[
                { label: 'Pending approvals', value: stats.pendingApprovals, link: 'pending-approvals' },
                { label: 'Active incidents', value: stats.activeIncidents, link: 'system-alerts' },
                { label: 'Overdue tasks', value: stats.overdueTasks, link: 'task-management' },
                { label: 'Unread notifications', value: stats.unreadNotifications, link: 'notifications' },
              ].map((row) => (
                <button
                  key={row.label}
                  onClick={() => onNavigate(row.link)}
                  className="w-full flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">{row.label}</span>
                  <span className={`text-lg font-bold ${row.value > 0 ? 'text-gray-900' : 'text-gray-300'}`}>{row.value}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default UnifiedActionCenter;
