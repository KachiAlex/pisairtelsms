import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Lock, Activity, AlertTriangle, RefreshCcw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface SecurityOverview {
  activeSessions: number;
  privilegedIdentities: number;
  mfaCoverage: number;
  encryptionCoverage: number;
  criticalAlerts: number;
  pendingReviews: number;
  backupSuccessRate: number;
  complianceTasks: number;
}

export function SecurityCompliance() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchWithAuth = async (url: string) => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
    if (auth.tenantId) headers['x-tenant-id'] = auth.tenantId;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch data');
    return response.json();
  };

  const loadOverview = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchWithAuth('/api/tenant/security/overview');
      setOverview(data.data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load security overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="text-gray-700 font-medium">Failed to load security data</p>
        <p className="text-sm text-gray-500">{loadError}</p>
        <Button variant="outline" onClick={loadOverview}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Security & compliance</p>
          <h1 className="text-2xl font-bold text-gray-900">Security Overview</h1>
          <p className="text-sm text-gray-600">Monitor access control, encryption, backups, and compliance posture.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadOverview}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button>
            <ShieldCheck className="h-4 w-4 mr-2" /> Run Security Scan
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Active Sessions</p>
                <p className="text-3xl font-semibold text-gray-900">{overview?.activeSessions || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Privileged Identities</p>
                <p className="text-3xl font-semibold text-gray-900">{overview?.privilegedIdentities || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">MFA Coverage</p>
                <p className="text-3xl font-semibold text-gray-900">{overview?.mfaCoverage || 0}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Encryption Coverage</p>
                <p className="text-3xl font-semibold text-gray-900">{overview?.encryptionCoverage || 0}%</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Lock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{overview?.criticalAlerts || 0}</p>
                <p className="text-xs text-red-600">Requires immediate attention</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{overview?.pendingReviews || 0}</p>
                <p className="text-xs text-amber-600">Access reviews due soon</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup & Compliance */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Backup Success Rate (24h)</p>
                <p className="text-2xl font-bold text-gray-900">{overview?.backupSuccessRate || 0}%</p>
                <p className="text-xs text-green-600">All jobs succeeded</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compliance Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{overview?.complianceTasks || 0} open</p>
                <p className="text-xs text-gray-500">Track regulatory requirements</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Shield className="w-6 h-6" />
              <span className="text-sm">Access Control</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Activity className="w-6 h-6" />
              <span className="text-sm">Session Management</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Lock className="w-6 h-6" />
              <span className="text-sm">Data Encryption</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <RefreshCcw className="w-6 h-6" />
              <span className="text-sm">Backup & Restore</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SecurityCompliance;
