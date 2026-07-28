import React from 'react'
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  AlertCircle,
  MessageSquare,
  Mail,
  CreditCard,
  Clock,
  Heart,
  Bell,
  User,
  GraduationCap,
  ClipboardList,
  FileText,
  CalendarDays,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface ParentNavigationProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'academic', label: 'Academic Progress', icon: BookOpen },
  { id: 'transcript', label: 'Report Card', icon: FileText },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'behavioral', label: 'Behavioral Reports', icon: AlertCircle },
  { id: 'communications', label: 'Communications', icon: MessageSquare },
  { id: 'messages', label: 'Teacher Messages', icon: Mail },
  { id: 'fees', label: 'Fee Management', icon: CreditCard },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'exams', label: 'Exams', icon: GraduationCap },
  { id: 'timetable', label: 'Timetable', icon: Clock },
  { id: 'events', label: 'School Events', icon: CalendarDays },
  { id: 'health', label: 'Health & Wellness', icon: Heart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
]

export function ParentNavigation({ currentPage, onNavigate }: ParentNavigationProps) {
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = currentPage === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
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
  )
}
