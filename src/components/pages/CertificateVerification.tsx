import React, { useState, useEffect } from 'react'
import { BadgeCheck, ShieldCheck, RefreshCcw, Search, HardDriveDownload, Share2, AlertTriangle, Fingerprint, Trash2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Validated: 'default',
  'Manual review': 'warning',
  Rejected: 'destructive',
  Live: 'default',
  'Sync lag': 'warning',
  Offline: 'secondary',
  High: 'destructive',
  Medium: 'warning',
  Low: 'secondary',
}

export function CertificateVerification() {
  const [verifications, setVerifications] = useState<any[]>([])
  const [registries, setRegistries] = useState<any[]>([])
  const [fraudSignals, setFraudSignals] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [certificateCode, setCertificateCode] = useState('')
  const [verifyResult, setVerifyResult] = useState<any>(null)

  const tenantId = 'default-tenant'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [verificationsRes, registriesRes, fraudRes, statsRes] = await Promise.all([
        fetch(`/api/tenant/certificates/verification?tenantId=${tenantId}&type=verifications`),
        fetch(`/api/tenant/certificates/verification?tenantId=${tenantId}&type=registries`),
        fetch(`/api/tenant/certificates/verification?tenantId=${tenantId}&type=fraud-signals`),
        fetch(`/api/tenant/certificates/verification?tenantId=${tenantId}&type=statistics`),
      ])

      if (!verificationsRes.ok || !registriesRes.ok || !fraudRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const verificationsData = await verificationsRes.json()
      const registriesData = await registriesRes.json()
      const fraudData = await fraudRes.json()
      const statsData = await statsRes.json()

      setVerifications(verificationsData.data || [])
      setRegistries(registriesData.data || [])
      setFraudSignals(fraudData.data || [])
      setStatistics(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!certificateCode.trim()) {
      setError('Please enter a certificate code')
      return
    }

    try {
      const res = await fetch(`/api/tenant/certificates/verification?tenantId=${tenantId}&code=${certificateCode}`, {
        method: 'GET',
      })

      if (!res.ok) {
        throw new Error('Certificate not found or invalid')
      }

      const result = await res.json()
      setVerifyResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setVerifyResult(null)
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Advanced Features</p>
          <h1 className="text-2xl font-bold text-gray-900">Certificate verification</h1>
          <p className="text-sm text-gray-600">Verify certificate authenticity, detect fraud signals, and manage revocations.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh data
          </Button>
          <Button>
            <HardDriveDownload className="h-4 w-4 mr-2" /> Export report
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Certificates issued</p>
            <p className="text-3xl font-semibold text-gray-900">{statistics?.certificatesIssued || 0}</p>
            <p className="text-xs text-gray-500">Year to date</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Certificates revoked</p>
            <p className="text-3xl font-semibold text-red-600">{statistics?.certificatesRevoked || 0}</p>
            <p className="text-xs text-gray-500">Invalidated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Validation success</p>
            <p className="text-3xl font-semibold text-emerald-600">{statistics?.validationSuccess || 0}%</p>
            <p className="text-xs text-gray-500">Verified certificates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Blockchain anchor</p>
            <p className="text-3xl font-semibold text-gray-900">{statistics?.blockchainAnchor || 0}</p>
            <p className="text-xs text-gray-500">Immutable records</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verify certificate</CardTitle>
          <CardDescription>Enter certificate code to verify authenticity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter certificate code (e.g., CERT-...)"
              value={certificateCode}
              onChange={(e) => setCertificateCode(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleVerify}>
              <Search className="h-4 w-4 mr-2" /> Verify
            </Button>
          </div>

          {verifyResult && (
            <div className="rounded-lg bg-green-50 p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <BadgeCheck className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Certificate verified</p>
                  <div className="mt-2 space-y-1 text-sm text-green-800">
                    <p>Code: {verifyResult.certificateCode}</p>
                    <p>Student ID: {verifyResult.studentId}</p>
                    <p>Exam ID: {verifyResult.examId}</p>
                    <p>Issued: {new Date(verifyResult.issuedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification feed</CardTitle>
          <CardDescription>Recent certificate verification records.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate</TableHead>
                <TableHead>Holder</TableHead>
                <TableHead>Credential</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verifications.length > 0 ? (
                verifications.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium text-gray-900">{v.certificateCode}</TableCell>
                    <TableCell>{v.holder}</TableCell>
                    <TableCell>{v.credential}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[v.status] || 'secondary'}>{v.status}</Badge>
                    </TableCell>
                    <TableCell>{v.method}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">No verifications found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registry integrations</CardTitle>
            <CardDescription>External registry connection status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {registries.length > 0 ? (
              registries.map((r) => (
                <div key={r.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900">{r.provider}</p>
                    <Badge variant={statusVariant[r.status] || 'secondary'}>{r.status}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Uptime: {r.uptime}%</p>
                    <p>Coverage: {r.coverage}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No registries configured</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fraud signals</CardTitle>
            <CardDescription>Detected anomalies and suspicious patterns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fraudSignals.length > 0 ? (
              fraudSignals.map((f) => (
                <div key={f.id} className="rounded-lg border border-gray-100 p-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{f.flag}</p>
                    <p className="text-sm text-gray-600">{f.volume} incidents</p>
                  </div>
                  <Badge variant={statusVariant[f.severity] || 'secondary'}>{f.severity}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No fraud signals detected</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default CertificateVerification;
