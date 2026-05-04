import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Menu, User, Bell, Search } from 'lucide-react';
import { HomePage } from './components/HomePage';
import { Sidebar } from './components/Sidebar';
import { TenantProvider } from './contexts/TenantContext';
const Dashboard = lazy(() => import('./components/pages/Dashboard'));
const StudentsList = lazy(() => import('./components/pages/StudentsList'));
const StudentEnrollment = lazy(() => import('./components/pages/StudentEnrollment'));
const PublicApplicationForm = lazy(() => import('./components/pages/PublicApplicationForm'));
const PublicInquiryForm = lazy(() => import('./components/pages/PublicInquiryForm'));
const StudentPromotion = lazy(() => import('./components/pages/StudentPromotion'));
const StudentDocuments = lazy(() => import('./components/pages/StudentDocuments'));
const StudentHealth = lazy(() => import('./components/pages/StudentHealth'));
const StudentAttendance = lazy(() => import('./components/pages/StudentAttendance'));
const TimetableScheduling = lazy(() => import('./components/pages/TimetableScheduling'));
const StaffHR = lazy(() => import('./components/pages/StaffHR'));
const CommunicationHub = lazy(() => import('./components/pages/CommunicationHub'));

const FinanceManagement = lazy(() => import('./components/pages/FinanceManagement'));
const AnalyticsDashboard = lazy(() => import('./components/pages/AnalyticsDashboard'));
const SystemSettings = lazy(() => import('./components/pages/SystemSettings'));
const SchoolProfile = lazy(() => import('./components/pages/SchoolProfile'));
const RolesPermissions = lazy(() => import('./components/pages/RolesPermissions'));
const UserAccounts = lazy(() => import('./components/pages/UserAccounts'));
const AuditLogs = lazy(() => import('./components/pages/AuditLogs'));
const ImportExport = lazy(() => import('./components/pages/ImportExport'));
const AcademicStructureOverview = lazy(() => import('./components/pages/AcademicStructureOverview'));
const ClassesAndArms = lazy(() => import('./components/pages/ClassesAndArms'));
const SubjectsCatalog = lazy(() => import('./components/pages/SubjectsCatalog'));
const TeacherAllocation = lazy(() => import('./components/pages/TeacherAllocation'));
const CAConfiguration = lazy(() => import('./components/pages/CAConfiguration'));
const GradingPolicy = lazy(() => import('./components/pages/GradingPolicy'));
const AcademicCalendar = lazy(() => import('./components/pages/AcademicCalendar'));
const CAScoreEntry = lazy(() => import('./components/pages/CAScoreEntry'));
const ResultComputation = lazy(() => import('./components/pages/ResultComputation'));
const ResultApproval = lazy(() => import('./components/pages/ResultApproval'));
const Broadsheets = lazy(() => import('./components/pages/Broadsheets'));
const Transcripts = lazy(() => import('./components/pages/Transcripts'));
const ResultPublishing = lazy(() => import('./components/pages/ResultPublishing'));
const AccessControl = lazy(() => import('./components/pages/AccessControl'));
const SessionManagement = lazy(() => import('./components/pages/security/SessionManagement'));
const DataEncryption = lazy(() => import('./components/pages/security/DataEncryption'));
const BackupRestore = lazy(() => import('./components/pages/BackupRestore'));
const PendingApprovals = lazy(() => import('./components/pages/PendingApprovals'));
const SystemAlerts = lazy(() => import('./components/pages/SystemAlerts'));
const TaskManagement = lazy(() => import('./components/pages/TaskManagement'));
const SchoolBranding = lazy(() => import('./components/pages/SchoolBranding'));
const ReportTemplates = lazy(() => import('./components/pages/ReportTemplates'));
const GradingScale = lazy(() => import('./components/pages/GradingScale'));
const PaymentGateway = lazy(() => import('./components/pages/PaymentGateway'));
const BiometricDevices = lazy(() => import('./components/pages/BiometricDevices'));
const LMSIntegration = lazy(() => import('./components/pages/LMSIntegration'));
const APIManagement = lazy(() => import('./components/pages/APIManagement'));
const CBTExaminations = lazy(() => import('./components/pages/cbt/CBTExaminations'));
const OfflineCBTSync = lazy(() => import('./components/pages/OfflineCBTSync'));
const ExamItemAnalysis = lazy(() => import('./components/pages/ExamItemAnalysis'));
const PredictiveRiskAlerts = lazy(() => import('./components/pages/PredictiveRiskAlerts'));
const CertificateVerification = lazy(() => import('./components/pages/CertificateVerification'));
const SystemHealth = lazy(() => import('./components/pages/SystemHealth'));
const ErrorLogs = lazy(() => import('./components/pages/ErrorLogs'));
const HelpCenter = lazy(() => import('./components/pages/HelpCenter'));
const SupportTickets = lazy(() => import('./components/pages/SupportTickets'));
const SuperAdminPortal = lazy(() => import('./components/pages/SuperAdminPortal'));
const TenantSettings = lazy(() => import('./components/pages/TenantSettings').then(m => ({ default: m.TenantSettings })));
import { LoginRole } from './components/auth/LoginPanel';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleBasedRoute } from './components/auth/RoleBasedRoute';
import { StudentLayout } from './components/layouts/StudentLayout';
import { StaffLayout } from './components/layouts/StaffLayout';
import { ParentLayout } from './components/layouts/ParentLayout';
import { ParentContextProvider } from './contexts/ParentContext';
import { ParentLoginPage } from './components/auth/ParentLoginPage';
import { clearAuthFromStorage } from './lib/auth';
import { AccessPortalPage } from './components/pages/AccessPortalPage';
import { UnauthorizedPage } from './components/pages/UnauthorizedPage';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';

