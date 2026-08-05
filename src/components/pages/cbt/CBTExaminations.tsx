import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { QuestionBankTab } from './QuestionBankTab';
import { ExamCreationTab } from './ExamCreationTab';
import { LiveMonitoringTab } from './LiveMonitoringTab';
import { ExamResultsTab } from './ExamResultsTab';
import { SecuritySettingsTab } from './SecuritySettingsTab';
import { BookOpen, FileText, Activity, BarChart3, Shield } from 'lucide-react';

export function CBTExaminations({ initialTab }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'question-bank');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">CBT & Examinations</h1>
        <p className="text-gray-600 mt-2">
          Manage computer-based testing, question banks, live exam monitoring, and security settings.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="question-bank" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Question Bank</span>
          </TabsTrigger>
          <TabsTrigger value="exam-creation" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Create Exam</span>
          </TabsTrigger>
          <TabsTrigger value="live-monitoring" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Live Monitor</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Results</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="question-bank" className="mt-6">
          <QuestionBankTab />
        </TabsContent>

        <TabsContent value="exam-creation" className="mt-6">
          <ExamCreationTab />
        </TabsContent>

        <TabsContent value="live-monitoring" className="mt-6">
          <LiveMonitoringTab />
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <ExamResultsTab />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CBTExaminations;
