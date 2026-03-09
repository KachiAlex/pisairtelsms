import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { CheckCircle, Upload } from 'lucide-react'

export function PublicApplicationForm() {
  const [formData, setFormData] = useState({
    // Student Info
    fullName: '',
    dateOfBirth: '',
    gender: 'Male',
    classApplying: 'JSS 1',
    previousSchool: '',
    // Parent Info
    parentNames: [''],
    phones: [''],
    email: '',
    address: '',
    // Other
    emergencyContacts: [''],
    specialNeeds: '',
    transportation: '',
    // Documents
    birthCertificate: null as File | null,
    passportPhoto: null as File | null,
    previousResults: null as File | null,
    medicalRecords: null as File | null,
    trackingId: '',
  })

  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Generate tracking ID
    const trackingId = Math.random().toString(36).substr(2, 9).toUpperCase()
    updateFormData('trackingId', trackingId)
    // In real app, submit to API
    console.log('Application submitted:', { ...formData, trackingId })
    setSubmitted(true)
    // Send confirmation email, etc.
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addParent = () => {
    setFormData(prev => ({
      ...prev,
      parentNames: [...prev.parentNames, ''],
      phones: [...prev.phones, ''],
    }))
  }

  const updateParent = (index: number, field: 'name' | 'phone', value: string) => {
    if (field === 'name') {
      const newNames = [...formData.parentNames]
      newNames[index] = value
      updateFormData('parentNames', newNames)
    } else {
      const newPhones = [...formData.phones]
      newPhones[index] = value
      updateFormData('phones', newPhones)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for your application. We'll review it and get back to you soon.
            </p>
            <p className="text-sm text-gray-500 mb-2">Your Application Tracking ID:</p>
            <p className="text-lg font-mono bg-gray-100 p-2 rounded text-center">{formData.trackingId}</p>
            <p className="text-xs text-gray-500 mt-2">
              Use this ID to check your application status. Check your email for confirmation.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admission Application</h1>
          <p className="text-gray-600">Fill out the form below to apply for admission</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    required
                    value={formData.fullName}
                    onChange={(e) => updateFormData('fullName', e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.gender}
                    onChange={(e) => updateFormData('gender', e.target.value)}
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div>
                  <Label>Class Applying For</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.classApplying}
                    onChange={(e) => updateFormData('classApplying', e.target.value)}
                  >
                    <option>JSS 1</option>
                    <option>JSS 2</option>
                    <option>JSS 3</option>
                    <option>SS 1</option>
                    <option>SS 2</option>
                    <option>SS 3</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Previous School</Label>
                <Input
                  value={formData.previousSchool}
                  onChange={(e) => updateFormData('previousSchool', e.target.value)}
                  placeholder="Enter previous school name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Parent Information */}
          <Card>
            <CardHeader>
              <CardTitle>Parent/Guardian Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.parentNames.map((name, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label>Parent/Guardian Name</Label>
                    <Input
                      required
                      value={name}
                      onChange={(e) => updateParent(index, 'name', e.target.value)}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      required
                      value={formData.phones[index]}
                      onChange={(e) => updateParent(index, 'phone', e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addParent}>
                Add Another Parent
              </Button>
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  placeholder="Enter full address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Documents Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Document Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Birth Certificate</Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => updateFormData('birthCertificate', e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label>Passport Photo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => updateFormData('passportPhoto', e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label>Previous School Results</Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => updateFormData('previousResults', e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label>Medical Records (Optional)</Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => updateFormData('medicalRecords', e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Other Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Emergency Contact</Label>
                <Input
                  value={formData.emergencyContacts[0]}
                  onChange={(e) => updateFormData('emergencyContacts', [e.target.value])}
                  placeholder="Enter emergency contact"
                />
              </div>
              <div>
                <Label>Special Needs (Optional)</Label>
                <Input
                  value={formData.specialNeeds}
                  onChange={(e) => updateFormData('specialNeeds', e.target.value)}
                  placeholder="Any special needs or requirements"
                />
              </div>
              <div>
                <Label>Transportation Needs (Optional)</Label>
                <Input
                  value={formData.transportation}
                  onChange={(e) => updateFormData('transportation', e.target.value)}
                  placeholder="Transportation requirements"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button type="submit" size="lg" className="px-8">
              Submit Application
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PublicApplicationForm
