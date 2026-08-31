import { useState, useEffect } from 'react';
import { CreditCard, Eye, EyeOff, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Badge } from '../../ui/badge';

interface PaymentGatewayConfig {
  id: string;
  gateway: 'paystack' | 'flutterwave' | 'moniepoint';
  publicKey: string;
  secretKey: string;
  isActive: boolean;
}

const GATEWAYS = [
  { key: 'paystack' as const, name: 'Paystack', description: 'Accept card, bank transfer, and mobile money payments' },
  { key: 'flutterwave' as const, name: 'Flutterwave', description: 'Accept card, bank transfer, and mobile money payments' },
  { key: 'moniepoint' as const, name: 'Moniepoint', description: 'Accept card and bank transfer payments' },
];

export function PaymentGatewaySettings() {
  const [settings, setSettings] = useState<Record<string, PaymentGatewayConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
            const response = await fetch('/api/tenant/finance/payments?action=settings', { headers });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const result = await response.json();
      const map: Record<string, PaymentGatewayConfig> = {};
      (result.data || []).forEach((s: PaymentGatewayConfig) => {
        map[s.gateway] = s;
      });
      setSettings(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (gateway: string) => {
    const config = settings[gateway];
    if (!config) return;

    if (!config.publicKey.trim() || !config.secretKey.trim()) {
      setError('Public key and secret key are required');
      return;
    }

    setSaving(gateway);
    setError(null);
    setSaveSuccess(null);

    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
            const response = await fetch('/api/tenant/finance/payments?action=settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          gateway,
          publicKey: config.publicKey,
          secretKey: config.secretKey,
          isActive: config.isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaveSuccess(gateway);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const toggleActive = (gateway: string) => {
    setSettings(prev => {
      const current = prev[gateway];
      if (!current) {
        return {
          ...prev,
          [gateway]: {
            id: '',
            gateway: gateway as 'paystack' | 'flutterwave' | 'moniepoint',
            publicKey: '',
            secretKey: '',
            isActive: true,
          },
        };
      }
      return {
        ...prev,
        [gateway]: { ...current, isActive: !current.isActive },
      };
    });
  };

  const updateField = (gateway: string, field: 'publicKey' | 'secretKey', value: string) => {
    setSettings(prev => {
      const current = prev[gateway] || {
        id: '',
        gateway: gateway as 'paystack' | 'flutterwave' | 'moniepoint',
        publicKey: '',
        secretKey: '',
        isActive: false,
      };
      return { ...prev, [gateway]: { ...current, [field]: value } };
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm text-gray-500 mt-2">Loading gateway settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {GATEWAYS.map(({ key, name, description }) => {
          const config = settings[key];
          const isSaving = saving === key;
          const justSaved = saveSuccess === key;

          return (
            <Card key={key} className={config?.isActive ? 'border-green-200' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-base">{name}</CardTitle>
                  </div>
                  {config?.isActive && (
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  )}
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${key}-active`} className="text-sm font-medium">
                    Set as Active Gateway
                  </Label>
                  <Switch
                    id={`${key}-active`}
                    checked={config?.isActive || false}
                    onCheckedChange={() => toggleActive(key)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${key}-public`}>Public Key</Label>
                  <Input
                    id={`${key}-public`}
                    type="text"
                    placeholder={`${name} public key`}
                    value={config?.publicKey || ''}
                    onChange={e => updateField(key, 'publicKey', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${key}-secret`}>Secret Key</Label>
                  <div className="relative">
                    <Input
                      id={`${key}-secret`}
                      type={showSecret[key] ? 'text' : 'password'}
                      placeholder={`${name} secret key`}
                      value={config?.secretKey || ''}
                      onChange={e => updateField(key, 'secretKey', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowSecret(prev => ({ ...prev, [key]: !prev[key] }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecret[key] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={() => handleSave(key)}
                  disabled={isSaving}
                  className="w-full"
                  variant={justSaved ? 'default' : 'outline'}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : justSaved ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isSaving ? 'Saving...' : justSaved ? 'Saved!' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-900 text-sm">Important Security Notice</p>
              <p className="text-sm text-amber-700 mt-1">
                Secret keys are encrypted at rest. Only activate one gateway at a time.
                Students and parents will see the Pay Now button only when a gateway is active.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
