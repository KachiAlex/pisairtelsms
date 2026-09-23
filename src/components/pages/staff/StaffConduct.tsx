import React, { useState, useEffect, useCallback } from 'react'
import { ShieldAlert, Award, MessageSquare, RefreshCw, Loader2, Send } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { Alert, AlertDescription } from '../../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { useToast } from '../../ui/use-toast'
import { tenantApiGet, tenantApiFetch } from '../../../lib/tenantApi'

interface AllocatedClass { id: string; name: string; arm?: string; subjects: string[] }
interface StudentItem { id: string; name: string; admissionNo?: string; class?: string }
interface IncidentRow {
  id: string; student_id: string; student_name: string; date: string
  type: string; description: string; severity: string; action_taken: string; reported_by: string
}
interface RecognitionRow {
  id: string; student_id: string; student_name: string; date: string
  type: string; description: string; awarded_by: string
}
interface CommentRow {
  id: string; student_id: string; student_name: string; date: string
  subject: string; comment: string; teacher: string
}

const INCIDENT_TYPES = ['Lateness', 'Disruption', 'Fighting', 'Bullying', 'Damage to property', 'Uniform violation', 'Truancy', 'Other']
const RECOGNITION_TYPES = ['Academic excellence', 'Good conduct', 'Helping others', 'Leadership', 'Sports', 'Improvement', 'Other']
const SEVERITIES = ['minor', 'moderate', 'severe']

