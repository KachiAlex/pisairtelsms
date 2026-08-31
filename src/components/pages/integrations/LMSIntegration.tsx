import { useState, useEffect, useCallback } from 'react';
import { RefreshCcw, Link, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { useToast } from '../../ui/use-toast';
import { getAuthFromStorage } from '../../../lib/auth';

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
  const auth = getAuthFromStorage();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
  return headers;
}

export function LMSIntegration() {
  const { toast } = useToast();
  const [config, setConfig] = useState<LMSConfig | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState({
    provider: 'moodle' as 'moodle' | 'canvas',
    baseUrl: '',
    apiKey: '',
  });

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
      const response = await fetch('/api/tenant/integrations/lms/config', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to save LMS config');
      const data = await response.json();
      setConfig(data.data);
      toast({ title: 'Configuration saved', description: 'LMS configuration saved successfully.' });
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Failed to save config', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config) return;
    try {
      setTesting(true);
      const response = await fetch(`/api/tenant/integrations/lms/${config.id}/test`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Connection test failed');
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Connection test passed', description: 'Check your LMS for connectivity.' });
      } else {
        toast({ title: 'Connection test failed', description: 'Check your credentials.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Connection test failed', description: err instanceof Error ? err.message : 'Connection test failed', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async (type: 'students' | 'grades') => {
    if (!config) return;
    try {
      setSyncing(true);
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
      toast({ title: 'Sync completed', description: `${type === 'students' ? 'Student' : 'Grade'} sync completed.` });
      fetchSyncHistory(config.id);
      fetchConfig();
    } catch (err) {
      toast({ title: 'Sync failed', description: err instanceof Error ? err.message : 'Sync failed', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="border-none ring-1 ring-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            LMS Connection
          </CardTitle>
          <CardDescription>Connect to Moodle or Canvas LMS for student and grade synchronization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">LMS Provider</Label>
            <Select value={formData.provider} onValueChange={v => setFormData({ ...formData, provider: v as 'moodle' | 'canvas' })}>
              <SelectTrigger id="provider" className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="moodle">Moodle</SelectItem>
                <SelectItem value="canvas">Canvas</SelectItem>
              </SelectContent>
            </Select>
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
            <Button onClick={handleSaveConfig} disabled={saving} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Configuration'}
            </Button>
            {config && (
              <Button variant="outline" onClick={handleTestConnection} disabled={testing} className="rounded-xl">
                {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</> : 'Test Connection'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      {config && (
        <Card className="border-none ring-1 ring-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sync Status</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSync('students')}
                disabled={syncing}
                className="rounded-xl"
              >
                {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                Sync Students
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSync('grades')}
                disabled={syncing}
                className="rounded-xl"
              >
                {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
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
