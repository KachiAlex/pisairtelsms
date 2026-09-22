import React, { useEffect, useState } from 'react'
import { Copy, Plus, Printer, RefreshCcw, UploadCloud, Wand2, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Badge } from '../../ui/badge'
import { TimetableEntryModal } from './TimetableEntryModal'
import { AutoScheduleDialog } from './AutoScheduleDialog'
import { BatchScheduleDialog } from './BatchScheduleDialog'
import { tenantApiGet, tenantApiPost } from '../../../lib/tenantApi'

const DAY_HEADERS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_NUMS = [1, 2, 3, 4, 5]

interface ScheduleEntry {
  id: string
  timeSlotId: string
  subjectId?: string
  subjectName: string
  teacherId?: string
  teacherName: string
  roomId?: string
  dayOfWeek: number
}

interface ClassSchedule {
  id: string
  classId: string
  termId: string
  status?: 'draft' | 'published'
  entries: ScheduleEntry[]
}

interface TimeSlot {
  id: string
  name: string
  startTime: string
  endTime: string
  isBreak: boolean
  sequence: number
}

interface Term {
  id: string
  name: string
  academicYear: string
}

interface ClassArm {
  id: string
  name: string
  arm?: string
}

export function ClassTimetableTab() {
  const [terms, setTerms] = useState<Term[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [classes, setClasses] = useState<ClassArm[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [schedule, setSchedule] = useState<ClassSchedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalSlot, setModalSlot] = useState<{ timeSlotId: string; dayOfWeek: number; entry?: ScheduleEntry } | null>(null)
  const [showAutoSchedule, setShowAutoSchedule] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [copying, setCopying] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    async function loadConfig() {
      try {
        const [calRes, slotsRes, classesRes] = await Promise.all([
          tenantApiGet('/api/tenant/timetable/calendar'),
          tenantApiGet('/api/tenant/timetable/time-slots'),
          tenantApiGet('/api/tenant/academics/classes'),
        ])
        const calData = await calRes.json()
        const slotsData = await slotsRes.json()
        const classesData = await classesRes.json()
        const fetchedTerms: Term[] = Array.isArray(calData.data?.terms) ? calData.data.terms : []
        const fetchedClasses: ClassArm[] = Array.isArray(classesData.data) ? classesData.data : []
        setTerms(fetchedTerms)
        setTimeSlots(Array.isArray(slotsData.data) ? [...slotsData.data].sort((a: TimeSlot, b: TimeSlot) => a.sequence - b.sequence) : [])
        setClasses(fetchedClasses)
        if (fetchedTerms.length > 0) setSelectedTerm(fetchedTerms[0].id)
        if (fetchedClasses.length > 0) setSelectedClass(fetchedClasses[0].id)
      } catch {
        setError('Failed to load configuration')
      }
    }
    loadConfig()
  }, [])

  useEffect(() => {
    if (!selectedTerm) return
    loadSchedule()
  }, [selectedClass, selectedTerm])

  async function loadSchedule() {
    setLoading(true)
    setError(null)
    try {
      const res = await tenantApiGet(`/api/tenant/timetable/class-schedules?classId=${encodeURIComponent(selectedClass)}&termId=${selectedTerm}`)
      const data = await res.json()
      const schedules: ClassSchedule[] = data.data || []
      if (schedules.length > 0) {
        const detailRes = await tenantApiGet(`/api/tenant/timetable/class-schedules?scheduleId=${schedules[0].id}`)
        const detailData = await detailRes.json()
        setSchedule(detailData.data)
      } else {
        setSchedule(null)
      }
    } catch {
      setError('Failed to load class schedule')
    } finally {
      setLoading(false)
    }
  }

  async function ensureScheduleExists(): Promise<string | null> {
    if (schedule) return schedule.id
    try {
      const res = await tenantApiPost('/api/tenant/timetable/class-schedules', { classId: selectedClass, termId: selectedTerm })
      const data = await res.json()
      return data.data?.id || null
    } catch {
      return null
    }
  }

  function getCellEntry(timeSlotId: string, dayOfWeek: number): ScheduleEntry | undefined {
    return schedule?.entries.find(e => e.timeSlotId === timeSlotId && e.dayOfWeek === dayOfWeek)
  }

  function openModal(timeSlotId: string, dayOfWeek: number, entry?: ScheduleEntry) {
    setModalSlot({ timeSlotId, dayOfWeek, entry })
    setShowModal(true)
  }

  async function handleEntrySaved() {
    setShowModal(false)
    await loadSchedule()
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function handlePrint() {
    const classLabel = classes.find(c => c.id === selectedClass)
    const termLabel = terms.find(t => t.id === selectedTerm)
    const className = `${classLabel?.name || ''}${classLabel?.arm ? ` ${classLabel.arm}` : ''}`.trim() || 'Class'
    const termName = termLabel ? `${termLabel.name} (${termLabel.academicYear})` : ''

    const rows = timeSlots.map(slot => {
      const head = `<td class="slot"><strong>${escapeHtml(slot.name)}</strong><br/><small>${slot.startTime}–${slot.endTime}</small></td>`
      if (slot.isBreak) {
        return `<tr>${head}<td colspan="5" class="break">${escapeHtml(slot.name)}</td></tr>`
      }
      const cells = DAY_NUMS.map(day => {
        const e = getCellEntry(slot.id, day)
        return `<td>${e ? `<strong>${escapeHtml(e.subjectName)}</strong><br/><small>${escapeHtml(e.teacherName)}</small>` : '—'}</td>`
      }).join('')
      return `<tr>${head}${cells}</tr>`
    }).join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Timetable — ${escapeHtml(className)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #111; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.sub { margin: 0 0 16px; color: #555; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: center; vertical-align: middle; }
  th { background: #f0f0f0; }
  td.slot { text-align: left; white-space: nowrap; width: 110px; }
  td.break { background: #f5f5f5; color: #666; font-style: italic; letter-spacing: 0.05em; }
  small { color: #555; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Weekly Timetable — ${escapeHtml(className)}</h1>
<p class="sub">${escapeHtml(termName)}</p>
<table><thead><tr><th style="text-align:left">Time Slot</th>${DAY_HEADERS.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
<script>window.onload = function(){ window.print(); }</script>
</body></html>`

    const w = window.open('', '_blank', 'width=1100,height=800')
    if (!w) return
    w.document.write(html)
    w.document.close()
  }

  async function handlePublish(action: 'publish' | 'unpublish') {
    setPublishing(true)
    setError(null)
    setNotice(null)
    try {
      const res = await tenantApiPost('/api/tenant/timetable/publish', { termId: selectedTerm, action })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Failed to ${action}`)
        return
      }
      setNotice(action === 'publish' ? 'Timetable published — now visible to students, parents and staff.' : 'Timetable unpublished — reverted to draft.')
      await loadSchedule()
    } catch {
      setError(`Network error during ${action}`)
    } finally {
      setPublishing(false)
    }
  }

  async function handleCopyTerm(fromTermId: string) {
    if (!fromTermId) return
    setCopying(true)
    setError(null)
    setNotice(null)
    try {
      const res = await tenantApiPost('/api/tenant/timetable/copy-term', { fromTermId, toTermId: selectedTerm })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to copy term')
        return
      }
      setNotice(`Copied ${data.data?.entriesCopied ?? 0} entries across ${data.data?.schedulesCopied ?? 0} class(es) as drafts.`)
      await loadSchedule()
    } catch {
      setError('Network error during copy')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-48"><SelectValue placeholder={classes.length === 0 ? 'No classes' : undefined} /></SelectTrigger>
          <SelectContent>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.arm ? ` ${c.arm}` : ''}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-48"><SelectValue placeholder={terms.length === 0 ? 'No terms yet' : undefined} /></SelectTrigger>
          <SelectContent>
            {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.academicYear})</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadSchedule}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowAutoSchedule(true)} disabled={!selectedTerm} className="border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50">
          <Wand2 className="h-4 w-4 mr-1" /> Auto Schedule
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowBatch(true)} disabled={!selectedTerm} className="border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50">
          <Zap className="h-4 w-4 mr-1" /> All Classes
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || timeSlots.length === 0}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
        {schedule && (
          schedule.status === 'published' ? (
            <Button variant="outline" size="sm" onClick={() => handlePublish('unpublish')} disabled={publishing} className="border-gray-300 text-gray-600">
              <UploadCloud className="h-4 w-4 mr-1" /> {publishing ? 'Working…' : 'Unpublish'}
            </Button>
          ) : (
            <Button size="sm" onClick={() => handlePublish('publish')} disabled={publishing} className="bg-emerald-600 hover:bg-emerald-700">
              <UploadCloud className="h-4 w-4 mr-1" /> {publishing ? 'Publishing…' : 'Publish Term'}
            </Button>
          )
        )}
        {terms.length > 1 && (
          <Select value="" onValueChange={handleCopyTerm} disabled={copying}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder={copying ? 'Copying…' : 'Copy from term…'} />
            </SelectTrigger>
            <SelectContent>
              {terms.filter(t => t.id !== selectedTerm).map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> {t.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {classes.find(c => c.id === selectedClass)?.name || selectedClass} — Weekly Timetable
            {schedule && (
              <Badge variant="secondary" className={schedule.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                {schedule.status === 'published' ? 'Published' : 'Draft'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {schedule?.status === 'published'
              ? 'Published — visible to students, parents and staff. Click a cell to reassign or clear it'
              : 'Draft — only visible here until published. Click a cell to assign, change, or clear a subject and teacher'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />)}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Time Slot</TableHead>
                    {DAY_HEADERS.map(d => <TableHead key={d} className="text-center">{d}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeSlots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-8">
                        No time slots configured. Go to Configure → Time Slots to set up your school day.
                      </TableCell>
                    </TableRow>
                  ) : (
                    timeSlots.map(slot => (
                      <TableRow key={slot.id} className={slot.isBreak ? 'bg-gray-50' : undefined}>
                        <TableCell className="font-medium text-xs text-gray-700">
                          <p>{slot.name}</p>
                          <p className="text-gray-400">{slot.startTime}–{slot.endTime}</p>
                        </TableCell>
                        {slot.isBreak ? (
                          <TableCell colSpan={5} className="text-center text-xs text-gray-400 italic tracking-wide">
                            {slot.name}
                          </TableCell>
                        ) : DAY_NUMS.map(day => {
                          const entry = getCellEntry(slot.id, day)
                          return (
                            <TableCell key={day} className="text-center p-1">
                              {entry ? (
                                <button
                                  onClick={() => openModal(slot.id, day, entry)}
                                  title="Click to edit or remove"
                                  className="w-full rounded-lg bg-blue-50 border border-blue-100 p-1.5 text-xs text-left hover:border-blue-400 hover:bg-blue-100 transition cursor-pointer"
                                >
                                  <p className="font-semibold text-blue-800">{entry.subjectName}</p>
                                  <p className="text-blue-600">{entry.teacherName}</p>
                                </button>
                              ) : (
                                <button
                                  onClick={() => openModal(slot.id, day)}
                                  className="w-full h-10 rounded-lg border border-dashed border-gray-200 text-gray-300 hover:border-blue-300 hover:text-blue-400 transition flex items-center justify-center"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && modalSlot && (
        <TimetableEntryModal
          scheduleId={schedule?.id || null}
          timeSlotId={modalSlot.timeSlotId}
          dayOfWeek={modalSlot.dayOfWeek}
          classId={selectedClass}
          termId={selectedTerm}
          entry={modalSlot.entry}
          onSaved={handleEntrySaved}
          onClose={() => setShowModal(false)}
          ensureSchedule={ensureScheduleExists}
        />
      )}

      <AutoScheduleDialog
        classId={selectedClass}
        className={classes.find(c => c.id === selectedClass)?.name}
        termId={selectedTerm}
        open={showAutoSchedule}
        onClose={() => setShowAutoSchedule(false)}
        onScheduled={() => {
          setShowAutoSchedule(false)
          loadSchedule()
        }}
      />

      <BatchScheduleDialog
        open={showBatch}
        onClose={() => setShowBatch(false)}
        termId={selectedTerm}
        termName={terms.find(t => t.id === selectedTerm)?.name}
        onDone={() => {
          setShowBatch(false)
          loadSchedule()
        }}
      />
    </div>
  )
}