export default function App() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLoginSuccess = (role: LoginRole) => {
    navigate(role === 'super-admin' ? '/super-admin' : '/tenant');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'students-list':
        return <StudentsList />;
      case 'student-enrollment':
        return <StudentEnrollment />;
      case 'student-promotion':
        return <StudentPromotion />;
      case 'student-documents':
        return <StudentDocuments />;
      case 'student-health':
        return <StudentHealth />;
      case 'student-attendance':
        return <StudentAttendance />;
      case 'cbt':
      case 'cbt-question-bank':
      case 'cbt-exam-creation':
      case 'cbt-live-monitoring':
      case 'cbt-results':
      case 'cbt-security':
        return <CBTExaminations />;
      case 'timetable':
      case 'timetable-configure':
      case 'timetable-class':
      case 'timetable-teacher':
      case 'timetable-exam':
        return <TimetableScheduling
          initialView={
            activePage === 'timetable-configure'
              ? 'configure'
              : activePage === 'timetable-teacher'
              ? 'teacher'
              : activePage === 'timetable-exam'
              ? 'exam'
              : 'class'
          }
        />;
      case 'staff':
      case 'staff-list':
      case 'staff-roles':
      case 'payroll':
      case 'leave-management':
      case 'performance':
        return <StaffHR />;
      case 'communication':
      case 'announcements':
      case 'bulk-notifications':
      case 'parent-messaging':
      case 'communication-logs':
        return <CommunicationHub />;
      case 'finance':
      case 'fee-structure':
      case 'fee-collection':
      case 'outstanding-fees':
      case 'invoices':
      case 'financial-reports':
        return <FinanceManagement />;
      case 'analytics':
      case 'academic-analytics':
      case 'student-progress':
      case 'teacher-performance':
      case 'attendance-analytics':
      case 'financial-analytics':
        return <AnalyticsDashboard />;
      case 'academic':
      case 'academic-structure':
        return <AcademicStructureOverview />;
      case 'classes':
        return <ClassesAndArms />;
      case 'subjects':
        return <SubjectsCatalog />;
      case 'teacher-allocation':
        return <TeacherAllocation />;
      case 'ca-configuration':
        return <CAConfiguration />;
      case 'ca-entry':
        return <CAScoreEntry />;
      case 'result-computation':
        return <ResultComputation />;
      case 'result-approval':
        return <ResultApproval />;
      case 'broadsheets':
        return <Broadsheets />;
      case 'transcripts':
        return <Transcripts />;
      case 'result-publishing':
        return <ResultPublishing />;
      case 'grading-policy':
        return <GradingPolicy />;
      case 'academic-calendar':
        return <AcademicCalendar />;
      case 'results':
      case 'access-control':
        return <AccessControl />;
      case 'session-management':
        return <SessionManagement />;
      case 'data-encryption':
        return <DataEncryption />;
      case 'backup-restore':
        return <BackupRestore />;
      case 'notifications':
      case 'pending-approvals':
        return <PendingApprovals />;
      case 'system-alerts':
        return <SystemAlerts />;
      case 'task-management':
        return <TaskManagement />;
      case 'payment-gateway':
        return <PaymentGateway />;
      case 'biometric-devices':
        return <BiometricDevices />;
      case 'lms-integration':
        return <LMSIntegration />;
      case 'api-management':
        return <APIManagement />;
      case 'advanced':
      case 'offline-cbt':
        return <OfflineCBTSync />;
      case 'item-analysis':
        return <ExamItemAnalysis />;
      case 'predictive-alerts':
        return <PredictiveRiskAlerts />;
      case 'certificate-verification':
        return <CertificateVerification />;
      case 'support':
      case 'system-health':
        return <SystemHealth />;
      case 'error-logs':
        return <ErrorLogs />;
      case 'help-center':
        return <HelpCenter />;
      case 'support-tickets':
        return <SupportTickets />;
      case 'customization':
      case 'branding':
        return <SchoolBranding />;
      case 'report-templates':
        return <ReportTemplates />;
      case 'grading-scale':
        return <GradingScale />;
      case 'system':
      case 'system-settings':
        return <SystemSettings />;
      case 'school-profile':
        return <SchoolProfile />;
      case 'roles-permissions':
        return <RolesPermissions />;
      case 'user-accounts':
        return <UserAccounts />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'import-export':
        return <ImportExport />;
      case 'integrations':
      case 'tenant-settings':
        return <TenantSettings tenantId="default" tenantName="Default School" />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Feature Coming Soon
              </h2>
              <p className="text-gray-600">
                This module is currently under development.
              </p>
            </div>
          </div>
        );
    }
  };

  const getPageTitle = () => {
    const pageTitles: { [key: string]: string } = {
      dashboard: 'Dashboard',
      'students-list': 'Student Management',
      'student-enrollment': 'Student Enrollment',

      'fee-structure': 'Finance & Fees',
      'academic-analytics': 'Analytics & Reports',
      'system-settings': 'System Settings',
    };
    return pageTitles[activePage] || 'SCHOLIX';
  };

  const tenantShell = (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
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
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
              <p className="text-xs text-gray-500">2025/2026 Academic Session - First Term</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search..." className="pl-10 w-64" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-96 overflow-y-auto">
                  <div className="p-3 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm font-medium text-gray-900">Result Approval Pending</p>
                    <p className="text-xs text-gray-600 mt-1">SS3 First Term results awaiting approval</p>
                    <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                  </div>
                  <div className="p-3 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm font-medium text-gray-900">New Student Enrolled</p>
                    <p className="text-xs text-gray-600 mt-1">John Adewale added to JSS 1A</p>
                    <p className="text-xs text-gray-500 mt-1">4 hours ago</p>
                  </div>
                  <div className="p-3 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm font-medium text-gray-900">Exam Scheduled</p>
                    <p className="text-xs text-gray-600 mt-1">Mathematics CBT for JSS 2 - Jan 20</p>
                    <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-gray-900">Admin User</p>
                    <p className="text-xs text-gray-500">System Administrator</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>Change Password</DropdownMenuItem>
                <DropdownMenuItem>Activity Log</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => {
                  clearAuthFromStorage();
                  navigate('/login');
                }}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6"><Suspense fallback={<div className="flex items-center justify-center h-full"><div>Loading...</div></div>}>{renderPage()}</Suspense></main>
      </div>
    </div>
  );

  return (
    <TenantProvider>
      <Routes>
        <Route path="/" element={<HomePage onNavigateToDashboard={() => navigate('/login')} />} />
        <Route
          path="/login"
          element={<AccessPortalPage onLoginSuccess={handleLoginSuccess} onBackToMarketing={() => navigate('/')} />}
        />
        <Route path="/apply" element={<Suspense fallback={<div>Loading...</div>}><PublicApplicationForm /></Suspense>} />
        <Route path="/inquiry" element={<Suspense fallback={<div>Loading...</div>}><PublicInquiryForm /></Suspense>} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/tenant" element={<ProtectedRoute requiredRole="tenant_admin">{tenantShell}</ProtectedRoute>} />
        <Route path="/super-admin" element={<ProtectedRoute requiredRole="super_admin"><Suspense fallback={<div>Loading...</div>}><SuperAdminPortal onSignOut={() => navigate('/login')} /></Suspense></ProtectedRoute>} />
        <Route path="/student/*" element={<RoleBasedRoute allowedRoles={['student']}><StudentLayout /></RoleBasedRoute>} />
        <Route path="/staff/*" element={<RoleBasedRoute allowedRoles={['staff']}><StaffLayout /></RoleBasedRoute>} />
        <Route path="/parent/login" element={<ParentLoginPage />} />
        <Route path="/parent/*" element={<RoleBasedRoute allowedRoles={['parent']} redirectTo="/parent/login"><ParentContextProvider><Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}><ParentLayout /></Suspense></ParentContextProvider></RoleBasedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TenantProvider>
  );
}