export function StaffConduct() {
  const { toast } = useToast()
  const [classes, setClasses] = useState<AllocatedClass[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<StudentItem[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [incidents, setIncidents] = useState<IncidentRow[]>([])
  const [recognition, setRecognition] = useState<RecognitionRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])

  const [kind, setKind] = useState<'incident' | 'recognition' | 'comment'>('incident')
  const [form, setForm] = useState({ type: '', severity: 'minor', subject: '', description: '', actionTaken: '', date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [actionDrafts, setActionDrafts] = useState<Record<string, string>>({})

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true)
    setLoadError(null)
    try {
      const res = await tenantApiGet('/api/staff/classes')
      if (!res.ok) throw new Error(`Failed to load classes (${res.status})`)
      const data = await res.json()
      setClasses(data.classes ?? data.data ?? [])
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load classes')
    } finally {
      setLoadingClasses(false)
    }
  }, [])

  useEffect(() => { loadClasses() }, [loadClasses])

  const loadRecords = useCallback(async (cls: string) => {
    if (!cls) return
    setLoadingRecords(true)
    try {
      const res = await tenantApiGet(`/api/tenant/behavioral?class=${encodeURIComponent(cls)}`)
      if (!res.ok) throw new Error(`Failed to load records (${res.status})`)
      const data = await res.json()
      setIncidents(data.incidents ?? [])
      setRecognition(data.recognition ?? [])
      setComments(data.comments ?? [])
    } catch {
      setIncidents([]); setRecognition([]); setComments([])
    } finally {
      setLoadingRecords(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return }
    setLoadingStudents(true)
    tenantApiGet(`/api/tenant/students?class=${encodeURIComponent(selectedClass)}&status=active`)
      .then(async r => {
        if (!r.ok) throw new Error()
        const data = await r.json()
        setStudents((data.data ?? data.students ?? []).map((s: any) => ({
          id: s.id, name: s.name, admissionNo: s.admissionNo || s.admission_no,
        })))
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false))
    loadRecords(selectedClass)
  }, [selectedClass, loadRecords])

  const submit = async () => {
    if (!selectedStudent) { toast({ title: 'Select a student first', variant: 'destructive' }); return }
    setSubmitting(true)
    try {
      const payload: Record<string, string> = {
        kind, studentId: selectedStudent,
        type: form.type, severity: form.severity, subject: form.subject,
        description: form.description, comment: form.description,
        actionTaken: form.actionTaken, date: form.date,
      }
      const res = await tenantApiFetch('/api/tenant/behavioral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`)
      toast({ title: 'Recorded', description: 'The record is now visible to the student’s parents.' })
      setForm({ type: '', severity: 'minor', subject: '', description: '', actionTaken: '', date: '' })
      await loadRecords(selectedClass)
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const saveAction = async (incidentId: string) => {
    const actionTaken = (actionDrafts[incidentId] ?? '').trim()
    if (!actionTaken) return
    try {
      const res = await tenantApiFetch('/api/tenant/behavioral', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'incident', id: incidentId, actionTaken }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Action recorded' })
      await loadRecords(selectedClass)
    } catch {
      toast({ title: 'Failed to save action', variant: 'destructive' })
    }
  }

  const studentName = (id: string) => students.find(s => s.id === id)?.name || ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Student Conduct</h1>
        <p className="text-sm text-gray-600">
          Record behavioral incidents, positive recognition, and comments for students in your classes.
          Parents see these on the Behavioral Reports page.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label>Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass} disabled={loadingClasses}>
            <SelectTrigger className="w-56"><SelectValue placeholder={loadingClasses ? 'Loading…' : 'Select class'} /></SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.arm ? `${c.name} ${c.arm}` : c.name}>{c.arm ? `${c.name} ${c.arm}` : c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Student</Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass || loadingStudents}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={loadingStudents ? 'Loading…' : 'Select student'} />
            </SelectTrigger>
            <SelectContent>
              {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.admissionNo ? ` (${s.admissionNo})` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedClass && (
          <Button variant="outline" size="sm" onClick={() => loadRecords(selectedClass)} disabled={loadingRecords}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingRecords ? 'animate-spin' : ''}`} /> Refresh records
          </Button>
        )}
      </div>

      {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}
      {!loadingClasses && classes.length === 0 && !loadError && (
        <Alert><AlertDescription>No classes are allocated to you yet. Ask an administrator to set up teacher allocations.</AlertDescription></Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New record</CardTitle>
          <CardDescription>
            {selectedStudent ? `Recording for ${studentName(selectedStudent)}` : 'Choose a class and student above.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={kind} onValueChange={v => setKind(v as typeof kind)}>
            <TabsList>
              <TabsTrigger value="incident"><ShieldAlert className="w-4 h-4 mr-1" /> Incident</TabsTrigger>
              <TabsTrigger value="recognition"><Award className="w-4 h-4 mr-1" /> Recognition</TabsTrigger>
              <TabsTrigger value="comment"><MessageSquare className="w-4 h-4 mr-1" /> Comment</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 md:grid-cols-3">
            {kind !== 'comment' && (
              <div className="space-y-1">
                <Label>{kind === 'incident' ? 'Incident type' : 'Recognition type'}</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {(kind === 'incident' ? INCIDENT_TYPES : RECOGNITION_TYPES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {kind === 'incident' && (
              <div className="space-y-1">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {kind === 'comment' && (
              <div className="space-y-1">
                <Label>Subject (optional)</Label>
                <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{kind === 'comment' ? 'Comment' : 'Description'}</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={kind === 'incident' ? 'What happened, when, and who was involved' : kind === 'recognition' ? 'What the student did well' : 'Comment for parents'}
              className="min-h-[90px]"
            />
          </div>

          {kind === 'incident' && (
            <div className="space-y-1">
              <Label>Action taken (optional)</Label>
              <Input value={form.actionTaken} onChange={e => setForm(f => ({ ...f, actionTaken: e.target.value }))} placeholder="e.g. Verbal warning, sent to principal" />
            </div>
          )}

          <Button onClick={submit} disabled={submitting || !selectedStudent || !form.description.trim() || (kind !== 'comment' && !form.type)}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Save record
          </Button>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Records — {selectedClass}</CardTitle>
            <CardDescription>Newest first. Parents see incidents, recognition, and comments immediately.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRecords ? (
              <div className="py-8 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading…</div>
            ) : incidents.length + recognition.length + comments.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No conduct records for this class yet.</p>
            ) : (
              <Tabs defaultValue="incidents">
                <TabsList>
                  <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
                  <TabsTrigger value="recognition">Recognition ({recognition.length})</TabsTrigger>
                  <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="incidents">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead><TableHead>Description</TableHead><TableHead>Action taken</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map(i => (
                        <TableRow key={i.id}>
                          <TableCell className="whitespace-nowrap text-sm">{i.date}</TableCell>
                          <TableCell className="text-sm font-medium">{i.student_name}</TableCell>
                          <TableCell className="text-sm">{i.type}</TableCell>
                          <TableCell><Badge variant={i.severity === 'severe' ? 'destructive' : i.severity === 'moderate' ? 'default' : 'secondary'} className="capitalize">{i.severity}</Badge></TableCell>
                          <TableCell className="text-sm max-w-xs">{i.description}</TableCell>
                          <TableCell>
                            <div className="flex gap-2 items-center">
                              <Input
                                className="h-8 text-xs w-40"
                                placeholder="Follow-up action…"
                                value={actionDrafts[i.id] ?? i.action_taken ?? ''}
                                onChange={e => setActionDrafts(d => ({ ...d, [i.id]: e.target.value }))}
                              />
                              <Button size="sm" variant="outline" onClick={() => saveAction(i.id)}>Save</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="recognition">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Awarded by</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {recognition.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-sm">{r.date}</TableCell>
                          <TableCell className="text-sm font-medium">{r.student_name}</TableCell>
                          <TableCell className="text-sm">{r.type}</TableCell>
                          <TableCell className="text-sm">{r.description}</TableCell>
                          <TableCell className="text-sm text-gray-500">{r.awarded_by}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="comments">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Comment</TableHead><TableHead>Teacher</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {comments.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="whitespace-nowrap text-sm">{c.date}</TableCell>
                          <TableCell className="text-sm font-medium">{c.student_name}</TableCell>
                          <TableCell className="text-sm">{c.subject || '—'}</TableCell>
                          <TableCell className="text-sm">{c.comment}</TableCell>
                          <TableCell className="text-sm text-gray-500">{c.teacher}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default StaffConduct
