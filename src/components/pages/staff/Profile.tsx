import React, { useEffect, useState } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'password'>('view')
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
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('view')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'view'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          View Profile
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'edit'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Edit Profile
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'password'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Change Password
        </button>
      </div>

      {/* View Profile Tab */}
      {activeTab === 'view' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{profile.name}</h2>
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
            <div className="flex gap-3">
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

            <div className="flex gap-3">
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
    </div>
  )
}
