import React, { useState, useRef } from 'react'
import { X, Upload, FileText } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'

const SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
  'Geography', 'Economics', 'Civic Education', 'History', 'ICT',
  'Further Mathematics', 'Literature', 'Government', 'Commerce', 'Accounting',
]

const EXAM_TYPES = [
  { value: 'written', label: 'Written' },
  { value: 'cbt', label: 'CBT (Computer-Based)' },
  { value: 'practical', label: 'Practical' },
  { value: 'oral', label: 'Oral' },
]

interface Props {
  examPeriodId: string
  onSaved: () => void
  onClose: () => void
}

export function ExamEntryModal({ examPeriodId, onSaved, onClose }: Props) {
  const [form, setForm] = useState({
    subjectName: '',
    examDate: '',
    startTime: '',
    endTime: '',
    examType: 'written',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importedQuestions, setImportedQuestions] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    if (!form.subjectName || !form.examDate || !form.startTime || !form.endTime) {
      setError('All fields are required')
      return
    }
    if (form.startTime >= form.endTime) {
      setError('Start time must be before end time')
      return
    }
    if (form.examType === 'cbt' && importedQuestions.length === 0) {
      setError('CBT exams require at least one question to be imported')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/tenant/timetable/exam-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examPeriodId,
          subjectId: form.subjectName.toLowerCase().replace(/\s+/g, '-'),
          subjectName: form.subjectName,
          examDate: form.examDate,
          startTime: form.startTime,
          endTime: form.endTime,
          examType: form.examType,
          questions: form.examType === 'cbt' ? importedQuestions : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save exam'); return }
      onSaved()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        let questions: any[] = []
        const result = event.target?.result
        
        if (file.name.endsWith('.json')) {
          const content = result as string
          questions = JSON.parse(content)
        } else if (file.name.endsWith('.csv')) {
          const content = result as string
          const lines = content.split('\n').filter(line => line.trim())
          // Parse CSV: question,optionA,optionB,optionC,optionD,correctAnswer
          questions = lines.slice(1).map((line, idx) => {
            const parts = line.split(',').map(s => s.trim())
            return {
              id: `q${idx + 1}`,
              question: parts[0] || '',
              options: [parts[1] || '', parts[2] || '', parts[3] || '', parts[4] || ''],
              correctAnswer: parseInt(parts[5]) || 0,
              marks: 1,
            }
          })
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // For Excel, we need to handle it differently
          import('xlsx').then(({ read, utils }) => {
            try {
              const arrayBuffer = result as ArrayBuffer
              const workbook = read(arrayBuffer, { type: 'array' })
              const worksheet = workbook.Sheets[workbook.SheetNames[0]]
              const data = utils.sheet_to_json(worksheet)
              
              const parsedQuestions = data.map((row: any, idx: number) => ({
                id: `q${idx + 1}`,
                question: row.question || row.Question || '',
                options: [
                  row.optionA || row.OptionA || row.Option_A || '',
                  row.optionB || row.OptionB || row.Option_B || '',
                  row.optionC || row.OptionC || row.Option_C || '',
                  row.optionD || row.OptionD || row.Option_D || '',
                ],
                correctAnswer: parseInt(row.correctAnswer || row.CorrectAnswer || row.Correct_Answer || '0') || 0,
                marks: parseInt(row.marks || row.Marks || '1') || 1,
              }))
              
              if (parsedQuestions.length === 0) {
                setError('No valid questions found in file')
                return
              }
              
              setImportedQuestions(parsedQuestions)
              setError(null)
            } catch (err) {
              setError('Failed to parse Excel file. Ensure it\'s a valid Excel format.')
            }
          }).catch(() => {
            setError('Failed to load Excel parser. Please try a CSV or JSON file instead.')
          })
          return
        }
        
        if (questions.length === 0) {
          setError('No valid questions found in file')
          return
        }
        
        setImportedQuestions(questions)
        setError(null)
      } catch (err) {
        console.error('File import error:', err)
        setError('Failed to parse file. Ensure it\'s valid JSON, CSV, or Excel format.')
      }
    }
    
    reader.onerror = () => {
      setError('Failed to read file. Please try again.')
    }
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">Schedule New Exam</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Subject</Label>
            <Select value={form.subjectName} onValueChange={v => setForm(f => ({ ...f, subjectName: v }))}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Exam Type</Label>
            <Select value={form.examType} onValueChange={v => setForm(f => ({ ...f, examType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {form.examType === 'cbt' && (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <Label className="text-xs font-semibold text-blue-900">Import Questions (CBT)</Label>
              </div>
              <p className="text-xs text-blue-700 mb-3">
                Upload a JSON, CSV, or Excel file with exam questions. CSV format: question,optionA,optionB,optionC,optionD,correctAnswer
              </p>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.xlsx,.xls"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Choose File
                </Button>
              </div>
              {importedQuestions.length > 0 && (
                <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                  <p className="text-xs text-green-700 font-semibold">
                    ✓ {importedQuestions.length} question{importedQuestions.length !== 1 ? 's' : ''} imported
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Exam Date</Label>
            <Input type="date" value={form.examDate} onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Schedule Exam'}</Button>
        </div>
      </div>
    </div>
  )
}
