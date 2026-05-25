import React, { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, Trash2, Calendar, Flag, X, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '../../ui/button'
import { getAuthFromStorage } from '../../../lib/auth'

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  assignedBy: string | null
  assignedByRole: 'admin' | 'system' | 'self'
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

interface TaskSummary {
  total: number
  pending: number
  inProgress: number
  completed: number
  overdue: number
}

export function StaffTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | TaskStatus>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const auth = getAuthFromStorage()

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [filter])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = auth?.token
      if (!token) {
        setError('Not authenticated')
        return
      }

      const url = filter !== 'all' ? `/api/staff/tasks?status=${filter}` : '/api/staff/tasks'
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data = await response.json()
      setTasks(data.tasks || [])
      setSummary(data.summary)
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const createTask = async () => {
    if (!newTaskTitle.trim()) return

    try {
      setActionLoading('create')
      const token = auth?.token
      if (!token) return

      const response = await fetch('/api/staff/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription,
          priority: newTaskPriority,
          dueDate: newTaskDueDate || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      // Reset form and close modal
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskPriority('medium')
      setNewTaskDueDate('')
      setShowAddModal(false)
      fetchTasks()
    } catch (err) {
      console.error('Failed to create task:', err)
      setError('Failed to create task')
    } finally {
      setActionLoading(null)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      setActionLoading(taskId)
      const token = auth?.token
      if (!token) return

      const response = await fetch(`/api/staff/tasks?id=${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      fetchTasks()
    } catch (err) {
      console.error('Failed to update task:', err)
      setError('Failed to update task')
    } finally {
      setActionLoading(null)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      setActionLoading(taskId)
      const token = auth?.token
      if (!token) return

      const response = await fetch(`/api/staff/tasks?id=${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      fetchTasks()
    } catch (err) {
      console.error('Failed to delete task:', err)
      setError('Failed to delete task')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'cancelled':
        return <X className="w-5 h-5 text-gray-400" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date'
    const date = new Date(dateStr)
    const today = new Date()
    const isOverdue = date < today && date.toDateString() !== today.toDateString()

    return (
      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
        {date.toLocaleDateString()}
        {isOverdue && ' (Overdue)'}
      </span>
    )
  }

  const getStatusLabel = (status: TaskStatus) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const filteredTasks = tasks

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-600 mt-1">
            {summary && (
              <>
                <span className="font-medium">{summary.pending}</span> pending
                {summary.overdue > 0 && (
                  <span className="text-red-600 font-medium">, {summary.overdue} overdue</span>
                )}
              </>
            )}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{summary.total}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{summary.pending}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-purple-700">{summary.inProgress}</p>
            <p className="text-sm text-gray-600">In Progress</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{summary.completed}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {status === 'all' ? 'All Tasks' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No tasks found</p>
            <p className="text-sm text-gray-500 mt-1">
              {filter === 'all' ? 'Create a new task to get started' : `No ${filter.replace('_', '-')} tasks`}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                task.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status Checkbox */}
                <button
                  onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                  disabled={actionLoading === task.id}
                  className="flex-shrink-0 mt-0.5"
                >
                  {actionLoading === task.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : (
                    getStatusIcon(task.status)
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                          <Flag className="w-3 h-3" />
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.dueDate)}
                        </span>
                        {task.assignedBy && (
                          <span className="text-xs text-gray-500">
                            Assigned by: {task.assignedBy}
                          </span>
                        )}
                        {task.assignedByRole === 'self' && !task.assignedBy && (
                          <span className="text-xs text-gray-500">Personal task</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          disabled={actionLoading === task.id}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                        >
                          {task.status === 'in_progress' ? 'Pending' : 'Start'}
                        </button>
                      )}
                      <button
                        onClick={() => deleteTask(task.id)}
                        disabled={actionLoading === task.id}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Task</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Enter task description (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <div className="relative">
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={createTask}
                disabled={!newTaskTitle.trim() || actionLoading === 'create'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {actionLoading === 'create' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Create Task'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
