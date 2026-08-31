import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Mail, MessageSquare, Megaphone, Settings, Trash2, CheckCircle2, Filter, Loader2, AlertTriangle, RefreshCcw, ExternalLink, PlusSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../ui/use-toast';
import { getAuthFromStorage } from '../../lib/auth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'message' | 'system' | 'update';
  status: 'unread' | 'read';
  createdAt: string;
  actor?: string;
  actionLink?: string;
}

export function NotificationsDashboard() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const { toast } = useToast();

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuthFromStorage();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;
      
      const response = await fetch('/api/tenant/notifications', { headers });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      setNotifications(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading notifications.');
      // Mock data if API fails (for demo/development)
      setNotifications([
        { id: '1', title: 'System Maintenance', message: 'Scheduled maintenance this Saturday at 2:00 AM UTC.', type: 'system', status: 'unread', createdAt: new Date().toISOString() },
        { id: '2', title: 'New Fee Waiver Request', message: 'Lola Balogun submitted a fee waiver request for SS3.', type: 'alert', status: 'unread', createdAt: new Date(Date.now() - 3600000).toISOString(), actionLink: 'pending-approvals' },
        { id: '3', title: 'Teacher Message', message: 'Mr. Tunde sent a message regarding the upcoming mock exams.', type: 'message', status: 'read', createdAt: new Date(Date.now() - 86400000).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const convertToTask = (notification: Notification) => {
    toast({
      title: "Converted to Task",
      description: `Task "${notification.title}" has been added to your queue.`,
    });
    // In a real app, this would call the API to create a task
    markAsRead(notification.id);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return n.status === 'unread';
    return n.type === activeTab;
  });

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Notifications & tasks</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Notification Center</h1>
          <p className="text-sm text-gray-600">Manage your alerts, messages, and system updates.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchNotifications}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" /> Preferences
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-blue-900/60 font-medium">Unread</p>
              <p className="text-2xl font-bold text-blue-900">{notifications.filter(n => n.status === 'unread').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-amber-900/60 font-medium">Critical Alerts</p>
              <p className="text-2xl font-bold text-amber-900">{notifications.filter(n => n.type === 'alert').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50/50 border-purple-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-purple-900/60 font-medium">Messages</p>
              <p className="text-2xl font-bold text-purple-900">{notifications.filter(n => n.type === 'message').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-gray-100/80 p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
            <TabsTrigger value="unread" className="rounded-lg">Unread</TabsTrigger>
            <TabsTrigger value="alert" className="rounded-lg">Alerts</TabsTrigger>
            <TabsTrigger value="message" className="rounded-lg">Messages</TabsTrigger>
            <TabsTrigger value="system" className="rounded-lg">System</TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })))}>
            Mark all as read
          </Button>
        </div>

        <TabsContent value={activeTab} className="space-y-4 mt-0">
          {filteredNotifications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="h-64 flex flex-col items-center justify-center text-gray-500 gap-2">
                <Bell className="w-12 h-12 text-gray-300" />
                <p>No notifications found in this category.</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card key={notification.id} className={`group transition-all hover:shadow-md ${notification.status === 'unread' ? 'border-l-4 border-l-blue-600 bg-blue-50/10' : ''}`}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`p-2 rounded-lg mt-1 ${
                    notification.type === 'alert' ? 'bg-red-50 text-red-600' :
                    notification.type === 'message' ? 'bg-purple-50 text-purple-600' :
                    notification.type === 'system' ? 'bg-blue-50 text-blue-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {notification.type === 'alert' ? <AlertTriangle className="w-5 h-5" /> :
                     notification.type === 'message' ? <MessageSquare className="w-5 h-5" /> :
                     notification.type === 'system' ? <Settings className="w-5 h-5" /> :
                     <Bell className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-semibold ${notification.status === 'unread' ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 pt-2">
                      {notification.status === 'unread' && (
                        <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => markAsRead(notification.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as read
                        </Button>
                      )}
                      {notification.actionLink && (
                        <Button variant="ghost" size="sm" className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                          <ExternalLink className="w-4 h-4 mr-2" /> Take Action
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100" onClick={() => convertToTask(notification)}>
                        <PlusSquare className="w-4 h-4 mr-2" /> Convert to Task
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteNotification(notification.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6 mt-8">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-blue-100 rounded-2xl text-blue-600">
            <Megaphone className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-lg">Communication Hub</h3>
            <p className="text-blue-700/80 text-sm max-w-md">
              Need to send a broadcast to all parents or staff? Use the Communication Hub for bulk SMS and Email.
            </p>
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6">
          Send Broadcast
        </Button>
      </div>
    </div>
  );
}

export default NotificationsDashboard;
