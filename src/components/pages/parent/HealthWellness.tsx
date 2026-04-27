import { useState, useEffect } from 'react'
import { Heart, AlertCircle, Download } from 'lucide-react'
import { useParentContext } from '../../../contexts/ParentContext'
import { getAuthFromStorage } from '../../../lib/auth'

interface HealthData {
  medicalHistory: Array<{ date: string; condition: string; treatment: string }>
  vaccinations: Array<{ name: string; date: string; nextDue?: string; status: 'completed' | 'pending' | 'overdue' }>
  allergies: Array<{ allergen: string; severity: 'mild' | 'moderate' | 'severe'; reaction: string }>
  emergencyContacts: Array<{ name: string; relationship: string; phone: string }>
  healthInitiatives: Array<{ name: string; description: string; date: string }>
}

export function HealthWellness() {
  const { selectedChild } = useParentContext()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'medical' | 'vaccinations' | 'allergies' | 'contacts' | 'initiatives'>('medical')

  const fetchHealth = async () => {
    if (!selectedChild) return
    setIsLoading(true)
    try {
      const auth = getAuthFromStorage()
      const res = await fetch(
        `/api/parent/health?childId=${selectedChild.id}`,
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      )
      if (!res.ok) throw new Error('Failed to fetch health data')
      const data = await res.json()
      setHealth(data)
      setError(null)
    } catch (err) {
      setError('Failed to load health information')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [selectedChild])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900'
      case 'moderate':
        return 'bg-orange-50 border-orange-200 text-orange-900'
      case 'severe':
        return 'bg-red-50 border-red-200 text-red-900'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900'
    }
  }

  const getVaccinationStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-700'
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      case 'overdue':
        return 'bg-red-50 border-red-200 text-red-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Health & Wellness</h1>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-900">{error}</p>
            <button
              onClick={fetchHealth}
              className="text-xs text-red-700 hover:text-red-900 font-medium mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {(['medical', 'vaccinations', 'allergies', 'contacts', 'initiatives'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Medical History */}
          {activeTab === 'medical' && (
            <div className="space-y-4">
              {health?.medicalHistory && health.medicalHistory.length > 0 ? (
                health.medicalHistory.map((record, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{record.condition}</p>
                        <p className="text-sm text-gray-600 mt-1">{record.treatment}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(record.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Heart className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">No medical history recorded</p>
                </div>
              )}
            </div>
          )}

          {/* Vaccinations */}
          {activeTab === 'vaccinations' && (
            <div className="space-y-4">
              {health?.vaccinations && health.vaccinations.length > 0 ? (
                health.vaccinations.map((vac, i) => (
                  <div
                    key={i}
                    className={`border rounded-lg p-4 ${getVaccinationStatus(vac.status)}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{vac.name}</p>
                        <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-600">Date Administered</p>
                            <p className="font-medium">
                              {new Date(vac.date).toLocaleDateString()}
                            </p>
                          </div>
                          {vac.nextDue && (
                            <div>
                              <p className="text-xs text-gray-600">Next Due</p>
                              <p className="font-medium">
                                {new Date(vac.nextDue).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        vac.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : vac.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {vac.status.charAt(0).toUpperCase() + vac.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Heart className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">No vaccination records</p>
                </div>
              )}
            </div>
          )}

          {/* Allergies */}
          {activeTab === 'allergies' && (
            <div className="space-y-4">
              {health?.allergies && health.allergies.length > 0 ? (
                health.allergies.map((allergy, i) => (
                  <div
                    key={i}
                    className={`border rounded-lg p-4 ${getSeverityColor(allergy.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">{allergy.allergen}</p>
                        <p className="text-sm mt-1">{allergy.reaction}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        allergy.severity === 'mild'
                          ? 'bg-yellow-100 text-yellow-700'
                          : allergy.severity === 'moderate'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {allergy.severity.charAt(0).toUpperCase() + allergy.severity.slice(1)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Heart className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">No allergies recorded</p>
                </div>
              )}
            </div>
          )}

          {/* Emergency Contacts */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              {health?.emergencyContacts && health.emergencyContacts.length > 0 ? (
                health.emergencyContacts.map((contact, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{contact.name}</p>
                        <p className="text-sm text-gray-600">{contact.relationship}</p>
                        <p className="text-sm font-medium text-gray-900 mt-2">{contact.phone}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Heart className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">No emergency contacts recorded</p>
                </div>
              )}
            </div>
          )}

          {/* Health Initiatives */}
          {activeTab === 'initiatives' && (
            <div className="space-y-4">
              {health?.healthInitiatives && health.healthInitiatives.length > 0 ? (
                health.healthInitiatives.map((initiative, i) => (
                  <div key={i} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <p className="font-semibold text-blue-900">{initiative.name}</p>
                    <p className="text-sm text-blue-700 mt-1">{initiative.description}</p>
                    <p className="text-xs text-blue-600 mt-2">
                      {new Date(initiative.date).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Heart className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">No health initiatives</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Download Button */}
      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
        <Download className="w-4 h-4" />
        Download Health Summary
      </button>
    </div>
  )
}
