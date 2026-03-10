import React, { useState } from 'react';
import { Plus, FileText, Play, Pause, Eye, Settings, AlertCircle, Users, Clock, Upload, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty?: string;
  type: 'objective' | 'truefalse' | 'essay';
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  class: string;
  status: 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed';
  date: string;
  duration: string;
  questions: Question[];
  participants: number;
  completed: number;
}

const mockExams: Exam[] = [
  {
    id: '1',
    title: 'First Term Exam',
    subject: 'Mathematics',
    class: 'SS 3',
    status: 'Ongoing',
    date: '2026-02-14',
    duration: '90 mins',
    questions: [], // Will be populated with actual questions
    participants: 145,
    completed: 87,
  },
  {
    id: '2',
    title: 'First Term Exam',
    subject: 'English Language',
    class: 'JSS 2',
    status: 'Scheduled',
    date: '2026-02-16',
    duration: '60 mins',
    questions: [],
    participants: 178,
    completed: 0,
  },
  {
    id: '3',
    title: 'Mid-Term Assessment',
    subject: 'Physics',
    class: 'SS 2',
    status: 'Ongoing',
    date: '2026-02-14',
    duration: '120 mins',
    questions: [],
    participants: 132,
    completed: 98,
  },
  {
    id: '4',
    title: 'First Term Exam',
    subject: 'Biology',
    class: 'SS 1',
    status: 'Completed',
    date: '2026-02-10',
    duration: '90 mins',
    questions: [],
    participants: 156,
    completed: 156,
  },
];

const liveMonitoring = [
  { name: 'Adewale Johnson', progress: 75, questionsAnswered: '38/50', timeRemaining: '15 mins', status: 'Active' },
  { name: 'Chioma Okafor', progress: 90, questionsAnswered: '45/50', timeRemaining: '8 mins', status: 'Active' },
  { name: 'Ibrahim Musa', progress: 60, questionsAnswered: '30/50', timeRemaining: '25 mins', status: 'Active' },
  { name: 'Blessing Eze', progress: 45, questionsAnswered: '23/50', timeRemaining: '35 mins', status: 'Idle' },
];

