import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  Bell,
  LogOut,
  ChevronDown,
  Briefcase,
  GraduationCap,
} from 'lucide-react'
import { clearAuthFromStorage, getAuthFromStorage } from '../../lib/auth'
import { Button } from '../ui/button'
import { ParentNavigation } from '../parent/ParentNavigation'
import { useParentContext } from '../../contexts/ParentContext'
import { useBranding } from '../../contexts/BrandingContext'

// Lazy load page components
const ParentDashboard = React.lazy(() => import('../pages/parent/ParentDashboard').then(m => ({ default: m.ParentDashboard })))
const AcademicProgress = React.lazy(() => import('../pages/parent/AcademicProgress').then(m => ({ default: m.AcademicProgress })))
const AttendanceTracking = React.lazy(() => import('../pages/parent/AttendanceTracking').then(m => ({ default: m.AttendanceTracking })))
const BehavioralReports = React.lazy(() => import('../pages/parent/BehavioralReports').then(m => ({ default: m.BehavioralReports })))
const Communications = React.lazy(() => import('../pages/parent/Communications').then(m => ({ default: m.Communications })))
const TeacherMessages = React.lazy(() => import('../pages/parent/TeacherMessages').then(m => ({ default: m.TeacherMessages })))
const FeeManagement = React.lazy(() => import('../pages/parent/FeeManagement').then(m => ({ default: m.FeeManagement })))
const Timetable = React.lazy(() => import('../pages/parent/Timetable').then(m => ({ default: m.Timetable })))
const HealthWellness = React.lazy(() => import('../pages/parent/HealthWellness').then(m => ({ default: m.HealthWellness })))
const Notifications = React.lazy(() => import('../pages/parent/Notifications').then(m => ({ default: m.Notifications })))
const ParentProfile = React.lazy(() => import('../pages/parent/ParentProfile').then(m => ({ default: m.ParentProfile })))
const ChildExams = React.lazy(() => import('../pages/parent/ChildExams').then(m => ({ default: m.ChildExams })))
const ChildAssignments = React.lazy(() => import('../pages/parent/ChildAssignments').then(m => ({ default: m.ChildAssignments })))
const ChildTranscript = React.lazy(() => import('../pages/parent/ChildTranscript').then(m => ({ default: m.ChildTranscript })))
const SchoolEvents = React.lazy(() => import('../pages/parent/SchoolEvents').then(m => ({ default: m.SchoolEvents })))
const ParentVirtualLearningConsents = React.lazy(() => import('../pages/parent/ParentVirtualLearningConsents').then(m => ({ default: m.ParentVirtualLearningConsents })))

interface ParentLayoutProps {
  children?: React.ReactNode
}

export function ParentLayout({ children }: ParentLayoutProps) {
  const { branding } = useBranding()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isChildSelectorOpen, setIsChildSelectorOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const auth = getAuthFromStorage()
  const { selectedChild, setSelectedChild, children: linkedChildren, setChildren } = useParentContext()

  // Extract current page from URL path
  const pathSegments = location.pathname.split('/')
  const currentPage = pathSegments[2] || 'dashboard'

  // Load children on mount
  useEffect(() => {
    const loadChildren = async () => {
      try {
        const response = await fetch('/api/parent/children', {
          headers: {
            'Authorization': `Bearer ${auth?.token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setChildren(data.children || [])
        }
      } catch (error) {
        console.error('Failed to load children:', error)
      }
    }

    if (auth?.token) {
      loadChildren()
    }
  }, [auth?.token, setChildren])

  // Load unread notifications count
  useEffect(() => {
    const loadNotificationCount = async () => {
      try {
        const response = await fetch('/api/parent/notifications?limit=1', {
          headers: {
            'Authorization': `Bearer ${auth?.token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setUnreadNotifications(data.unreadCount || 0)
        }
      } catch (error) {
        console.error('Failed to load notification count:', error)
      }
    }

    if (auth?.token) {
      loadNotificationCount()
      // Refresh every 30 seconds
      const interval = setInterval(loadNotificationCount, 30000)
      return () => clearInterval(interval)
    }
  }, [auth?.token])

  const handleNavigate = (page: string) => {
    navigate(`/parent/${page}`)
    setIsSidebarOpen(false)
  }

  const handleSelectChild = (child: any) => {
    setSelectedChild(child)
    setIsChildSelectorOpen(false)
  }

  const handleSignOut = () => {
    clearAuthFromStorage()
    navigate('/login')
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <ParentDashboard />
      case 'academic':
        return <AcademicProgress />
      case 'attendance':
        return <AttendanceTracking />
      case 'behavioral':
        return <BehavioralReports />
      case 'communications':
        return <Communications />
      case 'messages':
        return <TeacherMessages />
      case 'fees':
        return <FeeManagement />
      case 'timetable':
        return <Timetable />
      case 'exams':
        return <ChildExams />
      case 'assignments':
        return <ChildAssignments />
      case 'transcript':
        return <ChildTranscript />
      case 'events':
        return <SchoolEvents />
      case 'virtual-learning-consents':
        return <ParentVirtualLearningConsents />
      case 'health':
        return <HealthWellness />
      case 'notifications':
        return <Notifications />
      case 'profile':
        return <ParentProfile />
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Coming Soon</h2>
              <p className="text-gray-600">This page is currently under development.</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200
        flex flex-col transform transition-transform duration-200
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.schoolName} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-gray-900 truncate max-w-[140px]">{branding.schoolName}</p>
              <p className="text-xs text-blue-600">Parent Portal</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ParentNavigation currentPage={currentPage} onNavigate={handleNavigate} />

        {/* Sign out */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {selectedChild?.name || 'Parent Portal'}
              </p>
              <p className="text-xs text-gray-500">
                {selectedChild?.class ? `Class ${selectedChild.class}${selectedChild.arm ? selectedChild.arm : ''}` : 'Select a child'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative" onClick={() => handleNavigate('notifications')}>
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Button>

            {/* Child Selector */}
            <div className="relative">
              <button
                onClick={() => setIsChildSelectorOpen(!isChildSelectorOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {selectedChild?.name?.charAt(0) || 'C'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:inline max-w-[100px] truncate">
                  {selectedChild?.name || 'Select Child'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Child Selector Dropdown */}
              {isChildSelectorOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-40">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {linkedChildren.length > 0 ? (
                      linkedChildren.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => handleSelectChild(child)}
                          className={`
                            w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                            ${selectedChild?.id === child.id
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                            }
                          `}
                        >
                          <p className="font-medium">{child.name}</p>
                          <p className="text-xs text-gray-500">
                            {child.class}{child.arm ? child.arm : ''} • {child.admissionNumber}
                          </p>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-gray-500">No children linked</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-gray-900">Parent</p>
                <p className="text-xs text-gray-500">{auth?.userId ?? 'Portal'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          }>
            {children || renderPage()}
          </React.Suspense>
        </main>
      </div>
    </div>
  )
}
