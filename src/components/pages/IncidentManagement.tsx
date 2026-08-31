import React, { useState } from 'react';
import { AlertTriangle, Clock, User, Shield, CheckCircle2, MessageSquare, ArrowLeft, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';

interface Incident {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Active' | 'Triage' | 'Investigating' | 'Resolved' | 'Closed';
  category: 'Access' | 'Data' | 'Network' | 'System';
  openedAt: string;
  assignee: string;
  description: string;
}

export function IncidentManagement() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidents] = useState<Incident[]>([
    {
      id: 'INC-2026-001',
      title: 'Brute force attempt detected',
      severity: 'High',
      status: 'Active',
      category: 'Access',
      openedAt: '2026-02-21 10:15',
      assignee: 'Ibrahim Musa',
      description: 'Multiple failed login attempts from IP 192.168.1.45 targeting admin accounts.'
    },
    {
      id: 'INC-2026-002',
      title: 'Unauthorized file access attempt',
      severity: 'Critical',
      status: 'Triage',
      category: 'Data',
      openedAt: '2026-02-21 09:45',
      assignee: 'Unassigned',
      description: 'System flagged an attempt to access SS3 exam papers from an unauthorized staff account.'
    },
    {
      id: 'INC-2026-003',
      title: 'Bulk data export initiated',
      severity: 'Medium',
      status: 'Resolved',
      category: 'Data',
      openedAt: '2026-02-21 08:00',
      assignee: 'Adaeze Nwosu',
      description: 'A teacher exported a full class list. Validated as routine report generation.'
    }
  ]);

  if (selectedIncident) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedIncident(null)} className="pl-0">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Queue
        </Button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge variant={selectedIncident.severity === 'Critical' ? 'destructive' : 'default'}>{selectedIncident.severity}</Badge>
              <span className="text-gray-500 font-mono text-sm">{selectedIncident.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedIncident.title}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Assign</Button>
            <Button className="bg-green-600 hover:bg-green-700">Mark as Resolved</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Incident Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{selectedIncident.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Investigation Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 border-l-2 border-gray-100 space-y-8">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 p-1 bg-blue-100 rounded-full text-blue-600">
                      <AlertTriangle className="w-3 h-3" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Incident Detected</p>
                    <p className="text-xs text-gray-500">{selectedIncident.openedAt}</p>
                    <p className="text-sm text-gray-600 mt-1">Automatic trigger from SIEM connector.</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 p-1 bg-amber-100 rounded-full text-amber-600">
                      <User className="w-3 h-3" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Status changed to Triage</p>
                    <p className="text-xs text-gray-500">20 mins ago</p>
                    <p className="text-sm text-gray-600 mt-1">Assigned to security tier 1 for initial review.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comments & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">AM</div>
                  <div className="flex-1 bg-gray-50 rounded-2xl p-3 text-sm">
                    <p className="font-semibold text-gray-900 mb-1">Audit Manager</p>
                    <p className="text-gray-600">Please provide the IP logs for the last 24 hours related to this actor.</p>
                    <p className="text-[10px] text-gray-400 mt-2">15 mins ago</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <Input placeholder="Add a note or update..." />
                  <Button variant="outline"><MessageSquare className="w-4 h-4" /></Button>
                </div>
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
                  <span className="text-gray-500">Category</span>
                  <span className="font-medium">{selectedIncident.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <Badge variant="outline">{selectedIncident.status}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Assignee</span>
                  <span className="font-medium">{selectedIncident.assignee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">SLA Timer</span>
                  <span className="text-red-600 font-mono">01:45:22 remaining</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase text-gray-500">Affected Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm p-2 border rounded-lg">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Auth Gateway v2</span>
                </div>
                <div className="flex items-center gap-2 text-sm p-2 border rounded-lg">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Admin Portal</span>
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
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Security & compliance</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Incident Management</h1>
          <p className="text-sm text-gray-600">Global response queue for security threats and policy violations.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Incident Export
          </Button>
          <Button className="bg-red-600 hover:bg-red-700">
            <AlertTriangle className="h-4 w-4 mr-2" /> Report Incident
          </Button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100/80 rounded-xl w-fit">
        <Button variant="ghost" size="sm" className="bg-white shadow-sm rounded-lg">All Incidents</Button>
        <Button variant="ghost" size="sm" className="rounded-lg text-gray-500">Assigned to Me</Button>
        <Button variant="ghost" size="sm" className="rounded-lg text-gray-500">Resolved</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Response Queue</CardTitle>
            <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((inc) => (
                  <TableRow key={inc.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedIncident(inc)}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-gray-900">{inc.title}</p>
                        <p className="text-xs font-mono text-gray-500">{inc.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={inc.severity === 'Critical' ? 'destructive' : inc.severity === 'High' ? 'default' : 'secondary'}>
                        {inc.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${inc.status === 'Active' ? 'bg-red-500' : 'bg-gray-300'}`} />
                        {inc.status}
                      </div>
                    </TableCell>
                    <TableCell>{inc.category}</TableCell>
                    <TableCell className="text-sm">{inc.assignee}</TableCell>
                    <TableCell className="text-sm text-gray-500">{inc.openedAt}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Manage</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default IncidentManagement;
