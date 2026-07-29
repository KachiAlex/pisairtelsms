import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader, Cpu, RefreshCw, Plus, Wifi, WifiOff, AlertTriangle, CheckCircle2, RotateCcw, ScanSearch, Download, XCircle, Network } from 'lucide-react';
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

interface DiscoveredDevice {
  ip: string;
  port: number;
  deviceType: string;
  label: string;
  reachable: boolean;
}

const BATCH_SIZE = 20;

// Common biometric device TCP ports and their probable types
const BIOMETRIC_PORTS: { port: number; deviceType: string; label: string }[] = [
  { port: 4370,  deviceType: 'fingerprint', label: 'ZKTeco / fingerprint terminal' },
  { port: 9922,  deviceType: 'fingerprint', label: 'Suprema BioStation' },
  { port: 8080,  deviceType: 'face',        label: 'Face-recognition terminal' },
  { port: 443,   deviceType: 'card',        label: 'Smart-card / RFID reader' },
  { port: 80,    deviceType: 'fingerprint', label: 'Web-managed biometric device' },
];

function getHeaders() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    return {
      'Content-Type': 'application/json',
                  ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    };
  } catch {
    return { 'Content-Type': 'application/json'}
}

/** Probe a single IP:port with a short-lived fetch (image trick for cross-origin TCP check) */
async function probeHost(ip: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; resolve(false); }, timeoutMs);
    img.onload  = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(true); }; // error means host responded
    img.src = `http://${ip}:${port}/favicon.ico?_=${Date.now()}`;
  });
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

  // --- Auto-discovery state ---
  const [scanOpen, setScanOpen]           = useState(false);
  const [scanning, setScanning]           = useState(false);
  const [scanSubnet, setScanSubnet]       = useState('192.168.1');
  const [scanProgress, setScanProgress]   = useState(0); // 0–100
  const [discovered, setDiscovered]       = useState<DiscoveredDevice[]>([]);
  const [installing, setInstalling]       = useState<string | null>(null); // key = ip:port
  const [installedKeys, setInstalledKeys] = useState<Set<string>>(new Set());
  const scanAbortRef                      = useRef(false);

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

  // Scan the subnet .1–.254 on all known biometric ports — concurrent batches of BATCH_SIZE IPs
  const doneRef = useRef(0);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setDiscovered([]);
    setScanProgress(0);
    scanAbortRef.current = false;
    doneRef.current = 0;

    const subnet = scanSubnet.replace(/\.+$/, '');
    const ips: string[] = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
    const total = ips.length * BIOMETRIC_PORTS.length;

    // Chunk IPs into batches so we probe BATCH_SIZE addresses concurrently
    for (let i = 0; i < ips.length; i += BATCH_SIZE) {
      if (scanAbortRef.current) break;
      const batch = ips.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.flatMap(ip =>
          BIOMETRIC_PORTS.map(async ({ port, deviceType, label }) => {
            const reachable = await probeHost(ip, port, 1200);
            doneRef.current += 1;
            setScanProgress(Math.round((doneRef.current / total) * 100));
            if (reachable) {
              setDiscovered(prev => {
                if (prev.some(d => d.ip === ip && d.port === port)) return prev;
                return [...prev, { ip, port, deviceType, label, reachable: true }];
              });
            }
          })
        )
      );
    }
    setScanning(false);
    setScanProgress(100);
  }, [scanSubnet]);

  const handleInstallDiscovered = async (d: DiscoveredDevice) => {
    const key = `${d.ip}:${d.port}`;
    setInstalling(key);
    const autoName = `${d.label} @ ${d.ip}`;
    try {
      const res = await fetch('/api/tenant/integrations/biometric-devices', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: autoName,
          deviceType: d.deviceType,
          location: '',
          ipAddress: d.ip,
          serialNumber: '',
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      const json = await res.json();
      setDevices(prev => [json.data, ...prev]);
      setInstalledKeys(prev => new Set([...prev, key]));
      toast({ title: 'Device installed', description: `"${autoName}" has been registered.` });
    } catch (err) {
      toast({ title: 'Install failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setInstalling(null);
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
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setScanOpen(o => !o)}>
            <ScanSearch className="h-4 w-4 mr-2" />
            {scanOpen ? 'Hide scanner' : 'Scan network'}
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

      {/* Auto-discovery panel */}
      {scanOpen && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Auto-discover devices</CardTitle>
            </div>
            <CardDescription>
              Scans your local subnet for devices responding on known biometric ports (ZKTeco :4370, Suprema :9922, web-terminals :80/:8080, RFID :443).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subnet input + scan button */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="scan-subnet">Subnet prefix</Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="scan-subnet"
                    className="rounded-r-none font-mono"
                    placeholder="192.168.1"
                    value={scanSubnet}
                    onChange={e => setScanSubnet(e.target.value)}
                    disabled={scanning}
                  />
                  <span className="inline-flex items-center px-3 py-2 border border-l-0 border-input rounded-r-md bg-gray-50 text-sm text-gray-500 font-mono">.1–254</span>
                </div>
              </div>
              {!scanning ? (
                <Button onClick={handleScan} className="shrink-0">
                  <ScanSearch className="h-4 w-4 mr-2" /> Start scan
                </Button>
              ) : (
                <Button variant="destructive" className="shrink-0" onClick={() => { scanAbortRef.current = true; }}>
                  <XCircle className="h-4 w-4 mr-2" /> Stop
                </Button>
              )}
            </div>

            {/* Progress bar */}
            {(scanning || scanProgress > 0) && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{scanning ? `Scanning ${scanSubnet}.x…` : 'Scan complete'}</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-200 ${scanning ? 'bg-blue-500' : 'bg-emerald-500'}`}
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                {scanning && (
                  <p className="text-xs text-gray-400">
                    {discovered.length} device{discovered.length !== 1 ? 's' : ''} found so far…
                  </p>
                )}
              </div>
            )}

            {/* Discovered devices */}
            {discovered.length > 0 && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">IP address</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Port</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Detected as</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Type</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {discovered.map(d => {
                      const key = `${d.ip}:${d.port}`;
                      const alreadyRegistered = devices.some(dev => dev.ip_address === d.ip) || installedKeys.has(key);
                      return (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{d.ip}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{d.port}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-700">{d.label}</td>
                          <td className="px-4 py-2.5">
                            <span className="capitalize inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              <Cpu className="h-3 w-3" />{d.deviceType}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {alreadyRegistered ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Registered
                              </span>
                            ) : (
                              <Button
                                size="sm" variant="outline"
                                disabled={installing === key}
                                onClick={() => handleInstallDiscovered(d)}
                              >
                                {installing === key
                                  ? <Loader className="h-3.5 w-3.5 animate-spin mr-1" />
                                  : <Download className="h-3.5 w-3.5 mr-1" />}
                                Install
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!scanning && scanProgress === 100 && discovered.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <ScanSearch className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No biometric devices found on <span className="font-mono">{scanSubnet}.x</span>.</p>
                <p className="text-xs mt-1">Check the subnet prefix or register a device manually.</p>
              </div>
            )}

            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
              <strong>Note:</strong> Network scanning runs from your browser. Devices behind firewall rules or on different VLANs may not respond. For best results, ensure the server and devices share the same LAN segment.
            </div>
          </CardContent>
        </Card>
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
