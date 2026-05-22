import React, { useEffect, useState } from 'react'
import { X, Plus, Trash2, Wand2, AlertTriangle, CheckCircle, Sparkles, RefreshCcw } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Card, CardContent } from '../../ui/card'
import { Badge } from '../../ui/badge'

interface StaffMember {
  id: string
  name: string
  role: string
  department?: string
}

interface Subject {
  id: string
  name: string
  code: string
  department: string
  type: 'Core' | 'Elective'
  levels: string[]
}

interface SubjectRow {
  id: string
  subjectName: string
  teacherId: string
  periodsPerWeek: number
  suggested?: boolean
  subjectCode?: string
}

interface Props {
  classId: string
  termId: string
  open: boolean
  onClose: () => void
  onScheduled: () => void
}

export function AutoScheduleDialog({ classId, termId, open, onClose, onScheduled }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; failed: { subjectName: string; reason: string }[] } | null>(null)
  const [clearExisting, setClearExisting] = useState(false)

  // Extract class level from classId (e.g., "JSS 1A" -> "JSS 1")
  function getClassLevel(classId: string): string {
    const match = classId.match(/^(JSS|SS)\s*(\d+)/i)
    return match ? `${match[1].toUpperCase()} ${match[2]}` : classId
  }

  // Match teacher to subject based on department/role
  function findBestTeacher(subject: Subject): string {
    const classLevel = getClassLevel(classId)
    
    // Priority matching:
    // 1. Teacher role contains subject name
    // 2. Teacher department matches subject department
    // 3. Teacher role contains class level (e.g., "JSS 1 Teacher")
    
    const subjectKeywords = subject.name.toLowerCase().split(' ')
    const deptKeyword = subject.department.toLowerCase()
    
    let bestMatch = ''
    let bestScore = 0
    
    for (const teacher of staff) {
      const roleLower = teacher.role.toLowerCase()
      const deptLower = (teacher.department || '').toLowerCase()
      let score = 0
      
      // Check if role contains subject keywords
      for (const keyword of subjectKeywords) {
        if (keyword.length > 2 && roleLower.includes(keyword)) score += 3
      }
      
      // Department match
      if (deptLower === deptKeyword) score += 2
      if (deptLower.includes(deptKeyword) || deptKeyword.includes(deptLower)) score += 1
      
      // Class level match in role
      if (roleLower.includes(classLevel.toLowerCase())) score += 1
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = teacher.id
      }
    }
    
    return bestMatch
  }

  // Auto-generate subjects with suggested teachers
  function autoGenerateSubjects() {
    setGenerating(true)
    setError(null)
    
    const classLevel = getClassLevel(classId)
    
    // Filter subjects applicable to this class level
    const applicableSubjects = availableSubjects.filter(s => 
      s.levels.some(l => l.toLowerCase() === classLevel.toLowerCase() || 
                         l.toLowerCase().includes(classLevel.toLowerCase().replace(' ', '')))
    )
    
    if (applicableSubjects.length === 0) {
      setError(`No subjects found for ${classLevel}. Please add subjects in the CBT section.`)
      setGenerating(false)
      return
    }
    
    // Create subject rows with suggested teachers
    const generatedRows: SubjectRow[] = applicableSubjects.map(subject => {
      const suggestedTeacherId = findBestTeacher(subject)
      return {
        id: crypto.randomUUID(),
        subjectName: subject.name,
        subjectCode: subject.code,
        teacherId: suggestedTeacherId,
        periodsPerWeek: subject.type === 'Core' ? 5 : 3,
        suggested: !!suggestedTeacherId
      }
    })
    
    setSubjects(generatedRows)
    setGenerating(false)
    setResult(null)
  }

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      fetch('/api/tenant/staff').then(r => r.json()),
      fetch('/api/tenant/cbt/subjects').then(r => r.json())
    ])
      .then(([staffData, subjectsData]) => {
        const members = Array.isArray(staffData.data) ? staffData.data : []
        const subjects = Array.isArray(subjectsData.data) ? subjectsData.data : []
        setStaff(members)
        setAvailableSubjects(subjects)
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [open])

  function addSubject() {
    setSubjects(prev => [...prev, { id: crypto.randomUUID(), subjectName: '', teacherId: '', periodsPerWeek: 3 }])
    setResult(null)
  }

  function removeSubject(id: string) {
    setSubjects(prev => prev.filter(s => s.id !== id))
    setResult(null)
  }

  function updateSubject(id: string, field: keyof SubjectRow, value: string | number) {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
    setResult(null)
  }

  async function handleAutoSchedule() {
    if (!classId || !termId) {
      setError('Class and term must be selected')
      return
    }
    if (subjects.length === 0) {
      setError('Add at least one subject')
      return
    }
    if (subjects.some(s => !s.subjectName.trim() || !s.teacherId)) {
      setError('All subjects must have a name and a teacher')
      return
    }

    setScheduling(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/tenant/timetable/auto-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          termId,
          clearExisting,
          subjects: subjects.map(s => ({
            subjectName: s.subjectName.trim(),
            teacherId: s.teacherId,
            teacherName: staff.find(t => t.id === s.teacherId)?.name || s.teacherId,
            periodsPerWeek: Number(s.periodsPerWeek) || 1,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Auto-scheduling failed')
        return
      }
      setResult({
        created: data.data?.created || 0,
        failed: data.data?.failed || [],
      })
      if ((data.data?.failed || []).length === 0) {
        onScheduled()
      }
    } catch {
      setError('Network error during auto-scheduling')
    } finally {
      setScheduling(false)
    }
  }

  if (!open) return null

  const totalPeriods = subjects.reduce((sum, s) => sum + (Number(s.periodsPerWeek) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Auto-Schedule Subjects</h3>
              <p className="text-xs text-gray-500">Automatically assign subjects to time slots for {classId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && result.failed.length === 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              Successfully created {result.created} schedule entries!
            </div>
          )}

          {result && result.failed.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Partial success: {result.created} entries created, {result.failed.length} subjects had issues</span>
              </div>
              <ul className="text-xs text-amber-600 space-y-1 pl-6">
                {result.failed.map((f, i) => (
                  <li key={i}>• {f.subjectName}: {f.reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="clear-existing"
              checked={clearExisting}
              onChange={e => setClearExisting(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="clear-existing" className="text-sm text-gray-600 cursor-pointer">
              Clear existing schedule before auto-scheduling
            </Label>
          </div>

          {subjects.length === 0 && !loading && (
            <div className="text-center py-8 space-y-4">
              <div className="text-gray-400">
                <p className="text-sm">No subjects added yet.</p>
                <p className="text-xs mt-1">Auto-generate from your subject database or add manually.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={autoGenerateSubjects}
                disabled={generating || staff.length === 0}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                {generating ? (
                  <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {generating ? 'Generating…' : 'Auto-Generate Subjects'}
              </Button>
              {availableSubjects.length === 0 && (
                <p className="text-xs text-amber-600">
                  No subjects found. Please add subjects in CBT → Subjects first.
                </p>
              )}
            </div>
          )}

          {subjects.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {subjects.filter(s => s.suggested).length} of {subjects.length} subjects have suggested teachers
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={autoGenerateSubjects}
                disabled={generating}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </div>
          )}

          {subjects.map((subject, idx) => (
            <Card key={subject.id} className={`border-gray-200 ${subject.suggested ? 'border-l-4 border-l-purple-400' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {subject.subjectCode || `Subject ${idx + 1}`}
                    </span>
                    {subject.suggested && (
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Suggested
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeSubject(subject.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Subject Name</Label>
                    <Input
                      value={subject.subjectName}
                      onChange={e => updateSubject(subject.id, 'subjectName', e.target.value)}
                      placeholder="e.g. Mathematics"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      Teacher
                      {subject.suggested && subject.teacherId && (
                        <span className="text-[10px] text-purple-600">(matched)</span>
                      )}
                    </Label>
                    <Select value={subject.teacherId} onValueChange={v => { updateSubject(subject.id, 'teacherId', v); updateSubject(subject.id, 'suggested', false) }}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={staff.length === 0 ? 'Loading staff…' : 'Select teacher'} />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} — {s.role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Periods/Week</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={subject.periodsPerWeek}
                      onChange={e => updateSubject(subject.id, 'periodsPerWeek', parseInt(e.target.value) || 1)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {subjects.length > 0 && (
            <div className="text-sm text-gray-500 text-right">
              Total periods: <span className="font-semibold text-gray-700">{totalPeriods}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50">
          <Button variant="outline" size="sm" onClick={addSubject}>
            <Plus className="h-4 w-4 mr-1" /> Add Subject
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={scheduling}>Cancel</Button>
            <Button size="sm" onClick={handleAutoSchedule} disabled={scheduling || subjects.length === 0} className="bg-blue-600 hover:bg-blue-700">
              {scheduling ? 'Scheduling…' : (
                <><Wand2 className="h-4 w-4 mr-1" /> Auto-Schedule</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
