import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Sparkles, ArrowRight, Globe, Radio, BookOpen, Briefcase } from 'lucide-react'

import { LoginPanel, LoginRole } from '../auth/LoginPanel'
import { StudentLoginPage } from '../auth/StudentLoginPage'
import { StaffLoginPage } from '../auth/StaffLoginPage'

interface AccessPortalPageProps {
  onLoginSuccess: (role: LoginRole) => void
  onBackToMarketing: () => void
}

type RoleKey = 'admin' | 'students' | 'staff' | 'super'

interface RoleFeature {
  icon: React.ReactNode
  title: string
  description: string
}

interface RoleData {
  btn: string
  helper: string
  features: RoleFeature[]
}

const roleData: Record<RoleKey, RoleData> = {
  admin: {
    btn: 'Enter Admin Portal',
    helper: 'Enter the credentials for your school or network admin account.',
    features: [
      {
        icon: <Radio className="h-5 w-5 text-white" />,
        title: 'Attendance & Academics',
        description: 'Digitize roll calls, monitor absences, and broadcast remediation plans in real time.',
      },
      {
        icon: <BookOpen className="h-5 w-5 text-white" />,
        title: 'Finance Automation',
        description: 'Centralize fees, invoicing, and settlements with role-based approvals and audit logs.',
      },
    ],
  },
  students: {
    btn: 'Enter Student Portal',
    helper: 'Sign in with the email your school registered for you.',
    features: [
      {
        icon: <BookOpen className="h-5 w-5 text-white" />,
        title: 'Timetable & Grades',
        description: 'See class schedules, assignments, and results the moment teachers publish them.',
      },
      {
        icon: <Shield className="h-5 w-5 text-white" />,
        title: 'Attendance History',
        description: 'Track your own attendance record and request corrections directly with staff.',
      },
    ],
  },
  staff: {
    btn: 'Enter Staff Portal',
    helper: 'Use your staff work email to access classes and records.',
    features: [
      {
        icon: <Radio className="h-5 w-5 text-white" />,
        title: 'Gradebook & Roll Call',
        description: 'Take attendance and enter grades from any device, synced instantly to admins.',
      },
      {
        icon: <Briefcase className="h-5 w-5 text-white" />,
        title: 'Parent Communication',
        description: 'Message parents and guardians directly, with full conversation history logged.',
      },
    ],
  },
  super: {
    btn: 'Enter Super Admin Portal',
    helper: 'Super admin account detected. Enter the credentials configured for your Pisairtel Schools command center.',
    features: [
      {
        icon: <Globe className="h-5 w-5 text-white" />,
        title: 'Tenant Provisioning',
        description: 'Spin up secure workspaces with pre-baked compliance guardrails for every education network.',
      },
      {
        icon: <Shield className="h-5 w-5 text-white" />,
        title: 'Command Center',
        description: 'Observe performance, incidents, and billing telemetry across all connected schools.',
      },
    ],
  },
}

const TABS: { key: RoleKey; label: string }[] = [
  { key: 'admin', label: 'School & network admins' },
  { key: 'students', label: 'Students' },
  { key: 'staff', label: 'Staff' },
  { key: 'super', label: 'Super admin' },
]

