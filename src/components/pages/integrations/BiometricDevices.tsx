import React, { useState, useEffect, useCallback } from 'react';
import { Loader, Cpu, RefreshCw, Plus, Wifi, WifiOff, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from '../../ui/dialog';
import { useToast } from '../../ui/use-toast';

interface Device {
  id: string;
  name: string;
  device_type: string;
  location?: string;
  ip_address?: string;
  serial_number?: string;
  status: string;
  last_sync_at?: string;
  created_at: string;
}

interface Stats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  errorDevices: number;
  totalSyncs: number;
  completedSyncs: number;
  recordsProcessed: number;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': localStorage.getItem('tenantId') || '',
    'x-user-id':   localStorage.getItem('userId')   || '',
  };
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  online:  <Wifi className="h-4 w-4 text-emerald-500" />,
  offline: <WifiOff className="h-4 w-4 text-gray-400" />,
  error:   <AlertTriangle className="h-4 w-4 text-red-500" />,
};

const STATUS_STYLE: Record<string, string> = {
  online:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  offline: 'bg-gray-100 text-gray-600 border-gray-200',
  error:   'bg-red-50 text-red-700 border-red-200',
};

export function BiometricDevices() {
  const { toast } = useToast();
  const [devices, setDevices]   = useState<Device[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState<string | null>(null);
  const [addOpen, setAddOpen]   = useState(false);
  const [adding, setAdding]     = useState(false);
  const [form, setForm] = useState({
    name: '', deviceType: 'fingerprint', location: '', ipAddress: '', serialNumber: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = getHeaders();
      const [devRes, statsRes] = await Promise.all([
        fetch('/api/tenant/integrations/biometric-devices', { headers: h }),
        fetch('/api/tenant/integrations/biometric-devices/statistics', { headers: h }),
      ]);
      if (!devRes.ok || !statsRes.ok) throw new Error('Failed to load biometric device data');
      const [devJson, statsJson] = await Promise.all([devRes.json(), statsRes.json()]);
      setDevices(devJson.data || []);
      setStats(statsJson.data || null);
    } catch (err) {
      toast({ title: 'Load error', description: err instanceof Error ? err.message : 'Failed to load', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRegister = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/tenant/integrations/biometric-devices', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      const json = await res.json();
      setDevices(prev => [json.data, ...prev]);
      setAddOpen(false);
      setForm({ name: '', deviceType: 'fingerprint', location: '', ipAddress: '', serialNumber: '' });
      toast({ title: 'Device registered', description: `"${json.data.name}" added successfully.` });
    } catch (err) {
      toast({ title: 'Registration failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleSync = async (device: Device) => {
    setSyncing(device.id);
    try {
      const h = getHeaders();
      const startRes = await fetch(`/api/tenant/integrations/biometric-devices/${device.id}/sync`, {
        method: 'POST', headers: h,
      });
      if (!startRes.ok) { const j = await startRes.json(); throw new Error(j.error); }
      const { data: syncRecord } = await startRes.json();
      await fetch(`/api/tenant/integrations/biometric-devices/${device.id}/sync/${syncRecord.id}`, {
        method: 'PUT', headers: h,
        body: JSON.stringify({ recordsProcessed: 0, recordsFailed: 0 }),
      });
      toast({ title: 'Sync complete', description: `Attendance sync finished for "${device.name}".` });
      load();
    } catch (err) {
      toast({ title: 'Sync failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSyncing(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Integrations</p>
          <h1 className="text-2xl font-bold text-gray-900">Biometric Devices</h1>
          <p className="text-sm text-gray-600">Manage fingerprint and face-recognition devices for attendance capture.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Register device
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center mb-3">
              <Cpu className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500">Total devices</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.totalDevices}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500">Online</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.onlineDevices}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="rounded-full bg-gray-100 text-gray-500 w-10 h-10 flex items-center justify-center mb-3">
              <WifiOff className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500">Offline</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.offlineDevices}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center mb-3">
              <RotateCcw className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500">Records synced</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.recordsProcessed.toLocaleString()}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Device list */}
      <Card>
        <CardHeader>
          <CardTitle>Registered devices</CardTitle>
          <CardDescription>All biometric terminals linked to this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          {devices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last sync</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {STATUS_ICON[d.status] || <WifiOff className="h-4 w-4 text-gray-400" />}
                          <span className="font-medium text-gray-900">{d.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{d.device_type}</TableCell>
                      <TableCell className="text-sm text-gray-600">{d.location || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{d.ip_address || '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[d.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {d.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {d.last_sync_at ? new Date(d.last_sync_at).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline" size="sm"
                          disabled={syncing === d.id}
                          onClick={() => handleSync(d)}
                        >
                          {syncing === d.id
                            ? <Loader className="h-3.5 w-3.5 animate-spin" />
                            : <RotateCcw className="h-3.5 w-3.5" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Cpu className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-700">No devices registered</p>
              <p className="text-sm mt-1">Click <strong>Register device</strong> to add your first biometric terminal.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register device dialog */}
      <Dialog open={addOpen} onOpenChange={o => { setAddOpen(o); if (!o) setForm({ name: '', deviceType: 'fingerprint', location: '', ipAddress: '', serialNumber: '' }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register biometric device</DialogTitle>
            <DialogDescription>Add a fingerprint or face-recognition terminal to this tenant.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dev-name">Device name <span className="text-red-500">*</span></Label>
              <Input
                id="dev-name"
                placeholder="e.g. Main gate terminal"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dev-type">Device type</Label>
                <select
                  id="dev-type"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.deviceType}
                  onChange={e => setForm(f => ({ ...f, deviceType: e.target.value }))}
                >
                  <option value="fingerprint">Fingerprint</option>
                  <option value="face">Face recognition</option>
                  <option value="card">Smart card</option>
                  <option value="iris">Iris scan</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-location">Location</Label>
                <Input
                  id="dev-location"
                  placeholder="e.g. Block A entrance"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dev-ip">IP address</Label>
                <Input
                  id="dev-ip"
                  placeholder="192.168.1.100"
                  value={form.ipAddress}
                  onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-serial">Serial number</Label>
                <Input
                  id="dev-serial"
                  placeholder="SN-XXXXXXXX"
                  value={form.serialNumber}
                  onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild><Button variant="outline" disabled={adding}>Cancel</Button></DialogClose>
            <Button onClick={handleRegister} disabled={adding || !form.name.trim()}>
              {adding ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Register device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BiometricDevices;
