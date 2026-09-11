import React from 'react'
import { Building2, Compass, CalendarHeart } from 'lucide-react'
import { Button } from '../ui/button'

interface SchoolNotFoundProps {
  subdomain?: string | null
}

/**
 * Rendered when a visitor lands on an unknown <slug>.<root> host.
 * Turns a dead end into an onboarding funnel: find the right school,
 * request a demo, or contact support.
 */
export function SchoolNotFound({ subdomain }: SchoolNotFoundProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-6">
        <Building2 className="w-8 h-8 text-indigo-600" />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">We couldn't find that school</h1>
      {subdomain ? (
        <p className="text-gray-600 mb-1">
          No school is registered at <span className="font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded">{subdomain}</span>.
        </p>
      ) : null}
      <p className="text-gray-500 text-sm mb-8 max-w-md text-center">
        The address may be misspelled, the school may not be set up yet, or your school could be using a custom
        domain. Here's how to get to the right place:
      </p>

      <div className="space-y-3 w-full max-w-sm">
        <a href="/" className="w-full">
          <Button variant="outline" className="w-full">
            <Compass className="w-4 h-4 mr-2" /> Find your school
          </Button>
        </a>
        <a href="/demo" className="w-full">
          <Button className="w-full">
            <CalendarHeart className="w-4 h-4 mr-2" /> Request a demo
          </Button>
        </a>
      </div>

      <p className="text-xs text-gray-400 mt-8">
        School administrator? Check your subdomain spelling or contact support to set up your custom domain.
      </p>
    </div>
  )
}

export default SchoolNotFound