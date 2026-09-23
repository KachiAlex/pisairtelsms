import React, { useEffect, useState } from 'react'
import { AlertCircle, Eye, EyeOff, Landmark, ShieldCheck, Loader2 } from 'lucide-react'
import { Button } from '../../ui/button'

interface StaffProfile {
  id: string
  staffId: string
  name: string
  department: string
  role: string
  email: string
  phone: string
  address: string
  qualification: string
}

interface ProfileUpdateData {
  email?: string
  phone?: string
  address?: string
}

interface PasswordChangeData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function Profile() {
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'password' | 'bank'>('view')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [editData, setEditData] = useState<ProfileUpdateData>({
    email: '',
    phone: '',
    address: '',
  })

  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Bank details state
  interface BankInfo { name: string; code: string }
  interface BankDetails {
    bankName: string; bankCode: string; accountNumberMasked: string;
    accountName: string; verified: boolean; gatewayConfigured: boolean;
    banks: BankInfo[];
  }
  const [bank, setBank] = useState<BankDetails | null>(null)
  const [bankForm, setBankForm] = useState({ bankCode: '', bankName: '', accountNumber: '' })
  const [bankSaving, setBankSaving] = useState(false)
  const [bankMsg, setBankMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pendingAccountName, setPendingAccountName] = useState<string | null>(null)

  const auth = localStorage.getItem('auth')
  const token = auth ? JSON.parse(auth).token : null

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!token) {
          setError('Not authenticated')
          return
        }

        const response = await fetch('/api/staff/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }

        const profileData = await response.json()
        setProfile(profileData)
        setEditData({
          email: profileData.email,
          phone: profileData.phone,
          address: profileData.address,
        })

        fetch('/api/staff/bank-details', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d) {
              setBank(d)
              setBankForm({ bankCode: d.bankCode || '', bankName: d.bankName || '', accountNumber: '' })
            }
          })
          .catch(() => {})
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching profile:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [token])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (editData.email && !validateEmail(editData.email)) {
      errors.email = 'Invalid email format'
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      setIsSubmitting(true)
      setError(null)

      if (!token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/staff/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setSuccess('Profile updated successfully')
      setActiveTab('view')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error updating profile:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required'
    }
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required'
    }
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required'
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.passwordMatch = 'Passwords do not match'
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      setIsSubmitting(true)
      setError(null)

      if (!token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/staff/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to change password')
      }

      setSuccess('Password changed successfully')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setActiveTab('view')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error changing password:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveBank = async (e: React.FormEvent, confirmed = false) => {
    e.preventDefault()
    setBankMsg(null)
    const acct = bankForm.accountNumber.replace(/\D/g, '')
    if (!bankForm.bankCode) { setBankMsg({ ok: false, text: 'Please select your bank' }); return }
    if (acct.length !== 10) { setBankMsg({ ok: false, text: 'Account number must be 10 digits' }); return }
    try {
      setBankSaving(true)
      const res = await fetch('/api/staff/bank-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bankCode: bankForm.bankCode, bankName: bankForm.bankName, accountNumber: acct, confirmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save bank details')
      if (data.requiresConfirmation) {
        setPendingAccountName(data.accountName)
        return
      }
      setPendingAccountName(null)
      setBankMsg({ ok: true, text: data.message || 'Bank details saved' })
      // Refresh masked display
      const r = await fetch('/api/staff/bank-details', { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) {
        const d = await r.json()
        setBank(d)
        setBankForm(f => ({ ...f, accountNumber: '' }))
      }
    } catch (err) {
      setBankMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save bank details' })
    } finally { setBankSaving(false) }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Profile</h3>
            <p className="mt-1 text-sm text-red-800">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">No profile data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 sm:gap-4 border-b border-gray-200 min-w-max">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'view'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            View Profile
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'edit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Change Password
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'bank'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Bank Details
          </button>
        </div>
      </div>

      {/* View Profile Tab */}
      {activeTab === 'view' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">{profile.name}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-600">Staff ID</p>
              <p className="text-gray-900 mt-1">{profile.staffId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Department</p>
              <p className="text-gray-900 mt-1">{profile.department}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Role</p>
              <p className="text-gray-900 mt-1">{profile.role}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Qualification</p>
              <p className="text-gray-900 mt-1">{profile.qualification}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Email</p>
              <p className="text-gray-900 mt-1">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Phone</p>
              <p className="text-gray-900 mt-1">{profile.phone}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-600">Address</p>
              <p className="text-gray-900 mt-1">{profile.address}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Tab */}
      {activeTab === 'edit' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={editData.email || ''}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
              {formErrors.email && (
                <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={editData.phone || ''}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                value={editData.address || ''}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setActiveTab('view')
                  setFormErrors({})
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-gray-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formErrors.currentPassword && (
                <p className="text-sm text-red-600 mt-1">{formErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-gray-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formErrors.newPassword && (
                <p className="text-sm text-red-600 mt-1">{formErrors.newPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-gray-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{formErrors.confirmPassword}</p>
              )}
            </div>

            {formErrors.passwordMatch && (
              <p className="text-sm text-red-600">{formErrors.passwordMatch}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Changing...' : 'Change Password'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setActiveTab('view')
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  })
                  setFormErrors({})
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Bank Details Tab */}
      {activeTab === 'bank' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 max-w-lg">
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Used for salary payment when the school disburses payroll through the payment gateway.
          </p>

          {/* Current saved details */}
          {bank?.accountNumberMasked ? (
            <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Bank</span>
                <span className="font-medium text-gray-900">{bank.bankName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account</span>
                <span className="font-medium text-gray-900">{bank.accountNumberMasked}</span>
              </div>
              {bank.accountName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Account name</span>
                  <span className="font-medium text-gray-900">{bank.accountName}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status</span>
                {bank.verified ? (
                  <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                    <ShieldCheck className="h-4 w-4" /> Verified
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">Unverified</span>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No bank details on file — add them below so payroll can pay you directly.
            </div>
          )}

          <form onSubmit={handleSaveBank} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bank</label>
              {bank && bank.banks.length > 0 ? (
                <select
                  value={bankForm.bankCode}
                  onChange={(e) => {
                    const b = bank.banks.find(x => x.code === e.target.value)
                    setBankForm(f => ({ ...f, bankCode: e.target.value, bankName: b?.name || '' }))
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select bank…</option>
                  {bank.banks.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm(f => ({ ...f, bankName: e.target.value }))}
                  placeholder="Bank name (e.g. GTBank)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>

            {/* Bank code entry only needed when the gateway bank list isn't available */}
            {bank && bank.banks.length === 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank code</label>
                <input
                  type="text"
                  value={bankForm.bankCode}
                  onChange={(e) => setBankForm(f => ({ ...f, bankCode: e.target.value }))}
                  placeholder="e.g. 058"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '') }))}
                placeholder="10-digit NUBAN"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {pendingAccountName && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                <p className="text-sm text-blue-900">
                  This account resolves to: <strong>{pendingAccountName}</strong>
                </p>
                <p className="text-xs text-blue-700">Confirm this is your account before saving — salary will be paid here.</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={bankSaving}
                    onClick={(e) => handleSaveBank(e as unknown as React.FormEvent, true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {bankSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>) : 'Yes, this is my account'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPendingAccountName(null)}>
                    Not me — edit
                  </Button>
                </div>
              </div>
            )}

            {bankMsg && (
              <div className={`rounded-lg p-3 text-sm ${bankMsg.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                {bankMsg.text}
              </div>
            )}

            {!pendingAccountName && (
              <Button type="submit" disabled={bankSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {bankSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</>) : 'Verify & save'}
              </Button>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
