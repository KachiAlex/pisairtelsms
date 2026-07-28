import { useState, useEffect } from 'react';
import { Lock, RefreshCw, AlertCircle, CheckCircle, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

interface EncryptedField {
  field: string;
  enabled: boolean;
}

interface EncryptionConfig {
  algorithm: string;
  keyRotationDays: number;
  encryptedFields: EncryptedField[];
  lastKeyRotation: string;
  nextKeyRotation: string;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  changes: Record<string, unknown>;
  timestamp: string;
}

export function DataEncryption() {
  const [config, setConfig] = useState<EncryptionConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EncryptionConfig | null>(null);
  const [rotating, setRotating] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'fields' | 'audit'>('settings');

  useEffect(() => {
    fetchConfig();
    fetchAuditLogs();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tenant/security/encryption/config', {
        headers: { 'x-tenant-id': 'default-tenant', 'x-user-id': 'current-user' },
      });
      if (!response.ok) throw new Error('Failed to fetch encryption config');
      const data = await response.json();
      setConfig(data);
      setEditForm(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch encryption config');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/tenant/security/encryption/audit-logs', {
        headers: { 'x-tenant-id': 'default-tenant', 'x-user-id': 'current-user' },
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const data = await response.json();
      setAuditLogs(data.data || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  const handleSaveConfig = async () => {
    if (!editForm) return;
    try {
      setError(null);
      const response = await fetch('/api/tenant/security/encryption/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'default-tenant',
          'x-user-id': 'current-user',
        },
        body: JSON.stringify(editForm),
      });
      if (!response.ok) throw new Error('Failed to save encryption config');
      const data = await response.json();
      setConfig(data);
      setEditForm(data);
      setEditing(false);
      fetchAuditLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save encryption config');
    }
  };

  const handleSaveFields = async () => {
    if (!editForm) return;
    try {
      setError(null);
      const response = await fetch('/api/tenant/security/encryption/fields', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'default-tenant',
          'x-user-id': 'current-user',
        },
        body: JSON.stringify({ encryptedFields: editForm.encryptedFields }),
      });
      if (!response.ok) throw new Error('Failed to save encrypted fields');
      fetchConfig();
      fetchAuditLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save encrypted fields');
    }
  };

  const handleRotateKeys = async () => {
    try {
      setError(null);
      setRotating(true);
      const response = await fetch('/api/tenant/security/encryption/rotate-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'default-tenant',
          'x-user-id': 'current-user',
        },
      });
      if (!response.ok) throw new Error('Failed to rotate encryption keys');
      fetchConfig();
      fetchAuditLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate encryption keys');
    } finally {
      setRotating(false);
    }
  };

  const toggleField = (fieldName: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      encryptedFields: editForm.encryptedFields.map(f =>
        f.field === fieldName ? { ...f, enabled: !f.enabled } : f
      ),
    });
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString();

  const getDaysUntilRotation = (nextRotation: string) => {
    const diff = new Date(nextRotation).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <p>Failed to load encryption configuration</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchConfig}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {(['settings', 'fields', 'audit'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'settings' ? 'Encryption Settings' : tab === 'fields' ? 'Encrypted Fields' : 'Audit Log'}
          </button>
        ))}
      </div>

      {/* Encryption Settings Tab */}
      {activeTab === 'settings' && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Encryption Settings
              </CardTitle>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit Settings
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editing && editForm ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="algorithm">Encryption Algorithm</Label>
                    <Select
                      value={editForm.algorithm}
                      onValueChange={value => setEditForm({ ...editForm, algorithm: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AES-256">AES-256 (Recommended)</SelectItem>
                        <SelectItem value="AES-192">AES-192</SelectItem>
                        <SelectItem value="AES-128">AES-128</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="keyRotation">Key Rotation Period (days)</Label>
                    <input
                      id="keyRotation"
                      type="number"
                      min={7}
                      max={365}
                      value={editForm.keyRotationDays}
                      onChange={e =>
                        setEditForm({ ...editForm, keyRotationDays: parseInt(e.target.value) })
                      }
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Between 7 and 365 days</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-700">
                      Save Settings
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setEditing(false); setEditForm(config); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Algorithm</span>
                    <Badge>{config.algorithm}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Key Rotation Period</span>
                    <span className="text-sm text-gray-600">{config.keyRotationDays} days</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Last Key Rotation</span>
                    <span className="text-sm text-gray-600">{formatDate(config.lastKeyRotation)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Next Key Rotation</span>
                    <span className="text-sm text-gray-600">
                      {formatDate(config.nextKeyRotation)} ({getDaysUntilRotation(config.nextKeyRotation)} days)
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Key Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    Encryption keys are automatically rotated every {config.keyRotationDays} days.
                    You can manually rotate keys at any time.
                  </p>
                </div>
                <Button
                  onClick={handleRotateKeys}
                  disabled={rotating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {rotating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Rotating Keys...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Rotate Keys Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Encrypted Fields Tab */}
      {activeTab === 'fields' && editForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Encrypted Fields
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : 'Edit Fields'}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Toggle which fields are encrypted at rest. Changes take effect on next data write.
            </p>
            <div className="space-y-2">
              {editForm.encryptedFields.map(field => (
                <div
                  key={field.field}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <span className="text-sm font-medium">{field.field}</span>
                    <p className="text-xs text-gray-500">
                      {field.enabled ? 'Encrypted' : 'Not encrypted'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={() => toggleField(field.field)}
                    disabled={!editing}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            {editing && (
              <div className="mt-4 flex gap-2">
                <Button onClick={handleSaveFields} className="bg-blue-600 hover:bg-blue-700">
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setEditing(false); setEditForm(config); }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Encryption Audit Log</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No audit log entries</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Action</th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(entry => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {entry.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">{entry.userId}</td>
                        <td className="py-3 px-4 text-xs">{formatDateTime(entry.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Info */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-900">
            <p className="font-medium">Encryption Status</p>
            <p className="mt-1">
              All sensitive data is encrypted using {config.algorithm} encryption.
              Keys are rotated every {config.keyRotationDays} days.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DataEncryption;
