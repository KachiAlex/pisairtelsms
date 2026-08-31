import React, { useState, useEffect } from 'react';
import { useBranding } from '../contexts/BrandingContext';
import { getAuthFromStorage } from '../lib/auth';
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
  HelpCircle,
  ChevronDown,
  GraduationCap,
  Settings,
  Menu,
  X,
  MonitorPlay
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

import { usePlanAccess } from '../hooks/usePlanAccess';

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
  category?: keyof PlanFeatures;
  feature?: string;
  children?: { id: string; label: string; feature?: string }[];
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
      { id: 'student-promotion', label: 'Promotion & Demotion', feature: 'promotion' },
      { id: 'student-documents', label: 'Documents', feature: 'documents' },
    ]
  },
  {
    id: 'academic',
    label: 'Academic Structure',
    icon: <BookOpen className="w-5 h-5" />,
    children: [
      { id: 'academic-structure', label: 'Overview', feature: 'overviewDashboard' },
      { id: 'classes', label: 'Classes & Arms' },
      { id: 'subjects', label: 'Subjects' },
      { id: 'teacher-allocation', label: 'Teacher Allocation', feature: 'teacherAllocation' },
      { id: 'ca-configuration', label: 'CA Configuration' },
      { id: 'grading-policy', label: 'Grading Policy' },
      { id: 'academic-calendar', label: 'Academic Calendar', feature: 'calendar' },
    ]
  },

  {
    id: 'results',
    label: 'Results & Assessment',
    icon: <ClipboardCheck className="w-5 h-5" />,
    children: [
      { id: 'ca-entry', label: 'CA Score Entry' },
      { id: 'result-computation', label: 'Result Computation' },
      { id: 'result-approval', label: 'Result Approval', feature: 'approvalWorkflow' },
      { id: 'broadsheets', label: 'Broadsheets' },
      { id: 'transcripts', label: 'Transcripts', feature: 'transcripts' },
      { id: 'result-publishing', label: 'Publishing' },
    ]
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: <Calendar className="w-5 h-5" />,
    children: [
      { id: 'student-attendance', label: 'Student Attendance' },
      { id: 'staff-attendance', label: 'Staff Attendance', feature: 'staffTracking' },
      { id: 'attendance-reports', label: 'Reports' },
    ]
  },
  {
    id: 'cbt',
    label: 'CBT & Examinations',
    icon: <FileText className="w-5 h-5" />,
    children: [
      { id: 'cbt-question-bank', label: 'Question Bank' },
      { id: 'cbt-exam-creation', label: 'Create Exam' },
      { id: 'cbt-live-monitoring', label: 'Live Monitoring', feature: 'liveMonitoring' },
      { id: 'cbt-results', label: 'Results' },
      { id: 'cbt-security', label: 'Security Settings', feature: 'security' },
    ]
  },
  {
    id: 'digital-learning',
    label: 'Digital Learning',
    icon: <MonitorPlay className="w-5 h-5" />,
    category: 'digitalLearning',
    children: [
      { id: 'virtual-classrooms', label: 'Virtual Classrooms', feature: 'virtualClassrooms' },
      { id: 'private-lesson-request', label: 'Private Lesson Requests', feature: 'privateLessons' },
      { id: 'private-lesson-approvals', label: 'Lesson Approvals', feature: 'privateLessons' },
      { id: 'virtual-learning-settings', label: 'VL Settings' },
    ]
  },
  {
    id: 'timetable',
    label: 'Timetable & Scheduling',
    icon: <Calendar className="w-5 h-5" />,
    category: 'scheduling',
    children: [
      { id: 'timetable-configure', label: 'Configure', feature: 'configuration' },
      { id: 'timetable-class', label: 'Class Timetable', feature: 'timetables' },
      { id: 'timetable-teacher', label: 'Teacher Timetable', feature: 'timetables' },
      { id: 'timetable-exam', label: 'Exam Schedule', feature: 'timetables' },
    ]
  },
  {
    id: 'finance',
    label: 'Finance & Fees',
    icon: <DollarSign className="w-5 h-5" />,
    children: [
      { id: 'fee-structure', label: 'Fee Structure' },
      { id: 'fee-collection', label: 'Fee Collection' },
      { id: 'outstanding-fees', label: 'Outstanding Fees', feature: 'reminders' },
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
      { id: 'staff-roles', label: 'Roles & Departments', feature: 'rolesDepartments' },
      { id: 'payroll', label: 'Payroll', feature: 'payroll' },
      { id: 'leave-management', label: 'Leave Management', feature: 'leave' },
      { id: 'performance', label: 'Performance', feature: 'performance' },
    ]
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: <MessageSquare className="w-5 h-5" />,
    children: [
      { id: 'announcements', label: 'Announcements' },
      { id: 'bulk-notifications', label: 'Bulk Notifications', feature: 'bulkNotifications' },
      { id: 'parent-messaging', label: 'Parent Messaging', feature: 'parentTeacherMessaging' },
      { id: 'communication-logs', label: 'Communication Logs', feature: 'logs' },
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    icon: <BarChart3 className="w-5 h-5" />,
    category: 'analytics',
    children: [
      { id: 'academic-analytics', label: 'Academic Performance', feature: 'academic' },
      { id: 'student-progress', label: 'Student Progress', feature: 'studentProgress' },
      { id: 'teacher-performance', label: 'Teacher Performance', feature: 'teacherPerformance' },
      { id: 'attendance-analytics', label: 'Attendance Analytics', feature: 'attendance' },
      { id: 'financial-analytics', label: 'Financial Analytics', feature: 'financial' },
    ]
  },
  {
    id: 'security',
    label: 'Security & Compliance',
    icon: <Shield className="w-5 h-5" />,
    children: [
      { id: 'access-control', label: 'Access Control', feature: 'rbac' },
      { id: 'session-management', label: 'Session Management', feature: 'sessionManagement' },
      { id: 'data-encryption', label: 'Data Encryption', feature: 'encryption' },
      { id: 'backup-restore', label: 'Backup & Restore', feature: 'encryption' },
    ]
  },
  {
    id: 'notifications',
    label: 'Notifications & Tasks',
    icon: <Bell className="w-5 h-5" />,
    children: [
      { id: 'action-center', label: 'Command Center', feature: 'approvalCenter' },
      { id: 'notifications', label: 'Notification Center' },
      { id: 'pending-approvals', label: 'Pending Approvals', feature: 'approvalCenter' },
      { id: 'system-alerts', label: 'System Alerts' },
      { id: 'task-management', label: 'Task Management', feature: 'taskManagement' },
    ]
  },
  {
    id: 'customization',
    label: 'Customization',
    icon: <Palette className="w-5 h-5" />,
    children: [
      { id: 'branding', label: 'School Branding' },
      { id: 'report-templates', label: 'Report Templates', feature: 'customTemplates' },
      { id: 'grading-scale', label: 'Grading Scale', feature: 'gradingScales' },
    ]
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: <Plug className="w-5 h-5" />,
    children: [
      { id: 'payment-gateway', label: 'Payment Gateway', feature: 'paymentGateway' },
      { id: 'biometric-devices', label: 'Biometric Devices', feature: 'biometricIntegration' },
      { id: 'lms-integration', label: 'LMS Integration', feature: 'lmsIntegration' },
      { id: 'api-management', label: 'API Management', feature: 'apiAccess' },
    ]
  },
  {
    id: 'system',
    label: 'System Controls',
    icon: <Settings className="w-5 h-5" />,
    children: [
      { id: 'system-settings', label: 'System Settings' },
      { id: 'school-profile', label: 'School Profile' },
      { id: 'tenant-settings', label: 'Tenant Settings', feature: 'multiSchool' },
      { id: 'roles-permissions', label: 'Roles & Permissions', feature: 'customRoles' },
      { id: 'user-accounts', label: 'User Accounts' },
      { id: 'audit-logs', label: 'Audit Logs', feature: 'systemAuditLogs' },
      { id: 'import-export', label: 'Import/Export', feature: 'importExport' },
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
      { id: 'support-tickets', label: 'Support Tickets', feature: 'ticketSystem' },
    ]
  },
];

