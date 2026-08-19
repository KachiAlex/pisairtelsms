import React, { useState } from 'react'
import { Search, BookOpen, MessageSquare, ExternalLink, HelpCircle, FileText, Video, AlertOctagon, Sparkles, Send, Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { useToast } from '../ui/use-toast'

const featuredGuides = [
  { title: 'How to onboard a new school term', duration: '6 min read', category: 'Tenant setup' },
  { title: 'Sync CBT results with gradebook', duration: '4 min read', category: 'Assessments' },
  { title: 'Configure custom notifications', duration: '5 min read', category: 'Communication' },
]

const releaseHighlights = [
  { version: 'v2.18', note: 'Predictive alerts now support tamper zones', date: 'Feb 21' },
  { version: 'v2.17', note: 'New biometric audit dashboard', date: 'Feb 14' },
]

const requestCategories = [
  { name: 'Integrations', open: 3, sla: '24h' },
  { name: 'Payments', open: 2, sla: '12h' },
  { name: 'CBT', open: 1, sla: '8h' },
]

const quickLinks = [
  { label: 'API docs', icon: FileText },
  { label: 'Video library', icon: Video },
  { label: 'Status page', icon: AlertOctagon },
  { label: 'Feature ideas', icon: Sparkles },
]

function ContactSupportDialog() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ topic: '', message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const auth = JSON.parse(localStorage.getItem('auth') || '{}')
      const res = await fetch('/api/tenant/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify({
          action: 'create-ticket',
          payload: {
            requester: auth.email || 'Anonymous',
            topic: form.topic,
            description: form.message,
            priority: 'medium',
            channel: 'web',
          },
        }),
      })

      if (!res.ok) throw new Error('Failed to submit request')
      toast({ title: 'Request Sent', description: 'Our team will review your message and respond shortly.' })
      setOpen(false)
      setForm({ topic: '', message: '' })
    } catch (err) {
      toast({ title: 'Submission Failed', description: 'Could not deliver your request. Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <HelpCircle className="h-4 w-4 mr-2" /> Contact support
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>Describe your issue or question and we'll get back to you within 1 business day.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Topic</Label>
            <Input
              placeholder="e.g. Question about CBT sync"
              required
              value={form.topic}
              onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Provide as much detail as possible..."
              className="min-h-[120px]"
              required
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function HelpCenter() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Help & Support</p>
          <h1 className="text-2xl font-bold text-gray-900">Help center</h1>
          <p className="text-sm text-gray-600">Search guides, watch playbooks, and reach product specialists.</p>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search guides, topics, or FAQs" className="pl-9" />
          </div>
          <ContactSupportDialog />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Featured guides</CardTitle>
            <CardDescription>High-impact walkthroughs curated for admins.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {featuredGuides.map((guide) => (
              <div key={guide.title} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{guide.title}</p>
                  <p className="text-sm text-gray-500">{guide.duration} • {guide.category}</p>
                </div>
                <Button variant="outline" size="sm">
                  <BookOpen className="h-4 w-4 mr-2" /> Open
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" /> Browse all guides
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Release highlights</CardTitle>
            <CardDescription>Latest drops from the product team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {releaseHighlights.map((release) => (
              <div key={release.version} className="rounded-2xl border border-gray-100 p-4">
                <p className="font-medium text-gray-900">{release.version}</p>
                <p className="text-sm text-gray-500">{release.note}</p>
                <p className="text-xs text-gray-400 mt-1">{release.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Support requests</CardTitle>
            <CardDescription>Active tickets per domain with SLA goals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestCategories.map((category) => (
              <div key={category.name} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{category.name}</p>
                  <p className="text-sm text-gray-500">SLA {category.sla}</p>
                </div>
                <Badge variant={category.open > 2 ? 'warning' : 'default'}>{category.open} open</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <MessageSquare className="h-4 w-4 mr-2" /> View queue
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>Jump to common tools in the knowledge base.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <Button key={link.label} variant="outline" className="justify-start">
                <link.icon className="h-4 w-4 mr-2" /> {link.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <AlertOctagon className="h-5 w-5" />
          <p>Need product training? Join the weekly office hours with product specialists every Thursday.</p>
        </div>
        <Button size="sm">
          <ExternalLink className="h-4 w-4 mr-2" /> Save a seat
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-slate-500" />
          <p>Still stuck? Share context and a teammate will respond within 1 business day.</p>
        </div>
        <ContactSupportDialog />
      </div>
    </div>
  )
}
export default HelpCenter;
