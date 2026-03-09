import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Sparkles, Building2, ArrowRight, Globe, Radio } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { LoginPanel, LoginRole } from '../auth/LoginPanel'

interface AccessPortalPageProps {
  onLoginSuccess: (role: LoginRole) => void
  onBackToMarketing: () => void
}

const tenantHighlights = [
  {
    title: 'Attendance & Academics',
    description: 'Digitize roll calls, monitor absences, and broadcast remediation plans in real-time.',
    icon: Radio,
  },
  {
    title: 'Finance Automation',
    description: 'Centralize fees, invoicing, and settlements with role-based approvals and audit logs.',
    icon: Building2,
  },
]

const superAdminHighlights = [
  {
    title: 'Tenant Provisioning',
    description: 'Spin up secure workspaces with pre-baked compliance guardrails for every education network.',
    icon: Globe,
  },
  {
    title: 'Command Center',
    description: 'Observe performance, incidents, and billing telemetry across all connected schools.',
    icon: Shield,
  },
]

const loginFeatures = [
  'SAML/OAuth compatible single sign-on for every stakeholder tier',
  'Adaptive risk-based authentication toggled across geographies',
  'Unified audit trail covering sign-ins, policy changes, and escalations',
]

export function AccessPortalPage({ onLoginSuccess, onBackToMarketing }: AccessPortalPageProps) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-10 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute top-10 right-0 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 lg:py-20">
        <header className="flex items-center justify-between text-white/80">
          <Button
            variant="ghost"
            onClick={onBackToMarketing}
            className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to Scholix overview
          </Button>
          <Link to="/" className="text-sm text-white/70 hover:text-white">
            scholix.cloud
          </Link>
        </header>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-wide text-white/70">
              <Shield className="h-3.5 w-3.5" />
              Scholix Access Portal
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Sign in to orchestrate every learning network.
            </h1>
            <p className="text-lg text-white/80">
              Tenant administrators manage day-to-day school operations while super admins oversee compliance, provisioning, and billing signals across the entire Scholix platform footprint.
            </p>

            <Tabs defaultValue="tenant" className="space-y-6">
              <TabsList className="bg-white/10 p-1">
                <TabsTrigger value="tenant" className="flex-1">
                  School & network admins
                </TabsTrigger>
                <TabsTrigger value="super">
                  Scholix super admin
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tenant" className="space-y-4">
                {tenantHighlights.map((highlight) => (
                  <Card key={highlight.title} className="border-white/10 bg-white/5 text-white">
                    <CardContent className="flex items-start gap-4 p-5">
                      <highlight.icon className="h-6 w-6 text-blue-200" />
                      <div>
                        <p className="text-sm font-semibold">{highlight.title}</p>
                        <p className="text-sm text-white/70">{highlight.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button size="lg" className="bg-white text-slate-900 hover:bg-white/90">
                  Get started
                </Button>
              </TabsContent>
              <TabsContent value="super" className="space-y-4">
                {superAdminHighlights.map((highlight) => (
                  <Card key={highlight.title} className="border-white/10 bg-white/5 text-white">
                    <CardContent className="flex items-start gap-4 p-5">
                      <highlight.icon className="h-6 w-6 text-purple-200" />
                      <div>
                        <p className="text-sm font-semibold">{highlight.title}</p>
                        <p className="text-sm text-white/70">{highlight.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <Sparkles className="h-4 w-4 text-purple-300" />
                  Cloud-level guardrails on billing, security, and compliance.
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6 rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur">
            <div className="space-y-3">
              {loginFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-3 text-sm text-white/80">
                  <Sparkles className="mt-1 h-4 w-4 text-blue-200" />
                  <p>{feature}</p>
                </div>
              ))}
            </div>
            <LoginPanel onLogin={onLoginSuccess} />
          </div>
        </div>
      </div>
    </div>
  )
}
export default AccessPortalPage;
