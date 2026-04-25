import React from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  ClipboardCheck,
  Calendar,
  DollarSign,
  UserCog,
  MessageSquare,
  BarChart3,
  Shield,
  Bell,
  Palette,
  Plug,
  Sparkles,
  HelpCircle,
  ChevronDown,
  GraduationCap,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: { id: string; label: string }[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  {
    id: 'students',
    label: 'Student Management',
    icon: <GraduationCap className="w-5 h-5" />,
    children: [
      { id: 'students-list', label: 'All Students' },
      { id: 'student-enrollment', label: 'Enrollment & Admissions' },
      { id: 'student-promotion', label: 'Promotion & Demotion' },
      { id: 'student-documents', label: 'Documents' },
    ]
  },
  {
    id: 'academic',
    label: 'Academic Structure',
    icon: <BookOpen className="w-5 h-5" />,
    children: [
      { id: 'academic-structure', label: 'Overview' },
      { id: 'classes', label: 'Classes & Arms' },
      { id: 'subjects', label: 'Subjects' },
      { id: 'teacher-allocation', label: 'Teacher Allocation' },
      { id: 'ca-configuration', label: 'CA Configuration' },
      { id: 'grading-policy', label: 'Grading Policy' },
      { id: 'academic-calendar', label: 'Academic Calendar' },
    ]
  },
  {
    id: 'cbt',
    label: 'CBT & Examinations',
    icon: <FileText className="w-5 h-5" />,
    children: [
      { id: 'exam-creation', label: 'Exam Creation' },
      { id: 'question-bank', label: 'Question Bank' },
      { id: 'live-monitoring', label: 'Live Monitoring' },
      { id: 'exam-results', label: 'Exam Results' },
      { id: 'exam-security', label: 'Security Settings' },
    ]
  },
  {
    id: 'results',
    label: 'Results & Assessment',
    icon: <ClipboardCheck className="w-5 h-5" />,
    children: [
      { id: 'ca-entry', label: 'CA Score Entry' },
      { id: 'result-computation', label: 'Result Computation' },
      { id: 'result-approval', label: 'Result Approval' },
      { id: 'broadsheets', label: 'Broadsheets' },
      { id: 'transcripts', label: 'Transcripts' },
      { id: 'result-publishing', label: 'Publishing' },
    ]
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: <Calendar className="w-5 h-5" />,
    children: [
      { id: 'student-attendance', label: 'Student Attendance' },
      { id: 'staff-attendance', label: 'Staff Attendance' },
      { id: 'attendance-reports', label: 'Reports' },
    ]
  },
  {
    id: 'timetable',
    label: 'Timetable & Scheduling',
    icon: <Calendar className="w-5 h-5" />,
    children: [
      { id: 'timetable-configure', label: 'Configure' },
      { id: 'timetable-class', label: 'Class Timetable' },
      { id: 'timetable-teacher', label: 'Teacher Timetable' },
      { id: 'timetable-exam', label: 'Exam Schedule' },
    ]
  },
  {
    id: 'finance',
    label: 'Finance & Fees',
    icon: <DollarSign className="w-5 h-5" />,
    children: [
      { id: 'fee-structure', label: 'Fee Structure' },
      { id: 'fee-collection', label: 'Fee Collection' },
      { id: 'outstanding-fees', label: 'Outstanding Fees' },
      { id: 'invoices', label: 'Invoices' },
      { id: 'financial-reports', label: 'Financial Reports' },
    ]
  },
  {
    id: 'staff',
    label: 'Staff & HR',
    icon: <UserCog className="w-5 h-5" />,
    children: [
      { id: 'staff-list', label: 'All Staff' },
      { id: 'staff-roles', label: 'Roles & Departments' },
      { id: 'payroll', label: 'Payroll' },
      { id: 'leave-management', label: 'Leave Management' },
      { id: 'performance', label: 'Performance' },
    ]
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: <MessageSquare className="w-5 h-5" />,
    children: [
      { id: 'announcements', label: 'Announcements' },
      { id: 'bulk-notifications', label: 'Bulk Notifications' },
      { id: 'parent-messaging', label: 'Parent Messaging' },
      { id: 'communication-logs', label: 'Communication Logs' },
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    icon: <BarChart3 className="w-5 h-5" />,
    children: [
      { id: 'academic-analytics', label: 'Academic Performance' },
      { id: 'student-progress', label: 'Student Progress' },
      { id: 'teacher-performance', label: 'Teacher Performance' },
      { id: 'attendance-analytics', label: 'Attendance Analytics' },
      { id: 'financial-analytics', label: 'Financial Analytics' },
    ]
  },
  {
    id: 'security',
    label: 'Security & Compliance',
    icon: <Shield className="w-5 h-5" />,
    children: [
      { id: 'access-control', label: 'Access Control' },
      { id: 'session-management', label: 'Session Management' },
      { id: 'data-encryption', label: 'Data Encryption' },
      { id: 'backup-restore', label: 'Backup & Restore' },
    ]
  },
  {
    id: 'notifications',
    label: 'Notifications & Tasks',
    icon: <Bell className="w-5 h-5" />,
    children: [
      { id: 'pending-approvals', label: 'Pending Approvals' },
      { id: 'system-alerts', label: 'System Alerts' },
      { id: 'task-management', label: 'Task Management' },
    ]
  },
  {
    id: 'customization',
    label: 'Customization',
    icon: <Palette className="w-5 h-5" />,
    children: [
      { id: 'branding', label: 'School Branding' },
      { id: 'report-templates', label: 'Report Templates' },
      { id: 'grading-scale', label: 'Grading Scale' },
    ]
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: <Plug className="w-5 h-5" />,
    children: [
      { id: 'payment-gateway', label: 'Payment Gateway' },
      { id: 'biometric-devices', label: 'Biometric Devices' },
      { id: 'lms-integration', label: 'LMS Integration' },
      { id: 'api-management', label: 'API Management' },
    ]
  },
  {
    id: 'system',
    label: 'System Controls',
    icon: <Settings className="w-5 h-5" />,
    children: [
      { id: 'system-settings', label: 'System Settings' },
      { id: 'school-profile', label: 'School Profile' },
      { id: 'tenant-settings', label: 'Tenant Settings' },
      { id: 'roles-permissions', label: 'Roles & Permissions' },
      { id: 'user-accounts', label: 'User Accounts' },
      { id: 'audit-logs', label: 'Audit Logs' },
      { id: 'import-export', label: 'Import/Export' },
    ]
  },
  {
    id: 'advanced',
    label: 'Advanced Features',
    icon: <Sparkles className="w-5 h-5" />,
    children: [
      { id: 'offline-cbt', label: 'Offline CBT Sync' },
      { id: 'item-analysis', label: 'Exam Item Analysis' },
      { id: 'predictive-alerts', label: 'Predictive Risk Alerts' },
      { id: 'certificate-verification', label: 'Certificate Verification' },
    ]
  },
  {
    id: 'support',
    label: 'Help & Support',
    icon: <HelpCircle className="w-5 h-5" />,
    children: [
      { id: 'system-health', label: 'System Health' },
      { id: 'error-logs', label: 'Error Logs' },
      { id: 'help-center', label: 'Help Center' },
      { id: 'support-tickets', label: 'Support Tickets' },
    ]
  },
];

export function Sidebar({ activePage, onNavigate, isOpen, onClose }: SidebarProps) {
  const [openSections, setOpenSections] = React.useState<string[]>(['system']);

  const toggleSection = (id: string) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-gray-200 z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } w-72 flex flex-col`}
      >
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">SCHOLIX</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Selector */}
        <div className="p-4 border-b border-gray-200">
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>2025/2026 - First Term</option>
            <option>2025/2026 - Second Term</option>
            <option>2024/2025 - Third Term</option>
          </select>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <div key={item.id}>
                {item.children ? (
                  <Collapsible
                    open={openSections.includes(item.id)}
                    onOpenChange={() => toggleSection(item.id)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          openSections.includes(item.id) ? 'rotate-180' : ''
                        }`}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1">
                      <div className="ml-8 space-y-1">
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => {
                              onNavigate(child.id);
                              if (window.innerWidth < 1024) {
                                onClose();
                              }
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg ${
                              activePage === child.id
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <button
                    onClick={() => {
                      onNavigate(item.id);
                      if (window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                    className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg ${
                      activePage === item.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
