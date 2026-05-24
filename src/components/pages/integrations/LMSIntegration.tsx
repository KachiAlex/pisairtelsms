import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Link, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';

interface LMSConfig {
  id: string;
  provider: string;
  base_url: string;
  api_key: string;
  sync_status: string;
  last_sync_at?: string;
}

interface SyncRecord {
  id: string;
  sync_type: string;
  status: string;
  records_processed: number;
  records_failed: number;
  started_at: string;
  completed_at?: string;
  error?: string;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': localStorage.getItem('tenantId') || '',
    'x-user-id':   localStorage.getItem('userId')   || '',
  };
}

export function LMSIntegration() {
  const [config, setConfig] = useState<LMSConfig | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    provider: 'moodle' as 'moodle' | 'canvas',
    baseUrl: '',
    apiKey: '',
  });

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const fetchSyncHistory = useCallback(async (configId: string) => {
    try {
      const response = await fetch(`/api/tenant/integrations/lms/${configId}/sync-history`, {
        headers: getHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      setSyncHistory(data.data || []);
    } catch (err) {
      console.error('Failed to fetch sync history:', err);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tenant/integrations/lms/config', {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch LMS config');
      const data = await response.json();
      if (data.data) {
        setConfig(data.data);
        setFormData({
          provider: data.data.provider,
          baseUrl: data.data.base_url,
          apiKey: data.data.api_key,
        });
        fetchSyncHistory(data.data.id);
      }
    } catch (err) {
      console.error('Failed to fetch LMS config:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchSyncHistory]);

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const response = await fetch('/api/tenant/integrations/lms/config', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to save LMS config');
      const data = await response.json();
      setConfig(data.data);
      setSuccess('LMS configuration saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config) return;
    try {
      setTesting(true);
      setError(null);
      setSuccess(null);
      const response = await fetch(`/api/tenant/integrations/lms/${config.id}/test`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Connection test failed');
      const data = await response.json();
      if (data.success) {
        setSuccess('Connection test initiated. Check your LMS for connectivity.');
      } else {
        setError('Connection test failed. Check your credentials.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async (type: 'students' | 'grades') => {
    if (!config) return;
    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);
      const h = getHeaders();
      const startRes = await fetch(`/api/tenant/integrations/lms/${config.id}/sync/${type}`, {
        method: 'POST',
        headers: h,
      });
      if (!startRes.ok) throw new Error(`Failed to start ${type} sync`);
      const { data: syncRecord } = await startRes.json();
      await fetch(`/api/tenant/integrations/lms/${config.id}/sync/${syncRecord.id}`, {
        method: 'PUT',
        headers: h,
        body: JSON.stringify({ recordsProcessed: 0, recordsFailed: 0 }),
      });
      setSuccess(`${type === 'students' ? 'Student' : 'Grade'} sync completed`);
      fetchSyncHistory(config.id);
      fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
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
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            LMS Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="provider">LMS Provider</Label>
            <select
              id="provider"
              value={formData.provider}
              onChange={e => setFormData({ ...formData, provider: e.target.value as 'moodle' | 'canvas' })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="moodle">Moodle</option>
              <option value="canvas">Canvas</option>
            </select>
          </div>
          <div>
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={formData.baseUrl}
              onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
              placeholder="https://your-lms.example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="Enter your API key"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveConfig} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Configuration'}
            </Button>
            {config && (
              <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Testing...</> : 'Test Connection'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      {config && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sync Status</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSync('students')}
                disabled={syncing}
              >
                {syncing ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync Students
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSync('grades')}
                disabled={syncing}
              >
                {syncing ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync Grades
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium">Provider</span>
                <Badge>{config.provider}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium">Sync Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSyncStatusColor(config.sync_status)}`}>
                  {config.sync_status}
                </span>
              </div>
              {config.last_sync_at && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Last Sync</span>
                  <span className="text-sm text-gray-600">{new Date(config.last_sync_at).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Sync History */}
            {syncHistory.length > 0 && (
              <>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Sync History</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Type</th>
                        <th className="text-left py-2 px-3 font-medium">Status</th>
                        <th className="text-left py-2 px-3 font-medium">Processed</th>
                        <th className="text-left py-2 px-3 font-medium">Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncHistory.slice(0, 5).map(record => (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3 capitalize">{record.sync_type}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSyncStatusColor(record.status)}`}>
                              {record.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2 px-3">{record.records_processed}</td>
                          <td className="py-2 px-3 text-xs">{new Date(record.started_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LMSIntegration;
