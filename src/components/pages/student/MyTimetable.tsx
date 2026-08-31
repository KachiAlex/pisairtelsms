import React, { useEffect, useState } from 'react';
import { AlertCircle, Download, Clock } from 'lucide-react';
import { Button } from '../../ui/button';

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
}

interface ExamSchedule {
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  room: string;
}

interface TimetableData {
  schedule: TimeSlot[];
  examSchedule: ExamSchedule[];
  termId: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SUBJECT_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-amber-100 text-amber-800',
  'bg-pink-100 text-pink-800',
  'bg-cyan-100 text-cyan-800',
];

export function MyTimetable() {
  const [data, setData] = useState<TimetableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'exams'>('schedule');

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const auth = localStorage.getItem('auth');
        if (!auth) { setError('Not authenticated'); return; }
        const { token } = JSON.parse(auth);
        const res = await fetch('/api/student/timetable', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch timetable');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTimetable();
  }, []);

  const subjectColorMap = new Map<string, string>();
  let colorIndex = 0;
  const getSubjectColor = (subject: string) => {
    if (!subjectColorMap.has(subject)) {
      subjectColorMap.set(subject, SUBJECT_COLORS[colorIndex % SUBJECT_COLORS.length]);
      colorIndex++;
    }
    return subjectColorMap.get(subject)!;
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Timetable</h1>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'schedule' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Class Schedule
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'exams' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Exam Schedule
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />)}
        </div>
      ) : data && activeTab === 'schedule' ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {DAYS.map(day => {
            const slots = data.schedule.filter(s => s.day === day);
            const isToday = day === today;
            return (
              <div key={day} className={`rounded-lg border p-3 ${isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <h3 className={`font-semibold text-sm mb-3 ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                  {day} {isToday && <span className="text-xs font-normal">(Today)</span>}
                </h3>
                {slots.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No classes</p>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot, i) => (
                      <div key={i} className={`rounded-md p-2 text-xs ${getSubjectColor(slot.subject)}`}>
                        <p className="font-semibold">{slot.subject}</p>
                        <p className="mt-0.5 opacity-80">{slot.startTime} – {slot.endTime}</p>
                        <p className="opacity-70">{slot.teacher}</p>
                        <p className="opacity-70">Room {slot.room}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : data && activeTab === 'exams' ? (
        <div className="space-y-3">
          {data.examSchedule.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <Clock className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-3 text-gray-600">No exams scheduled</p>
            </div>
          ) : (
            data.examSchedule.map((exam, i) => {
              const examDate = new Date(exam.date);
              const daysUntil = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{exam.subject}</h3>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm text-gray-600">
                        <span>{exam.date}</span>
                        <span>{exam.startTime} – {exam.endTime}</span>
                        <span>Room: {exam.room}</span>
                      </div>
                    </div>
                    {daysUntil > 0 && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${daysUntil <= 3 ? 'bg-red-100 text-red-700' : daysUntil <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {daysUntil}d away
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export default MyTimetable;