export function ExamManagement() {
  const [exams, setExams] = useState(mockExams);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Form state for creating exam
  const [examForm, setExamForm] = useState({
    title: '',
    subject: '',
    class: '',
    duration: '',
    passMark: '',
    examDate: '',
    startTime: '',
    questions: [] as Question[],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-green-100 text-green-700';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'Completed':
        return 'bg-gray-100 text-gray-700';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Handle form input changes
  const handleFormChange = (field: keyof typeof examForm, value: string) => {
    setExamForm(prev => ({ ...prev, [field]: value }));
  };

  // Validate form
  const validateForm = () => {
    return examForm.title.trim() &&
           examForm.subject &&
           examForm.class &&
           examForm.duration &&
           examForm.passMark &&
           examForm.examDate &&
           examForm.startTime &&
           examForm.questions.length > 0;
  };

  // Handle exam creation
  const handleCreateExam = () => {
    if (!validateForm()) {
      alert('Please fill in all required fields.');
      return;
    }

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      title: examForm.title,
      subject: examForm.subject,
      class: examForm.class,
      status: 'Draft',
      date: examForm.examDate,
      duration: `${examForm.duration} mins`,
      questions: examForm.questions,
      participants: 0, // Will be assigned when scheduled
      completed: 0,
    };

    setExams(prev => [...prev, newExam]);

    // Show success feedback
    alert(`Exam "${examForm.title}" created successfully! Status: Draft`);

    // Reset form and close dialog
    setExamForm({
      title: '',
      subject: '',
      class: '',
      duration: '',
      passMark: '',
      examDate: '',
      startTime: '',
      questions: [],
    });
    setIsCreateDialogOpen(false);
  };

  // Handle starting a scheduled exam
  const handleStartExam = (exam: Exam) => {
    setExams(prev => prev.map(e =>
      e.id === exam.id ? { ...e, status: 'Ongoing' as const } : e
    ));
  };

  // Handle exam settings
  const handleExamSettings = (exam: Exam) => {
    // For now, just show an alert. In a real app, this would open a settings dialog
    alert(`Settings for ${exam.subject} exam`);
  };

  // Handle adding a question
  const handleAddQuestion = () => {
    // For now, just show an alert. In a real app, this would open a question creation dialog
    alert('Add Question functionality - would open question creation dialog');
  };

  const downloadSampleCSV = () => {
    const sampleData = `"Question","OptionA","OptionB","OptionC","OptionD","CorrectAnswer","Difficulty","Type"\n"What is 2+2?","3","4","5","6","B","Easy","Objective"\n"What is the capital of France?","Paris","London","Berlin","Madrid","A","Medium","Objective"\n"Solve for x: 2x + 3 = 7","x = 1","x = 2","x = 3","x = 4","B","Medium","Objective"\n"The sky is blue.","True","False","","","A","Easy","True/False"\n"Water boils at 100°C.","True","False","","","A","Easy","True/False"\n"Explain the process of photosynthesis.","","","","","","Medium","Essay"\n"Describe the water cycle.","","","","","","Medium","Essay"`;
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_questions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const [importFile, setImportFile] = useState<File | null>(null);

  const handleImport = () => {
    if (!importFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const questions: Question[] = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(s => s.replace(/"/g, ''));
        if (row.length >= 7) {
          let type: 'objective' | 'truefalse' | 'essay' = 'objective';
          if (row.length >= 8) {
            const typeStr = row[7].toLowerCase();
            if (typeStr === 'true/false' || typeStr === 'truefalse') type = 'truefalse';
            else if (typeStr === 'essay') type = 'essay';
          }
          let options = [row[1], row[2], row[3], row[4]];
          let correctAnswer = row[5];
          if (type === 'truefalse') {
            options = ['True', 'False'];
            if (correctAnswer.toLowerCase() === 'true') correctAnswer = 'A';
            else if (correctAnswer.toLowerCase() === 'false') correctAnswer = 'B';
          } else if (type === 'essay') {
            options = [];
            correctAnswer = '';
          }
          questions.push({
            id: `q-${Date.now()}-${i}`,
            text: row[0],
            options,
            correctAnswer,
            difficulty: row[6] || 'Medium',
            type,
          });
        }
      }
      setExamForm(prev => ({ ...prev, questions: [...prev.questions, ...questions] }));
    };
    reader.readAsText(importFile);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CBT & Examination Management</h1>
          <p className="text-sm text-gray-600 mt-1">Create, schedule and monitor computer-based tests</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Exam
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ongoing Exams</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {exams.filter(e => e.status === 'Ongoing').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Play className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {exams.filter(e => e.status === 'Scheduled').length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Students</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">87</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Question Bank</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">2,450</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="exams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exams">All Exams</TabsTrigger>
          <TabsTrigger value="live">Live Monitoring</TabsTrigger>
          <TabsTrigger value="questions">Question Bank</TabsTrigger>
        </TabsList>

        <TabsContent value="exams" className="space-y-4">
          {exams.map((exam) => (
            <Card key={exam.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">{exam.subject}</h3>
                      <Badge className={getStatusColor(exam.status)}>{exam.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{exam.title} - {exam.class}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{exam.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{exam.questions.length} Questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{exam.participants} Students</span>
                      </div>
                    </div>
                    {exam.status === 'Ongoing' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Completion</span>
                          <span className="font-medium">{exam.completed}/{exam.participants}</span>
                        </div>
                        <Progress value={(exam.completed / exam.participants) * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {exam.status === 'Ongoing' && (
                      <Button onClick={() => setSelectedExam(exam)} variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        Monitor
                      </Button>
                    )}
                    {exam.status === 'Scheduled' && (
                      <Button variant="outline" onClick={() => handleStartExam(exam)}>
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={() => handleExamSettings(exam)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Exam Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liveMonitoring.map((student, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.questionsAnswered}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {student.status}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">{student.timeRemaining}</p>
                      </div>
                    </div>
                    <Progress value={student.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Question Bank</CardTitle>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddQuestion}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Economics'].map((subject, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{subject}</p>
                          <p className="text-sm text-gray-600 mt-1">{Math.floor(Math.random() * 500 + 100)} questions</p>
                        </div>
                        <FileText className="w-8 h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Exam Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Exam</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="questions">Questions ({examForm.questions.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div>
                <Label>Exam Title</Label>
                <Input
                  placeholder="e.g., First Term Examination"
                  value={examForm.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={examForm.subject}
                    onChange={(e) => handleFormChange('subject', e.target.value)}
                  >
                    <option value="">Select Subject</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="English Language">English Language</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>
                <div>
                  <Label>Class</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={examForm.class}
                    onChange={(e) => handleFormChange('class', e.target.value)}
                  >
                    <option value="">Select Class</option>
                    <option value="JSS 1">JSS 1</option>
                    <option value="JSS 2">JSS 2</option>
                    <option value="JSS 3">JSS 3</option>
                    <option value="SS 1">SS 1</option>
                    <option value="SS 2">SS 2</option>
                    <option value="SS 3">SS 3</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (mins)</Label>
                  <Input
                    type="number"
                    placeholder="90"
                    value={examForm.duration}
                    onChange={(e) => handleFormChange('duration', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Pass Mark (%)</Label>
                  <Input
                    type="number"
                    placeholder="40"
                    value={examForm.passMark}
                    onChange={(e) => handleFormChange('passMark', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Exam Date</Label>
                  <Input
                    type="date"
                    value={examForm.examDate}
                    onChange={(e) => handleFormChange('examDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={examForm.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="questions" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Import Questions
                </Button>
                <input id="import-file" type="file" accept=".csv" style={{display: 'none'}} onChange={(e) => { setImportFile(e.target.files?.[0] || null); handleImport(); }} />
                <Button variant="outline" onClick={downloadSampleCSV}>
                  <Download className="h-4 w-4 mr-2" /> Download Sample
                </Button>
                <Button variant="outline" onClick={handleAddQuestion}>
                  <Plus className="h-4 w-4 mr-2" /> Add Manually
                </Button>
              </div>
              <div className="space-y-2">
                {examForm.questions.map((q, index) => (
                  <div key={q.id} className="border p-2 rounded">
                    <p className="font-medium">{index+1}. {q.text}</p>
                    <p className="text-sm text-gray-600">Type: {q.type}</p>
                    {q.options.length > 0 && <p className="text-sm text-gray-600">Options: {q.options.join(', ')}</p>}
                    {q.correctAnswer && <p className="text-sm text-gray-600">Answer: {q.correctAnswer}</p>}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
              if (validateForm()) {
                handleCreateExam();
              } else {
                alert('Please fill in all required fields.');
              }
            }}>
              Create Exam
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monitor Exam Dialog */}
      <Dialog open={!!selectedExam} onOpenChange={() => setSelectedExam(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Live Exam Monitoring - {selectedExam?.subject}</DialogTitle>
          </DialogHeader>
          {selectedExam && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold">{selectedExam.participants}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{selectedExam.completed}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedExam.participants - selectedExam.completed}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {liveMonitoring.map((student, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{student.name}</p>
                      <Badge className={student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {student.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress: {student.questionsAnswered}</span>
                        <span className="text-gray-600">Time: {student.timeRemaining}</span>
                      </div>
                      <Progress value={student.progress} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default ExamManagement;
