import { useState, useEffect } from 'react'
import { User, Save, Eye, EyeOff } from 'lucide-react'

interface ProfileData {
  id: string; name: string; email: string; phone: string; address: string
  linkedChildren: Array<{ id: string; name: string; admissionNumber: string; class: string }>
}

export function ParentProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ email: '', phone: '', address: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')!).token : null
      const res = await fetch('/api/parent/profile', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setProfile(data)
      setEditForm({ email: data.email, phone: data.phone, address: data.address })
    } catch {
      setError('Failed to load profile.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchProfile() }, [])

  const handleSaveProfile = async () => {
    setSaveStatus('saving')
    try {
      const token = localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')!).token : null
      const res = await fetch('/api/parent/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Failed to save')
      const updated = await res.json()
      setProfile(updated)
      setIsEditing(false)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }
    try {
      const token = localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')!).token : null
      const res = await fetch('/api/parent/change-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      })
      if (!res.ok) throw new Error('Failed to change password')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      alert('Password changed successfully')
    } catch {
      alert('Failed to change password. Please check your current password.')
    }
  }

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded"></div><div className="h-64 bg-gray-200 rounded"></div></div>
  if (error) return <div className="flex flex-col items-center justify-center h-64 gap-4"><p className="text-red-500">{error}</p><button onClick={fetchProfile} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Retry</button></div>
  if (!profile) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl font-bold text-white">{profile.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">{profile.name}</h2>
              <p className="text-sm text-gray-500">Parent Account</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 self-start sm:self-auto"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={editForm.address}
                onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
            </button>
            {saveStatus === 'success' && <p className="text-green-600 text-sm">Profile updated successfully.</p>}
            {saveStatus === 'error' && <p className="text-red-500 text-sm">Failed to save. Please try again.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500 w-20">Email</span>
              <span className="text-sm text-gray-900">{profile.email}</span>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500 w-20">Phone</span>
              <span className="text-sm text-gray-900">{profile.phone}</span>
            </div>
            <div className="flex items-start gap-3 py-2">
              <span className="text-sm text-gray-500 w-20">Address</span>
              <span className="text-sm text-gray-900">{profile.address}</span>
            </div>
          </div>
        )}
      </div>

      {/* Linked Children */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Linked Children</h3>
        {profile.linkedChildren.length === 0 ? (
          <p className="text-gray-500 text-sm">No children linked to this account.</p>
        ) : (
          <div className="space-y-3">
            {profile.linkedChildren.map(child => (
              <div key={child.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{child.name}</p>
                  <p className="text-xs text-gray-500">{child.admissionNumber} · {child.class}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Change Password
          </button>
        </div>
      </div>
    </div>
  )
}
