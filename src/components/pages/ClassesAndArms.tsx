import React, { useMemo, useState } from 'react'
import { Building2, Users, Sparkles, AlertTriangle, Download, Filter, UserPlus, Merge, SplitSquareHorizontal } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'

const levelSnapshot = [
  { level: 'JSS 1', arms: 4, capacity: 160, enrolled: 148, lead: 'Mrs. Salami', trend: '+4%', genderMix: '52% ♀ | 48% ♂', boardingSplit: 'Day 82% | Boarding 18%' },
  { level: 'JSS 2', arms: 4, capacity: 160, enrolled: 154, lead: 'Mr. Muraina', trend: '+2%', genderMix: '49% ♀ | 51% ♂', boardingSplit: 'Day 80% | Boarding 20%' },
  { level: 'JSS 3', arms: 4, capacity: 160, enrolled: 167, lead: 'Mrs. Uwa', trend: '+5%', genderMix: '45% ♀ | 55% ♂', boardingSplit: 'Day 77% | Boarding 23%' },
  { level: 'SS 1', arms: 5, capacity: 200, enrolled: 181, lead: 'Mr. Bello', trend: '+1%', genderMix: '53% ♀ | 47% ♂', boardingSplit: 'Day 69% | Boarding 31%' },
  { level: 'SS 2', arms: 5, capacity: 200, enrolled: 176, lead: 'Mrs. Ikpe', trend: '-3%', genderMix: '50% ♀ | 50% ♂', boardingSplit: 'Day 65% | Boarding 35%' },
  { level: 'SS 3', arms: 5, capacity: 200, enrolled: 189, lead: 'Mr. Aina', trend: '+6%', genderMix: '48% ♀ | 52% ♂', boardingSplit: 'Day 60% | Boarding 40%' },
]

const restructuringQueue = [
  { title: 'Split SS2 Science arm', owner: 'Academics Board', eta: 'Due Friday', status: 'Pending' },
  { title: 'Merge JSS1 Arms C & D', owner: 'Principal', eta: 'Awaiting approval', status: 'Review' },
  { title: 'Create Arts immersion stream', owner: 'Curriculum Office', eta: 'Scheduled Mar 12', status: 'Scheduled' },
]

const classDirectory = [
  { level: 'JSS 1', arm: 'A', advisor: 'Mrs. Adekunle', capacity: 40, enrolled: 37, shift: 'Morning', profile: 'STEM' },
  { level: 'JSS 1', arm: 'B', advisor: 'Mr. Lucas', capacity: 40, enrolled: 41, shift: 'Morning', profile: 'Mixed' },
  { level: 'JSS 1', arm: 'C', advisor: 'Ms. Tobi', capacity: 40, enrolled: 36, shift: 'Morning', profile: 'Arts' },
  { level: 'JSS 2', arm: 'A', advisor: 'Mr. Idris', capacity: 40, enrolled: 39, shift: 'Morning', profile: 'STEM' },
  { level: 'SS 1', arm: 'Science A', advisor: 'Mrs. Ogun', capacity: 40, enrolled: 44, shift: 'Morning', profile: 'STEM' },
  { level: 'SS 1', arm: 'Arts A', advisor: 'Mr. Okoye', capacity: 40, enrolled: 34, shift: 'Morning', profile: 'Arts' },
  { level: 'SS 2', arm: 'Science B', advisor: 'Mrs. Bello', capacity: 40, enrolled: 46, shift: 'Morning', profile: 'STEM' },
  { level: 'SS 3', arm: 'Commercial', advisor: 'Mr. Musa', capacity: 40, enrolled: 42, shift: 'Morning', profile: 'Commercial' },
]

