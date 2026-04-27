import React, { useState, useRef } from 'react';
import { Plus, Upload, Download, X, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty?: string;
  type: 'objective' | 'truefalse' | 'essay';
}

interface ExamEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExamCreate?: (examData: any) => void;
}

export function ExamEntryModal({ open, onOpenChange, onExamCreate }: ExamEntryModalProps) {
  const [examType, setExamType] = useState<'written' | 'cbt' | 'practical' | 'oral'>('cbt');
  const [formData, setFormData] = useState({
    subject: '',
    examDate: '',
    startTime: '',
    endTime: '',
    durationMinutes: '',
    examPeriodId: '',
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const downloadSampleCSV = () => {
    const sampleData = `Question,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Difficulty,Type
"What is 2+2?","3","4","5","6","B","Easy","Objective"
"What is the capital of France?","Paris","London","Berlin","Madrid","A","Medium","Objective"
"The sky is blue.","True","False","","","A","Easy","True/False"
"Explain photosynthesis.","","","","","","Medium","Essay"`;
    
    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_questions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string): Question[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const questions: Question[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Parse CSV with proper quote handling
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim());

      if (fields.length < 7) continue;

      const questionText = fields[0];
      const optionA = fields[1];
      const optionB = fields[2];
      const optionC = fields[3];
      const optionD = fields[4];
      const correctAnswer = fields[5];
      const difficulty = fields[6] || 'Medium';
      const typeStr = (fields[7] || 'Objective').toLowerCase();

      let type: 'objective' | 'truefalse' | 'essay' = 'objective';
      if (typeStr.includes('true') || typeStr.includes('false')) {
        type = 'truefalse';
      } else if (typeStr === 'essay') {
        type = 'essay';
      }

      let options: string[] = [];
      let finalCorrectAnswer = correctAnswer;

      if (type === 'truefalse') {
        options = ['True', 'False'];
        finalCorrectAnswer = correctAnswer.toLowerCase() === 'true' ? 'A' : 'B';
      } else if (type === 'essay') {
        options = [];
        finalCorrectAnswer = '';
      } else {
        options = [optionA, optionB, optionC, optionD].filter(o => o);
      }

      questions.push({
        id: `q-${Date.now()}-${i}`,
        text: questionText,
        options,
        correctAnswer: finalCorrectAnswer,
        difficulty,
        type,
      });
    }

    return questions;
  };

  const parseExcel = async (file: File): Promise<Question[]> => {
    // For Excel files, we'll use a simple approach - read as text if possible
    // In production, you'd use a library like xlsx
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = parseCSV(text);
          resolve(parsed);
        } catch (error) {
          reject(new Error('Failed to parse Excel file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseDocx = async (file: File): Promise<Question[]> => {
    // Simple DOCX parsing - extract text and parse as questions
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const text = new TextDecoder().decode(arrayBuffer);
          
          // Extract text content from DOCX (basic parsing)
          const questions: Question[] = [];
          const lines = text.split('\n').filter(line => line.trim());
          
          let currentQuestion: Partial<Question> | null = null;
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Simple heuristic: lines starting with numbers are questions
            if (/^\d+\.\s/.test(trimmed)) {
              if (currentQuestion && currentQuestion.text) {
                questions.push({
                  id: `q-${Date.now()}-${Math.random()}`,
                  text: currentQuestion.text,
                  options: currentQuestion.options || [],
                  correctAnswer: currentQuestion.correctAnswer || '',
                  difficulty: currentQuestion.difficulty || 'Medium',
                  type: currentQuestion.type || 'objective',
                });
              }
              currentQuestion = {
                text: trimmed.replace(/^\d+\.\s/, ''),
                options: [],
                correctAnswer: '',
                type: 'objective',
              };
            } else if (currentQuestion && /^[A-D]\)\s/.test(trimmed)) {
              currentQuestion.options = currentQuestion.options || [];
              currentQuestion.options.push(trimmed.replace(/^[A-D]\)\s/, ''));
            }
          }

          if (currentQuestion && currentQuestion.text) {
            questions.push({
              id: `q-${Date.now()}-${Math.random()}`,
              text: currentQuestion.text,
              options: currentQuestion.options || [],
              correctAnswer: currentQuestion.correctAnswer || '',
              difficulty: currentQuestion.difficulty || 'Medium',
              type: currentQuestion.type || 'objective',
            });
          }

          resolve(questions);
        } catch (error) {
          reject(new Error('Failed to parse DOCX file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    try {
      let parsedQuestions: Question[] = [];

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        parsedQuestions = parseCSV(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parsedQuestions = await parseExcel(file);
      } else if (file.name.endsWith('.docx')) {
        parsedQuestions = await parseDocx(file);
      } else {
        throw new Error('Unsupported file format. Please use CSV, Excel, or DOCX.');
      }

      if (parsedQuestions.length === 0) {
        throw new Error('No questions found in the file.');
      }

      setQuestions(prev => [...prev, ...parsedQuestions]);
      setImportSuccess(`Successfully imported ${parsedQuestions.length} question(s)`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => setImportSuccess(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import file';
      setImportError(message);
      setTimeout(() => setImportError(null), 5000);
    }
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleCreateExam = () => {
    if (!formData.subject || !formData.examDate || !formData.startTime || !formData.endTime) {
      setImportError('Please fill in all required fields');
      return;
    }

    if (examType === 'cbt' && questions.length === 0) {
      setImportError('CBT exams require at least one question');
      return;
    }

    const examData = {
      ...formData,
      examType,
      questions,
      durationMinutes: parseInt(formData.durationMinutes) || 60,
    };

    onExamCreate?.(examData);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      examDate: '',
      startTime: '',
      endTime: '',
      durationMinutes: '',
      examPeriodId: '',
    });
    setQuestions([]);
    setImportError(null);
    setImportSuccess(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Exam</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Exam Type Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Exam Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['written', 'cbt', 'practical', 'oral'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setExamType(type)}
                  className={`p-3 rounded-lg border-2 transition-all capitalize ${
                    examType === type
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="e.g., Mathematics"
                value={formData.subject}
                onChange={e => handleFormChange('subject', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="examDate">Exam Date *</Label>
              <Input
                id="examDate"
                type="date"
                value={formData.examDate}
                onChange={e => handleFormChange('examDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={e => handleFormChange('startTime', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={e => handleFormChange('endTime', e.target.value)}
              />
            </div>
          </div>

          {/* Import Questions Section - Only for CBT */}
          {examType === 'cbt' && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Import Questions</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadSampleCSV}
                  className="text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Sample CSV
                </Button>
              </div>

              {/* File Upload */}
              <div className="mb-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.docx"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-full"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-700">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      CSV, Excel (.xlsx, .xls), or DOCX files
                    </p>
                  </button>
                </div>
              </div>

              {/* Status Messages */}
              {importError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{importError}</p>
                </div>
              )}

              {importSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{importSuccess}</p>
                </div>
              )}

              {/* Questions Counter */}
              {questions.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    {questions.length} question{questions.length !== 1 ? 's' : ''} imported
                  </p>
                </div>
              )}

              {/* Questions List */}
              {questions.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {questions.map((q, idx) => (
                    <Card key={q.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {idx + 1}. {q.text}
                          </p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {q.type}
                            </Badge>
                            {q.difficulty && (
                              <Badge variant="outline" className="text-xs">
                                {q.difficulty}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="text-gray-400 hover:text-red-600 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end border-t pt-6">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateExam}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Exam
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
