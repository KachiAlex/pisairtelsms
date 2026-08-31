import React, { useState } from 'react';
import { Eye, EyeOff, Briefcase } from 'lucide-react';
import { Input } from '../ui/input';
import { setAuthInStorage } from '../../lib/auth';

interface RoleFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface RoleData {
  btn: string;
  helper: string;
  features: RoleFeature[];
}

interface StaffLoginPageProps {
  onLoginSuccess: () => void;
  onBackToPortalSelection: () => void;
  roleData: RoleData;
}

export function StaffLoginPage({ onLoginSuccess, onBackToPortalSelection, roleData }: StaffLoginPageProps) {
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
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-[38px] w-[38px] rounded-[10px] bg-[#15161a] flex items-center justify-center flex-shrink-0">
          <Briefcase className="h-5 w-5 text-[#f7c93c]" />
        </div>
        <div>
          <p
            className="text-[10.5px] tracking-[0.1em] text-[#9b9a94] mb-0.5"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            STAFF PORTAL
          </p>
          <h3
            className="text-[18.5px] leading-tight text-[#15161a]"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}
          >
            Sign in to your portal
          </h3>
        </div>
      </div>

      <div className="mb-[18px]">
        <label htmlFor="staff-email" className="block text-[12.5px] font-semibold text-[#5b5c63] mb-[7px]">
          Email address
        </label>
        <Input
          id="staff-email"
          type="email"
          placeholder="staff@school.edu"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={isLoading}
          className="w-full text-sm px-3.5 py-3 border border-[#d5cfc0] rounded-lg bg-white text-[#15161a] focus:border-[#15161a] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="mb-0">
        <label htmlFor="staff-password" className="block text-[12.5px] font-semibold text-[#5b5c63] mb-[7px]">
          Password
        </label>
        <div className="relative">
          <Input
            id="staff-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isLoading}
            className="w-full text-sm px-3.5 py-3 pr-14 border border-[#d5cfc0] rounded-lg bg-white text-[#15161a] focus:border-[#15161a] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#e31e24] hover:underline bg-transparent border-none"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="text-xs text-[#9b9a94] mt-2 leading-relaxed">
          Enter your work email and password. First time? Use your <strong>email address</strong> as your temporary password.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-5 bg-[#e31e24] hover:bg-[#cf1a1f] text-white text-[14.5px] font-bold rounded-lg py-3.5 transition-all duration-200 disabled:opacity-70"
      >
        {isLoading ? 'Signing in...' : roleData.btn}
      </button>

      <button
        type="button"
        onClick={onBackToPortalSelection}
        disabled={isLoading}
        className="w-full mt-3 border border-[#d5cfc0] text-[#15161a] text-sm font-semibold rounded-lg py-3 hover:border-[#15161a] transition-colors bg-white"
      >
        Back to portal selection
      </button>
    </form>
  );
}
