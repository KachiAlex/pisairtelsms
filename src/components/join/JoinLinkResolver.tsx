import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader, Link2 } from 'lucide-react'
import { Button } from '../ui/button'
import { resolveJoinLink } from '../../lib/tenantUrlResolver'

/**
 * Resolves the printable/QR "/join/<handle>" links:
 *   https://<app-domain>/join/lincolnhigh-4F9K  →  <school>/inquiry
 *
 * The handle is resolved server-side (never trusted from the URL blindly),
 * then the browser is redirected to the school's canonical inquiry URL so
 * every printed QR/leaflet lands on the correct, brand-aware form.
 */
export function JoinLinkResolver() {
  const { alias } = useParams()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!alias) {
      setFailed(true)
      return
    }
    let cancelled = false
    resolveJoinLink(alias).then(resolution => {
      if (cancelled) return
      if (resolution.ok && resolution.redirectTo) {
        window.location.replace(resolution.redirectTo)
      } else {
        setFailed(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [alias])

  if (failed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Link2 className="w-7 h-7 text-gray-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">This link isn't valid anymore</h1>
        <p className="text-gray-500 text-sm mb-6">
          The school link you followed doesn't point to a school on this platform.
        </p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to home
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
      <p className="text-sm text-gray-500 mt-4">Taking you to the school's inquiry form…</p>
    </div>
  )
}

export default JoinLinkResolver