import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock, User, Shield, CheckCircle2, MessageSquare, ArrowLeft, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { tenantApiFetch } from '../../lib/tenantApi';

interface Incident {
  id: string;
  event_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  status: 'Active' | 'Triage' | 'Investigating' | 'Resolved' | 'Closed';
  assignee: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  actor: string;
}

const INCIDENT_STATUSES = ['Active', 'Triage', 'Investigating', 'Resolved', 'Closed'] as const;

function severityBadge(severity: string) {
  if (severity === 'critical') return 'destructive' as const;
  if (severity === 'high') return 'default' as const;
  return 'secondary' as const;
}

function titleFor(eventType: string): string {
  return eventType
    .replace(/^manual_/, '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function fmt(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
}

export function IncidentManagement() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'Resolved'>('all');
  const [assigneeInput, setAssigneeInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ title: '', description: '', severity: 'medium' });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await tenantApiFetch('/api/tenant/security/incidents');
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setIncidents(data.incidents ?? []);
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateIncident = async (patch: { status?: string; assignee?: string; resolutionNotes?: string }) => {
    if (!selectedIncident) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await tenantApiFetch('/api/tenant/security/incidents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedIncident.id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      const updated = { ...selectedIncident, ...patch, status: (patch.status ?? selectedIncident.status) as Incident['status'], resolution_notes: patch.resolutionNotes ?? selectedIncident.resolution_notes };
      setSelectedIncident(updated);
      setIncidents(prev => prev.map(i => (i.id === updated.id ? { ...i, ...updated } : i)));
    } catch (e: any) {
      setActionError(e?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const submitReport = async () => {
    setSaving(true);
    setActionError(null);
    try {
      const res = await tenantApiFetch('/api/tenant/security/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setReportOpen(false);
      setReportForm({ title: '', description: '', severity: 'medium' });
      await load();
    } catch (e: any) {
      setActionError(e?.message || 'Failed to report incident');
    } finally {
      setSaving(false);
    }
  };

  const filtered = incidents.filter(i => {
    if (statusFilter === 'open') return i.status !== 'Resolved' && i.status !== 'Closed';
    if (statusFilter === 'Resolved') return i.status === 'Resolved' || i.status === 'Closed';
    return true;
  });

  if (selectedIncident) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => { setSelectedIncident(null); setActionError(null); }} className="pl-0">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Queue
        </Button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge variant={severityBadge(selectedIncident.severity)}>{selectedIncident.severity}</Badge>
              <span className="text-gray-500 font-mono text-sm">{selectedIncident.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{titleFor(selectedIncident.event_type)}</h1>
          </div>
          <div className="flex gap-2 items-center">
            <Select
              value={selectedIncident.status}
              onValueChange={(v) => updateIncident({ status: v })}
              disabled={saving}
            >
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCIDENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {actionError && <p className="text-sm text-red-600">{actionError}</p>}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Incident Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{selectedIncident.description || 'No description recorded.'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assign &amp; Resolution Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="Assignee (staff name or email)"
                    value={assigneeInput}
                    onChange={e => setAssigneeInput(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={saving || !assigneeInput.trim()}
                    onClick={() => updateIncident({ assignee: assigneeInput.trim() })}
                  >
                    Assign
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Resolution notes..."
                    value={notesInput}
                    onChange={e => setNotesInput(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={saving || !notesInput.trim()}
                  onClick={() => updateIncident({ resolutionNotes: notesInput.trim() })}
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Save Notes
                </Button>
                {selectedIncident.resolution_notes && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-gray-900 mb-1">Recorded notes</p>
                    <p className="text-gray-600">{selectedIncident.resolution_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase text-gray-500">Incident Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Event type</span>
                  <span className="font-medium font-mono text-xs">{selectedIncident.event_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <Badge variant="outline">{selectedIncident.status}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Actor</span>
                  <span className="font-medium">{selectedIncident.actor}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Assignee</span>
                  <span className="font-medium">{selectedIncident.assignee || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Opened</span>
                  <span className="font-medium">{fmt(selectedIncident.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Resolved</span>
                  <span className="font-medium">{fmt(selectedIncident.resolved_at)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Security &amp; compliance</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Incident Management</h1>
          <p className="text-sm text-gray-600">
            Response queue for security events recorded by the audit system — failed logins, session anomalies,
            and manually reported incidents. Triage, assign, and resolve them here.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => setReportOpen(true)}>
            <AlertTriangle className="h-4 w-4 mr-2" /> Report Incident
          </Button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100/80 rounded-xl w-fit">
        <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}
          className={statusFilter === 'all' ? 'bg-white shadow-sm rounded-lg' : 'rounded-lg text-gray-500'}>
          All Incidents
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setStatusFilter('open')}
          className={statusFilter === 'open' ? 'bg-white shadow-sm rounded-lg' : 'rounded-lg text-gray-500'}>
          Open
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setStatusFilter('Resolved')}
          className={statusFilter === 'Resolved' ? 'bg-white shadow-sm rounded-lg' : 'rounded-lg text-gray-500'}>
          Resolved
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response Queue</CardTitle>
          <CardDescription>Security events for this school, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading incidents…
            </div>
          ) : loadError ? (
            <div className="py-12 text-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600">{loadError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={load}>Retry</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">No incidents</p>
              <p className="text-sm text-gray-500 mt-1">
                {statusFilter === 'all'
                  ? 'No security events have been recorded for this school yet.'
                  : 'No incidents match this filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incident</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inc) => (
                    <TableRow key={inc.id} className="cursor-pointer hover:bg-gray-50"
                      onClick={() => { setSelectedIncident(inc); setAssigneeInput(inc.assignee ?? ''); setNotesInput(''); setActionError(null); }}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-gray-900">{titleFor(inc.event_type)}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{inc.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={severityBadge(inc.severity)}>{inc.severity}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <div className={`w-2 h-2 rounded-full ${inc.status === 'Active' ? 'bg-red-500' : inc.status === 'Resolved' || inc.status === 'Closed' ? 'bg-green-500' : 'bg-amber-400'}`} />
                          {inc.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{inc.actor}</TableCell>
                      <TableCell className="text-sm">{inc.assignee || '—'}</TableCell>
                      <TableCell className="text-sm text-gray-500">{fmt(inc.created_at)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Security Incident</DialogTitle>
            <DialogDescription>Manually log a security incident into the response queue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inc-title">Title</Label>
              <Input id="inc-title" value={reportForm.title}
                onChange={e => setReportForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Suspicious USB device found in lab" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-sev">Severity</Label>
              <Select value={reportForm.severity}
                onValueChange={v => setReportForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger id="inc-sev"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-desc">Description</Label>
              <Textarea id="inc-desc" value={reportForm.description}
                onChange={e => setReportForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What happened, when, and who is affected" />
            </div>
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" disabled={saving || !reportForm.title.trim()}
              onClick={submitReport}>
              {saving ? 'Reporting…' : 'Report Incident'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IncidentManagement;
