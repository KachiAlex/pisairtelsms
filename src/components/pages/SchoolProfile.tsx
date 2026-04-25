import React, { useMemo, useState } from 'react'
import { Building2, MapPinned, Phone, Mail, Award, Globe2, Users, Calendar, Link2, Upload } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const summaryStats = [
  { label: 'Founded', value: '1998', detail: '26 years of service', icon: Calendar },
  { label: 'Students enrolled', value: '2,140', detail: '+6.3% YoY', icon: Users },
  { label: 'Campuses', value: '3', detail: 'Lagos • Abuja • Kano', icon: MapPinned },
  { label: 'Affiliations', value: '6', detail: 'WAEC • NECO • SAT', icon: Award },
]

const governanceContacts = [
  { role: 'Proprietor', name: 'Mrs. Bisi Oronsaye', email: 'bisi@heritage.edu.ng', phone: '+234 802 321 8890' },
  { role: 'Principal', name: 'Mr. Kunle Ibrahim', email: 'k.ibrahim@heritage.edu.ng', phone: '+234 803 234 5566' },
  { role: 'Compliance Lead', name: 'Ms. Doyin Akande', email: 'doyin.akande@heritage.edu.ng', phone: '+234 701 119 2233' },
]

const accreditationHistory = [
  { year: '2025', item: 'STEM Excellence Award', owner: 'Federal Ministry of Education', status: 'Active' },
  { year: '2024', item: 'WAEC Center recertification', owner: 'WAEC Council', status: 'Active' },
  { year: '2022', item: 'Child safeguarding audit', owner: 'UNICEF partner network', status: 'Cleared' },
]

const socialLinks = [
  { label: 'Website', value: 'www.heritageacademy.edu', icon: Globe2 },
  { label: 'Parent portal', value: 'parents.heritageacademy.edu', icon: Link2 },
  { label: 'Admissions', value: 'admissions@heritageacademy.edu', icon: Mail },
]

export function SchoolProfile() {
  const [profile, setProfile] = useState({
    schoolName: 'Heritage International Academy',
    motto: 'Lighting paths, shaping futures.',
    registrationId: 'RC-2198845',
    foundedYear: '1998',
    website: 'www.heritageacademy.edu',
    address: 'Plot 4, Unity Crescent, Lekki Phase 1, Lagos',
    phone: '+234-801-234-5678',
    email: 'info@heritageacademy.edu',
  })

  const [campuses] = useState([
    { campus: 'Lagos (Main)', population: 1280, head: 'Mrs. Funmi Adeoye', contact: '+234 802 555 6677' },
    { campus: 'Abuja', population: 560, head: 'Dr. Ifeanyi Ugwu', contact: '+234 803 111 8844' },
    { campus: 'Kano', population: 300, head: 'Mr. Yakubu Garba', contact: '+234 805 993 1122' },
  ])

  const totalPopulation = useMemo(() =>
    campuses.reduce((acc, campus) => acc + campus.population, 0),
  [campuses])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Institution DNA</p>
          <h1 className="text-2xl font-bold text-gray-900">School profile</h1>
          <p className="text-sm text-gray-600">Document your brand assets, leadership contacts, and regulatory status.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" /> Upload crest
          </Button>
          <Button>
            <Building2 className="h-4 w-4 mr-2" /> Publish prospectus
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.detail}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand identity</CardTitle>
          <CardDescription>Public-facing details seen on report cards, admissions, and portals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>School name</Label>
              <Input value={profile.schoolName} onChange={(event) => setProfile((prev) => ({ ...prev, schoolName: event.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Registration ID</Label>
              <Input value={profile.registrationId} onChange={(event) => setProfile((prev) => ({ ...prev, registrationId: event.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Motto</Label>
              <Input value={profile.motto} onChange={(event) => setProfile((prev) => ({ ...prev, motto: event.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Founded year</Label>
              <Input value={profile.foundedYear} onChange={(event) => setProfile((prev) => ({ ...prev, foundedYear: event.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Primary website</Label>
              <Input value={profile.website} onChange={(event) => setProfile((prev) => ({ ...prev, website: event.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Official email</Label>
              <Input value={profile.email} onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Head office address</Label>
            <Input value={profile.address} onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))} className="mt-1" />
          </div>
          <div className="grid gap-4 md:grid-cols-[3fr_1fr]">
            <div>
              <Label>Contact line</Label>
              <Input value={profile.phone} onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))} className="mt-1" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Primary campus count</Label>
              <Input value={String(campuses.length)} readOnly className="mt-1 bg-gray-100" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Governance & leadership
            </CardTitle>
            <CardDescription>Trusted contacts for regulators and Scholix support.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {governanceContacts.map((contact) => (
              <div key={contact.role} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.role}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Primary</Badge>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex flex-col gap-1">
                  <span>{contact.email}</span>
                  <span>{contact.phone}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-emerald-600" />
              Digital touch-points
            </CardTitle>
            <CardDescription>Keep prospectus links in sync across portals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {socialLinks.map((link) => {
              const Icon = link.icon
              return (
                <div key={link.label} className="rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-slate-100 p-2 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{link.label}</p>
                      <p className="text-xs text-gray-500">{link.value}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    Copy
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-purple-600" />
            Campuses & enrollment
          </CardTitle>
          <CardDescription>Total population: {totalPopulation.toLocaleString()} learners</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campus</TableHead>
                <TableHead>Population</TableHead>
                <TableHead>Head of school</TableHead>
                <TableHead>Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campuses.map((campus) => (
                <TableRow key={campus.campus}>
                  <TableCell className="font-semibold text-gray-900">{campus.campus}</TableCell>
                  <TableCell>{campus.population.toLocaleString()}</TableCell>
                  <TableCell>{campus.head}</TableCell>
                  <TableCell className="text-sm text-gray-500">{campus.contact}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            Accreditation timeline
          </CardTitle>
          <CardDescription>Track expiring licenses and awards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {accreditationHistory.map((row) => (
            <div key={row.item} className="rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{row.item}</p>
                <p className="text-xs text-gray-500">{row.owner}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{row.year}</span>
                <Badge variant="secondary" className={row.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                  {row.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
export default SchoolProfile;
