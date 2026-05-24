import React, { useState, useEffect, useCallback } from 'react'
import { KeyRound, RefreshCcw, Loader, ShieldCheck, Activity, XCircle, Plus, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from '../ui/dialog'
import { useToast } from '../ui/use-toast'

interface APIKey {
  id: string;
  name: string;
  key: string;
  status: string;
  rate_limit: number;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}

interface Stats {
  activeKeys: number;
  revokedKeys: number;
  totalKeys: number;
  callsLast24h: number;
  errorRate: number;
  avgResponseTime: number;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': localStorage.getItem('tenantId') || '',
    'x-user-id':   localStorage.getItem('userId')   || '',
  };
}

const STATUS_STYLE: Record<string, string> = {
  active:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  revoked: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function APIManagement() {
  const { toast } = useToast();
  const [keys, setKeys]       = useState<APIKey[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issuing, setIssuing]     = useState(false);
  const [revoking, setRevoking]   = useState<string | null>(null);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', rateLimit: '60' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = getHeaders();
      const [keysRes, statsRes] = await Promise.all([
        fetch('/api/tenant/integrations/api-management', { headers: h }),
        fetch('/api/tenant/integrations/api-management/statistics', { headers: h }),
      ]);
      if (!keysRes.ok || !statsRes.ok) throw new Error('Failed to load API management data');
      const [keysJson, statsJson] = await Promise.all([keysRes.json(), statsRes.json()]);
      setKeys(keysJson.data || []);
      setStats(statsJson.data || null);
    } catch (err) {
      toast({ title: 'Load error', description: err instanceof Error ? err.message : 'Failed to load', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleIssue = async () => {
    if (!form.name.trim()) return;
    setIssuing(true);
    try {
      const res = await fetch('/api/tenant/integrations/api-management', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: form.name, rateLimit: parseInt(form.rateLimit) || 60 }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      const json = await res.json();
      setKeys(prev => [json.data, ...prev]);
      setIssueOpen(false);
      setForm({ name: '', rateLimit: '60' });
      toast({ title: 'Key issued', description: `"${json.data.name}" is now active.` });
    } catch (err) {
      toast({ title: 'Failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoke = async (keyId: string, keyName: string) => {
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/tenant/integrations/api-management/${keyId}/revoke`, {
        method: 'POST', headers: getHeaders(),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, status: 'revoked' } : k));
      toast({ title: 'Key revoked', description: `"${keyName}" has been revoked.` });
    } catch (err) {
      toast({ title: 'Revoke failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setRevoking(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Integrations</p>
          <h1 className="text-2xl font-bold text-gray-900">API management</h1>
          <p className="text-sm text-gray-600">Secure API keys, monitor consumption, and enforce rate limits.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => setIssueOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" /> Issue new key
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Active keys</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.activeKeys}</p>
            <p className="text-xs text-gray-500">{stats.totalKeys} total</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">API calls (24h)</p>
            <p className="text-3xl font-semibold text-emerald-600">{stats.callsLast24h.toLocaleString()}</p>
            <p className="text-xs text-gray-500">requests</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Error rate</p>
            <p className="text-3xl font-semibold text-amber-600">{stats.errorRate}%</p>
            <p className="text-xs text-gray-500">last 24h</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg latency</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.avgResponseTime}ms</p>
            <p className="text-xs text-gray-500">last 24h</p>
          </CardContent></Card>
        </div>
      )}

      {/* Keys table */}
      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Lifecycle controls for every integration key.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {keys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Rate limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map(k => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium text-gray-900">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        {visibleKey === k.id ? k.key : `${k.key.slice(0, 10)}••••••`}
                        <button onClick={() => setVisibleKey(v => v === k.id ? null : k.id)} className="text-gray-400 hover:text-gray-600">
                          {visibleKey === k.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{k.rate_limit} / min</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[k.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {k.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{new Date(k.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm text-gray-500">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      {k.status === 'active' && (
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={revoking === k.id}
                          onClick={() => handleRevoke(k.id, k.name)}
                        >
                          {revoking === k.id ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-700">No API keys yet</p>
              <p className="text-sm mt-1">Click <strong>Issue new key</strong> to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent usage note */}
      <Card>
        <CardHeader>
          <CardTitle>Security posture</CardTitle>
          <CardDescription>Key rotation and lifecycle overview.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Active keys</p>
            <p className="text-2xl font-semibold text-gray-900">{stats?.activeKeys ?? '—'}</p>
            <p className="text-xs text-gray-400">Issuing credentials</p>
          </div>
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Revoked keys</p>
            <p className="text-2xl font-semibold text-red-600">{stats?.revokedKeys ?? '—'}</p>
            <p className="text-xs text-gray-400">Decommissioned</p>
          </div>
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Calls today</p>
            <p className="text-2xl font-semibold text-emerald-600">{stats?.callsLast24h?.toLocaleString() ?? '—'}</p>
            <p className="text-xs text-gray-400">Last 24 hours</p>
          </div>
        </CardContent>
      </Card>

      {/* Issue key dialog */}
      <Dialog open={issueOpen} onOpenChange={o => { setIssueOpen(o); if (!o) setForm({ name: '', rateLimit: '60' }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue new API key</DialogTitle>
            <DialogDescription>The generated key and secret will be shown once. Copy them immediately.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Key label <span className="text-red-500">*</span></Label>
              <Input
                id="key-name"
                placeholder="e.g. Mobile app v2"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleIssue()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key-rate">Rate limit (requests / minute)</Label>
              <Input
                id="key-rate"
                type="number"
                min={1}
                value={form.rateLimit}
                onChange={e => setForm(f => ({ ...f, rateLimit: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild><Button variant="outline" disabled={issuing}>Cancel</Button></DialogClose>
            <Button onClick={handleIssue} disabled={issuing || !form.name.trim()}>
              {issuing ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Issue key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default APIManagement;
