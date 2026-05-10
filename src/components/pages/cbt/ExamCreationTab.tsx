import React, { useState, useEffect } from 'react';
import { Plus, Clock, FileText, Users, Settings, Play, Edit2, Trash2, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Progress } from '../../ui/progress';
import { tenantApiGet, tenantApiPost, tenantApiPut } from '../../../lib/tenantApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exam {
  id: string;
  title: string;
  subject: string;
  class: string;
  description?: string;
  duration: number;
  passMark: number;
  totalMarks: number;
  status: 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed';
  scheduledDate?: string;
  scheduledTime?: string;
  questions: Array<{ id: string; questionId: string; marks: number; order: number }>;
  createdAt: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  subject: string;
}

interface ExamForm {
  title: string;
  subject: string;
  class: string;
  duration: string;
  passMark: string;
  totalMarks: string;
  scheduledDate: string;
  scheduledTime: string;
  description: string;
}

interface FormErrors {
  title?: string;
  subject?: string;
  class?: string;
  duration?: string;
  passMark?: string;
  totalMarks?: string;
  scheduledDate?: string;
  questions?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-yellow-100 text-yellow-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  Ongoing: 'bg-green-100 text-green-700',
  Completed: 'bg-gray-100 text-gray-700',
};

function validateExamForm(form: ExamForm, selectedQuestions: string[]): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = 'Title is required';
  if (!form.subject.trim()) errors.subject = 'Subject is required';
  if (!form.class.trim()) errors.class = 'Class is required';
  const dur = Number(form.duration);
  if (!form.duration || isNaN(dur) || dur < 15 || dur > 480) errors.duration = 'Duration must be 15–480 minutes';
  const pm = Number(form.passMark);
  if (!form.passMark || isNaN(pm) || pm < 0 || pm > 100) errors.passMark = 'Pass mark must be 0–100';
  const tm = Number(form.totalMarks);
  if (!form.totalMarks || isNaN(tm) || tm <= pm) errors.totalMarks = 'Total marks must be greater than pass mark';
  if (form.scheduledDate) {
    const d = new Date(form.scheduledDate);
    if (d < new Date()) errors.scheduledDate = 'Scheduled date must be in the future';
  }
  if (selectedQuestions.length === 0) errors.questions = 'At least one question must be selected';
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExamCreationTab() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState<ExamForm>({ title: '', subject: '', class: '', duration: '', passMark: '', totalMarks: '', scheduledDate: '', scheduledTime: '', description: '' });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Question selection
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Dynamic dropdowns
  const [subjects, setSubjects] = useState<string[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; arm: string }>>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tenantApiGet('/api/tenant/cbt/exams?limit=50');
      if (!res.ok) throw new Error('Failed to load exams');
      const data = await res.json();
      setExams(data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (search = '') => {
    setLoadingQuestions(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('searchText', search);
      const res = await tenantApiGet(`/api/tenant/cbt/questions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableQuestions(data.data || []);
      }
    } catch {
      // non-critical
    } finally {
      setLoadingQuestions(false);
    }
  };

  const fetchDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      // First, run diagnostics to see what's in the database
      const diagRes = await tenantApiGet('/api/tenant/cbt/diagnostics');
      if (diagRes.ok) {
        const diagData = await diagRes.json();
        console.log('Diagnostics:', diagData);
      }

      // Fetch subjects from admin-created subjects
      const subjectsRes = await tenantApiGet('/api/tenant/cbt/subjects?namesOnly=true');
      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        console.log('Subjects response:', subjectsData);
        const subjectsList = Array.isArray(subjectsData.data) ? subjectsData.data : [];
        console.log('Subjects list:', subjectsList);
        setSubjects(subjectsList);
      } else {
        const errorText = await subjectsRes.text();
        console.error('Failed to fetch subjects:', subjectsRes.status, errorText);
        setSubjects([]);
      }

      // Fetch classes from tenant-scoped classes endpoint
      const classesRes = await tenantApiGet('/api/tenant/cbt/classes');
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        console.log('Classes response:', classesData);
        const classList = Array.isArray(classesData.data) ? classesData.data : [];
        console.log('Classes list:', classList);
        setClasses(classList);
      } else {
        const errorText = await classesRes.text();
        console.error('Failed to fetch classes:', classesRes.status, errorText);
        setClasses([]);
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      setSubjects([]);
      setClasses([]);
    } finally {
      setLoadingDropdowns(false);
    }
  };

  useEffect(() => { fetchExams(); }, []);
  useEffect(() => { fetchDropdownData(); }, []);

  useEffect(() => {
    if (isFormOpen) fetchQuestions(questionSearch);
  }, [isFormOpen, questionSearch]);

  // ── Form handlers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingExam(null);
    setForm({ title: '', subject: '', class: '', duration: '', passMark: '', totalMarks: '', scheduledDate: '', scheduledTime: '', description: '' });
    setSelectedQuestions([]);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (exam: Exam) => {
    setEditingExam(exam);
    setForm({
      title: exam.title,
      subject: exam.subject,
      class: exam.class,
      duration: String(exam.duration),
      passMark: String(exam.passMark),
      totalMarks: String(exam.totalMarks),
      scheduledDate: exam.scheduledDate || '',
      scheduledTime: exam.scheduledTime || '',
      description: exam.description || '',
    });
    setSelectedQuestions(exam.questions.map((q) => q.questionId));
    setFormErrors({});
    setIsFormOpen(true);
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((prev) => prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]);
  };

  const handleSave = async (schedule = false) => {
    const errors = validateExamForm(form, selectedQuestions);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subject: form.subject.trim(),
        class: form.class.trim(),
        duration: Number(form.duration),
        passMark: Number(form.passMark),
        totalMarks: Number(form.totalMarks),
        scheduledDate: form.scheduledDate || undefined,
        scheduledTime: form.scheduledTime || undefined,
        description: form.description.trim() || undefined,
        questionIds: selectedQuestions,
      };

      let res: Response;
      if (editingExam) {
        res = await tenantApiPut(`/api/tenant/cbt/exams/${editingExam.id}`, payload);
      } else {
        res = await tenantApiPost('/api/tenant/cbt/exams', payload);
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }

      const saved = await res.json();

      // Schedule if requested
      if (schedule && form.scheduledDate && form.scheduledTime) {
        const examId = saved.data?.id || editingExam?.id;
        if (examId) {
          await tenantApiPost(`/api/tenant/cbt/exams/${examId}/schedule`, {
            scheduledDate: form.scheduledDate,
            scheduledTime: form.scheduledTime,
          });
        }
      }

      setIsFormOpen(false);
      fetchExams();
    } catch (e) {
      setFormErrors({ title: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this exam?')) return;
    try {
      const res = await tenantApiPut(`/api/tenant/cbt/exams/${id}`, { deleted: true });
      if (!res.ok) throw new Error('Delete failed');
      fetchExams();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const filteredQuestions = availableQuestions.filter((q) =>
    !questionSearch || q.text.toLowerCase().includes(questionSearch.toLowerCase()) || q.subject.toLowerCase().includes(questionSearch.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">All Exams ({exams.length})</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchExams} aria-label="Refresh"><RefreshCw className="w-4 h-4" /></Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Create Exam</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading exams...</div>
      ) : error ? (
        <div className="text-center py-12"><p className="text-red-600 mb-3">{error}</p><Button variant="outline" onClick={fetchExams}>Retry</Button></div>
      ) : exams.length === 0 ? (
        <div className="text-center py-12 text-gray-500"><FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No exams yet. Create your first exam.</p></div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.id}>
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h4 className="font-semibold text-gray-900">{exam.title}</h4>
                      <Badge className={STATUS_COLORS[exam.status]}>{exam.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{exam.subject} · {exam.class}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{exam.duration} mins</span>
                      <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{exam.questions.length} questions</span>
                      <span>Pass: {exam.passMark}/{exam.totalMarks}</span>
                      {exam.scheduledDate && <span>📅 {exam.scheduledDate} {exam.scheduledTime}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {exam.status === 'Draft' && (
                      <Button variant="outline" size="sm" onClick={() => openEdit(exam)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1" />Edit
                      </Button>
                    )}
                    {exam.status === 'Draft' && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(exam.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingExam ? 'Edit Exam' : 'Create Exam'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Basic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="e-title">Title *</Label>
                <Input id="e-title" className="mt-1" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Exam title" />
                {formErrors.title && <p className="text-red-600 text-xs mt-1">{formErrors.title}</p>}
              </div>
              <div>
                <Label htmlFor="e-subject">Subject *</Label>
                <select id="e-subject" className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}>
                  <option value="">Select a subject</option>
                  {subjects.length === 0 ? (
                    <option disabled>No subjects available</option>
                  ) : (
                    subjects.map((s) => <option key={s} value={s}>{s}</option>)
                  )}
                  <option value="other">Other...</option>
                </select>
                {formErrors.subject && <p className="text-red-600 text-xs mt-1">{formErrors.subject}</p>}
              </div>
              <div>
                <Label htmlFor="e-class">Class *</Label>
                <select id="e-class" className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={form.class} onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}>
                  <option value="">Select a class</option>
                  {classes.length === 0 ? (
                    <option disabled>No classes available</option>
                  ) : (
                    classes.map((c) => <option key={c.id} value={`${c.name} ${c.arm}`}>{c.name} {c.arm}</option>)
                  )}
                </select>
                {formErrors.class && <p className="text-red-600 text-xs mt-1">{formErrors.class}</p>}
              </div>
              <div>
                <Label htmlFor="e-duration">Duration (minutes) *</Label>
                <Input id="e-duration" type="number" min={15} max={480} className="mt-1" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="60" />
                {formErrors.duration && <p className="text-red-600 text-xs mt-1">{formErrors.duration}</p>}
              </div>
              <div>
                <Label htmlFor="e-pass">Pass Mark *</Label>
                <Input id="e-pass" type="number" min={0} max={100} className="mt-1" value={form.passMark} onChange={(e) => setForm((f) => ({ ...f, passMark: e.target.value }))} placeholder="50" />
                {formErrors.passMark && <p className="text-red-600 text-xs mt-1">{formErrors.passMark}</p>}
              </div>
              <div>
                <Label htmlFor="e-total">Total Marks *</Label>
                <Input id="e-total" type="number" min={1} className="mt-1" value={form.totalMarks} onChange={(e) => setForm((f) => ({ ...f, totalMarks: e.target.value }))} placeholder="100" />
                {formErrors.totalMarks && <p className="text-red-600 text-xs mt-1">{formErrors.totalMarks}</p>}
              </div>
              <div>
                <Label htmlFor="e-date">Scheduled Date</Label>
                <Input id="e-date" type="date" className="mt-1" value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
                {formErrors.scheduledDate && <p className="text-red-600 text-xs mt-1">{formErrors.scheduledDate}</p>}
              </div>
              <div>
                <Label htmlFor="e-time">Scheduled Time</Label>
                <Input id="e-time" type="time" className="mt-1" value={form.scheduledTime} onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label htmlFor="e-desc">Description</Label>
              <textarea id="e-desc" rows={2} className="w-full mt-1 border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description..." />
            </div>

            {/* Question selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Questions * ({selectedQuestions.length} selected)</Label>
              </div>
              {formErrors.questions && <p className="text-red-600 text-xs mb-2">{formErrors.questions}</p>}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search questions..." value={questionSearch} onChange={(e) => setQuestionSearch(e.target.value)} />
              </div>
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {loadingQuestions ? (
                  <p className="text-center py-4 text-sm text-gray-500">Loading questions...</p>
                ) : filteredQuestions.length === 0 ? (
                  <p className="text-center py-4 text-sm text-gray-500">No questions found</p>
                ) : (
                  filteredQuestions.map((q) => (
                    <label key={q.id} className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${selectedQuestions.includes(q.id) ? 'bg-blue-50' : ''}`}>
                      <input type="checkbox" className="mt-0.5 shrink-0" checked={selectedQuestions.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{q.text}</p>
                        <div className="flex gap-1 mt-0.5">
                          <span className="text-xs text-gray-500">{q.subject}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{q.difficulty}</span>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? 'Saving...' : 'Save as Draft'}
              </Button>
              {form.scheduledDate && form.scheduledTime && (
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleSave(true)} disabled={saving}>
                  {saving ? 'Scheduling...' : 'Save & Schedule'}
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
