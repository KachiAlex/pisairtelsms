import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Trash2, FileText, RefreshCw, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { tenantApiGet, tenantApiPost, tenantApiPut, tenantApiFetch } from '../../../lib/tenantApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  type: 'objective' | 'truefalse' | 'essay';
  options: string[];
  correctAnswer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  tags: string[];
  createdAt: string;
}

interface QuestionStats {
  total: number;
  byDifficulty: { Easy: number; Medium: number; Hard: number };
  byType: { objective: number; truefalse: number; essay: number };
}

interface QuestionFormData {
  text: string;
  type: 'objective' | 'truefalse' | 'essay';
  options: string[];
  correctAnswer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  tags: string;
}

interface FormErrors {
  text?: string;
  options?: string;
  correctAnswer?: string;
  subject?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Hard: 'bg-red-100 text-red-700',
};

const TYPE_COLORS: Record<string, string> = {
  objective: 'bg-blue-100 text-blue-700',
  truefalse: 'bg-purple-100 text-purple-700',
  essay: 'bg-orange-100 text-orange-700',
};

function validateForm(form: QuestionFormData): FormErrors {
  const errors: FormErrors = {};
  if (!form.text.trim()) errors.text = 'Question text is required';
  if (!form.subject.trim()) errors.subject = 'Subject is required';
  if (form.type === 'objective') {
    if (form.options.some((o) => !o.trim())) errors.options = 'All options must be filled in';
    if (!form.correctAnswer) errors.correctAnswer = 'Correct answer is required';
  }
  if (form.type === 'truefalse' && !form.correctAnswer) {
    errors.correctAnswer = 'Correct answer is required';
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuestionBankTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<QuestionFormData>({
    text: '',
    type: 'objective',
    options: ['', '', '', ''],
    correctAnswer: 'A',
    difficulty: 'Medium',
    subject: '',
    tags: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('searchText', search);
      if (filterSubject) params.set('subject', filterSubject);
      if (filterDifficulty) params.set('difficulty', filterDifficulty);
      if (filterType) params.set('type', filterType);

      const res = await tenantApiGet(`/api/tenant/cbt/questions?${params}`);
      if (!res.ok) throw new Error('Failed to load questions');
      const data = await res.json();
      setQuestions(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await tenantApiGet('/api/tenant/cbt/questions/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch {
      // stats are non-critical
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [page, search, filterSubject, filterDifficulty, filterType]);

  useEffect(() => {
    fetchStats();
  }, [questions]);

  // ── Form handlers ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ text: '', type: 'objective', options: ['', '', '', ''], correctAnswer: 'A', difficulty: 'Medium', subject: '', tags: '' });
    setFormErrors({});
  };

  const handleTypeChange = (type: QuestionFormData['type']) => {
    const options = type === 'objective' ? ['', '', '', ''] : type === 'truefalse' ? ['True', 'False'] : [];
    const correctAnswer = type === 'essay' ? '' : 'A';
    setForm((f) => ({ ...f, type, options, correctAnswer }));
  };

  const handleSave = async () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      const payload = {
        text: form.text.trim(),
        type: form.type,
        options: form.type === 'essay' ? [] : form.options,
        correctAnswer: form.correctAnswer,
        difficulty: form.difficulty,
        subject: form.subject.trim(),
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      const res = await tenantApiPost('/api/tenant/cbt/questions', payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save question');
      }
      setIsAddOpen(false);
      resetForm();
      fetchQuestions();
      fetchStats();
    } catch (e) {
      setFormErrors({ text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      const res = await tenantApiFetch(`/api/tenant/cbt/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      fetchQuestions();
      fetchStats();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  // ── CSV import/export ──────────────────────────────────────────────────────

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Importing...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await tenantApiFetch('/api/tenant/cbt/questions/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportStatus(`Imported ${data.imported} questions. ${data.failed > 0 ? `${data.failed} failed.` : ''}`);
      fetchQuestions();
      fetchStats();
    } catch (e) {
      setImportStatus(e instanceof Error ? e.message : 'Import failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterSubject) params.set('subject', filterSubject);
    window.open(`/api/tenant/cbt/questions/export?${params}`, '_blank');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold text-blue-600">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Easy / Med / Hard</p><p className="text-sm font-semibold mt-1">{stats.byDifficulty.Easy} / {stats.byDifficulty.Medium} / {stats.byDifficulty.Hard}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Objective</p><p className="text-xl font-bold text-blue-600">{stats.byType.objective}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Essay</p><p className="text-xl font-bold text-orange-600">{stats.byType.essay}</p></CardContent></Card>
        </div>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search questions..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="border rounded-md px-3 py-2 text-sm" value={filterSubject} onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}>
              <option value="">All Subjects</option>
              {['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="border rounded-md px-3 py-2 text-sm" value={filterDifficulty} onChange={(e) => { setFilterDifficulty(e.target.value); setPage(1); }}>
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <select className="border rounded-md px-3 py-2 text-sm" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="objective">Objective</option>
              <option value="truefalse">True/False</option>
              <option value="essay">Essay</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { resetForm(); setIsAddOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />Add Question
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />Import CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button variant="outline" size="icon" onClick={fetchQuestions} aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          {importStatus && (
            <div className="mt-2 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded px-3 py-2">
              <span>{importStatus}</span>
              <button onClick={() => setImportStatus(null)} aria-label="Dismiss"><X className="w-3 h-3" /></button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading questions...</div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-3">{error}</p>
          <Button variant="outline" onClick={fetchQuestions}>Retry</Button>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No questions found. Add your first question or import a CSV.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-gray-500">Q{(page - 1) * 20 + idx + 1}.</span>
                      <p className="font-medium text-gray-900 truncate">{q.text}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap mb-2">
                      <Badge className={TYPE_COLORS[q.type]}>{q.type}</Badge>
                      <Badge className={DIFFICULTY_COLORS[q.difficulty]}>{q.difficulty}</Badge>
                      {q.subject && <Badge className="bg-gray-100 text-gray-600">{q.subject}</Badge>}
                    </div>
                    {q.type === 'objective' && q.options.length > 0 && (
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`px-2 py-1 rounded text-xs ${String.fromCharCode(65 + i) === q.correctAnswer ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === 'truefalse' && (
                      <div className="flex gap-2 text-xs">
                        <span className={`px-2 py-1 rounded ${q.correctAnswer === 'A' ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>A. True</span>
                        <span className={`px-2 py-1 rounded ${q.correctAnswer === 'B' ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>B. False</span>
                      </div>
                    )}
                    {q.type === 'essay' && <p className="text-xs text-gray-500 italic">Essay — manual grading</p>}
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 shrink-0" onClick={() => handleDelete(q.id)} aria-label="Delete question">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="flex items-center text-sm text-gray-600">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* Add Question Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Type */}
            <div>
              <Label>Question Type *</Label>
              <div className="flex gap-2 mt-1">
                {(['objective', 'truefalse', 'essay'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => handleTypeChange(t)}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors ${form.type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                    {t === 'truefalse' ? 'True/False' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Text */}
            <div>
              <Label htmlFor="q-text">Question Text *</Label>
              <textarea id="q-text" rows={3} className="w-full mt-1 border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Enter question text..." />
              {formErrors.text && <p className="text-red-600 text-xs mt-1">{formErrors.text}</p>}
            </div>

            {/* Options */}
            {form.type === 'objective' && (
              <div>
                <Label>Options * (mark correct answer)</Label>
                <div className="space-y-2 mt-1">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button type="button" onClick={() => setForm((f) => ({ ...f, correctAnswer: String.fromCharCode(65 + i) }))}
                        className={`w-7 h-7 rounded-full text-xs font-bold border-2 shrink-0 ${form.correctAnswer === String.fromCharCode(65 + i) ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-500'}`}>
                        {String.fromCharCode(65 + i)}
                      </button>
                      <Input value={opt} onChange={(e) => { const opts = [...form.options]; opts[i] = e.target.value; setForm((f) => ({ ...f, options: opts })); }}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                    </div>
                  ))}
                </div>
                {formErrors.options && <p className="text-red-600 text-xs mt-1">{formErrors.options}</p>}
                {formErrors.correctAnswer && <p className="text-red-600 text-xs mt-1">{formErrors.correctAnswer}</p>}
              </div>
            )}

            {form.type === 'truefalse' && (
              <div>
                <Label>Correct Answer *</Label>
                <div className="flex gap-3 mt-1">
                  {['A', 'B'].map((v, i) => (
                    <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, correctAnswer: v }))}
                      className={`px-4 py-2 rounded border text-sm ${form.correctAnswer === v ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-700'}`}>
                      {i === 0 ? 'True' : 'False'}
                    </button>
                  ))}
                </div>
                {formErrors.correctAnswer && <p className="text-red-600 text-xs mt-1">{formErrors.correctAnswer}</p>}
              </div>
            )}

            {/* Subject & Difficulty */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="q-subject">Subject *</Label>
                <Input id="q-subject" className="mt-1" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics" />
                {formErrors.subject && <p className="text-red-600 text-xs mt-1">{formErrors.subject}</p>}
              </div>
              <div>
                <Label htmlFor="q-difficulty">Difficulty</Label>
                <select id="q-difficulty" className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as any }))}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="q-tags">Tags (comma-separated)</Label>
              <Input id="q-tags" className="mt-1" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="e.g. algebra, equations" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Question'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
