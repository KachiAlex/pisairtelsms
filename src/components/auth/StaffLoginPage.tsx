import React, { useState } from 'react';
import { Eye, EyeOff, Briefcase } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { setAuthInStorage } from '../../lib/auth';

interface StaffLoginPageProps {
  onLoginSuccess: () => void;
  onBackToPortalSelection: () => void;
}

export function StaffLoginPage({ onLoginSuccess, onBackToPortalSelection }: StaffLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call login endpoint with staff credentials
      const response = await fetch('/api/staff/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || 'Login failed. Please check your credentials.');
      }

      const data = await response.json();

      setAuthInStorage({
        token: data.token,
        tenantId: data.tenantId || 'default-tenant',
        role: 'staff',
        userId: data.userId || data.staffId,
        name: data.name,
        email: data.email,
        expiresAt: data.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
      });

      onLoginSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred during login';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Staff Portal</p>
            <h3 className="text-lg font-semibold text-gray-900">Sign in to Your Portal</h3>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Email Address</label>
          <Input
            type="email"
            placeholder="staff@school.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <label className="font-medium text-gray-700">Password</label>
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading}
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
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-3 flex items-center text-gray-400">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Enter your work email and password to access your staff portal.
          First time? Use your <strong>email address</strong> as your temporary password.
        </p>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onBackToPortalSelection}
          disabled={isLoading}
        >
          Back to Portal Selection
        </Button>
      </form>
    </div>
  );
}
