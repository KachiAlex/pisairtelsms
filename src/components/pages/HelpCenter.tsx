import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, BookOpen, HelpCircle, Send, Loader2, ChevronDown, ChevronRight,
  GraduationCap, Users, Wallet, ClipboardCheck, ShieldCheck, Globe, Settings,
  MessageSquare, ListChecks,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { useToast } from '../ui/use-toast'

interface Guide {
  title: string
  summary: string
  steps: string[]
}

interface GuideCategory {
  name: string
  icon: React.ComponentType<{ className?: string }>
  guides: Guide[]
}

const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    name: 'Getting started',
    icon: Settings,
    guides: [
      {
        title: 'Set up your school profile and branding',
        summary: 'School name, logo, contact details, and portal appearance.',
        steps: [
          'Open System Settings → School Profile and enter your school name, address, phone, and email.',
          'Open Branding to upload your school crest/logo and pick portal colors. These appear on the portal, public forms, and report cards.',
          'Save, then reload — the sidebar and public pages pick up the new branding immediately.',
        ],
      },
      {
        title: 'Configure the current session and term',
        summary: 'The active academic period drives attendance, results, and billing defaults.',
        steps: [
          'Open System Settings → System Controls.',
          'Set Current Session (e.g. 2025/2026) and Current Term, then Save.',
          'New attendance records, results, and fee assignments default to this period — keep it current at the start of every term.',
        ],
      },
      {
        title: 'Set the admission number format',
        summary: 'Controls the format generated for every new student.',
        steps: [
          'Open System Settings → System Controls → Admission Number Format.',
          'Use placeholders: {PREFIX} (from your school name, e.g. KTX), {YEAR} (admission year), {SEQ} (padded sequence). Example: KTX/{YEAR}/{SEQ} → KTX/2026/001.',
          'Set the sequence digit count (e.g. 3 → 001). The sequence restarts per prefix+year, and collisions are retried automatically.',
          'You can always type an admission number manually to override the generated one.',
        ],
      },
      {
        title: 'Share your school\'s application and inquiry links',
        summary: 'Each school gets its own public form URLs.',
        steps: [
          'Open System Settings → Tenant Settings → School Link and set a short slug (e.g. kreatix).',
          'Your links become https://<this-domain>/apply/<slug> and /inquiry/<slug>. Use the Copy buttons to share them.',
          'The forms brand themselves with your school name automatically, and every submission is routed to your school — never another tenant.',
          'Test a link in an incognito window before publishing it on your website or social media.',
        ],
      },
    ],
  },
  {
    name: 'People & access',
    icon: Users,
    guides: [
      {
        title: 'Add staff and get them signed in',
        summary: 'Create staff records; first login uses the email address as the temporary password.',
        steps: [
          'Open Staff Management → Add Staff and fill in name, email, department, and role.',
          'Tell the staff member to sign in with their email and their email address as the temporary password — they\'ll be prompted to set a real password.',
          'Assign roles under Roles & Permissions to control what they can see and do.',
        ],
      },
      {
        title: 'Enroll students (single or bulk CSV)',
        summary: 'Admission numbers are generated automatically from your format.',
        steps: [
          'Open Students → Add Student for a single enrollment.',
          'For many students, use the bulk/CSV import — one row per student. Every row flows through the same admission-number generator.',
          'New students sign in with their admission number as both username and initial password.',
          'Class names come from your Classes list (canonical names like "JSS 1") — pick from the dropdown rather than typing variants.',
        ],
      },
      {
        title: 'Understand the User Accounts directory',
        summary: 'One directory for every credential holder in the school.',
        steps: [
          'User Accounts lists three record types, marked with a Type badge: invited Users, Staff, and Students.',
          'Edit/Suspend/Delete actions apply to invited user accounts. Staff and student records are managed from Staff Management and Students respectively.',
          'Suspending an account blocks its next login immediately.',
        ],
      },
      {
        title: 'Control access with roles and permissions',
        summary: 'Tenant roles define what each staff member can do.',
        steps: [
          'Open Roles & Permissions to see roles like School Admin, Faculty Lead, Finance Officer, and Read Only Auditor.',
          'Grant or revoke permissions per role; staff inherit their role\'s permissions on next request.',
          'Platform super-administrators are deliberately excluded from tenant roles — tenant access is managed entirely within the school.',
        ],
      },
    ],
  },
  {
    name: 'Academics',
    icon: GraduationCap,
    guides: [
      {
        title: 'Create classes, arms, subjects, and departments',
        summary: 'The academic structure everything else builds on.',
        steps: [
          'Open Academics → Classes and create canonical class names (JSS 1, JSS 2, SS 1…). These are the single source of truth for class naming across the app.',
          'Add arms/streams where needed, then create Subjects and Departments.',
          'Allocate teachers to class+subject pairs — these allocations drive teacher performance analytics and result entry.',
        ],
      },
      {
        title: 'Build and publish the timetable',
        summary: 'Periods, subjects, teachers, and rooms per class.',
        steps: [
          'Open Timetable, choose a class, and fill each period with subject, teacher, and room.',
          'Students and staff see their personal timetables in their own portals as soon as you save.',
        ],
      },
      {
        title: 'Take attendance (register, batch upload, QR)',
        summary: 'Three ways to record who was present.',
        steps: [
          'Daily register: Attendance → pick class and date → mark present/absent → save.',
          'Batch upload: use the CSV batch upload for historical or bulk entries.',
          'Staff check-in: generate a QR session from Staff Attendance; staff scan to clock in.',
          'Attendance analytics update immediately and feed the Analytics & Reporting dashboards.',
        ],
      },
      {
        title: 'Record results and publish report cards',
        summary: 'Scores → computed grades → published report cards.',
        steps: [
          'Open Results/Gradebook, pick the class, subject, and term, then enter scores.',
          'Compute results, review them, then publish — unpublished results stay invisible to students and parents.',
          'Report cards render from published results; the Certificate Verification page validates issued documents.',
        ],
      },
    ],
  },
  {
    name: 'Examinations (CBT)',
    icon: ClipboardCheck,
    guides: [
      {
        title: 'Create and run a CBT exam',
        summary: 'Question bank → exam → schedule → live monitor → results.',
        steps: [
          'Build questions in the Question Bank (or import them), grouped by subject.',
          'Exam Management → Create Exam: pick class, subject, duration, and questions; set the schedule window.',
          'During the exam, Live Monitoring shows who is connected, progress, and flags.',
          'After the window closes, review flagged attempts, then approve/publish results to the gradebook.',
        ],
      },
    ],
  },
  {
    name: 'Finance',
    icon: Wallet,
    guides: [
      {
        title: 'Set up fees and record payments',
        summary: 'Fee structures → assignments → payments → reconciliation.',
        steps: [
          'Finance → Fee Structures: define each fee (name, amount, applicable classes/term).',
          'Assign fees to classes or individual students — assignments create the balances families owe.',
          'Record payments against assignments; the Reconciliation view matches payments to outstanding fees.',
          'Financial analytics (collected vs outstanding) update from live billing data.',
        ],
      },
      {
        title: 'Run payroll',
        summary: 'Salary schedules and payout runs for staff.',
        steps: [
          'Configure staff salary details under Payroll.',
          'Create a payroll schedule and run it — the run records who was paid, how much, and when.',
          'Review the payroll audit trail before marking a run complete.',
        ],
      },
    ],
  },
  {
    name: 'Security & operations',
    icon: ShieldCheck,
    guides: [
      {
        title: 'Monitor sessions and cut access instantly',
        summary: 'Every login is a tracked, terminable session.',
        steps: [
          'Security & Compliance → Session Management lists every active session with device and last-activity time.',
          'Terminate a single session to sign that device out, or bulk-terminate all sessions but your own.',
          'A terminated session fails on its very next request — no propagation delay.',
        ],
      },
      {
        title: 'Read the audit logs',
        summary: 'A unified, tenant-scoped trail of what changed and who did it.',
        steps: [
          'Audit Logs combines access events (logins, logouts, session terminations), security events, exam activity, and academic-structure changes.',
          'Filter by surface (Access, Security, Examinations, Academics) or search actors, actions, and metadata.',
          'Use Export CSV to download the filtered feed for an external review.',
        ],
      },
      {
        title: 'Back up and restore school data',
        summary: 'On-demand PostgreSQL backups with an approval-gated restore.',
        steps: [
          'Security & Compliance → Backup & Restore → Run Backup creates a real database dump stored on the server.',
          'Restore requests are recorded as pending approvals — they are never executed automatically.',
          'Check backup status, size, and completion time in the same tab before relying on one.',
        ],
      },
    ],
  },
]

