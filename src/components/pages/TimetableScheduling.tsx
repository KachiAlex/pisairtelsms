import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'

import { Button } from '../ui/button'
import { PageHint } from '../ui/page-hint'
import { ConfigureTab } from './timetable/ConfigureTab'
import { ClassTimetableTab } from './timetable/ClassTimetableTab'
import { TeacherTimetableTab } from './timetable/TeacherTimetableTab'
import { ExamScheduleTab } from './timetable/ExamScheduleTab'

type TimetableView = 'configure' | 'class' | 'teacher' | 'exam'

const viewMeta: Record<TimetableView, { title: string; description: string }> = {
  configure: {
    title: 'Timetable configuration',
    description: 'Set up calendars, time slots, and academic terms.',
  },
  class: {
    title: 'Class timetable orchestration',
    description: 'Balance subjects across arms, detect clashes early, and push polished grids to homerooms.',
  },
  teacher: {
    title: 'Teacher allocation dashboard',
    description: 'Track individual workloads, late changes, and synchronous classes for each educator.',
  },
  exam: {
    title: 'Exam & assessment scheduler',
    description: 'Stage CBT, paper exams, and practicals with hall capacity, invigilators, and logistics.',
  },
}

interface TimetableSchedulingProps {
  initialView?: TimetableView
}

export function TimetableScheduling({ initialView = 'class' }: TimetableSchedulingProps) {
  const navigate = useNavigate()
  const activeView = initialView
  const config = viewMeta[activeView]

  const handleViewChange = (view: TimetableView) => {
    navigate(`/tenant/timetable-${view}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Timetable &amp; Scheduling</h1>
          <p className="text-sm text-gray-600">{config.description}</p>
        </div>
      </div>

      <PageHint
        id="timetable"
        title="Build timetables in order"
        tips={[
          'Start in Configure: set the academic period, school days, and period times — everything else builds on this.',
          'Then open Class view to fill each period with subject and teacher. Classes and teachers must exist first (Classes & Arms, Staff Management).',
          'Teacher view shows workloads per educator; Exam view schedules CBT and paper assessments.',
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {(['configure', 'class', 'teacher', 'exam'] as TimetableView[]).map((view) => (
          <Button
            key={view}
            variant={activeView === view ? 'default' : 'outline'}
            onClick={() => handleViewChange(view)}
            className={activeView === view ? 'bg-blue-600 text-white' : ''}
          >
            {view === 'configure' && <><Settings className="h-4 w-4 mr-2" />Configure</>}
            {view === 'class' && 'Class view'}
            {view === 'teacher' && 'Teacher view'}
            {view === 'exam' && 'Exam view'}
          </Button>
        ))}
      </div>

      {activeView === 'configure' && <ConfigureTab />}

      {activeView === 'class' && <ClassTimetableTab />}

      {activeView === 'teacher' && <TeacherTimetableTab />}

      {activeView === 'exam' && <ExamScheduleTab />}
    </div>
  )
}
export default TimetableScheduling;
