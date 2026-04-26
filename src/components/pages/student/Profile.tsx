import React, { useEffect, useState } from 'react';
import { AlertCircle, User, Edit2, Lock } from 'lucide-react';
import { Button } from '../../ui/button';

interface StudentProfile {
  id: string;
  name: string;
  admissionNumber: string;
  class: string;
  arm: string;
  gender: string;
  email: string;
  phone: string;
  guardian: { name: string; phone: string };
}

interface LoginHistory {
  date: string;
  time: string;
  device: string;
  ipAddress: string;
}

export function Profile() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  const getToken = () => {
    const auth = localStorage.getItem('auth');
    return auth ? JSON.parse(auth).token : null;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = getToken();
        if (!token) { setError('Not authenticated'); return; }
        const res = await fetch('/api/student/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch profile');
        const data = await res.json();
        setProfile(data.profile);
        setLoginHistory(data.loginHistory);
        setEditEmail(data.profile.email);
        setEditPhone(data.profile.phone);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setSaveMsg('');
      const token = getToken();
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editEmail, phone: editPhone }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setProfile(prev => prev ? { ...prev, email: editEmail, phone: editPhone } : null);
      setSaveMsg('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { setPwdMsg('Passwords do not match'); return; }
    if (newPwd.length < 8) { setPwdMsg('Password must be at least 8 characters'); return; }
    try {
      const token = getToken();
      const res = await fetch('/api/student/profile?action=change-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      if (!res.ok) throw new Error('Failed to change password');
      setPwdMsg('Password changed successfully');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setShowPasswordForm(false);
    } catch (err) {
      setPwdMsg(err instanceof Error ? err.message : 'Failed to change password');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {saveMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{saveMsg}</div>
      )}

      {/* Personal Info */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{profile.name}</h2>
              <p className="text-sm text-gray-500">{profile.admissionNumber}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(!isEditing)}>
            <Edit2 className="h-4 w-4" />
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">Class</p>
            <p className="font-medium text-gray-900">{profile.class} {profile.arm}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Gender</p>
            <p className="font-medium text-gray-900">{profile.gender}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            {isEditing ? (
              <input
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
            ) : (
              <p className="font-medium text-gray-900">{profile.email}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            {isEditing ? (
              <input
                type="tel"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
            ) : (
              <p className="font-medium text-gray-900">{profile.phone}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Guardian</p>
            <p className="font-medium text-gray-900">{profile.guardian.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Guardian Phone</p>
            <p className="font-medium text-gray-900">{profile.guardian.phone}</p>
          </div>
        </div>

        {isEditing && (
          <div className="mt-4 flex gap-3">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Change Password</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(!showPasswordForm)}>
            {showPasswordForm ? 'Cancel' : 'Change'}
          </Button>
        </div>

        {pwdMsg && (
          <div className={`mb-4 rounded-lg p-3 text-sm ${pwdMsg.includes('success') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {pwdMsg}
          </div>
        )}

        {showPasswordForm && (
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="New password (min 8 characters)"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <Button onClick={handleChangePassword} disabled={!currentPwd || !newPwd || !confirmPwd}>
              Update Password
            </Button>
          </div>
        )}
      </div>

      {/* Login History */}
      {loginHistory.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Login Activity</h2>
          <div className="space-y-3">
            {loginHistory.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{entry.device}</p>
                  <p className="text-gray-500">{entry.date} at {entry.time}</p>
                </div>
                <p className="text-xs text-gray-400 font-mono">{entry.ipAddress}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