export function ClassesAndArms() {
  const [newArmName, setNewArmName] = useState('SS2 Science C')
  const [newArmLevel, setNewArmLevel] = useState('SS 2')
  const [newArmAdvisor, setNewArmAdvisor] = useState('Mrs. Mabel Ojo')
  const [newArmCapacity, setNewArmCapacity] = useState('38')

  const totalCapacity = useMemo(() => levelSnapshot.reduce((sum, level) => sum + level.capacity, 0), [])
  const totalEnrolled = useMemo(() => levelSnapshot.reduce((sum, level) => sum + level.enrolled, 0), [])
  const totalBoarders = useMemo(() => Math.round(totalEnrolled * 0.28), [totalEnrolled])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Level orchestration</p>
          <h1 className="text-2xl font-bold text-gray-900">Classes & arms</h1>
          <p className="text-sm text-gray-600">Balance capacity, shift policies, and advisor coverage in one view.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" /> Advanced filters
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export structure
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" /> Add class arm
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Launch new class arm</DialogTitle>
                <DialogDescription>We pre-fill with enrollment signals from admissions and promotion pipelines.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="text-gray-600">Level</span>
                  <Input value={newArmLevel} onChange={(e) => setNewArmLevel(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-600">Arm name</span>
                  <Input value={newArmName} onChange={(e) => setNewArmName(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-600">Advisor</span>
                  <Input value={newArmAdvisor} onChange={(e) => setNewArmAdvisor(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-600">Capacity</span>
                  <Input type="number" value={newArmCapacity} onChange={(e) => setNewArmCapacity(e.target.value)} />
                </label>
                <div className="rounded-2xl border border-dashed border-gray-200 p-3 text-xs text-gray-500">
                  This wizard will clone timetable templates, auto-assign subject teachers, and notify admissions once you confirm.
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Save draft</Button>
                  <Button>Create arm</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Total levels</p>
            <p className="text-3xl font-semibold text-gray-900">6</p>
            <p className="text-xs text-gray-500">Primary streams handled separately</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Enrolled learners</p>
            <p className="text-3xl font-semibold text-gray-900">{totalEnrolled.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{((totalEnrolled / totalCapacity) * 100).toFixed(1)}% of configured capacity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Active shifts</p>
            <p className="text-3xl font-semibold text-gray-900">Morning</p>
            <p className="text-xs text-gray-500">Afternoon stream pilot opens in May</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-rose-50 text-rose-600 w-10 h-10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Over-subscribed arms</p>
            <p className="text-3xl font-semibold text-gray-900">3</p>
            <p className="text-xs text-gray-500">Prioritize JSS1, SS2 Science, SS3 Commercial</p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 xl:col-span-1">
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <SplitSquareHorizontal className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Boarding footprint</p>
            <p className="text-3xl font-semibold text-gray-900">{Math.round((totalBoarders / totalEnrolled) * 100)}%</p>
            <p className="text-xs text-gray-500">{totalBoarders.toLocaleString()} of {totalEnrolled.toLocaleString()} learners reside on campus</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Level snapshot</CardTitle>
            <CardDescription>Capacity trends with assigned level leads.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {levelSnapshot.map((level) => {
              const occupancy = Math.round((level.enrolled / level.capacity) * 100)
              return (
                <div key={level.level} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{level.level}</p>
                      <p className="text-xs text-gray-500">Lead: {level.lead}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{level.arms} arms</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500">Capacity</p>
                      <p className="text-sm font-semibold text-gray-900">{level.capacity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Enrolled</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {level.enrolled}
                        <span className="text-[11px] text-emerald-600 ml-1">{level.trend}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Occupancy</p>
                      <p className={`text-sm font-semibold ${occupancy > 100 ? 'text-rose-600' : 'text-gray-900'}`}>{occupancy}%</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 text-xs text-gray-500 sm:grid-cols-2">
                    <span>Gender mix: <span className="text-gray-900 font-medium">{level.genderMix}</span></span>
                    <span>Boarding split: <span className="text-gray-900 font-medium">{level.boardingSplit}</span></span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-gray-100">
                    <div className={`h-2 rounded-full ${occupancy > 100 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(occupancy, 120)}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restructuring pipeline</CardTitle>
            <CardDescription>Requests awaiting leadership action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {restructuringQueue.map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">{item.owner}</p>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>{item.eta}</span>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{item.status}</Badge>
                </div>
              </div>
            ))}
            <Button className="w-full" variant="outline">
              <Merge className="h-4 w-4 mr-2" /> Launch restructure charter
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class directory</CardTitle>
          <CardDescription>Each arm inherits timetable templates and advisor workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input placeholder="Search by level, arm, or advisor" className="lg:w-64" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Morning</Button>
              <Button variant="outline" size="sm">Afternoon</Button>
              <Button variant="outline" size="sm">Boarding</Button>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Arm</TableHead>
                  <TableHead>Advisor</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Shift</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classDirectory.map((row) => (
                  <TableRow key={`${row.level}-${row.arm}`}>
                    <TableCell className="font-semibold text-gray-900">{row.level}</TableCell>
                    <TableCell>{row.arm}</TableCell>
                    <TableCell>{row.advisor}</TableCell>
                    <TableCell>{row.capacity}</TableCell>
                    <TableCell className={`font-semibold ${row.enrolled > row.capacity ? 'text-rose-600' : 'text-gray-900'} flex items-center gap-2`}>
                      {row.enrolled}
                      {row.enrolled > row.capacity && (
                        <span className="text-[11px] rounded-full bg-rose-50 text-rose-600 px-2 py-0.5">+{row.enrolled - row.capacity}</span>
                      )}
                    </TableCell>
                    <TableCell>{row.shift}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">{row.profile}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default ClassesAndArms;
