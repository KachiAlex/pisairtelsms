import React from 'react'
import { UploadCloud, Download, FileSpreadsheet, AlertTriangle, History } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'

const importJobs = [
  {
    id: 'job-1',
    dataset: 'Student enrollment (CSV)',
    status: 'processing' as const,
    progress: 62,
    startedAt: '09:12',
  },
  {
    id: 'job-2',
    dataset: 'Staff directory (XLSX)',
    status: 'succeeded' as const,
    progress: 100,
    startedAt: 'Yesterday',
  },
]

const exportSlots = [
  { dataset: 'Fee ledger', description: 'Term invoices, settlements, and waivers', size: '22 MB' },
  { dataset: 'Attendance history', description: 'Daily swipe logs across classes', size: '18 MB' },
  { dataset: 'Assessment results', description: 'CA + exams with grade bands', size: '14 MB' },
]

export function ImportExport() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Data operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Import & export</h1>
          <p className="text-sm text-gray-500">Sync Scholix with your SIS, HR, and finance tooling.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <History className="h-4 w-4 mr-2" />
            View history
          </Button>
          <Button>
            <UploadCloud className="h-4 w-4 mr-2" />
            Start import
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-gray-600">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              Active imports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {importJobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{job.dataset}</p>
                    <p className="text-xs text-gray-500">Started {job.startedAt}</p>
                  </div>
                  <span className={`text-xs font-semibold ${job.status === 'processing' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {job.status === 'processing' ? 'Processing' : 'Completed'}
                  </span>
                </div>
                <Progress value={job.progress} className="mt-3" />
                <div className="mt-2 text-xs text-gray-500">{job.progress}% complete</div>
              </div>
            ))}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Keep the browser tab open while imports run to capture live statuses.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-gray-600">
              <Download className="h-4 w-4 text-emerald-600" />
              Exports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {exportSlots.map((slot) => (
              <div key={slot.dataset} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{slot.dataset}</p>
                    <p className="text-xs text-gray-500">{slot.description}</p>
                  </div>
                  <span className="text-xs text-gray-500">{slot.size}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    CSV export
                  </Button>
                  <Button variant="outline" size="sm">
                    XLSX export
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default ImportExport;