function FeatureCard({ feature }: { feature: RoleFeature }) {
  return (
    <div className="flex gap-4 items-start bg-white border border-[#e6e2d8] rounded-xl p-4 transition-all duration-300 hover:opacity-90">
      <div className="h-9 w-9 rounded-lg bg-[#15161a] flex items-center justify-center flex-shrink-0">
        {feature.icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#15161a]">{feature.title}</p>
        <p className="text-[13px] text-[#5b5c63] leading-relaxed">{feature.description}</p>
      </div>
    </div>
  )
}

export function AccessPortalPage({ onLoginSuccess, onBackToMarketing }: AccessPortalPageProps) {
  const navigate = useNavigate()
  const [activeRole, setActiveRole] = useState<RoleKey>('admin')
  const [showStudentLogin, setShowStudentLogin] = useState(false)
  const [showStaffLogin, setShowStaffLogin] = useState(false)
  const [animateKey, setAnimateKey] = useState(0)

  const ROLE_ROUTES: Record<string, string> = {
    super_admin: '/super-admin',
    tenant_admin: '/tenant',
    staff: '/staff/dashboard',
    student: '/student/dashboard',
    parent: '/parent/dashboard',
  }

  const navigateByRole = () => {
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}')
      navigate(ROLE_ROUTES[auth.role] ?? '/unauthorized')
    } catch {
      navigate('/login')
    }
  }

  const handleRoleChange = (role: RoleKey) => {
    setActiveRole(role)
    setAnimateKey((k) => k + 1)
    if (role === 'students') {
      setShowStudentLogin(true)
      setShowStaffLogin(false)
    } else if (role === 'staff') {
      setShowStaffLogin(true)
      setShowStudentLogin(false)
    } else {
      setShowStudentLogin(false)
      setShowStaffLogin(false)
    }
  }

  useEffect(() => {
    handleRoleChange('admin')
  }, [])

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] font-sans text-[#15161a]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Left marketing panel */}
      <div className="relative overflow-hidden bg-[#faf9f5] px-7 py-12 lg:px-16 lg:py-14 flex flex-col justify-center">
        <div
          className="absolute w-[420px] h-[420px] rounded-full blur-[70px] opacity-55"
          style={{
            background: 'radial-gradient(circle, #fbe6ee 0%, transparent 72%)',
            top: '-140px',
            left: '-60px',
          }}
        />
        <div
          className="absolute w-[340px] h-[340px] rounded-full blur-[70px] opacity-55"
          style={{
            background: 'radial-gradient(circle, #fdecd0 0%, transparent 72%)',
            bottom: '-100px',
            left: '30%',
          }}
        />

        <div className="relative z-10 max-w-[560px]">
          <div className="inline-flex items-center gap-2 font-mono text-[11.5px] tracking-[0.12em] text-[#5b5c63] border border-[#d5cfc0] rounded-full px-4 py-[7px] mb-7">
            <Shield className="h-3.5 w-3.5 text-[#e31e24]" />
            PISAIRTEL SCHOOLS · ACCESS PORTAL
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-[50px] leading-[1.06] tracking-tight text-[#15161a] mb-5"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}
          >
            Sign in to run <em className="italic text-[#e31e24]" style={{ fontWeight: 500 }}>every</em> campus.
          </h1>

          <p className="text-[15.5px] leading-relaxed text-[#5b5c63] max-w-[480px] mb-8">
            School and network admins manage day-to-day operations, while super admins oversee provisioning, billing, and compliance across every Pisairtel Schools tenant.
          </p>

          <div className="inline-flex flex-wrap bg-[#f3f1ea] border border-[#e6e2d8] rounded-xl p-1 gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleRoleChange(tab.key)}
                className={`text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  activeRole === tab.key
                    ? 'bg-white text-[#15161a] shadow-sm'
                    : 'text-[#9b9a94] hover:text-[#5b5c63]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div key={animateKey} className="mt-7 flex flex-col gap-3 animate-[rise_0.7s_cubic-bezier(.2,.7,.2,1)_forwards]">
            {roleData[activeRole].features.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              onClick={onBackToMarketing}
              className="text-[13.5px] font-semibold border border-[#d5cfc0] rounded-lg px-5 py-2.5 hover:border-[#15161a] transition-colors"
            >
              Get started
            </button>
            <Link
              to="/"
              className="text-[13px] font-semibold text-[#5b5c63] inline-flex items-center gap-1 hover:text-[#15161a] transition-colors"
            >
              Explore Pisairtel Schools
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div
        className="relative flex items-center justify-center px-6 py-12 lg:px-10"
        style={{
          background: '#15161a',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(420px 320px at 85% 15%, rgba(232,40,110,.28), transparent 60%), radial-gradient(420px 320px at 10% 90%, rgba(247,147,30,.20), transparent 60%)',
          }}
        />

        <div className="relative z-10 w-full max-w-[400px] bg-white rounded-[20px] p-8 sm:p-9 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.45)] animate-[rise_0.7s_0.15s_cubic-bezier(.2,.7,.2,1)_forwards]">
          {showStudentLogin ? (
            <StudentLoginPage
              onLoginSuccess={navigateByRole}
              onBackToPortalSelection={() => handleRoleChange('admin')}
              roleData={roleData.students}
            />
          ) : showStaffLogin ? (
            <StaffLoginPage
              onLoginSuccess={navigateByRole}
              onBackToPortalSelection={() => handleRoleChange('admin')}
              roleData={roleData.staff}
            />
          ) : (
            <LoginPanel onLogin={onLoginSuccess} roleData={roleData[activeRole]} activeRole={activeRole} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes rise {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default AccessPortalPage
