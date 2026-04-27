import React, { useState, Suspense, lazy } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  Bell,
  LogOut,
  ChevronDown,
  GraduationCap,
} from 'lucide-react'
import { clearAuthFromStorage, getAuthFromStorage } from '../../lib/auth'
import { useParentContext } from '../../contexts/ParentContext'
import { ParentNavigation } from '../parent/ParentNavigation'
import { Button } from '../ui/button'

const ParentDashboard = lazy(() => import('../pages/parent/ParentDashboard').then(m => ({ default: m.ParentDashboard })))

interface ParentLayoutProps {
  children?: React.ReactNode
}

export function ParentLayout({ children }: ParentLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isChildSelectorOpen, setIsChildSelectorOpen] = useState(false)
  const { selectedChild, linkedChildren, selectChild, isLoading } = useParentContext()
  const auth = getAuthFromStorage()

  // Extract current page from URL path
  const pathSegments = location.pathname.split('/')
  const currentPage = pathSegments[2] || 'dashboard'

  const handleNavigate = (page: string) => {
    navigate(`/parent/${page}`)
    setIsSidebarOpen(false)
  }

  const handleSelectChild = (childId: string) => {
    const child = linkedChildren.find(c => c.id === childId)
    if (child) {
      selectChild(child)
      setIsChildSelectorOpen(false)
    }
  }

  const handleSignOut = () => {
    clearAuthFromStorage()
    navigate('/login')
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <ParentDashboard />
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
              <p className="text-gray-600">This page is currently under development.</p>
            </div>
          </div>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      </div>
    )
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
                Parent Portal
              </p>
              <p className="text-xs text-gray-500">2024/2025 Academic Session</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Child Selector */}
            {linkedChildren.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsChildSelectorOpen(!isChildSelectorOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <span className="hidden sm:inline">{selectedChild?.name || 'Select Child'}</span>
                  <span className="sm:hidden">{selectedChild?.name?.split(' ')[0] || 'Child'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Child Selector Dropdown */}
                {isChildSelectorOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-40">
                    {linkedChildren.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => handleSelectChild(child.id)}
                        className={`
                          w-full text-left px-4 py-2.5 text-sm transition-colors
                          ${selectedChild?.id === child.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }
                          ${linkedChildren.indexOf(child) !== linkedChildren.length - 1 ? 'border-b border-gray-100' : ''}
                        `}
                      >
                        <div className="font-medium">{child.name}</div>
                        <div className="text-xs text-gray-500">{child.admissionNumber}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notification Bell */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            {/* Parent Info */}
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">P</span>
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
          <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-pulse text-gray-500">Loading...</div></div>}>
            {renderPage()}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
