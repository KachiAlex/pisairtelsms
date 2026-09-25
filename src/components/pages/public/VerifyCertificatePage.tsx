import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, Search, Loader2 } from 'lucide-react'
import { Button } from '../../ui/button'

interface VerifyResult {
  valid: boolean
  code: string
  studentName: string | null
  examTitle: string | null
  schoolName: string | null
  issuedAt: string
  revoked: boolean
  revokedReason?: string | null
}

export function VerifyCertificatePage() {
  const [params] = useSearchParams()
  const [code, setCode] = useState(params.get('code') || '')
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)

  const verify = async (certCode: string) => {
    if (!certCode.trim()) return
    setLoading(true)
    setResult(null)
    setNotFound(false)
    try {
      const res = await fetch(`/api/public/verify-certificate?code=${encodeURIComponent(certCode.trim())}`)
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) throw new Error()
      setResult(await res.json())
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const c = params.get('code')
    if (c) verify(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-xl font-bold text-gray-900 text-center">Certificate Verification</h1>
          <p className="text-sm text-gray-500 text-center mt-1 mb-6">
            Enter a certificate code to confirm it was issued by a school on this platform.
          </p>

          <form
            onSubmit={e => { e.preventDefault(); verify(code) }}
            className="flex gap-2"
          >
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Certificate code"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
            />
            <Button type="submit" disabled={loading || !code.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>

          {notFound && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Not found</p>
                <p className="text-sm text-red-700 mt-0.5">
                  No certificate matches this code. Check the code and try again.
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className={`mt-6 rounded-lg border p-4 ${result.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-3">
                {result.valid
                  ? <ShieldCheck className="h-6 w-6 text-green-600 mt-0.5" />
                  : <ShieldAlert className="h-6 w-6 text-red-600 mt-0.5" />}
                <div className="min-w-0">
                  <p className={`font-semibold ${result.valid ? 'text-green-900' : 'text-red-900'}`}>
                    {result.valid ? 'Valid certificate' : 'Certificate revoked'}
                  </p>
                  <dl className="mt-2 space-y-1 text-sm">
                    {result.studentName && (
                      <div className="flex gap-2"><dt className="text-gray-500 w-20">Holder</dt><dd className="font-medium text-gray-900">{result.studentName}</dd></div>
                    )}
                    {result.examTitle && (
                      <div className="flex gap-2"><dt className="text-gray-500 w-20">Exam</dt><dd className="text-gray-900">{result.examTitle}</dd></div>
                    )}
                    {result.schoolName && (
                      <div className="flex gap-2"><dt className="text-gray-500 w-20">School</dt><dd className="text-gray-900">{result.schoolName}</dd></div>
                    )}
                    <div className="flex gap-2"><dt className="text-gray-500 w-20">Issued</dt><dd className="text-gray-900">{new Date(result.issuedAt).toLocaleDateString()}</dd></div>
                    <div className="flex gap-2"><dt className="text-gray-500 w-20">Code</dt><dd className="font-mono text-gray-900">{result.code}</dd></div>
                    {result.revoked && result.revokedReason && (
                      <div className="flex gap-2"><dt className="text-gray-500 w-20">Reason</dt><dd className="text-red-800">{result.revokedReason}</dd></div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Powered by Pisairtel SMS</p>
      </div>
    </div>
  )
}

export default VerifyCertificatePage
