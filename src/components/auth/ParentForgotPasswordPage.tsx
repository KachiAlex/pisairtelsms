import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

/**
 * Parent Forgot Password page.
 * Currently shows a "contact administrator" message since the email-based
 * reset flow is not yet implemented. This prevents navigation to a
 * non-existent route.
 */
export function ParentForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mark as submitted — the actual email reset flow will be wired up when
    // the backend endpoint is implemented. For now we show a confirmation
    // message directing the user to contact their school administrator.
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Enter your email to request a password reset.</CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                If an account exists for <strong>{email}</strong>, your school administrator will
                contact you with reset instructions. For immediate assistance, please contact your
                school's administrative office.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate('/parent/login')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Request Reset</Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/parent/login')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ParentForgotPasswordPage;