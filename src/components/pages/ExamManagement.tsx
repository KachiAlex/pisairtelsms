import React, { useState } from 'react';
import { Plus, FileText, Play, Pause, Eye, Settings, AlertCircle, Users, Clock, Upload, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ExamEntryModal } from './timetable/ExamEntryModal';

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

const mockExams: Exam[] = []

const liveMonitoring = []

export function ExamManagement() {
  const [exams, setExams] = useState(mockExams);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
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
          <TabsTrigger value="results">Exam Results</TabsTrigger>
          <TabsTrigger value="security">Security Settings</TabsTrigger>
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

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exam Results</CardTitle>
              <CardDescription>View and analyze exam performance and student results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Total Exams Completed</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">24</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Average Score</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">78.5%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Pass Rate</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">92%</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { exam: 'Mathematics Final', students: 45, avgScore: 82, passed: 42 },
                      { exam: 'English Midterm', students: 48, avgScore: 75, passed: 44 },
                      { exam: 'Physics Quiz', students: 50, avgScore: 68, passed: 45 },
                    ].map((result, idx) => (
                      <div key={idx} className="border-b pb-3 last:border-b-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{result.exam}</p>
                            <p className="text-sm text-gray-600">{result.students} students</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700">{result.passed}/{result.students} Passed</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Average Score: {result.avgScore}%</span>
                          <span className="text-gray-600">Pass Rate: {Math.round((result.passed / result.students) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure exam security and proctoring options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">Enable Proctoring</p>
                      <p className="text-sm text-gray-600">Monitor students during exam</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">Disable Copy/Paste</p>
                      <p className="text-sm text-gray-600">Prevent copying exam content</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">Disable Right-Click</p>
                      <p className="text-sm text-gray-600">Prevent context menu access</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">Require Camera</p>
                      <p className="text-sm text-gray-600">Student must enable camera</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" />
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">Randomize Questions</p>
                      <p className="text-sm text-gray-600">Show questions in random order</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">Randomize Options</p>
                      <p className="text-sm text-gray-600">Shuffle answer options</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-medium text-gray-900 mb-3">Access Control</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Allowed IP Addresses</label>
                    <Input placeholder="e.g., 192.168.1.0/24" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Exam Password</label>
                    <Input type="password" placeholder="Optional password for exam access" className="mt-1" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="bg-blue-600 hover:bg-blue-700">Save Settings</Button>
                <Button variant="outline">Reset to Default</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Exam Modal */}
      <ExamEntryModal 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onExamCreate={(examData) => {
          const newExam: Exam = {
            id: `exam-${Date.now()}`,
            title: examData.subject,
            subject: examData.subject,
            class: 'All Classes',
            status: 'Draft',
            date: examData.examDate,
            duration: `${examData.durationMinutes} mins`,
            questions: examData.questions || [],
            participants: 0,
            completed: 0,
          };
          setExams(prev => [...prev, newExam]);
          setIsCreateDialogOpen(false);
        }}
      />

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
