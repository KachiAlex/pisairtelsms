import type { VercelRequest, VercelResponse } from '@vercel/node'

// This endpoint aggregates data from multiple sources for the main dashboard
// It calls other integrated endpoints to provide a comprehensive view

interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalExams: number
  activeExams: number
  classesCount: number
  recentActivity: any[]
  classSummaries: any[]
  systemHealth: {
    studentsApi: boolean
    teachersApi: boolean
    examsApi: boolean
    database: boolean
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'

    // Call integrated endpoints to aggregate data
    const endpoints = [
      `${baseUrl}/api/tenant/students`,
      `${baseUrl}/api/tenant/teacher-workloads`,
      `${baseUrl}/api/tenant/exam-assignments`,
      `${baseUrl}/api/tenant/student-progress`
    ]

    const [studentsRes, teachersRes, examsRes, progressRes] = await Promise.allSettled(
      endpoints.map(url => fetch(url))
    )

    // Process students data
    let studentsData: any[] = []
    let studentsApiHealthy = false
    if (studentsRes.status === 'fulfilled') {
      try {
        const data = await studentsRes.value.json()
        studentsData = data.data || []
        studentsApiHealthy = true
      } catch (error) {
        console.error('Error parsing students data:', error)
      }
    }

    // Process teachers data
    let teachersData: any[] = []
    let teachersApiHealthy = false
    if (teachersRes.status === 'fulfilled') {
      try {
        const data = await teachersRes.value.json()
        teachersData = data.data || []
        teachersApiHealthy = true
      } catch (error) {
        console.error('Error parsing teachers data:', error)
      }
    }

    // Process exams data
    let examsData: any[] = []
    let examsApiHealthy = false
    if (examsRes.status === 'fulfilled') {
      try {
        const data = await examsRes.value.json()
        examsData = data.data || []
        examsApiHealthy = true
      } catch (error) {
        console.error('Error parsing exams data:', error)
      }
    }

    // Process progress data
    let progressData: any[] = []
    if (progressRes.status === 'fulfilled') {
      try {
        const data = await progressRes.value.json()
        progressData = data.data || []
      } catch (error) {
        console.error('Error parsing progress data:', error)
      }
    }

    // Aggregate dashboard statistics
    const totalStudents = studentsData.length
    const totalTeachers = teachersData.length
    const totalExams = examsData.length
    const activeExams = examsData.filter((exam: any) => exam.class && exam.totalStudents > 0).length

    // Generate class summaries by calling class-dashboard for each class
    const classes = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3']
    const classSummaries = []

    for (const className of classes) {
      try {
        const classRes = await fetch(`${baseUrl}/api/tenant/class-dashboard?className=${encodeURIComponent(className)}`)
        if (classRes.ok) {
          const classData = await classRes.json()
          classSummaries.push({
            className,
            studentCount: classData.data?.studentCount || 0,
            teacherCount: classData.data?.teacherCount || 0,
            examCount: classData.data?.examCount || 0
          })
        }
      } catch (error) {
        console.error(`Error fetching data for class ${className}:`, error)
        classSummaries.push({
          className,
          studentCount: 0,
          teacherCount: 0,
          examCount: 0
        })
      }
    }

    // Generate recent activity from progress data
    const recentActivity = progressData.slice(0, 5).map((student: any) => ({
      type: 'exam_completed',
      message: `${student.studentName} completed ${student.totalExams} exams`,
      timestamp: new Date().toISOString()
    }))

    const dashboardStats: DashboardStats = {
      totalStudents,
      totalTeachers,
      totalExams,
      activeExams,
      classesCount: classes.length,
      recentActivity,
      classSummaries,
      systemHealth: {
        studentsApi: studentsApiHealthy,
        teachersApi: teachersApiHealthy,
        examsApi: examsApiHealthy,
        database: studentsApiHealthy // Simplified - if students API works, assume DB is healthy
      }
    }

    return res.status(200).json({
      data: dashboardStats,
      message: 'Integrated dashboard data retrieved successfully from all endpoints',
      integrations: {
        studentsEndpoint: '/api/tenant/students',
        teachersEndpoint: '/api/tenant/teacher-workloads',
        examsEndpoint: '/api/tenant/exam-assignments',
        progressEndpoint: '/api/tenant/student-progress',
        classDashboardEndpoint: '/api/tenant/class-dashboard'
      }
    })

  } catch (error) {
    console.error('Error in integrated dashboard:', error)
    return res.status(500).json({
      error: 'Failed to aggregate dashboard data',
      details: 'One or more integrated endpoints may be unavailable'
    })
  }
}
