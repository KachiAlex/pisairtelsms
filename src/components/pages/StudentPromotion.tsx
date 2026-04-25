import React, { useState, useEffect, useMemo, useContext } from 'react'
import {
  Users,
  GraduationCap,
  AlertTriangle,
  Repeat,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Download,
  Settings,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  FileText,
  Play,
  Shield,
  History,
  Zap,
  Target,
  Award,
  AlertCircle,
  Calendar,
  BookOpen,
} from 'lucide-react'
import { TenantContext } from '../../contexts/TenantContext'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Checkbox } from '../ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { Progress } from '../ui/progress'
import { Separator } from '../ui/separator'
import {
  fetchStudents,
  type Student as StudentType
} from '../../lib/studentsClient'
import {
  fetchPromotionRecords,
  createBulkPromotionRecords,
  updatePromotionRecord,
  fetchPromotionRules,
  getPromotionStatus,
  getNextClass,
  type PromotionRecord,
  type PromotionPayload,
  type PromotionRule,
} from '../../lib/promotionsClient'
import { fetchScores } from '../../lib/resultsClient'

interface StudentWithPerformance extends StudentType {
  averageScore: number | null
  attendance: number | null
  hasScores: boolean
}

export function StudentPromotion() {
  const { tenantId } = useContext(TenantContext) || { tenantId: '' }
  
  // Filter states
  const [academicSession, setAcademicSession] = useState('2024/2025')
  const [term, setTerm] = useState('Third Term')
  const [fromClass, setFromClass] = useState('Primary 5')

  // Data states
  const [students, setStudents] = useState<StudentWithPerformance[]>([])
  const [promotionRecords, setPromotionRecords] = useState<PromotionRecord[]>([])
  const [promotionRules, setPromotionRules] = useState<PromotionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI states
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [selectedStudent, setSelectedStudent] = useState<StudentWithPerformance | null>(null)
  const [showIndividualPanel, setShowIndividualPanel] = useState(false)
  const [showBulkWizard, setShowBulkWizard] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [bulkWizardStep, setBulkWizardStep] = useState(1)
  const [bulkPromotionData, setBulkPromotionData] = useState<{
    promoteTo: string
    exceptions: StudentWithPerformance[]
    summary: { promote: number; repeat: number; demote: number }
  } | null>(null)

  // Load data on component mount and when filters change
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load all students
        const allStudents = await fetchStudents()
        
        // Filter students by class
        const filteredStudents = allStudents.filter(
          student => student.class === fromClass
        )

        // Fetch scores for the selected class, session, and term
        const scores = await fetchScores(undefined, academicSession, term, fromClass)

        // Create a map of student scores for quick lookup
        const scoresByStudentId = new Map<string, typeof scores>()
        scores.forEach(score => {
          if (!scoresByStudentId.has(score.studentId)) {
            scoresByStudentId.set(score.studentId, [])
          }
          scoresByStudentId.get(score.studentId)!.push(score)
        })

        // Derive averageScore and attendance for each student
        const studentsWithPerformance: StudentWithPerformance[] = filteredStudents.map(student => {
          const studentScores = scoresByStudentId.get(student.id) || []
          const hasScores = studentScores.length > 0

          let averageScore: number | null = null
          let attendance: number | null = null

          if (hasScores) {
            // Calculate average of total scores
            const totalScores = studentScores.map(s => s.totalScore)
            averageScore = Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)

            // Calculate average attendance
            const attendances = studentScores.map(s => s.attendancePercentage)
            attendance = Math.round(attendances.reduce((a, b) => a + b, 0) / attendances.length)
          }

          return {
            ...student,
            averageScore,
            attendance,
            hasScores,
          }
        })

        setStudents(studentsWithPerformance)

        // Load promotion records
        const records = await fetchPromotionRecords(academicSession, term, fromClass)
        setPromotionRecords(records)

        // Load promotion rules
        const rules = await fetchPromotionRules(tenantId)
        setPromotionRules(rules)

      } catch (err) {
        console.error('Error loading promotion data:', err)
        setError('Failed to load promotion data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [academicSession, term, fromClass])

  // Calculate promotion recommendations for each student
  const studentsWithRecommendations = useMemo(() => {
    return students.map(student => {
      const existingRecord = promotionRecords.find(r => r.studentId === student.id)
      
      // If no scores recorded, recommend 'review'
      let recommendedAction: string
      if (!student.hasScores) {
        recommendedAction = 'review'
      } else {
        recommendedAction = existingRecord?.action || getPromotionStatus(
          student.averageScore ?? undefined,
          student.attendance ?? undefined,
          promotionRules
        )
      }

      const nextClass = getNextClass(student.class, recommendedAction as any)

      return {
        ...student,
        recommendedAction,
        nextClass,
        existingRecord,
      }
    })
  }, [students, promotionRecords, promotionRules])

  // Calculate stats
  const stats = useMemo(() => {
    const total = studentsWithRecommendations.length
    const eligible = studentsWithRecommendations.filter(s => s.recommendedAction === 'promote').length
    const review = studentsWithRecommendations.filter(s => s.recommendedAction === 'review').length
    const repeat = studentsWithRecommendations.filter(s => s.recommendedAction === 'repeat').length

    return { total, eligible, review, repeat }
  }, [studentsWithRecommendations])

  // Handle individual student selection
  const handleStudentSelect = (studentId: string, selected: boolean) => {
    const newSelected = new Set(selectedStudents)
    if (selected) {
      newSelected.add(studentId)
    } else {
      newSelected.delete(studentId)
    }
    setSelectedStudents(newSelected)
  }

  // Handle bulk select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedStudents(new Set(studentsWithRecommendations.map(s => s.id)))
    } else {
      setSelectedStudents(new Set())
    }
  }

  // Open individual promotion panel
  const handleOpenIndividualPanel = (student: StudentWithPerformance) => {
    setSelectedStudent(student)
    setShowIndividualPanel(true)
  }

  // Save individual promotion decision
  const handleSaveIndividualDecision = async (action: 'promote' | 'repeat' | 'demote' | 'hold', reason?: string) => {
    if (!selectedStudent) return

    try {
      const nextClass = getNextClass(selectedStudent.class, action)

      const payload: PromotionPayload = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        fromClass: selectedStudent.class,
        toClass: nextClass,
        action,
        academicSession,
        term,
        averageScore: selectedStudent.averageScore,
        attendance: selectedStudent.attendance,
        teacherRecommendation: selectedStudent.teacherRecommendation,
        reason,
      }

      await createBulkPromotionRecords([payload])

      // Refresh data
      const records = await fetchPromotionRecords(academicSession, term, fromClass)
      setPromotionRecords(records)

      setShowIndividualPanel(false)
      setSelectedStudent(null)
    } catch (err) {
      console.error('Error saving promotion decision:', err)
      setError('Failed to save promotion decision. Please try again.')
    }
  }

  // Start bulk promotion wizard
  const handleStartBulkPromotion = () => {
    setBulkWizardStep(1)
    setShowBulkWizard(true)
  }

  // Handle bulk wizard next step
  const handleBulkWizardNext = () => {
    if (bulkWizardStep === 1) {
      // Step 1: Select destination class
      setBulkWizardStep(2)
    } else if (bulkWizardStep === 2) {
      // Step 2: Review exceptions and create summary
      const exceptions = studentsWithRecommendations.filter(s =>
        s.recommendedAction === 'review' || s.recommendedAction === 'repeat'
      )

      const summary = {
        promote: studentsWithRecommendations.filter(s => s.recommendedAction === 'promote').length,
        repeat: studentsWithRecommendations.filter(s => s.recommendedAction === 'repeat').length,
        demote: studentsWithRecommendations.filter(s => s.recommendedAction === 'review').length,
      }

      setBulkPromotionData({
        promoteTo: getNextClass(fromClass, 'promote'),
        exceptions,
        summary,
      })

      setBulkWizardStep(3)
    } else if (bulkWizardStep === 3) {
      // Step 3: Show confirmation
      setShowBulkWizard(false)
      setShowConfirmation(true)
    }
  }

  // Confirm bulk promotion
  const handleConfirmBulkPromotion = async () => {
    if (!bulkPromotionData) return

    try {
      const promotionPayloads: PromotionPayload[] = studentsWithRecommendations.map(student => ({
        studentId: student.id,
        studentName: student.name,
        fromClass: student.class,
        toClass: student.recommendedAction === 'promote' ? bulkPromotionData.promoteTo : student.class,
        action: student.recommendedAction === 'promote' ? 'promote' :
                student.recommendedAction === 'repeat' ? 'repeat' : 'demote',
        academicSession,
        term,
        averageScore: student.averageScore,
        attendance: student.attendance,
        teacherRecommendation: student.teacherRecommendation,
      }))

      await createBulkPromotionRecords(promotionPayloads)

      // Refresh data
      const records = await fetchPromotionRecords(academicSession, term, fromClass)
      setPromotionRecords(records)

      setShowConfirmation(false)
      setBulkPromotionData(null)
      setBulkWizardStep(1)
    } catch (err) {
      console.error('Error executing bulk promotion:', err)
      setError('Failed to execute bulk promotion. Please try again.')
    }
  }

  const getStatusColor = (action: string) => {
    switch (action) {
      case 'promote': return 'bg-green-100 text-green-800 border-green-200'
      case 'review': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'repeat': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'demote': return 'bg-red-100 text-red-800 border-red-200'
      case 'hold': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'promote': return <ArrowUpRight className="h-4 w-4" />
      case 'repeat': return <Repeat className="h-4 w-4" />
      case 'demote': return <ArrowDownRight className="h-4 w-4" />
      case 'hold': return <Clock className="h-4 w-4" />
      default: return <Eye className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading promotion data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Academic Progression</p>
          <h1 className="text-2xl font-bold text-gray-900">Promotion & Demotion</h1>
          <p className="text-sm text-gray-600">Manage student progression between classes safely and efficiently</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={handleStartBulkPromotion} disabled={loading}>
            <Users className="h-4 w-4 mr-2" />
            Bulk Promotion
          </Button>
        </div>
      </div>

      {/* Top Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Academic Session</Label>
              <Select value={academicSession} onValueChange={setAcademicSession}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                  <SelectItem value="2023/2024">2023/2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">From Class</Label>
              <Select value={fromClass} onValueChange={setFromClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Primary 1">Primary 1</SelectItem>
                  <SelectItem value="Primary 2">Primary 2</SelectItem>
                  <SelectItem value="Primary 3">Primary 3</SelectItem>
                  <SelectItem value="Primary 4">Primary 4</SelectItem>
                  <SelectItem value="Primary 5">Primary 5</SelectItem>
                  <SelectItem value="Primary 6">Primary 6</SelectItem>
                  <SelectItem value="JSS 1">JSS 1</SelectItem>
                  <SelectItem value="JSS 2">JSS 2</SelectItem>
                  <SelectItem value="JSS 3">JSS 3</SelectItem>
                  <SelectItem value="SS 1">SS 1</SelectItem>
                  <SelectItem value="SS 2">SS 2</SelectItem>
                  <SelectItem value="SS 3">SS 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Eligible for Promotion</p>
                <p className="text-2xl font-bold text-green-600">{stats.eligible}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Requires Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.review}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Recommended Repeat</p>
                <p className="text-2xl font-bold text-orange-600">{stats.repeat}</p>
              </div>
              <Repeat className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Promotion Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Student Promotion Decisions</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedStudents.size === studentsWithRecommendations.length && studentsWithRecommendations.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedStudents.size === studentsWithRecommendations.length && studentsWithRecommendations.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Current Class</TableHead>
                  <TableHead>Average Score</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsWithRecommendations.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={(checked) => handleStudentSelect(student.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>
                      {student.hasScores ? `${student.averageScore}%` : <span className="text-gray-400 italic">No scores recorded</span>}
                    </TableCell>
                    <TableCell>
                      {student.hasScores ? `${student.attendance}%` : <span className="text-gray-400 italic">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(student.recommendedAction)}>
                        {student.recommendedAction}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{student.nextClass}</p>
                        {!student.hasScores && (
                          <p className="text-gray-500 text-xs mt-1">Awaiting scores</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenIndividualPanel(student)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Decide
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Individual Student Promotion Panel */}
      <Dialog open={showIndividualPanel} onOpenChange={setShowIndividualPanel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Promotion Decision</DialogTitle>
            <DialogDescription>
              Review student performance and make promotion decision
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6">
              {/* Student Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-xs text-gray-500">Student</Label>
                  <p className="font-medium">{selectedStudent.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Current Class</Label>
                  <p className="font-medium">{selectedStudent.class}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Average Score</Label>
                  <p className="font-medium">
                    {selectedStudent.hasScores ? `${selectedStudent.averageScore}%` : 'No scores recorded'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Attendance</Label>
                  <p className="font-medium">
                    {selectedStudent.hasScores ? `${selectedStudent.attendance}%` : '—'}
                  </p>
                </div>
              </div>

              {/* No Scores Warning */}
              {!selectedStudent.hasScores && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Label className="text-xs text-yellow-600 font-semibold">No Scores Recorded</Label>
                  <p className="text-sm text-yellow-800 mt-1">
                    This student has no score records for the selected session and term. 
                    The recommended action is "review" until scores are available.
                  </p>
                </div>
              )}

              {/* Decision Options */}
              <div>
                <Label className="text-sm font-semibold">Decision Options</Label>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-green-200 hover:bg-green-50"
                    onClick={() => handleSaveIndividualDecision('promote')}
                  >
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Promote to {getNextClass(selectedStudent.class, 'promote')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-orange-200 hover:bg-orange-50"
                    onClick={() => handleSaveIndividualDecision('repeat')}
                  >
                    <Repeat className="h-5 w-5 text-orange-600" />
                    <span className="text-sm">Repeat {selectedStudent.class}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-red-200 hover:bg-red-50"
                    onClick={() => handleSaveIndividualDecision('demote')}
                  >
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                    <span className="text-sm">Demote to {getNextClass(selectedStudent.class, 'demote')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-gray-200 hover:bg-gray-50"
                    onClick={() => handleSaveIndividualDecision('hold')}
                  >
                    <Clock className="h-5 w-5 text-gray-600" />
                    <span className="text-sm">Hold for Review</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Promotion Wizard */}
      <Dialog open={showBulkWizard} onOpenChange={setShowBulkWizard}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {bulkWizardStep === 1 && 'Select Class for Promotion'}
              {bulkWizardStep === 2 && 'Review Exceptions'}
              {bulkWizardStep === 3 && 'Preview Promotion'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= bulkWizardStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={`w-12 h-px mx-2 ${
                        step < bulkWizardStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Select Class */}
            {bulkWizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Promote From</Label>
                  <p className="text-lg font-medium text-gray-900">{fromClass}</p>
                </div>
                <div>
                  <Label>Promote To</Label>
                  <Select defaultValue={getNextClass(fromClass, 'promote')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={getNextClass(fromClass, 'promote')}>
                        {getNextClass(fromClass, 'promote')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Review Exceptions */}
            {bulkWizardStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-800">Students requiring manual review:</h4>
                  <ul className="mt-2 space-y-1">
                    {studentsWithRecommendations
                      .filter(s => s.recommendedAction === 'review' || s.recommendedAction === 'repeat')
                      .map(student => (
                        <li key={student.id} className="text-sm text-yellow-700">
                          {student.name} - {student.recommendedAction === 'review' ? 'Needs review' : 'Recommended repeat'}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {bulkWizardStep === 3 && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsWithRecommendations.slice(0, 5).map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell>{student.nextClass}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(student.recommendedAction)}>
                              {student.recommendedAction}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkWizard(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkWizardNext}>
              {bulkWizardStep === 3 ? 'Continue to Confirmation' : 'Next'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Safety Confirmation */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              Confirm Bulk Promotion
            </DialogTitle>
            <DialogDescription>
              Please review the changes before proceeding. This action cannot be easily undone.
            </DialogDescription>
          </DialogHeader>

          {bulkPromotionData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{bulkPromotionData.summary.promote}</p>
                  <p className="text-sm text-green-700">Students Promoted</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{bulkPromotionData.summary.repeat}</p>
                  <p className="text-sm text-orange-700">Students Repeating</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{bulkPromotionData.summary.demote}</p>
                  <p className="text-sm text-red-700">Students Demoted</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  You are about to update <strong>{studentsWithRecommendations.length}</strong> student records
                  for the <strong>{academicSession}</strong> academic session.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBulkPromotion} className="bg-orange-600 hover:bg-orange-700">
              Confirm Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

export default StudentPromotion;
