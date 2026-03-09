import React, { useState } from 'react'
import { CalendarRange, Clock3, MapPin, Download, Upload, BellRing, AlertTriangle } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const termSummary = [
  { term: 'First Term', start: '09 Sep 2025', end: '06 Dec 2025', exams: '25 Nov - 04 Dec', status: 'In session' },
  { term: 'Second Term', start: '13 Jan 2026', end: '27 Mar 2026', exams: '17 Mar - 26 Mar', status: 'Upcoming' },
  { term: 'Third Term', start: '27 Apr 2026', end: '17 Jul 2026', exams: '07 Jul - 15 Jul', status: 'Upcoming' },
]

const milestoneTimeline = [
  { title: 'CA entry window', date: '12 - 23 Feb', owner: 'Assessment team', status: 'Live' },
  { title: 'Mid-term break', date: '01 Mar', owner: 'Principal', status: 'Locked' },
  { title: 'External competition', date: '08 Mar', owner: 'Student affairs', status: 'Tentative' },
  { title: 'WAEC practicals', date: '15 Mar', owner: 'Exams dept', status: 'High priority' },
]

const eventTable = [
  { type: 'Academic', name: 'STEM Innovation Week', date: '19 Feb', audience: 'SS1-SS3', venue: 'Innovation Hub', state: 'Confirmed' },
  { type: 'Assessment', name: 'Continuous Assessment 2', date: '26 Feb', audience: 'All classes', venue: 'Homerooms', state: 'Live' },
  { type: 'Holiday', name: 'Good Friday', date: '03 Apr', audience: 'All', venue: '—', state: 'Public holiday' },
  { type: 'Compliance', name: 'Curriculum review submission', date: '10 Apr', audience: 'HODs', venue: 'Portal upload', state: 'Due soon' },
]

export function AcademicCalendar() {
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false)
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    date: '',
    owner: '',
    status: 'Tentative' as 'Tentative' | 'Live' | 'Locked' | 'High priority'
  })
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Session heartbeat</p>
          <h1 className="text-2xl font-bold text-gray-900">Academic calendar</h1>
          <p className="text-sm text-gray-600">Visualize term timelines, milestones, and alerts across campuses.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" /> Import ICS
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export calendar
          </Button>
          <Button onClick={() => setAddMilestoneOpen(true)}>
            <CalendarRange className="h-4 w-4 mr-2" /> Add milestone
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {termSummary.map((term) => (
          <Card key={term.term}>
            <CardHeader>
              <CardTitle className="text-base">{term.term}</CardTitle>
              <CardDescription>{term.status}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">Start</p>
                <p className="font-semibold text-gray-900">{term.start}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">End</p>
                <p className="font-semibold text-gray-900">{term.end}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Exam window</p>
                <p className="font-semibold text-gray-900">{term.exams}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Milestone timeline</CardTitle>
            <CardDescription>All academic-critical events sorted by urgency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestoneTimeline.map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.owner}</p>
                  <p className="text-[11px] text-gray-400">{item.date}</p>
                </div>
                <Badge variant={item.status === 'High priority' ? 'destructive' : 'secondary'} className="text-[11px] uppercase tracking-wide">
                  {item.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert center</CardTitle>
            <CardDescription>Automated nudges from timetable, exams, and compliance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${idx === 2 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {idx === 3 ? <AlertTriangle className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
                </div>
                <div className="flex-1 text-sm text-gray-900">
                  <p>{idx === 1 ? 'Exam timetable conflict detected for SS2 Science.' : idx === 2 ? 'Waec practical rehearsal overlaps with CA window.' : 'Curriculum uploads pending for 2 electives.'}</p>
                  <p className="text-xs text-gray-500 mt-1">{idx === 1 ? 'Resolve by assigning alternate lab.' : idx === 2 ? 'Confirm reschedule with principal.' : 'Remind HODs to upload scheme of work.'}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event matrix</CardTitle>
          <CardDescription>Filterable grid across activity type and audience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between text-sm text-gray-600">
            <div className="flex gap-2">
              <Badge variant="outline">Academic</Badge>
              <Badge variant="outline">Assessment</Badge>
              <Badge variant="outline">Compliance</Badge>
              <Badge variant="outline">Holiday</Badge>
            </div>
            <div className="text-xs text-gray-500">Session: 2025/2026 • Term 1</div>
          </div>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventTable.map((event) => (
                  <TableRow key={event.name}>
                    <TableCell className="font-semibold text-gray-900">{event.type}</TableCell>
                    <TableCell>{event.name}</TableCell>
                    <TableCell>{event.date}</TableCell>
                    <TableCell>{event.audience}</TableCell>
                    <TableCell>{event.venue}</TableCell>
                    <TableCell>
                      <Badge variant={event.state === 'High priority' ? 'destructive' : 'secondary'} className="text-xs">
                        {event.state}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 p-4 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              Sync with facility bookings
            </div>
            <Button variant="outline" size="sm">
              Connect now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addMilestoneOpen} onOpenChange={setAddMilestoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Milestone</DialogTitle>
            <DialogDescription>Create a new academic milestone for the calendar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="milestone-title">Title</Label>
              <Input
                id="milestone-title"
                placeholder="e.g., Mid-term break"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="milestone-date">Date</Label>
              <Input
                id="milestone-date"
                placeholder="e.g., 01 Mar"
                value={newMilestone.date}
                onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="milestone-owner">Owner</Label>
              <Input
                id="milestone-owner"
                placeholder="e.g., Principal"
                value={newMilestone.owner}
                onChange={(e) => setNewMilestone({ ...newMilestone, owner: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="milestone-status">Status</Label>
              <Select value={newMilestone.status} onValueChange={(value: typeof newMilestone.status) => setNewMilestone({ ...newMilestone, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tentative">Tentative</SelectItem>
                  <SelectItem value="Live">Live</SelectItem>
                  <SelectItem value="Locked">Locked</SelectItem>
                  <SelectItem value="High priority">High priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddMilestoneOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              console.log('Adding milestone:', newMilestone)
              setNewMilestone({ title: '', date: '', owner: '', status: 'Tentative' })
              setAddMilestoneOpen(false)
            }}>Add Milestone</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
export default AcademicCalendar;
