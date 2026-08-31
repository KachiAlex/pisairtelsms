export type SummaryStat = {
  label: string
  value: string
  detail: string
  tone: string
  icon: 'screening' | 'counseling' | 'alerts' | 'incidents'
}

export type ScreeningItem = {
  student: string
  cohort: string
  type: string
  due: string
  owner: string
  status: string
}

export type CounselingCase = {
  student: string
  topic: string
  owner: string
  nextStep: string
}

export type CounselingColumn = {
  stage: string
  color: string
  cases: CounselingCase[]
}

export type IncidentItem = {
  title: string
  student: string
  time: string
  detail: string
  severity: string
}

export type WellnessTask = {
  task: string
  owner: string
  due: string
  status: string
}

export type StudentHealthPayload = {
  summaryStats: SummaryStat[]
  screeningQueue: ScreeningItem[]
  counselingPipeline: CounselingColumn[]
  incidentFeed: IncidentItem[]
  wellnessTasks: WellnessTask[]
}

const HEALTH_ENDPOINT = '/api/student-health'

export async function fetchStudentHealth(signal?: AbortSignal): Promise<StudentHealthPayload> {
  const response = await fetch(HEALTH_ENDPOINT, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch student health dashboard: ${response.status}`)
  }

  const payload = (await response.json()) as StudentHealthPayload
  return payload
}
