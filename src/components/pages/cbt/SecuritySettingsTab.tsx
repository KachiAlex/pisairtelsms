import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { tenantApiGet, tenantApiPost } from '../../../lib/tenantApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SecuritySettings {
  id?: string;
  examId: string;
  proctoringEnabled: boolean;
  cameraRequired: boolean;
  copyPasteDisabled: boolean;
  rightClickDisabled: boolean;
  questionRandomization: boolean;
  optionRandomization: boolean;
  ipWhitelist?: string;
  examPassword?: string;
}

interface ProctoringLog {
  id: string;
  studentId: string;
  studentName?: string;
  eventType: 'camera_on' | 'camera_off' | 'tab_switch' | 'copy_attempt' | 'right_click';
  createdAt: string;
  eventDetails?: Record<string, any>;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  class: string;
  status: string;
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SecuritySettingsTab() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [settings, setSettings] = useState<SecuritySettings>({
    examId: '',
    proctoringEnabled: false,
    cameraRequired: false,
    copyPasteDisabled: false,
    rightClickDisabled: false,
    questionRandomization: false,
    optionRandomization: false,
    ipWhitelist: '',
    examPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);

  // Proctoring logs
  const [logs, setLogs] = useState<ProctoringLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logEventFilter, setLogEventFilter] = useState('');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchExams = async () => {
    try {
      const res = await tenantApiGet('/api/tenant/cbt/exams?limit=50');
      if (res.ok) {
        const data = await res.json();
        setExams(data.data || []);
        if (data.data?.length > 0 && !selectedExamId) {
          setSelectedExamId(data.data[0].id);
        }
      }
    } catch {
      // non-critical
    }
  };