export function Sidebar({ activePage, onNavigate, isOpen, onClose }: SidebarProps) {
  const [openSections, setOpenSections] = React.useState<string[]>(['system']);
  const { branding } = useBranding();
  const { hasAccess } = usePlanAccess();

  const toggleSection = (id: string) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const filteredItems = navItems.filter(item => {
    // If it has a category, check if any feature in that category is allowed
    if (item.category) {
      return hasAccess(item.category);
    }
    return true;
  }).map(item => ({
    ...item,
    children: item.children ? item.children.filter(child => {
      if (child.feature) {
        // Map top level category based on item.id for simplicity if not provided
        const category = item.category || (item.id === 'students' ? 'studentManagement' : 
                          item.id === 'academic' ? 'academicStructure' :
                          item.id === 'results' ? 'results' :
                          item.id === 'cbt' ? 'exams' :
                          item.id === 'finance' ? 'finance' :
                          item.id === 'staff' ? 'hr' :
                          item.id === 'communication' ? 'communication' :
                          item.id === 'security' ? 'security' :
                          item.id === 'notifications' ? 'security' :
                          item.id === 'customization' ? 'results' :
                          item.id === 'integrations' ? 'admin' :
                          item.id === 'system' ? 'security' :
                          item.id === 'support' ? 'support' : 'security') as keyof PlanFeatures;
        return hasAccess(category, child.feature);
      }
      return true;
    }) : undefined
  })).filter(item => !item.children || item.children.length > 0);

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
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.schoolName}
                className="w-8 h-8 rounded-lg object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="font-bold text-xl text-gray-900 truncate max-w-[160px]">
              {branding.schoolName}
            </span>
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
          <SessionSelector />
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-3 space-y-1">
            {filteredItems.map((item) => (
              <div key={item.id}>
                {item.children ? (
                  <Collapsible
                    open={openSections.includes(item.id)}
                    onOpenChange={() => toggleSection(item.id)}
                  >
                    <div className="flex items-center gap-0">
                      <button
                        onClick={() => {
                          onNavigate(item.id);
                          if (window.innerWidth < 1024) {
                            onClose();
                          }
                        }}
                        className={`flex-1 flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-left ${
                          activePage === item.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                      <CollapsibleTrigger className="px-2 py-2 hover:bg-gray-100 rounded-lg">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            openSections.includes(item.id) ? 'rotate-180' : ''
                          }`}
                        />
                      </CollapsibleTrigger>
                    </div>
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
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.schoolName}
                className="w-8 h-8 rounded-lg object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="font-bold text-xl text-gray-900 truncate max-w-[160px]">
              {branding.schoolName}
            </span>
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
          <SessionSelector />
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
                    <div className="flex items-center gap-0">
                      <button
                        onClick={() => {
                          onNavigate(item.id);
                          if (window.innerWidth < 1024) {
                            onClose();
                          }
                        }}
                        className={`flex-1 flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-left ${
                          activePage === item.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                      <CollapsibleTrigger className="px-2 py-2 hover:bg-gray-100 rounded-lg">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            openSections.includes(item.id) ? 'rotate-180' : ''
                          }`}
                        />
                      </CollapsibleTrigger>
                    </div>
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

function SessionSelector() {
  const [sessions, setSessions] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/tenant/timetable/calendar?resource=academic-years', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.data)) {
            const labels = data.data.map((y: any) => y.name || y.label || `${y.startDate?.slice(0, 4)}/${y.endDate?.slice(0, 4)}`);
            setSessions(labels);
            if (labels.length > 0) setSelected(labels[0]);
          }
        }
      } catch {
        // silently ignore — session selector is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSessions();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400">
        <option>Loading sessions...</option>
      </select>
    );
  }

  if (sessions.length === 0) {
    return (
      <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400">
        <option>No sessions available</option>
      </select>
    );
  }

  return (
    <select
      value={selected}
      onChange={(e) => setSelected(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {sessions.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
