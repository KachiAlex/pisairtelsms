import React, { useState, useEffect } from 'react';
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

export function DataEncryption() {
  const [config, setConfig] = useState<EncryptionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EncryptionConfig | null>(null);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenant/security/encryption/config', {
        headers: {
          'x-tenant-id': 'default-tenant',
        },
      });
      const data = await response.json();
      setConfig(data.data);
      setEditForm(data.data);
    } catch (err) {
      setError('Failed to fetch encryption config');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!editForm) return;

    try {
      const response = await fetch('/api/tenant/security/encryption/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'default-tenant',
          'x-user-id': 'current-user',
        },
        body: JSON.stringify(editForm),
      });
      const data = await response.json();
      setConfig(data.data);
      setEditing(false);
    } catch (err) {
      setError('Failed to save encryption config');
    }
  };

  const handleRotateKeys = async () => {
    try {
      setRotating(true);
      const response = await fetch('/api/tenant/security/encryption/rotate-keys', {
        method: 'POST',
        headers: {
          'x-tenant-id': 'default-tenant',
          'x-user-id': 'current-user',
        },
      });
      const data = await response.json();
      fetchConfig();
    } catch (err) {
      setError('Failed to rotate encryption keys');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilRotation = (nextRotation: string) => {
    const now = new Date();
    const next = new Date(nextRotation);
    const diff = next.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

      {/* Encryption Settings */}
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
                  onValueChange={value =>
                    setEditForm({ ...editForm, algorithm: value })
                  }
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
                  value={editForm.keyRotationDays}
                  onChange={e =>
                    setEditForm({
                      ...editForm,
                      keyRotationDays: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-700">
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setEditForm(config);
                  }}
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

      {/* Encrypted Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Encrypted Fields
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {editForm?.encryptedFields.map(field => (
              <div
                key={field.field}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <span className="text-sm font-medium">{field.field}</span>
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
              <Button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setEditForm(config);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Rotation */}
      <Card>
        <CardHeader>
          <CardTitle>Key Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Encryption keys are automatically rotated every {config.keyRotationDays} days. You can manually rotate keys at any time.
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

      {/* Info Box */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-900">
            <p className="font-medium">Encryption Status</p>
            <p className="mt-1">All sensitive data is encrypted using {config.algorithm} encryption. Keys are rotated every {config.keyRotationDays} days.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DataEncryption;
