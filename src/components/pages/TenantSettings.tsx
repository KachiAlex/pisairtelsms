import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Alert, AlertDescription } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Settings, Globe, ExternalLink, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { TenantDomainManager, type TenantConfig, type TenantSettings } from '../../lib/tenantConfig'

interface TenantSettingsProps {
  tenantId: string
  tenantName: string
}

export function TenantSettings({ tenantId, tenantName }: TenantSettingsProps) {
  const [config, setConfig] = useState<TenantConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  useEffect(() => {
    loadTenantConfig()
  }, [tenantId])

  const loadTenantConfig = () => {
    setLoading(true)
    try {
      let tenantConfig = TenantDomainManager.getTenantConfig(tenantId)
      if (!tenantConfig) {
        tenantConfig = TenantDomainManager.createDefaultConfig(tenantId, tenantName)
        TenantDomainManager.saveTenantConfig(tenantId, tenantConfig)
      }
      setConfig(tenantConfig)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load tenant configuration' })
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = (updates: Partial<TenantSettings>) => {
    if (!config) return

    const updatedConfig = {
      ...config,
      settings: { ...config.settings, ...updates }
    }
    setConfig(updatedConfig)
  }

  const saveConfig = async () => {
    if (!config) return

    setSaving(true)
    try {
      // Validate URLs if custom domain is enabled
      if (config.settings.enableCustomDomain) {
        if (config.settings.customApplicationUrl &&
            !TenantDomainManager.validateUrl(config.settings.customApplicationUrl)) {
          setMessage({ type: 'error', text: 'Invalid application URL format' })
          setSaving(false)
          return
        }
        if (config.settings.customInquiryUrl &&
            !TenantDomainManager.validateUrl(config.settings.customInquiryUrl)) {
          setMessage({ type: 'error', text: 'Invalid inquiry URL format' })
          setSaving(false)
          return
        }
      }

      TenantDomainManager.saveTenantConfig(tenantId, config)
      setMessage({ type: 'success', text: 'Settings saved successfully!' })

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const testUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load tenant configuration.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const currentUrls = TenantDomainManager.getTenantFormUrls(tenantId)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tenant Settings - {tenantName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current URLs Display */}
          <div>
            <h3 className="text-lg font-medium mb-3">Current Form URLs</h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Application Form</p>
                  <p className="text-sm text-gray-600 font-mono">{currentUrls.application}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testUrl(currentUrls.application)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Inquiry Form</p>
                  <p className="text-sm text-gray-600 font-mono">{currentUrls.inquiry}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testUrl(currentUrls.inquiry)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Custom Domain Settings */}
          <div>
            <h3 className="text-lg font-medium mb-3">Custom Domain Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Custom Domain</Label>
                  <p className="text-sm text-gray-600">
                    Allow this tenant to use their own domain for form links
                  </p>
                </div>
                <Switch
                  checked={config.settings.enableCustomDomain}
                  onCheckedChange={(checked) => updateSettings({ enableCustomDomain: checked })}
                />
              </div>

              {config.settings.enableCustomDomain && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Custom domains must be properly configured to point to this application.
                      Contact your system administrator for domain setup.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="application-url">Custom Application URL</Label>
                    <Input
                      id="application-url"
                      placeholder="https://apply.yourschool.com"
                      value={config.settings.customApplicationUrl || ''}
                      onChange={(e) => updateSettings({ customApplicationUrl: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">
                      Full URL for the application form (e.g., https://apply.yourschool.com)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inquiry-url">Custom Inquiry URL</Label>
                    <Input
                      id="inquiry-url"
                      placeholder="https://inquiry.yourschool.com"
                      value={config.settings.customInquiryUrl || ''}
                      onChange={(e) => updateSettings({ customInquiryUrl: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">
                      Full URL for the inquiry form (e.g., https://inquiry.yourschool.com)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Branding Settings */}
          <div>
            <h3 className="text-lg font-medium mb-3">Branding</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name</Label>
                <Input
                  id="school-name"
                  placeholder="Enter school name"
                  value={config.settings.schoolName || ''}
                  onChange={(e) => updateSettings({ schoolName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <Input
                  id="primary-color"
                  type="color"
                  value={config.settings.primaryColor || '#3b82f6'}
                  onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium mb-3">Contact Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  placeholder="support@yourschool.com"
                  value={config.settings.supportEmail || ''}
                  onChange={(e) => updateSettings({ supportEmail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  placeholder="+1 (555) 123-4567"
                  value={config.settings.contactPhone || ''}
                  onChange={(e) => updateSettings({ contactPhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>

          {/* Message Display */}
          {message && (
            <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' :
                            message.type === 'error' ? 'border-red-200 bg-red-50' :
                            'border-blue-200 bg-blue-50'}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : message.type === 'error' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