  const fetchSettings = async (examId: string) => {
    if (!examId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await tenantApiGet(`/api/tenant/cbt/security/${examId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setSettings({ ...data.data, examPassword: '' }); // don't pre-fill password
        } else {
          // No settings yet — use defaults
          setSettings({ examId, proctoringEnabled: false, cameraRequired: false, copyPasteDisabled: false, rightClickDisabled: false, questionRandomization: false, optionRandomization: false, ipWhitelist: '', examPassword: '' });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (examId: string) => {
    if (!examId) return;
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (logEventFilter) params.set('eventType', logEventFilter);
      if (logStartDate) params.set('startDate', logStartDate);
      if (logEndDate) params.set('endDate', logEndDate);
      const res = await tenantApiGet(`/api/tenant/cbt/security/${examId}/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
      }
    } catch {
      // non-critical
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => { fetchExams(); }, []);
  useEffect(() => {
    if (selectedExamId) {
      fetchSettings(selectedExamId);
      fetchLogs(selectedExamId);
    }
  }, [selectedExamId]);
  useEffect(() => {
    if (selectedExamId) fetchLogs(selectedExamId);
  }, [logEventFilter, logStartDate, logEndDate]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateIP = (value: string): boolean => {
    if (!value.trim()) return true;
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    return value.split(',').map((s) => s.trim()).every((cidr) => cidrRegex.test(cidr));
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (settings.ipWhitelist && !validateIP(settings.ipWhitelist)) {
      setIpError('Invalid CIDR notation. Use format: 192.168.1.0/24');
      return;
    }
    setIpError(null);
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload: Record<string, any> = {
        proctoringEnabled: settings.proctoringEnabled,
        cameraRequired: settings.cameraRequired,
        copyPasteDisabled: settings.copyPasteDisabled,
        rightClickDisabled: settings.rightClickDisabled,
        questionRandomization: settings.questionRandomization,
        optionRandomization: settings.optionRandomization,
        ipWhitelist: settings.ipWhitelist || undefined,
      };
      if (settings.examPassword) payload.examPassword = settings.examPassword;

      const res = await tenantApiPost(`/api/tenant/cbt/security/${selectedExamId}`, payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setSettings((s) => ({ ...s, examPassword: '' })); // clear password after save
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({ examId: selectedExamId, proctoringEnabled: false, cameraRequired: false, copyPasteDisabled: false, rightClickDisabled: false, questionRandomization: false, optionRandomization: false, ipWhitelist: '', examPassword: '' });
    setIpError(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const EVENT_TYPE_LABELS: Record<string, string> = {
    camera_on: '📷 Camera On',
    camera_off: '📷 Camera Off',
    tab_switch: '🔄 Tab Switch',
    copy_attempt: '📋 Copy Attempt',
    right_click: '🖱️ Right Click',
  };

  return (
    <div className="space-y-4">
      {/* Exam selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1">
              <Label htmlFor="exam-select">Select Exam</Label>
              <select id="exam-select" className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
                <option value="">-- Select an exam --</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>{e.title} ({e.subject} · {e.class})</option>
                ))}
              </select>
            </div>
            <Button variant="outline" size="icon" className="mt-5 sm:mt-0" onClick={() => { fetchExams(); if (selectedExamId) fetchSettings(selectedExamId); }} aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selectedExamId ? (
        <div className="text-center py-12 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Select an exam to configure security settings.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Loading settings...</div>
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          {saveSuccess && (
            <div className="text-green-700 bg-green-50 rounded px-4 py-3 text-sm">
              ✓ Security settings saved successfully.
            </div>
          )}

          {/* Toggle settings */}
          <Card>
            <CardHeader>
              <CardTitle>Proctoring & Restrictions</CardTitle>
              <CardDescription>Configure exam security and monitoring options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'proctoringEnabled', label: 'Enable Proctoring', desc: 'Monitor students during the exam' },
                { key: 'cameraRequired', label: 'Require Camera', desc: 'Students must enable their camera to start' },
                { key: 'copyPasteDisabled', label: 'Disable Copy/Paste', desc: 'Prevent copying exam content' },
                { key: 'rightClickDisabled', label: 'Disable Right-Click', desc: 'Prevent context menu access' },
                { key: 'questionRandomization', label: 'Randomize Questions', desc: 'Show questions in random order per student' },
                { key: 'optionRandomization', label: 'Randomize Options', desc: 'Shuffle answer options per student' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <Toggle
                    id={key}
                    checked={settings[key as keyof SecuritySettings] as boolean}
                    onChange={(v) => setSettings((s) => ({ ...s, [key]: v }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Access control */}
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>Restrict exam access by IP or password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ip-whitelist">Allowed IP Addresses (CIDR notation)</Label>
                <Input id="ip-whitelist" className="mt-1" value={settings.ipWhitelist || ''}
                  onChange={(e) => { setSettings((s) => ({ ...s, ipWhitelist: e.target.value })); setIpError(null); }}
                  placeholder="e.g. 192.168.1.0/24, 10.0.0.0/8" />
                {ipError && <p className="text-red-600 text-xs mt-1">{ipError}</p>}
                <p className="text-xs text-gray-500 mt-1">Leave empty to allow all IP addresses. Separate multiple ranges with commas.</p>
              </div>
              <div>
                <Label htmlFor="exam-password">Exam Password</Label>
                <div className="relative mt-1">
                  <Input id="exam-password" type={showPassword ? 'text' : 'password'} className="pr-10"
                    value={settings.examPassword || ''}
                    onChange={(e) => setSettings((s) => ({ ...s, examPassword: e.target.value }))}
                    placeholder="Leave empty to keep existing password" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {settings.examPassword && (
                  <div className="mt-1 flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className={`h-1 flex-1 rounded ${settings.examPassword!.length >= level * 4 ? (level <= 2 ? 'bg-red-400' : level === 3 ? 'bg-yellow-400' : 'bg-green-500') : 'bg-gray-200'}`} />
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">4–50 characters. Leave empty to remove password protection.</p>
              </div>
            </CardContent>
          </Card>

          {/* Save buttons */}
          <div className="flex gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button variant="outline" onClick={handleReset}>Reset to Default</Button>
          </div>

          {/* Proctoring logs */}
          <Card>
            <CardHeader>
              <CardTitle>Proctoring Logs</CardTitle>
              <CardDescription>Security events recorded during exams</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Log filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select className="border rounded-md px-3 py-2 text-sm" value={logEventFilter} onChange={(e) => setLogEventFilter(e.target.value)}>
                  <option value="">All Events</option>
                  <option value="camera_on">Camera On</option>
                  <option value="camera_off">Camera Off</option>
                  <option value="tab_switch">Tab Switch</option>
                  <option value="copy_attempt">Copy Attempt</option>
                  <option value="right_click">Right Click</option>
                </select>
                <Input type="date" className="text-sm" value={logStartDate} onChange={(e) => setLogStartDate(e.target.value)} />
                <Input type="date" className="text-sm" value={logEndDate} onChange={(e) => setLogEndDate(e.target.value)} />
                <Button variant="outline" size="icon" onClick={() => fetchLogs(selectedExamId)} aria-label="Refresh logs">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {logsLoading ? (
                <p className="text-center py-6 text-gray-500 text-sm">Loading logs...</p>
              ) : logs.length === 0 ? (
                <p className="text-center py-6 text-gray-500 text-sm">No proctoring events recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-medium text-gray-700">Event</th>
                        <th className="text-left p-3 font-medium text-gray-700">Student</th>
                        <th className="text-left p-3 font-medium text-gray-700">Timestamp</th>
                        <th className="text-left p-3 font-medium text-gray-700">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="p-3">
                            <Badge className={
                              log.eventType === 'copy_attempt' || log.eventType === 'tab_switch' ? 'bg-red-100 text-red-700' :
                              log.eventType === 'right_click' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }>
                              {EVENT_TYPE_LABELS[log.eventType] || log.eventType}
                            </Badge>
                          </td>
                          <td className="p-3 text-gray-700">{log.studentName || log.studentId}</td>
                          <td className="p-3 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="p-3 text-gray-500 text-xs max-w-[200px] truncate">
                            {log.eventDetails ? JSON.stringify(log.eventDetails) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