const FAQS = [
  {
    q: 'A new staff member can\'t log in. What\'s wrong?',
    a: 'On first login, the temporary password is the staff member\'s email address. They\'ll be prompted to set a real password. If it still fails, check Staff Management that their status is Active and the email is spelled correctly.',
  },
  {
    q: 'How does a student log in for the first time?',
    a: 'With their admission number as both the username and the initial password. If the account shows Suspended in Students or User Accounts, reactivate it first.',
  },
  {
    q: 'How do the public application and inquiry forms know which school they belong to?',
    a: 'Through your school\'s slug in the URL — /apply/<slug> and /inquiry/<slug>. Set the slug under Tenant Settings → School Link. Submissions are resolved to your tenant server-side, so a form can never file a record under the wrong school.',
  },
  {
    q: 'Why do I see staff and students in User Accounts but can\'t edit them there?',
    a: 'User Accounts is a unified directory of every credential holder. Invited user accounts are edited there; staff and student records are managed in Staff Management and Students, where suspension and profile fields live.',
  },
  {
    q: 'How are admission numbers generated?',
    a: 'From the format in System Controls — e.g. KTX/{YEAR}/{SEQ} with 3 digits produces KTX/2026/001. The sequence is per prefix+year and collision-safe, so concurrent enrollments never duplicate a number.',
  },
  {
    q: 'Why do class names show as "JSS 1" instead of "JSS1"?',
    a: 'Class names are normalized to a single canonical format in the Classes list, which is the source of truth everywhere — enrollment, timetables, attendance, results, and analytics all read from it.',
  },
  {
    q: 'How do I immediately end someone\'s access?',
    a: 'Two steps: Security & Compliance → Session Management → terminate their session (signs them out now), then suspend the account in User Accounts or Staff Management so they can\'t sign back in.',
  },
  {
    q: 'Where can I see who changed a class, subject, or student record?',
    a: 'Audit Logs → filter surface to Academics. Inserts, updates, and deletes are recorded with the actor\'s name and the changed values.',
  },
  {
    q: 'Is my school\'s data visible to other schools on the platform?',
    a: 'No. Every query is scoped to your tenant ID, which comes from your signed-in token — never from the URL or a client-supplied value. Public form submissions resolve the tenant server-side from the slug.',
  },
  {
    q: 'Does restoring a backup overwrite data immediately?',
    a: 'No. Restore requests are queued as pending approvals in Backup & Restore and must be approved before anything executes — an accidental click can\'t wipe current data.',
  },
  {
    q: 'A payment was recorded but a family still shows as owing. Why?',
    a: 'Check Finance → Reconciliation: the payment must be matched to a fee assignment. Also confirm the payment status is Confirmed — pending or failed payments don\'t reduce balances.',
  },
  {
    q: 'How do I reset my own password?',
    a: 'Use the Change Password option in your profile menu. It requires your current password, and the change is recorded in the audit trail.',
  },
  {
    q: 'The System Health page shows a spinner forever — is the site down?',
    a: 'No — that was a page bug (now fixed). If it ever recurs, use Refresh telemetry; the underlying services report independently of the panel.',
  },
  {
    q: 'Who receives my "Contact support" request?',
    a: 'It creates a ticket in Support Tickets, visible to your school\'s administrators and the platform team. Track its status on the Support Tickets page.',
  },
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
      toast({ title: 'Request Sent', description: 'Your ticket has been created. Track it on the Support Tickets page.' })
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
          <DialogDescription>Describe your issue or question — it becomes a ticket your admins and the platform team can track.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Topic</Label>
            <Input
              placeholder="e.g. Question about fee reconciliation"
              required
              value={form.topic}
              onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Provide as much detail as possible — what you clicked, what you expected, what happened..."
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

function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-2xl border border-gray-100">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-2xl">
            <div>
              <p className="font-medium text-gray-900">{guide.title}</p>
              <p className="text-sm text-gray-500">{guide.summary}</p>
            </div>
            {open
              ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-3" />
              : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 ml-3" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ol className="px-4 pb-4 space-y-2 list-none">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-2xl border border-gray-100">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-2xl">
            <p className="font-medium text-gray-900 pr-4">{q}</p>
            {open
              ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="px-4 pb-4 text-sm text-gray-600">{a}</p>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function HelpCenter() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const query = searchTerm.trim().toLowerCase()

  const filteredCategories = useMemo(() => {
    return GUIDE_CATEGORIES
      .filter((cat) => categoryFilter === 'all' || cat.name === categoryFilter)
      .map((cat) => ({
        ...cat,
        guides: cat.guides.filter((guide) =>
          !query ||
          guide.title.toLowerCase().includes(query) ||
          guide.summary.toLowerCase().includes(query) ||
          guide.steps.some((s) => s.toLowerCase().includes(query))
        ),
      }))
      .filter((cat) => cat.guides.length > 0)
  }, [query, categoryFilter])

  const filteredFaqs = useMemo(() =>
    FAQS.filter((f) =>
      !query || f.q.toLowerCase().includes(query) || f.a.toLowerCase().includes(query)
    ), [query])

  const totalResults = filteredCategories.reduce((n, c) => n + c.guides.length, 0) + filteredFaqs.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Help & Support</p>
          <h1 className="text-2xl font-bold text-gray-900">Help center</h1>
          <p className="text-sm text-gray-600">Step-by-step guides and answers for every part of the platform.</p>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search guides and FAQs"
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ContactSupportDialog />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('all')}
        >
          All topics
        </Button>
        {GUIDE_CATEGORIES.map((cat) => (
          <Button
            key={cat.name}
            variant={categoryFilter === cat.name ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(cat.name)}
          >
            <cat.icon className="h-3.5 w-3.5 mr-1.5" />
            {cat.name}
          </Button>
        ))}
      </div>

      {query && (
        <p className="text-sm text-gray-500">
          {totalResults} result{totalResults === 1 ? '' : 's'} for &ldquo;{searchTerm.trim()}&rdquo;
        </p>
      )}

      {totalResults === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Nothing matches &ldquo;{searchTerm.trim()}&rdquo;.</p>
            <p className="text-sm text-gray-400 mt-1">Try a different keyword, or contact support below.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {filteredCategories.map((category) => (
            <Card key={category.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="h-5 w-5 text-blue-600" />
                  {category.name}
                </CardTitle>
                <CardDescription>{category.guides.length} guide{category.guides.length === 1 ? '' : 's'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {category.guides.map((guide) => (
                  <GuideCard key={guide.title} guide={guide} />
                ))}
              </CardContent>
            </Card>
          ))}

          {filteredFaqs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Frequently asked questions
                </CardTitle>
                <CardDescription>{filteredFaqs.length} answer{filteredFaqs.length === 1 ? '' : 's'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredFaqs.map((faq) => (
                  <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
          <div className="flex items-center gap-3">
            <ListChecks className="h-5 w-5 text-slate-500" />
            <p>Track the status of requests you&rsquo;ve already raised.</p>
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={() => navigate('/tenant/support-tickets')}>
              <MessageSquare className="h-4 w-4 mr-2" /> Open Support Tickets
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-slate-500" />
            <p>Check live service status before reporting an outage.</p>
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={() => navigate('/tenant/system-health')}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Open System Health
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-slate-500" />
          <p>Still stuck? Share context and a teammate will respond — your request lands in Support Tickets.</p>
        </div>
        <ContactSupportDialog />
      </div>
    </div>
  )
}
export default HelpCenter;
