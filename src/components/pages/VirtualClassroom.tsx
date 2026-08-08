import React, { useState, useEffect, useCallback } from 'react'
import {
  Video, BookOpen, FileText, ClipboardList, Plus, Search, MoreVertical,
  Users, Calendar, Trash2, Edit, Eye, ArrowLeft, Upload, Link2, Download,
  CheckCircle, Clock, AlertCircle, GraduationCap, PlayCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select'
import { LiveClassRoom } from './LiveClassRoom'
import { tenantApiGet, tenantApiPost, tenantApiDelete } from '../../lib/tenantApi'
import { useToast } from '../ui/use-toast'

interface Classroom {
  id: string
  name: string
  description: string | null
  subject_name: string | null
  class_arm_name: string | null
  teacher_name: string | null
  status: string
  cover_image_url: string | null
  created_at: string
}

interface Lesson {
  id: string
  title: string
  description: string | null
  type: string
  scheduled_at: string | null
  duration_minutes: number
  meeting_url: string | null
  recording_url: string | null
  status: string
}

interface Assignment {
  id: string
  title: string
  instructions: string | null
  points: number
  due_date: string
  is_published: boolean
  submission_count: number
}

interface Material {
  id: string
  title: string
  description: string | null
  type: string
  url: string
  file_name: string | null
  uploaded_by: string
  created_at: string
}

export function VirtualClassroom() {
  const { toast } = useToast()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [activeTab, setActiveTab] = useState('lessons')
  const [showLessonDialog, setShowLessonDialog] = useState(false)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [showMaterialDialog, setShowMaterialDialog] = useState(false)
  const [liveLesson, setLiveLesson] = useState<Lesson | null>(null)

  const fetchClassrooms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await tenantApiGet('/api/tenant/virtual-classrooms')
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any))
        throw new Error(data.error || `Failed to load classrooms (status ${res.status})`)
      }
      const data = await res.json()
      setClassrooms(data.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.'
      setError(message)
      toast({ title: 'Failed to load classrooms', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchClassroomDetails = useCallback(async (classroom: Classroom) => {
    try {
      const [lessonsRes, assignmentsRes, materialsRes] = await Promise.all([
        tenantApiGet(`/api/tenant/lessons?classroomId=${classroom.id}`),
        tenantApiGet(`/api/tenant/assignments?classroomId=${classroom.id}`),
        tenantApiGet(`/api/tenant/course-materials?classroomId=${classroom.id}`),
      ])
      if (lessonsRes.ok) {
        const data = await lessonsRes.json()
        setLessons(data.data || [])
      }
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json()
        setAssignments(data.data || [])
      }
      if (materialsRes.ok) {
        const data = await materialsRes.json()
        setMaterials(data.data || [])
      }
    } catch (err) {
      toast({ title: 'Failed to load classroom details', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }, [toast])

  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

  const handleSelectClassroom = (classroom: Classroom) => {
    setSelectedClassroom(classroom)
    fetchClassroomDetails(classroom)
  }

  const handleBack = () => {
    setSelectedClassroom(null)
    setLessons([])
    setAssignments([])
    setMaterials([])
  }

  const handleCreateClassroom = async (data: any) => {
    try {
      const res = await tenantApiPost('/api/tenant/virtual-classrooms', data)
      if (res.ok) {
        setShowCreateDialog(false)
        fetchClassrooms()
        toast({ title: 'Classroom created', description: 'Virtual classroom created successfully.' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to create classroom', description: err.error || 'Please try again.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to create classroom', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const handleCreateLesson = async (data: any) => {
    // Auto-generate Jitsi meeting URL for live lessons
    let meetingUrl = data.meetingUrl
    if (data.type === 'live' && !meetingUrl) {
      const roomSlug = data.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
      meetingUrl = `https://meet.jit.si/pisairtel-${roomSlug}-${Date.now().toString(36)}`
    }
    try {
      const res = await tenantApiPost('/api/tenant/lessons', { ...data, meetingUrl, classroomId: selectedClassroom?.id })
      if (res.ok) {
        setShowLessonDialog(false)
        if (selectedClassroom) fetchClassroomDetails(selectedClassroom)
        toast({ title: 'Lesson created', description: 'Lesson created successfully.' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to create lesson', description: err.error || 'Please try again.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to create lesson', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const handleCreateAssignment = async (data: any) => {
    try {
      const res = await tenantApiPost('/api/tenant/assignments', { ...data, classroomId: selectedClassroom?.id })
      if (res.ok) {
        setShowAssignmentDialog(false)
        if (selectedClassroom) fetchClassroomDetails(selectedClassroom)
        toast({ title: 'Assignment created', description: 'Assignment created successfully.' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to create assignment', description: err.error || 'Please try again.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to create assignment', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const handleCreateMaterial = async (data: any) => {
    try {
      const res = await tenantApiPost('/api/tenant/course-materials', { ...data, classroomId: selectedClassroom?.id })
      if (res.ok) {
        setShowMaterialDialog(false)
        if (selectedClassroom) fetchClassroomDetails(selectedClassroom)
        toast({ title: 'Material added', description: 'Course material added successfully.' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to add material', description: err.error || 'Please try again.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to add material', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const handleDeleteClassroom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classroom? This will remove all lessons, materials, and assignments.')) return
    try {
      const res = await tenantApiDelete(`/api/tenant/virtual-classrooms?id=${id}`)
      if (res.ok) {
        fetchClassrooms()
        toast({ title: 'Classroom deleted', description: 'Virtual classroom deleted successfully.' })
      } else {
        toast({ title: 'Failed to delete classroom', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to delete classroom', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const filteredClassrooms = classrooms.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Live class view
  if (liveLesson && selectedClassroom) {
    return (
      <LiveClassRoom
        lesson={liveLesson}
        classroomName={selectedClassroom.name}
        onBack={() => setLiveLesson(null)}
        onRecordingSaved={(url) => {
          // Update lesson in state with recording URL
          setLessons(prev => prev.map(l =>
            l.id === liveLesson.id ? { ...l, recording_url: url, status: 'completed' } : l
          ))
        }}
      />
    )
  }

  // Classroom detail view
  if (selectedClassroom) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{selectedClassroom.name}</h1>
            <p className="text-sm text-gray-600">{selectedClassroom.description || 'No description'}</p>
          </div>
          <Badge variant={selectedClassroom.status === 'active' ? 'default' : 'secondary'}>
            {selectedClassroom.status}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <PlayCircle className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-semibold">{lessons.length}</p>
                <p className="text-xs text-gray-500">Lessons</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-semibold">{assignments.length}</p>
                <p className="text-xs text-gray-500">Assignments</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-semibold">{materials.length}</p>
                <p className="text-xs text-gray-500">Materials</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Lessons</h2>
              <Button size="sm" onClick={() => setShowLessonDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> New Lesson
              </Button>
            </div>
            {lessons.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <PlayCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No lessons yet. Create your first lesson to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {lessons.map(lesson => (
                  <Card key={lesson.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {lesson.type === 'live' ? (
                          <Video className="h-6 w-6 text-red-500" />
                        ) : (
                          <PlayCircle className="h-6 w-6 text-blue-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{lesson.title}</p>
                          <p className="text-sm text-gray-500">
                            {lesson.type === 'live' ? 'Live Class' : 'Async Lesson'}
                            {lesson.scheduled_at && ` • ${new Date(lesson.scheduled_at).toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{lesson.status}</Badge>
                        {lesson.recording_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={lesson.recording_url} target="_blank" rel="noopener noreferrer">
                              <PlayCircle className="h-4 w-4 mr-1" /> Recording
                            </a>
                          </Button>
                        )}
                        {lesson.type === 'live' && lesson.status !== 'completed' ? (
                          <Button size="sm" variant="outline" onClick={() => setLiveLesson(lesson)}>
                            <Video className="h-4 w-4 mr-1" /> Join Live
                          </Button>
                        ) : lesson.type === 'live' && lesson.status === 'completed' ? (
                          <Button size="sm" variant="ghost" onClick={() => setLiveLesson(lesson)}>
                            <Video className="h-4 w-4 mr-1" /> Replay
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Course Materials</h2>
              <Button size="sm" onClick={() => setShowMaterialDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Material
              </Button>
            </div>
            {materials.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No materials uploaded yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {materials.map(material => (
                  <Card key={material.id}>
                    <CardContent className="p-4 flex items-start gap-3">
                      {material.type === 'video' ? (
                        <Video className="h-6 w-6 text-red-500 mt-1" />
                      ) : material.type === 'link' ? (
                        <Link2 className="h-6 w-6 text-blue-500 mt-1" />
                      ) : (
                        <FileText className="h-6 w-6 text-emerald-500 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{material.title}</p>
                        <p className="text-sm text-gray-500">{material.description || material.file_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{material.type}</Badge>
                          <Button size="sm" variant="ghost" asChild>
                            <a href={material.url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3 mr-1" /> View
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Assignments</h2>
              <Button size="sm" onClick={() => setShowAssignmentDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> New Assignment
              </Button>
            </div>
            {assignments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No assignments created yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {assignments.map(assignment => (
                  <Card key={assignment.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ClipboardList className="h-6 w-6 text-orange-500" />
                        <div>
                          <p className="font-medium text-gray-900">{assignment.title}</p>
                          <p className="text-sm text-gray-500">
                            Due: {new Date(assignment.due_date).toLocaleString()} • {assignment.points} pts
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {assignment.submission_count} submissions
                        </Badge>
                        {new Date(assignment.due_date) < new Date() && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CreateLessonDialog open={showLessonDialog} onClose={() => setShowLessonDialog(false)} onCreate={handleCreateLesson} />
        <CreateAssignmentDialog open={showAssignmentDialog} onClose={() => setShowAssignmentDialog(false)} onCreate={handleCreateAssignment} />
        <CreateMaterialDialog open={showMaterialDialog} onClose={() => setShowMaterialDialog(false)} onCreate={handleCreateMaterial} />
      </div>
    )
  }

  // Classroom list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Digital Learning</p>
          <h1 className="text-2xl font-bold text-gray-900">Virtual Classrooms</h1>
          <p className="text-sm text-gray-600">Create and manage online course spaces for your teachers and students.</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Classroom
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search classrooms..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Classroom Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-[#e31e24] rounded-full animate-spin mb-3" />
          <p>Loading classrooms...</p>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load classrooms</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">{error}</p>
            <Button onClick={fetchClassrooms} className="bg-[#e31e24] hover:bg-[#cf1a1f]">Try again</Button>
          </CardContent>
        </Card>
      ) : filteredClassrooms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Virtual Classrooms Yet</h3>
            <p className="text-gray-500 mb-4">Create your first virtual classroom to start teaching online.</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Classroom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClassrooms.map(classroom => (
            <Card key={classroom.id} className="cursor-pointer hover:shadow-md transition-shadow" >
              <CardContent className="p-5" onClick={() => handleSelectClassroom(classroom)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant={classroom.status === 'active' ? 'default' : 'secondary'}>
                    {classroom.status}
                  </Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{classroom.name}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{classroom.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {classroom.subject_name && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {classroom.subject_name}
                    </span>
                  )}
                  {classroom.teacher_name && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {classroom.teacher_name}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateClassroomDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} onCreate={handleCreateClassroom} />
    </div>
  )
}

// --- Dialogs ---

function CreateClassroomDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: any) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [teacherId, setTeacherId] = useState('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Virtual Classroom</DialogTitle>
          <DialogDescription>Set up a new online course space for your students.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Classroom Name *</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. JSS1 Mathematics - First Term" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the course..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacherId">Teacher ID *</Label>
            <Input id="teacherId" value={teacherId} onChange={e => setTeacherId(e.target.value)} placeholder="Staff ID of the teacher" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onCreate({ name, description, teacherId }); setName(''); setDescription(''); setTeacherId('') }}>
            Create Classroom
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateLessonDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: any) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('async')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [meetingUrl, setMeetingUrl] = useState('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Lesson</DialogTitle>
          <DialogDescription>Schedule a live class or create an async lesson.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Lesson Title *</Label>
            <Input id="lesson-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Introduction to Algebra" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-desc">Description</Label>
            <Textarea id="lesson-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What will be covered in this lesson?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lesson Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="async">Async (Pre-recorded)</SelectItem>
                  <SelectItem value="live">Live (Real-time)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" type="number" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Scheduled At</Label>
            <Input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>
          {type === 'live' && (
            <div className="space-y-2">
              <Label htmlFor="meetingUrl">Meeting URL</Label>
              <Input id="meetingUrl" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..." />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onCreate({ title, description, type, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null, durationMinutes, meetingUrl }); setTitle(''); setDescription(''); setMeetingUrl('') }}>
            Create Lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateAssignmentDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: any) => void }) {
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [points, setPoints] = useState(100)
  const [dueDate, setDueDate] = useState('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
          <DialogDescription>Create a new assignment for students to submit.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="asg-title">Assignment Title *</Label>
            <Input id="asg-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Exercises" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asg-instructions">Instructions</Label>
            <Textarea id="asg-instructions" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Detailed instructions for students..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input id="points" type="number" value={points} onChange={e => setPoints(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input id="dueDate" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onCreate({ title, instructions, points, dueDate: dueDate ? new Date(dueDate).toISOString() : null }); setTitle(''); setInstructions(''); setDueDate('') }}>
            Create Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateMaterialDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: any) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('document')
  const [url, setUrl] = useState('')
  const [fileName, setFileName] = useState('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Course Material</DialogTitle>
          <DialogDescription>Upload a document, video link, or external resource.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mat-title">Title *</Label>
            <Input id="mat-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 5 - Algebra Notes" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mat-desc">Description</Label>
            <Textarea id="mat-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the material..." />
          </div>
          <div className="space-y-2">
            <Label>Material Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="document">Document (PDF, Slides)</SelectItem>
                <SelectItem value="video">Video Link</SelectItem>
                <SelectItem value="link">External Link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input id="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fileName">File Name (optional)</Label>
            <Input id="fileName" value={fileName} onChange={e => setFileName(e.target.value)} placeholder="algebra-notes.pdf" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onCreate({ title, description, type, url, fileName }); setTitle(''); setDescription(''); setUrl(''); setFileName('') }}>
            Add Material
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default VirtualClassroom
