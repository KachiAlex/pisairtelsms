import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { createLead } from '../../lib/leadClient'

export function DemoRequestForm() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    schoolName: '',
    adminName: '',
    role: 'Principal',
    phone: '',
    email: '',
    studentCount: '100-500',
    preferredDate: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const trackingId = `demo_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      await createLead({
        id: trackingId,
        studentName: `${formData.schoolName} — ${formData.adminName} (${formData.role})`,
        parentName: formData.adminName,
        contactPhone: formData.phone,
        contactEmail: formData.email,
        classInterested: `Demo Request — ${formData.studentCount} students`,
        source: 'demo_request',
        status: 'new',
      })
      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting demo request:', err)
      setError('Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for your interest in Pisairtel Schools. Our team will contact you within 24 hours to schedule your demo.
            </p>
            <Button onClick={() => navigate('/')} className="mt-2">
              Back to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Homepage
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Demo</h1>
          <p className="text-gray-600">
            See Pisairtel Schools in action. Fill out the form below and we'll schedule a personalized demo for your school.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demo Request Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              <div>
                <Label>School Name</Label>
                <Input
                  required
                  value={formData.schoolName}
                  onChange={(e) => updateField('schoolName', e.target.value)}
                  placeholder="Enter your school name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Your Name</Label>
                  <Input
                    required
                    value={formData.adminName}
                    onChange={(e) => updateField('adminName', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label>Your Role</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.role}
                    onChange={(e) => updateField('role', e.target.value)}
                  >
                    <option>Principal</option>
                    <option>Head Teacher</option>
                    <option>Administrator</option>
                    <option>IT Manager</option>
                    <option>Proprietor</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Number of Students</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.studentCount}
                    onChange={(e) => updateField('studentCount', e.target.value)}
                  >
                    <option>Less than 100</option>
                    <option>100-500</option>
                    <option>500-1000</option>
                    <option>1000-5000</option>
                    <option>More than 5000</option>
                  </select>
                </div>
                <div>
                  <Label>Preferred Demo Date</Label>
                  <Input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => updateField('preferredDate', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Additional Information</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[100px]"
                  value={formData.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  placeholder="Tell us about your school's specific needs or questions..."
                />
              </div>

              <div className="flex justify-center">
                <Button type="submit" size="lg" className="px-8" disabled={loading}>
                  {loading ? 'Submitting...' : 'Request Demo'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DemoRequestForm
