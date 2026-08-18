import React, { useState } from 'react';
import { ShieldCheck, UserMinus, FileDown, Globe, Lock, AlertCircle, CheckCircle2, Search, Trash2, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface PrivacyRequest {
  id: string;
  type: 'Erasure' | 'Portability' | 'Correction';
  subject: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Rejected';
  requestDate: string;
  dueDate: string;
}

const residencyZones = [
  { id: 'zone-1', region: 'European Union (Frankfurt)', status: 'Active', dataStored: 'Student Records, Financials', latency: '24ms' },
  { id: 'zone-2', region: 'United Kingdom (London)', status: 'Active', dataStored: 'Staff Records, Backups', latency: '18ms' },
  { id: 'zone-3', region: 'North America (N. Virginia)', status: 'Standby', dataStored: 'Public Portal, CDN', latency: '85ms' },
];

export function PrivacyCenter() {
  const [requests, setRequests] = useState<PrivacyRequest[]>([
    { id: 'REQ-001', type: 'Erasure', subject: 'Lola Balogun (Guardian)', status: 'Pending', requestDate: '2026-02-15', dueDate: '2026-03-15' },
    { id: 'REQ-002', type: 'Portability', subject: 'Ibrahim Musa (Student)', status: 'Completed', requestDate: '2026-02-10', dueDate: '2026-03-10' },
    { id: 'REQ-003', type: 'Erasure', subject: 'Tunde Ajayi (Staff)', status: 'In Progress', requestDate: '2026-02-18', dueDate: '2026-03-18' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Security & compliance</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Data Privacy Center</h1>
          <p className="text-sm text-gray-600">Global compliance tools for GDPR, CCPA, and regional data residency.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export Privacy Report
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Lock className="h-4 w-4 mr-2" /> Global Privacy Policy
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl text-red-600">
              <UserMinus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Erasure Requests</p>
              <p className="text-2xl font-bold text-gray-900">{requests.filter(r => r.type === 'Erasure').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <FileDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Portability Exports</p>
              <p className="text-2xl font-bold text-gray-900">{requests.filter(r => r.type === 'Portability').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Data Zones</p>
              <p className="text-2xl font-bold text-gray-900">{residencyZones.filter(z => z.status === 'Active').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger value="requests" className="rounded-lg">Subject Rights Requests</TabsTrigger>
          <TabsTrigger value="residency" className="rounded-lg">Data Residency</TabsTrigger>
          <TabsTrigger value="consent" className="rounded-lg">Consent Management</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subject Rights Requests (SRRs)</CardTitle>
              <CardDescription>Manage and fulfill requests for data access, correction, or deletion.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{req.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={req.status === 'Completed' ? 'default' : req.status === 'In Progress' ? 'secondary' : req.status === 'Rejected' ? 'destructive' : 'outline'}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{req.requestDate}</TableCell>
                        <TableCell className="text-sm text-gray-500">{req.dueDate}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">Review</Button>
                            {req.type === 'Erasure' && req.status === 'Pending' && (
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="residency" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Global Data Residency</CardTitle>
                  <CardDescription>Configure where different categories of tenant data are physically stored.</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-2" /> Add Zone
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {residencyZones.map((zone) => (
                  <div key={zone.id} className="p-4 border rounded-2xl space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Globe className="w-5 h-5" />
                      </div>
                      <Badge variant={zone.status === 'Active' ? 'default' : 'secondary'}>{zone.status}</Badge>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{zone.region}</p>
                      <p className="text-xs text-gray-500 mt-1">Data: {zone.dataStored}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t">
                      <span className="text-gray-500">Latency: {zone.latency}</span>
                      <Button variant="link" className="p-0 h-auto text-indigo-600">Details</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900">Compliance Warning</p>
                  <p className="text-amber-800/80">
                    Cross-border data transfers between EU and NA zones require valid Standard Contractual Clauses (SCCs) to be signed. 
                    <Button variant="link" className="p-0 h-auto text-amber-900 underline ml-1 font-semibold">Review SCC status</Button>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consent & Preference Management</CardTitle>
              <CardDescription>Track user opt-ins for cookies, marketing, and data processing.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: 'Necessary Cookies', description: 'Required for platform stability and authentication.', required: true, optInRate: '100%' },
                  { title: 'Analytics & Performance', description: 'Used to improve academic scheduling and resource allocation.', required: false, optInRate: '88%' },
                  { title: 'Communication & Marketing', description: 'Emails regarding school events, newsletters, and updates.', required: false, optInRate: '65%' },
                  { title: 'Third-Party Integration', description: 'Sharing basic data with integrated learning tools (LMS).', required: false, optInRate: '72%' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-2xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        {item.required && <Badge className="text-[10px] h-4">Required</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 max-w-md">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{item.optInRate}</p>
                      <p className="text-xs text-gray-500">Opt-in rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PrivacyCenter;
