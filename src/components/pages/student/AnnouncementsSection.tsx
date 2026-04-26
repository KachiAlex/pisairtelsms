import React from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';

interface Announcement {
  id: string;
  title: string;
  date: string;
  preview: string;
}

interface AnnouncementsSectionProps {
  announcements: Announcement[];
  isLoading: boolean;
  onViewAll: () => void;
}

export function AnnouncementsSection({ announcements, isLoading, onViewAll }: AnnouncementsSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <Bell className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">No announcements yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((announcement) => (
        <div key={announcement.id} className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{announcement.title}</h4>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{announcement.preview}</p>
              <p className="mt-2 text-xs text-gray-500">{announcement.date}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full" onClick={onViewAll}>
        View All Announcements
      </Button>
    </div>
  );
}
