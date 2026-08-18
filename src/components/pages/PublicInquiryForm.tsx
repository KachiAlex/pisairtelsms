import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { CheckCircle } from 'lucide-react'
import { Lead } from '../../types'
import { createLead } from '../../lib/leadClient'

export function PublicInquiryForm() {
  const [formData, setFormData] = useState({
    studentName: '',
    parentName: '',
    phone: '',
    email: '',
    classInterested: 'JSS 1',
    source: 'website' as 'website' | 'open_day' | 'phone' | 'walk_in' | 'referral',
    trackingId: '',
  })

  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Generate tracking ID
      const trackingId = Math.random().toString(36).substr(2, 9).toUpperCase()
      // Create lead payload
      const leadPayload = {
        id: trackingId,
        studentName: formData.studentName,
        parentName: formData.parentName,
        contactPhone: formData.phone,
        contactEmail: formData.email,
        classInterested: formData.classInterested,
        source: formData.source,
        status: 'new',
      }
      // Save to cloud
      await createLead(leadPayload)
      // Update form with tracking ID
      setFormData(prev => ({ ...prev, trackingId }))
      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting inquiry:', error)
      // Handle error - perhaps show error message
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Inquiry Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for your interest. We'll get back to you soon.
            </p>
            <p className="text-sm text-gray-500 mb-2">Your Inquiry Tracking ID:</p>
            <p className="text-lg font-mono bg-gray-100 p-2 rounded text-center">{formData.trackingId}</p>
            <p className="text-xs text-gray-500 mt-2">
              Use this ID to check your inquiry status. Check your email for confirmation.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Express Interest</h1>
          <p className="text-gray-600">Fill out this quick form to show interest in our school</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inquiry Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Student Name</Label>
                  <Input
                    required
                    value={formData.studentName}
                    onChange={(e) => updateFormData('studentName', e.target.value)}
                    placeholder="Enter student full name"
                  />
                </div>
                <div>
                  <Label>Parent/Guardian Name</Label>
                  <Input
                    required
                    value={formData.parentName}
                    onChange={(e) => updateFormData('parentName', e.target.value)}
                    placeholder="Enter parent full name"
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    placeholder="Enter email (optional)"
                  />
                </div>
                <div>
                  <Label>Class Interested In</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.classInterested}
                    onChange={(e) => updateFormData('classInterested', e.target.value)}
                  >
                    <option>JSS 1</option>
                    <option>JSS 2</option>
                    <option>JSS 3</option>
                    <option>SS 1</option>
                    <option>SS 2</option>
                    <option>SS 3</option>
                  </select>
                </div>
                <div>
                  <Label>How did you hear about us?</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.source}
                    onChange={(e) => updateFormData('source', e.target.value)}
                  >
                    <option value="website">School Website</option>
                    <option value="open_day">Open Day</option>
                    <option value="phone">Phone Call</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-center">
                <Button type="submit" size="lg" className="px-8">
                  Submit Inquiry
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PublicInquiryForm
