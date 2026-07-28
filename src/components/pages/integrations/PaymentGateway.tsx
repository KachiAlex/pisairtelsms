import React, { useState, useEffect, useCallback } from 'react';
import { Loader, CreditCard, AlertCircle, CheckCircle2, Clock, RefreshCw, Settings, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../ui/dialog';
import { useToast } from '../../ui/use-toast';

interface GatewayConfig {
  id: string;
  provider: string;
  mode: string;
  api_key: string;
  secret_key: string;
  webhook_url?: string;
  webhook_secret?: string;
  is_active: boolean;
  updated_at: string;
}

interface Transaction {
  id: string;
  provider: string;
  reference_id: string;
  amount: string;
  currency: string;
  status: string;
  description?: string;
  created_at: string;
}

interface Stats {
  totalAmount: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  totalTransactions: number;
}

const STATUS_STYLES: Record<string, string> = {
  success:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed:   'bg-red-50 text-red-700 border-red-200',
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  refunded: 'bg-blue-50 text-blue-700 border-blue-200',
};

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': localStorage.getItem('tenantId') || '',
    'x-user-id':   localStorage.getItem('userId')   || '',
  };
}

export default function PaymentGateway() {
  const { toast } = useToast();
  const [config, setConfig]           = useState<GatewayConfig | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [form, setForm] = useState({
    provider:      'paystack',
    mode:          'test',
    apiKey:        '',
    secretKey:     '',
    webhookUrl:    '',
    webhookSecret: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      const [cfgRes, txnRes, statsRes] = await Promise.all([
        fetch('/api/tenant/integrations/payment-gateway/config',       { headers }),
        fetch('/api/tenant/integrations/payment-gateway/transactions?limit=20', { headers }),
        fetch('/api/tenant/integrations/payment-gateway/statistics',   { headers }),
      ]);

      if (!cfgRes.ok || !txnRes.ok || !statsRes.ok) {
        throw new Error('Failed to load payment gateway data');
      }

      const [cfgJson, txnJson, statsJson] = await Promise.all([
        cfgRes.json(), txnRes.json(), statsRes.json(),
      ]);

      const cfg: GatewayConfig | null = cfgJson.data;
      setConfig(cfg);
      setTransactions(txnJson.data || []);
      setStats(statsJson.data || null);

      if (cfg) {
        setForm({
          provider:      cfg.provider,
          mode:          cfg.mode,
          apiKey:        cfg.api_key,
          secretKey:     cfg.secret_key,
          webhookUrl:    cfg.webhook_url    || '',
          webhookSecret: cfg.webhook_secret || '',
        });
      }
    } catch (err) {
      toast({ title: 'Load error', description: err instanceof Error ? err.message : 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveConfig = async () => {
    if (!form.apiKey || !form.secretKey) {
      toast({ title: 'Missing fields', description: 'API key and Secret key are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/tenant/integrations/payment-gateway/config', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to save configuration');
      }
      const json = await res.json();
      setConfig(json.data);
      setDialogOpen(false);
      toast({ title: 'Configuration saved', description: `${form.provider} gateway is now active in ${form.mode} mode.` });
      loadData();
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Integrations</p>
          <h1 className="text-2xl font-bold text-gray-900">Payment Gateway</h1>
          <p className="text-sm text-gray-600">Connect Stripe or Paystack to process school fee payments.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            {config ? 'Edit configuration' : 'Configure gateway'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-xs text-gray-500">Successful</p>
              <p className="text-3xl font-semibold text-gray-900">{stats.successCount}</p>
              <p className="text-xs text-gray-500">transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center mb-3">
                <CreditCard className="h-5 w-5" />
              </div>
              <p className="text-xs text-gray-500">Total volume</p>
              <p className="text-3xl font-semibold text-gray-900">{stats.totalAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">all time</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center mb-3">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-3xl font-semibold text-gray-900">{stats.pendingCount}</p>
              <p className="text-xs text-gray-500">awaiting confirmation</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="rounded-full bg-red-50 text-red-600 w-10 h-10 flex items-center justify-center mb-3">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-xs text-gray-500">Failed</p>
              <p className="text-3xl font-semibold text-gray-900">{stats.failedCount}</p>
              <p className="text-xs text-gray-500">transactions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active config */}
      <Card>
        <CardHeader>
          <CardTitle>Active configuration</CardTitle>
          <CardDescription>Current payment provider settings.</CardDescription>
        </CardHeader>
        <CardContent>
          {config ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Provider</p>
                <p className="font-semibold text-gray-900 capitalize">{config.provider}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Mode</p>
                <Badge className={config.mode === 'live'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                }>
                  {config.mode.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">API Key</p>
                <p className="font-mono text-sm text-gray-700">{config.api_key.slice(0, 12)}•••</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Active</Badge>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-700">No gateway configured</p>
              <p className="text-sm mt-1">Click <strong>Configure gateway</strong> to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>Last 20 payment events recorded by the gateway.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(txn => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-mono text-xs text-gray-600">
                        {txn.reference_id.length > 14 ? txn.reference_id.slice(0, 14) + '…' : txn.reference_id}
                      </TableCell>
                      <TableCell className="capitalize">{txn.provider}</TableCell>
                      <TableCell className="text-gray-600 text-sm">{txn.description || '—'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {txn.currency} {parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          STATUS_STYLES[txn.status] || 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {txn.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(txn.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-700">No transactions yet</p>
              <p className="text-sm mt-1">Transactions will appear here once payments are processed.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configure Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure payment gateway</DialogTitle>
            <DialogDescription>Enter your provider credentials. Keys are stored securely in the database.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pg-provider">Provider</Label>
                <select
                  id="pg-provider"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.provider}
                  onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                >
                  <option value="paystack">Paystack</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pg-mode">Mode</Label>
                <select
                  id="pg-mode"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.mode}
                  onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
                >
                  <option value="test">Test</option>
                  <option value="live">Live</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pg-apikey">API Key <span className="text-red-500">*</span></Label>
              <Input
                id="pg-apikey"
                type="password"
                placeholder="pk_test_••••••••"
                value={form.apiKey}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pg-secret">Secret Key <span className="text-red-500">*</span></Label>
              <Input
                id="pg-secret"
                type="password"
                placeholder="sk_test_••••••••"
                value={form.secretKey}
                onChange={e => setForm(f => ({ ...f, secretKey: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pg-webhook">Webhook URL <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                id="pg-webhook"
                placeholder="https://yourschool.com/webhooks/payment"
                value={form.webhookUrl}
                onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pg-whsecret">Webhook Secret <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                id="pg-whsecret"
                type="password"
                value={form.webhookSecret}
                onChange={e => setForm(f => ({ ...f, webhookSecret: e.target.value }))}
              />
            </div>

            {form.mode === 'live' && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span><strong>Live mode</strong> — real transactions will be processed. Ensure keys are correct before saving.</span>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveConfig} disabled={saving || !form.apiKey || !form.secretKey}>
              {saving ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
              Save configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
