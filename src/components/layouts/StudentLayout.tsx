import React, { useState, Suspense, lazy } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  Clock,
  CreditCard,
  MessageSquare,
  User,
  Menu,
  X,
  Bell,
  LogOut,
  GraduationCap,
} from 'lucide-react'
import { clearAuthFromStorage, getAuthFromStorage } from '../../lib/auth'
import { Button } from '../ui/button'

const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })))
const MyResults = lazy(() => import('../pages/student/MyResults').then(m => ({ default: m.MyResults })))
const MyAttendance = lazy(() => import('../pages/student/MyAttendance').then(m => ({ default: m.MyAttendance })))
const MyTimetable = lazy(() => import('../pages/student/MyTimetable').then(m => ({ default: m.MyTimetable })))
const MyFees = lazy(() => import('../pages/student/MyFees').then(m => ({ default: m.MyFees })))
const Communications = lazy(() => import('../pages/student/Communications').then(m => ({ default: m.Communications })))
const Messages = lazy(() => import('../pages/student/Messages').then(m => ({ default: m.Messages })))
const Profile = lazy(() => import('../pages/student/Profile').then(m => ({ default: m.Profile })))

interface StudentLayoutProps {
  children?: React.ReactNode
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'results', label: 'My Results', icon: BookOpen },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'timetable', label: 'Timetable', icon: Clock },
  { id: 'fees', label: 'Fees & Payments', icon: CreditCard },
  { id: 'communications', label: 'Communications', icon: MessageSquare },
  { id: 'profile', label: 'Profile', icon: User },
]

export function StudentLayout({ children }: StudentLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const auth = getAuthFromStorage()

  // Extract current page from URL path
  const pathSegments = location.pathname.split('/')
  const currentPage = pathSegments[2] || 'dashboard'

  const handleNavigate = (page: string) => {
    navigate(`/student/${page}`)
    setIsSidebarOpen(false)
  }

  const handleSignOut = () => {
    clearAuthFromStorage()
    navigate('/login')
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <StudentDashboard />
      case 'results':
        return <MyResults />
      case 'attendance':
        return <MyAttendance />
      case 'timetable':
        return <MyTimetable />
      case 'fees':
        return <MyFees />
      case 'communications':
        return <Communications />
      case 'messages':
        return <Messages />
      case 'profile':
        return <Profile />
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
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">ScholarX</p>
              <p className="text-xs text-blue-600">Student Portal</p>
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

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>

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
                {navItems.find(n => n.id === currentPage)?.label ?? 'Student Portal'}
              </p>
              <p className="text-xs text-gray-500">2024/2025 Academic Session</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-gray-900">Student</p>
                <p className="text-xs text-gray-500">{auth?.userId ?? 'Portal'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-pulse text-gray-500">Loading...</div></div>}>
            {renderPage()}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
