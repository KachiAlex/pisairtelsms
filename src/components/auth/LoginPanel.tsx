import React, { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Building2, Eye, EyeOff } from 'lucide-react'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { CreateSuperAdminAccountDialog, SuperAdminAccountFormData } from './CreateSuperAdminAccountDialog'
import {
  fetchSuperAdminAccount,
  SuperAdminAccount,
  upsertSuperAdminAccount,
  verifySuperAdminAccount,
} from '../../lib/superAdminClient'
import { setAuthInStorage } from '../../lib/auth'

export type LoginRole = 'tenant-admin' | 'super-admin'

interface LoginPanelProps {
  onLogin: (role: LoginRole) => void
}

const STORAGE_KEY = 'scholix.superAdminAccount'

export function LoginPanel({ onLogin }: LoginPanelProps) {
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
            : 'Unable to reach Scholix cloud right now. Please retry later.'
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
    ? 'Super admin account detected. Enter the credentials configured for your Scholix command center.'
    : 'Use your school workspace email to enter the Scholix tenant console.'

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

    if (isSuperAdminFlow) {
      try {
        setIsVerifying(true)
        const verifiedAccount = await verifySuperAdminAccount(normalizedInputEmail, password)
        setStoredAccount(verifiedAccount)
        
        // Save auth token for super admin
        setAuthInStorage({
          token: `super-admin-${Date.now()}`,
          tenantId: 'super-admin',
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
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

    // Look up tenant ID from user record
    try {
      const userRes = await fetch('/api/tenant/user-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      let tenantId = 'default-tenant'
      if (userRes.ok) {
        const userData = await userRes.json()
        tenantId = userData.tenantId || 'default-tenant'
      }

      // Save auth token for tenant admin
      setAuthInStorage({
        token: `tenant-admin-${Date.now()}`,
        tenantId,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        userId: email.trim().toLowerCase(),
      })

      onLogin('tenant-admin')
    } catch (lookupError) {
      console.error('Error looking up tenant:', lookupError)
      // Fallback: use email as tenant ID (will be handled by endpoints)
      setAuthInStorage({
        token: `tenant-admin-${Date.now()}`,
        tenantId: email.trim().toLowerCase(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        userId: email.trim().toLowerCase(),
      })
      onLogin('tenant-admin')
    }
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Secure Access</p>
            <h3 className="text-lg font-semibold text-gray-900">Sign in to Scholix Console</h3>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Work Email</label>
          <Input
            type="email"
            placeholder="principal@school.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <label className="font-medium text-gray-700">Password</label>
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <div className="absolute inset-y-0 right-3 flex items-center text-gray-400">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">{helperText}</p>

        {accountLoadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {accountLoadError}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <Switch checked={remember} onCheckedChange={(value) => setRemember(Boolean(value))} />
            Remember me
          </label>
          <button type="button" className="font-medium text-blue-600 hover:text-blue-700">
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isSuperAdminFlow && isVerifying}
        >
          {isSuperAdminFlow ? (isVerifying ? 'Verifying super admin credentials...' : 'Enter Super Admin Portal') : 'Access School Dashboard'}
        </Button>

        <div className="rounded-xl bg-blue-50 p-4 text-xs text-blue-800 space-y-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white/70 p-2">
              <Building2 className="h-4 w-4 text-blue-700" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-900">Scholix provisioning</p>
              {storedAccount ? (
                <p>Super admin account registered for {storedAccount.organization} ({storedAccount.email}).</p>
              ) : (
                <p>No super admin account detected yet. Provision one below to unlock the command center.</p>
              )}
            </div>
          </div>
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
        </div>
      </form>
    </div>
  )
}
