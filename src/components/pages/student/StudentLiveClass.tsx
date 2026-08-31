import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Video } from 'lucide-react'
import { CloudflareLiveClassRoom } from '../CloudflareLiveClassRoom'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { getAuthFromStorage } from '../../../lib/auth'

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

export function StudentLiveClass() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [lessonId, setLessonId] = useState(searchParams.get('lessonId') || '')
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [classroomName, setClassroomName] = useState('Live Class')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const auth = getAuthFromStorage()

  const loadLesson = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/student/live-meetings?lessonId=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${auth?.token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to load live class (${res.status})`)
      setLesson(data.data)
      setClassroomName(data.data.classroom_name || 'Live Class')
      setSearchParams({ lessonId: id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = searchParams.get('lessonId')
    if (id) loadLesson(id)
  }, [])

  if (lesson) {
    return (
      <CloudflareLiveClassRoom
        lesson={lesson}
        classroomName={classroomName}
        onBack={() => {
          setLesson(null)
          setSearchParams({})
        }}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <Video className="h-12 w-12 mx-auto text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Join Live Class</h1>
        <p className="text-sm text-gray-500">Enter the lesson ID shared by your teacher.</p>
      </div>

      <div className="space-y-4">
        <Input
          placeholder="e.g. 24b8d56e-6d09-4390-9446-721e9f8eebcb"
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
        />
        <Button
          className="w-full"
          onClick={() => lessonId.trim() && loadLesson(lessonId.trim())}
          disabled={!lessonId.trim() || loading}
        >
          {loading ? 'Joining...' : 'Join Live Class'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}

export default StudentLiveClass
