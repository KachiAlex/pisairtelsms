import { useState, useEffect } from 'react';
import { LogOut, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';

interface Session {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
}

interface SessionPolicy {
  timeoutMinutes: number;
  maxSessions: number;
}

interface SessionHistoryEntry {
  id: string;
  sessionId: string;
  userId: string;
  action: string;
  ipAddress: string | null;
  deviceInfo: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [policy, setPolicy] = useState<SessionPolicy>({ timeoutMinutes: 30, maxSessions: 5 });
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [policyForm, setPolicyForm] = useState<SessionPolicy>({ timeoutMinutes: 30, maxSessions: 5 });
  const [activeTab, setActiveTab] = useState<'sessions' | 'policy' | 'history'>('sessions');

  useEffect(() => {
    fetchSessions();
    fetchPolicy();
    fetchHistory();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tenant/security/sessions', {
        headers: { 'x-tenant-id': 'default-tenant', 'x-user-id': 'current-user' },
      });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      setSessions(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicy = async () => {
    try {
      const response = await fetch('/api/tenant/security/sessions/policy', {
        headers: { 'x-tenant-id': 'default-tenant', 'x-user-id': 'current-user' },
      });
      if (!response.ok) throw new Error('Failed to fetch session policy');
      const data = await response.json();
      setPolicy(data.data);
      setPolicyForm(data.data);
    } catch (err) {
      console.error('Failed to fetch session policy:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/tenant/security/sessions/history', {
        headers: { 'x-tenant-id': 'default-tenant', 'x-user-id': 'current-user' },
      });
      if (!response.ok) throw new Error('Failed to fetch session history');
      const data = await response.json();
      setHistory(data.data || []);
    } catch (err) {
      console.error('Failed to fetch session history:', err);
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/tenant/security/sessions/${sessionId}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'default-tenant',
          'x-user-id': 'current-user',
        },
        body: JSON.stringify({ reason: 'Force logout by admin' }),
      });
      if (!response.ok) throw new Error('Failed to logout session');
      fetchSessions();
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout session');
    }
  };

  const handleSavePolicy = async () => {
    try {
      setError(null);
      const response = await fetch('/api/tenant/security/sessions/policy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'default-tenant',
          'x-user-id': 'current-user',
        },
        body: JSON.stringify(policyForm),
      });
      if (!response.ok) throw new Error('Failed to save session policy');
      const data = await response.json();
      setPolicy(data.data);
      setPolicyForm(data.data);
      setEditingPolicy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session policy');
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'force_logout': return 'bg-red-100 text-red-800';
      case 'policy_update': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {(['sessions', 'policy', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'sessions' ? 'Active Sessions' : tab === 'policy' ? 'Session Policy' : 'History'}
          </button>
        ))}
      </div>

      {/* Active Sessions Tab */}
      {activeTab === 'sessions' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Sessions</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchSessions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No active sessions</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Device</th>
                      <th className="text-left py-3 px-4 font-medium">IP Address</th>
                      <th className="text-left py-3 px-4 font-medium">Last Activity</th>
                      <th className="text-left py-3 px-4 font-medium">Expires In</th>
                      <th className="text-left py-3 px-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(session => (
                      <tr key={session.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium">{session.deviceInfo || 'Unknown Device'}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {session.userAgent?.substring(0, 60)}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{session.ipAddress || '—'}</td>
                        <td className="py-3 px-4 text-xs">{formatDate(session.lastActivity)}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{getTimeRemaining(session.expiresAt)}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLogoutSession(session.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session Policy Tab */}
      {activeTab === 'policy' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Session Policy</CardTitle>
            {!editingPolicy && (
              <Button variant="outline" size="sm" onClick={() => setEditingPolicy(true)}>
                Edit Policy
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingPolicy ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={5}
                    max={1440}
                    value={policyForm.timeoutMinutes}
                    onChange={e =>
                      setPolicyForm({ ...policyForm, timeoutMinutes: parseInt(e.target.value) })
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Between 5 and 1440 minutes</p>
                </div>
                <div>
                  <Label htmlFor="maxSessions">Maximum Sessions Per User</Label>
                  <Input
                    id="maxSessions"
                    type="number"
                    min={1}
                    max={100}
                    value={policyForm.maxSessions}
                    onChange={e =>
                      setPolicyForm({ ...policyForm, maxSessions: parseInt(e.target.value) })
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Between 1 and 100 sessions</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSavePolicy} className="bg-blue-600 hover:bg-blue-700">
                    Save Policy
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setEditingPolicy(false); setPolicyForm(policy); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Session Timeout</span>
                  <span className="text-sm text-gray-600">{policy.timeoutMinutes} minutes</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Maximum Sessions</span>
                  <span className="text-sm text-gray-600">{policy.maxSessions} sessions</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Session History
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchHistory}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No session history available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Action</th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">IP Address</th>
                      <th className="text-left py-3 px-4 font-medium">Device</th>
                      <th className="text-left py-3 px-4 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(entry => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionBadgeColor(entry.action)}`}
                          >
                            {entry.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">{entry.userId}</td>
                        <td className="py-3 px-4 text-xs font-mono">{entry.ipAddress || '—'}</td>
                        <td className="py-3 px-4 text-xs">{entry.deviceInfo || '—'}</td>
                        <td className="py-3 px-4 text-xs">{formatDate(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">Session Management Tips</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Inactive sessions automatically expire after the timeout period</li>
              <li>• Force logout immediately terminates the selected session</li>
              <li>• Adjust timeout and max sessions based on your security requirements</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SessionManagement;
