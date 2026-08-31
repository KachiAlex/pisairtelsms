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
  const [urgentItems, setUrgentItems] = useState<ActionItem[]>([]);
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    activeIncidents: 0,
    overdueTasks: 0,
    unreadNotifications: 0
  });

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const auth = getAuthFromStorage();
      const headers = { 'Authorization': `Bearer ${auth?.token}` };
      
      // In a real app, this might be a single "summary" endpoint
      // For now, we'll mock the aggregated response
      setTimeout(() => {
        setUrgentItems([
          {
            id: '1',
            source: 'system',
            title: 'Database Latency Spike',
            subtitle: 'Impact: Admin Portal login slowdowns',
            severity: 'high',
            timestamp: new Date().toISOString(),
            link: 'system-alerts'
          },
          {
            id: '2',
            source: 'approval',
            title: 'SS3 Fee Waiver (Lola Balogun)',
            subtitle: 'SLA Breach in 45 mins',
            severity: 'high',
            timestamp: new Date().toISOString(),
            link: 'pending-approvals'
          },
          {
            id: '3',
            source: 'task',
            title: 'Review Mock Exam Results',
            subtitle: 'Assigned to: Ibrahim Musa',
            severity: 'medium',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            link: 'task-management'
          },
          {
            id: '4',
            source: 'notification',
            title: 'New Staff Onboarding',
            subtitle: 'Mr. Tunde joined the Science Dept',
            severity: 'low',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            link: 'notifications'
          }
        ]);
        setStats({
          pendingApprovals: 12,
          activeIncidents: 2,
          overdueTasks: 5,
          unreadNotifications: 8
        });
        setLoading(false);
      }, 800);
    } catch (err) {
      console.error(err);
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

          <div className="space-y-4">
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
          <h2 className="text-xl font-bold text-gray-900">Today's Progress</h2>
          <Card className="border-none ring-1 ring-gray-100 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-700">Daily Goal Completion</span>
                  <span className="text-blue-600">68%</span>
                </div>
                <Progress value={68} className="h-2 bg-blue-50" />
                <p className="text-xs text-gray-500">14/22 priority items resolved.</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Team Health</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Staff Capacity</span>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-none">Optimal</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <LayoutDashboard className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">API Uptime</span>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border-none">99.98%</Badge>
                </div>
              </div>

              <div className="pt-6">
                <div className="rounded-2xl bg-gray-900 p-6 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h5 className="font-bold text-lg mb-2">Smart Insights</h5>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                      Based on current velocity, all high-priority tasks will be resolved by 4:00 PM.
                    </p>
                    <Button size="sm" className="w-full bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-bold">
                      Analyze Rota
                    </Button>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap className="w-24 h-24 text-blue-400" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default UnifiedActionCenter;
