import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Upload, Download, Trash2, FileText, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const [subjects, setSubjects] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [subjectTagHints, setSubjectTagHints] = useState<Record<string, string[]>>({});

  // Filters
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selection state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addTab, setAddTab] = useState<'manual' | 'import'>('manual');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; field: string; error: string }>>([]);
  const [importPreview, setImportPreview] = useState<Array<{ text: string; type: string; subject: string; tags?: string[] }>>([]);
  const [isImporting, setIsImporting] = useState(false);
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

  // Import categorization
  const [importSubject, setImportSubject] = useState('');
  const [importDifficulty, setImportDifficulty] = useState<Question['difficulty']>('Medium');
  const [importType, setImportType] = useState<Question['type']>('objective');
  const [importTag, setImportTag] = useState('');

  const activeTagHints = useMemo(() => (
    importSubject ? (subjectTagHints[importSubject] || []) : []
  ), [importSubject, subjectTagHints]);

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
      if (filterTag) params.set('tag', filterTag);

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

  const fetchSubjects = async () => {
    try {
      const res = await tenantApiGet('/api/tenant/cbt/subjects?namesOnly=true');
      if (!res.ok) {
        setSubjects([]);
        return;
      }
      const data = await res.json();
      setSubjects(Array.isArray(data.data) ? data.data : []);
    } catch {
      setSubjects([]);
    }
  };

  const fetchTagSummary = async () => {
    try {
      const res = await tenantApiGet('/api/tenant/cbt/questions?action=tags');
      if (!res.ok) {
        setAvailableTags([]);
        setSubjectTagHints({});
        return;
      }
      const data = await res.json();
      const summary = data.data || { allTags: [], subjects: [] };
      setAvailableTags(Array.isArray(summary.allTags) ? summary.allTags : []);
      const map: Record<string, string[]> = {};
      if (Array.isArray(summary.subjects)) {
        summary.subjects.forEach((entry: { subject: string; tags: string[] }) => {
          map[entry.subject] = entry.tags;
        });
      }
      setSubjectTagHints(map);
    } catch {
      setAvailableTags([]);
      setSubjectTagHints({});
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
    fetchTagSummary();
  }, [page, search, filterSubject, filterDifficulty, filterType, filterTag]);

  useEffect(() => {
    fetchStats();
  }, [questions]);

  useEffect(() => {
    if (!importSubject || importTag) return;
    const nextTag = activeTagHints[0] || `${importSubject} set`.trim();
    setImportTag(nextTag);
  }, [importSubject, importTag, activeTagHints]);

  // ── Form handlers ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ text: '', type: 'objective', options: ['', '', '', ''], correctAnswer: 'A', difficulty: 'Medium', subject: '', tags: '' });
    setFormErrors({});
    setAddTab('manual');
    setImportStatus(null);
    setImportErrors([]);
    setImportPreview([]);
    setImportSubject('');
    setImportDifficulty('Medium');
    setImportType('objective');
    setImportTag('');
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
      fetchTagSummary();
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
      setSelectedQuestions(new Set());
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.size === 0) return;
    if (!confirm(`Delete ${selectedQuestions.size} question${selectedQuestions.size > 1 ? 's' : ''}?`)) return;
    
    try {
      const ids = Array.from(selectedQuestions);
      let successCount = 0;
      let failCount = 0;
      
      for (const id of ids) {
        try {
          const res = await tenantApiFetch(`/api/tenant/cbt/questions?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to delete question ${id}:`, res.status);
          }
        } catch (err) {
          failCount++;
          console.error(`Error deleting question ${id}:`, err);
        }
      }
      
      setSelectedQuestions(new Set());
      fetchQuestions();
      fetchStats();
      
      if (failCount > 0) {
        alert(`Deleted ${successCount} question${successCount !== 1 ? 's' : ''}. ${failCount} failed.`);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map(q => q.id)));
    }
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    setSelectedQuestions(new Set());
    setSelectAll(false);
  }, [page, search, filterSubject, filterDifficulty, filterType]);

  // ── CSV import/export ──────────────────────────────────────────────────────

  const handleDownloadSample = async () => {
    try {
      const res = await tenantApiFetch('/api/tenant/cbt/questions/export?sample=true');
      if (!res.ok) throw new Error('Failed to download sample');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample-questions.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to download sample');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportStatus('Reading file...');
    setImportErrors([]);
    setImportPreview([]);
    
    try {
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setImportStatus('Validating and importing...');
      const res = await tenantApiFetch('/api/tenant/cbt/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: base64Content, 
          filename: file.name,
          options: { 
            skipDuplicates: true,
            subject: importSubject || undefined,
            difficulty: importDifficulty || undefined,
            type: importType || undefined,
            tag: (importTag || importSubject || '').trim() || undefined,
          }
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (data.data?.errors) {
          setImportErrors(data.data.errors);
          setImportStatus(`Validation failed: ${data.data.errorRows} rows have errors`);
        } else {
          throw new Error(data.error || 'Import failed');
        }
      } else {
        const { imported, skipped, failed, preview } = data.data || data;
        setImportPreview(preview || []);
        setImportStatus(
          `Imported ${imported} question${imported !== 1 ? 's' : ''}` +
          (skipped > 0 ? `. Skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}` : '') +
          (failed > 0 ? `. ${failed} failed.` : '.')
        );
        fetchQuestions();
        fetchStats();
        fetchTagSummary();
      }
    } catch (e) {
      setImportStatus(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
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
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filterTag}
              onChange={(e) => { setFilterTag(e.target.value); setPage(1); }}
              disabled={availableTags.length === 0}
            >
              <option value="">{availableTags.length === 0 ? 'No tags yet' : 'All Tags'}</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { resetForm(); setIsAddOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />Add Question
            </Button>
            {selectedQuestions.size > 0 && (
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />Delete ({selectedQuestions.size})
              </Button>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button variant="outline" size="icon" onClick={fetchQuestions} aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
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
          <p>No questions found. Add your first question.</p>
        </div>
      ) : (
        <>
          {/* Select All */}
          {questions.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded-t-md border-b">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={selectAll}
                onChange={toggleSelectAll}
                id="select-all-questions"
              />
              <label htmlFor="select-all-questions" className="text-sm text-gray-600 cursor-pointer">
                Select all ({questions.length})
              </label>
            </div>
          )}
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <Card key={q.id} className={selectedQuestions.has(q.id) ? 'bg-blue-50 border-blue-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        className="mt-1 w-4 h-4 shrink-0"
                        checked={selectedQuestions.has(q.id)}
                        onChange={() => toggleQuestionSelection(q.id)}
                        id={`question-${q.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`question-${q.id}`} className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-gray-500">Q{(page - 1) * 20 + idx + 1}.</span>
                            <p className="font-medium text-gray-900 truncate">{q.text}</p>
                          </div>
                          <div className="flex gap-2 flex-wrap mb-2">
                            <Badge className={TYPE_COLORS[q.type]}>{q.type}</Badge>
                            <Badge className={DIFFICULTY_COLORS[q.difficulty]}>{q.difficulty}</Badge>
                            {q.subject && <Badge className="bg-gray-100 text-gray-600">{q.subject}</Badge>}
                          </div>
                          {q.tags && q.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {q.tags.map((tag) => (
                                <span key={`${q.id}-${tag}`} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {q.type === 'objective' && Array.isArray(q.options) && q.options.length > 0 && (
                            <div className="grid grid-cols-2 gap-1 text-sm">
                              {q.options.map((opt, i) => {
                                const optionText = typeof opt === 'string' ? opt : (opt?.text || '');
                                return (
                                  <div key={i} className={`px-2 py-1 rounded text-xs ${String.fromCharCode(65 + i) === q.correctAnswer ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>
                                    {String.fromCharCode(65 + i)}. {optionText}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {q.type === 'truefalse' && (
                            <div className="flex gap-2 text-xs">
                              <span className={`px-2 py-1 rounded ${q.correctAnswer === 'A' ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>A. True</span>
                              <span className={`px-2 py-1 rounded ${q.correctAnswer === 'B' ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>B. False</span>
                            </div>
                          )}
                          {q.type === 'essay' && <p className="text-xs text-gray-500 italic">Essay — manual grading</p>}
                        </label>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 shrink-0" onClick={() => handleDelete(q.id)} aria-label="Delete question">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="flex items-center text-sm text-gray-600">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      {/* Add Question Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setAddTab('manual')}
                className={`px-4 py-2 text-sm font-medium ${addTab === 'manual' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setAddTab('import')}
                className={`px-4 py-2 text-sm font-medium ${addTab === 'import' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
              >
                Import from CSV/Excel
              </button>
            </div>

            {/* Manual Entry Tab */}
            {addTab === 'manual' && (
              <>
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
                    <select
                      id="q-subject"
                      className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      disabled={subjects.length === 0}
                    >
                      <option value="">{subjects.length === 0 ? 'No subjects available' : 'Select a subject'}</option>
                      {subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {subjects.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">Create subjects in the catalog to unlock this dropdown.</p>
                    )}
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
              </>
            )}

            {/* Import Tab */}
            {addTab === 'import' && (
              <>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Import Questions</h4>
                    <p className="text-sm text-blue-700 mb-3">Upload a CSV or Excel file to import multiple questions at once.</p>
                    <Button variant="outline" size="sm" onClick={handleDownloadSample} className="w-full">
                      <Download className="w-4 h-4 mr-2" />Download Sample Template
                    </Button>
                  </div>

                  {/* Categorization */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <Label htmlFor="import-subject">Subject (optional)</Label>
                      <select
                        id="import-subject"
                        className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                        value={importSubject}
                        onChange={(e) => setImportSubject(e.target.value)}
                        disabled={subjects.length === 0}
                      >
                        <option value="">{subjects.length === 0 ? 'Add subjects first' : 'Use from CSV'}</option>
                        {subjects.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="import-difficulty">Difficulty (optional)</Label>
                      <select id="import-difficulty" className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={importDifficulty} onChange={(e) => setImportDifficulty(e.target.value as any)}>
                        <option value="">Use from CSV</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="import-type">Type (optional)</Label>
                      <select id="import-type" className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={importType} onChange={(e) => setImportType(e.target.value as any)}>
                        <option value="">Use from CSV</option>
                        <option value="objective">Objective</option>
                        <option value="truefalse">True/False</option>
                        <option value="essay">Essay</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="import-tag">Tag label</Label>
                      <Input
                        id="import-tag"
                        className="mt-1"
                        value={importTag}
                        onChange={(e) => setImportTag(e.target.value)}
                        placeholder={importSubject ? `${importSubject} Midterm` : 'e.g. Algebra Wave 1'}
                      />
                      <p className="text-xs text-gray-500 mt-1">Tags group imported sets and show up while creating exams.</p>
                      {activeTagHints.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {activeTagHints.slice(0, 3).map((hint) => (
                            <button
                              key={hint}
                              type="button"
                              onClick={() => setImportTag(hint)}
                              className="text-[11px] px-2 py-0.5 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              Use "{hint}"
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Upload File *</Label>
                    <div className="mt-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        onChange={handleImport}
                      />
                    </div>
                  </div>

                  {importStatus && (
                    <div className={`flex items-center gap-2 text-sm rounded px-3 py-2 ${importErrors.length > 0 ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50'}`}>
                      {importErrors.length > 0 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{importStatus}</span>
                    </div>
                  )}

                  {importErrors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto text-xs bg-red-50 rounded p-2">
                      <p className="font-semibold text-red-700 mb-1">Validation Errors:</p>
                      {importErrors.slice(0, 10).map((err, idx) => (
                        <div key={idx} className="text-red-600">Row {err.row} ({err.field}): {err.error}</div>
                      ))}
                      {importErrors.length > 10 && <div className="text-red-600 mt-1">...and {importErrors.length - 10} more errors</div>}
                    </div>
                  )}

                  {importPreview.length > 0 && importErrors.length === 0 && (
                    <div className="text-xs bg-green-50 rounded p-2">
                      <p className="font-semibold text-green-700 mb-1">Preview of imported questions:</p>
                      {importPreview.map((q, idx) => (
                        <div key={idx} className="text-green-600">
                          • {q.text} ({q.type} - {q.subject})
                          {q.tags && q.tags.length > 0 && (
                            <span className="text-green-700"> — #{q.tags.join(', #')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)}>Close</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
