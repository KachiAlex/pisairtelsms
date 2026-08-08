import React, { useEffect, useMemo, useState } from 'react'
import { Briefcase, ShieldCheck, Eye, EyeOff } from 'lucide-react'

import { Input } from '../ui/input'
import { CreateSuperAdminAccountDialog, SuperAdminAccountFormData } from './CreateSuperAdminAccountDialog'
import {
  fetchSuperAdminAccount,
  SuperAdminAccount,
  upsertSuperAdminAccount,
} from '../../lib/superAdminClient'
import { setAuthInStorage } from '../../lib/auth'

export type LoginRole = 'tenant-admin' | 'super-admin'

interface RoleData {
  btn: string
  helper: string
  features: { icon: React.ReactNode; title: string; description: string }[]
}

interface LoginPanelProps {
  onLogin: (role: LoginRole) => void
  roleData: RoleData
  activeRole: string
}

const STORAGE_KEY = 'Pisairtel-Schools.superAdminAccount'

export function LoginPanel({ onLogin, roleData, activeRole }: LoginPanelProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [storedAccount, setStoredAccount] = useState<SuperAdminAccount | null>(null)
  const [isAccountLoading, setIsAccountLoading] = useState(true)
  const [accountLoadError, setAccountLoadError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadAccount() {
      setIsAccountLoading(true)
      setAccountLoadError('')
      try {
        const account = await fetchSuperAdminAccount()
        if (cancelled) return
        setStoredAccount(account)
        if (account && !email) {
          setEmail(account.email)
        }
      } catch (loadError) {
        if (cancelled) return
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Unable to reach Pisairtel-Schools cloud right now. Please retry later.'
        setAccountLoadError(message)
      } finally {
        if (!cancelled) {
          setIsAccountLoading(false)
        }
      }
    }

    loadAccount()
    return () => {
      cancelled = true
    }
  }, [email])

  const normalizedStoredEmail = storedAccount?.email?.trim().toLowerCase() ?? ''
  const normalizedInputEmail = email.trim().toLowerCase()
  const isSuperAdminFlow = useMemo(() => {
    if (!storedAccount) return false
    return normalizedInputEmail === normalizedStoredEmail
  }, [normalizedInputEmail, normalizedStoredEmail, storedAccount])

  const helperText = isSuperAdminFlow
    ? 'Super admin account detected. Enter the credentials configured for your Pisairtel-Schools command center.'
    : activeRole === 'super'
    ? 'Super admin account detected. Enter the credentials configured for your Pisairtel-Schools command center.'
    : 'Use your school workspace email to enter the Pisairtel-Schools tenant console.'

  const handleAccountCreated = async (account: SuperAdminAccountFormData) => {
    const savedAccount = await upsertSuperAdminAccount(account)
    setStoredAccount(savedAccount)
    setEmail(savedAccount.email)
    setPassword('')
    setAccountLoadError('')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (isSuperAdminFlow || activeRole === 'super') {
      try {
        setIsVerifying(true)
        const response = await fetch('/api/super-admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedInputEmail, password }),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Invalid credentials')
        }
        setAuthInStorage({
          token: data.token,
          tenantId: data.tenantId,
          role: 'super_admin',
          userId: data.userId,
          name: data.name,
          email: data.email,
          expiresAt: data.expiresAt,
        })
        onLogin('super-admin')
        return
      } catch (verifyError) {
        const message =
          verifyError instanceof Error ? verifyError.message : 'Unable to verify credentials. Please try again.'
        setError(message)
        return
      } finally {
        setIsVerifying(false)
      }
    }

    // Tenant admin / staff login
    try {
      setIsVerifying(true)
      const response = await fetch('/api/tenant/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedInputEmail, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setAuthInStorage({
          token: data.token,
          tenantId: data.tenantId,
          role: 'tenant_admin',
          userId: data.userId,
          name: data.name,
          email: data.email,
          expiresAt: data.expiresAt,
        })
        onLogin('tenant-admin')
        return
      }

      if (response.status === 403) {
        const staffResponse = await fetch('/api/staff/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedInputEmail, password }),
        })
        const staffData = await staffResponse.json()
        if (!staffResponse.ok) {
          throw new Error(staffData.error || 'Invalid credentials')
        }
        setAuthInStorage({
          token: staffData.token,
          tenantId: staffData.tenantId || 'default-tenant',
          role: staffData.role,
          userId: staffData.userId,
          name: staffData.name,
          email: staffData.email,
          expiresAt: staffData.expiresAt,
        })
        onLogin('tenant-admin')
        return
      }

      const data = await response.json()
      throw new Error(data.error || 'Invalid credentials')
    } catch (loginError) {
      const message =
        loginError instanceof Error ? loginError.message : 'Login failed. Please check your credentials.'
      setError(message)
    } finally {
      setIsVerifying(false)
    }
  }

  const buttonText = isVerifying
    ? 'Signing in...'
    : isSuperAdminFlow || activeRole === 'super'
    ? 'Enter Super Admin Portal'
    : roleData.btn

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-[38px] w-[38px] rounded-[10px] bg-[#15161a] flex items-center justify-center flex-shrink-0">
          <Briefcase className="h-5 w-5 text-[#e31e24]" />
        </div>
        <div>
          <p
            className="text-[10.5px] tracking-[0.1em] text-[#9b9a94] mb-0.5"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            SECURE ACCESS
          </p>
          <h3
            className="text-[18.5px] leading-tight text-[#15161a]"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}
          >
            Sign in to Pisairtel Schools
          </h3>
        </div>
      </div>

      <div className="mb-[18px]">
        <label htmlFor="login-email" className="block text-[12.5px] font-semibold text-[#5b5c63] mb-[7px]">
          Work email
        </label>
        <Input
          id="login-email"
          type="email"
          placeholder="admin@yourschool.edu"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={isVerifying}
          className="w-full text-sm px-3.5 py-3 border border-[#d5cfc0] rounded-lg bg-white text-[#15161a] focus:border-[#15161a] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="mb-0">
        <label htmlFor="login-password" className="block text-[12.5px] font-semibold text-[#5b5c63] mb-[7px]">
          Password
        </label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isVerifying}
            className="w-full text-sm px-3.5 py-3 pr-14 border border-[#d5cfc0] rounded-lg bg-white text-[#15161a] focus:border-[#15161a] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isVerifying}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#e31e24] hover:underline bg-transparent border-none"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="text-xs text-[#9b9a94] mt-2 leading-relaxed">{helperText}</p>
      </div>

      {accountLoadError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {accountLoadError}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between my-5">
        <button
          type="button"
          onClick={() => setRemember((r) => !r)}
          className="flex items-center gap-2.5 cursor-pointer select-none bg-transparent border-none p-0"
        >
          <div
            className={`w-[38px] h-[22px] rounded-full relative transition-colors duration-200 ${
              remember ? 'bg-[#15161a]' : 'bg-[#d5cfc0]'
            }`}
          >
            <div
              className="absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: remember ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </div>
          <span className="text-[13px] text-[#5b5c63]">Remember me</span>
        </button>
        <button type="button" className="text-[13px] font-semibold text-[#e31e24] hover:underline bg-transparent border-none">
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        disabled={isVerifying}
        className="w-full bg-[#e31e24] hover:bg-[#cf1a1f] text-white text-[14.5px] font-bold rounded-lg py-3.5 transition-all duration-200 disabled:opacity-70"
        style={{ transform: isVerifying ? 'none' : 'translateY(0)' }}
      >
        {buttonText}
      </button>

      <div className="mt-5 flex gap-2.5 items-start bg-[#f3f1ea] border border-[#e6e2d8] rounded-xl p-3.5">
        <Briefcase className="h-4 w-4 text-[#e31e24] flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <b className="block text-[12.5px] text-[#15161a] mb-0.5">New to Pisairtel Schools?</b>
          <span className="text-[11.5px] text-[#5b5c63]">
            Super admin accounts are provisioned by our team —{' '}
            <CreateSuperAdminAccountDialog
              existingAccount={
                storedAccount
                  ? {
                      fullName: storedAccount.fullName,
                      organization: storedAccount.organization,
                      email: storedAccount.email,
                    }
                  : null
              }
              onAccountCreated={handleAccountCreated}
            />
          </span>
        </div>
      </div>
    </form>
  )
}
