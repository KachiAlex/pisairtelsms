import React, { useEffect, useState } from 'react'
import { X, Wand2, AlertTriangle, CheckCircle, RefreshCcw, UploadCloud } from 'lucide-react'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { tenantApiGet, tenantApiPost } from '../../../lib/tenantApi'

interface ClassArm {
  id: string
  name: string
  arm?: string
}

interface MatrixRow {
  class: string
  subject: string
  teacher: string | null
  coverage: string
}

interface DetectedConflict {
  type: string
  severity: 'high' | 'medium' | 'low'
  entityType: string
  entityId: string
  description: string
}

interface BatchResult {
  classes: { classId: string; className: string; created: number; capacity: number; failed: { subjectName: string; reason: string }[] }[]
  skipped: { className: string; reason: string }[]
  uncovered: { className: string; subjectName: string }[]
  totalCreated: number
  conflicts: DetectedConflict[]
}

interface Props {
  open: boolean
  onClose: () => void
  termId: string
  termName?: string
  onDone: () => void
}

const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

export function BatchScheduleDialog({ open, onClose, termId, termName, onDone }: Props) {
  const [classes, setClasses] = useState<ClassArm[]>([])
  const [matrix, setMatrix] = useState<MatrixRow[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BatchResult | null>(null)
  const [published, setPublished] = useState(false)
  const [clearExisting, setClearExisting] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    setResult(null)
    setPublished(false)
    Promise.all([
      tenantApiGet('/api/tenant/academics/classes').then(r => r.json()),
      tenantApiGet('/api/tenant/teacher-allocation-handler?action=matrix').then(r => r.json()).catch(() => ({})),
    ])
      .then(([classesData, matrixData]) => {
        setClasses(Array.isArray(classesData.data) ? classesData.data : [])
        setMatrix(Array.isArray(matrixData.data) ? matrixData.data : [])
      })
      .catch(() => setError('Failed to load classes and allocations'))
      .finally(() => setLoading(false))
  }, [open])

  function rowsForClass(cls: ClassArm): MatrixRow[] {
    const keys = [norm(cls.name), norm(`${cls.name}${cls.arm || ''}`), norm(`${cls.name} ${cls.arm || ''}`)]
    return matrix.filter(m => keys.includes(norm(m.class)))
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setResult(null)
    try {
      const res = await tenantApiPost('/api/tenant/timetable/auto-schedule-all', {
        termId,
        clearExisting,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Generation failed')
        if (data.data?.skipped) setResult({ classes: [], skipped: data.data.skipped, uncovered: data.data.uncovered || [], totalCreated: 0, conflicts: [] })
        return
      }
      setResult(data.data)
    } catch {
      setError('Network error during generation')
    } finally {
      setGenerating(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setError(null)
    try {
      const res = await tenantApiPost('/api/tenant/timetable/publish', { termId, action: 'publish' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Publish failed')
        return
      }
      setPublished(true)
      setTimeout(onDone, 800)
    } catch {
      setError('Network error during publish')
    } finally {
      setPublishing(false)
    }
  }

  if (!open) return null

  const readyClasses = classes.filter(c => rowsForClass(c).length > 0)
  const unreadyClasses = classes.filter(c => rowsForClass(c).length === 0)
  const totalOpen = matrix.filter(m => m.coverage === 'Open' || !m.teacher).length
  const highConflicts = result?.conflicts.filter(c => c.severity === 'high') || []

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Auto-Schedule All Classes</h3>
              <p className="text-xs text-gray-500">Generate timetables for every class{termName ? ` — ${termName}` : ''} from the teacher allocation matrix</p>
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

          {published && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              Timetable published — students, parents and staff can now see it.
            </div>
          )}

          {/* Allocation readiness */}
          {!result && (
            <>
              {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />)}</div>
              ) : matrix.length === 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700 space-y-1">
                  <p className="font-semibold">No teacher allocations found.</p>
                  <p>Set up the Teacher Allocation matrix first (who teaches which subject in each class), then come back to generate the whole school's timetable in one pass.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-600">
                          <th className="px-3 py-2">Class</th>
                          <th className="px-3 py-2 text-center">Subjects</th>
                          <th className="px-3 py-2 text-center">Teachers assigned</th>
                          <th className="px-3 py-2 text-center">Unassigned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readyClasses.map(c => {
                          const rows = rowsForClass(c)
                          const open = rows.filter(r => r.coverage === 'Open' || !r.teacher).length
                          return (
                            <tr key={c.id} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2 font-medium text-gray-800">{c.name}{c.arm ? ` ${c.arm}` : ''}</td>
                              <td className="px-3 py-2 text-center">{rows.length}</td>
                              <td className="px-3 py-2 text-center text-emerald-700">{rows.length - open}</td>
                              <td className={`px-3 py-2 text-center ${open > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>{open}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {unreadyClasses.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {unreadyClasses.length} class{unreadyClasses.length > 1 ? 'es' : ''} skipped (no allocations): {unreadyClasses.map(c => `${c.name}${c.arm ? ` ${c.arm}` : ''}`).join(', ')}
                    </p>
                  )}
                  {totalOpen > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {totalOpen} subject{totalOpen > 1 ? 's have' : ' has'} no assigned teacher — they'll be placed marked "Unassigned" so you can fill them later.
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="batch-clear"
                      checked={clearExisting}
                      onChange={e => setClearExisting(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="batch-clear" className="text-sm text-gray-600 cursor-pointer">
                      Clear existing entries before generating
                    </Label>
                  </div>
                </>
              )}
            </>
          )}

          {/* Results */}
          {result && !published && (
            <div className="space-y-3">
              <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${highConflicts.length === 0 ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-amber-50 border border-amber-100 text-amber-700'}`}>
                {highConflicts.length === 0 ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
                <span>
                  {result.totalCreated} entries created across {result.classes.length} class{result.classes.length !== 1 ? 'es' : ''}
                  {highConflicts.length > 0 && ` — ${highConflicts.length} teacher conflict(s) found`}
                </span>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-600">
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2 text-center">Placed</th>
                      <th className="px-3 py-2 text-center">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.classes.map(c => (
                      <tr key={c.classId} className="border-b border-gray-100 last:border-0 align-top">
                        <td className="px-3 py-2 font-medium text-gray-800">{c.className}</td>
                        <td className="px-3 py-2 text-center">{c.created}/{c.capacity}</td>
                        <td className="px-3 py-2 text-xs text-amber-700">
                          {c.failed.length === 0 ? <span className="text-gray-300">—</span> : (
                            <ul className="space-y-0.5 text-left">
                              {c.failed.map((f, i) => <li key={i}>• {f.subjectName}: {f.reason}</li>)}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.skipped.length > 0 && (
                <ul className="text-xs text-gray-500 space-y-0.5 pl-4">
                  {result.skipped.map((s, i) => <li key={i}>• {s.className}: {s.reason}</li>)}
                </ul>
              )}

              {result.conflicts.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Conflict review</p>
                  <ul className="text-xs space-y-1">
                    {result.conflicts.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`mt-0.5 inline-block h-2 w-2 rounded-full flex-shrink-0 ${c.severity === 'high' ? 'bg-red-500' : c.severity === 'medium' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                        <span className="text-gray-600">{c.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50">
          <Button variant="outline" size="sm" onClick={onClose} disabled={generating || publishing}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          <div className="flex gap-2">
            {result && !published && highConflicts.length === 0 && (
              <Button size="sm" onClick={handlePublish} disabled={publishing} className="bg-emerald-600 hover:bg-emerald-700">
                <UploadCloud className="h-4 w-4 mr-1" />
                {publishing ? 'Publishing…' : 'Publish Timetable'}
              </Button>
            )}
            {!result && (
              <Button size="sm" onClick={handleGenerate} disabled={generating || loading || readyClasses.length === 0} className="bg-blue-600 hover:bg-blue-700">
                {generating ? <RefreshCcw className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
                {generating ? 'Generating…' : `Generate for ${readyClasses.length} class${readyClasses.length !== 1 ? 'es' : ''}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
