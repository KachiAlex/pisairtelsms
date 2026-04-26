import React from 'react';
import { Mail, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';

interface Message {
  id: string;
  sender: string;
  subject: string;
  date: string;
  isRead: boolean;
}

interface MessagesSectionProps {
  messages: Message[];
  isLoading: boolean;
  unreadCount: number;
  onViewAll: () => void;
}

export function MessagesSection({ messages, isLoading, unreadCount, onViewAll }: MessagesSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <Mail className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-sm font-medium text-blue-900">
            You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`rounded-lg border p-4 transition hover:shadow-sm ${
            message.isRead
              ? 'border-gray-200 bg-white'
              : 'border-blue-200 bg-blue-50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={`font-medium ${message.isRead ? 'text-gray-900' : 'text-blue-900 font-semibold'}`}>
                  {message.sender}
                </h4>
                {!message.isRead && (
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">{message.subject}</p>
              <p className="mt-2 text-xs text-gray-500">{message.date}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full" onClick={onViewAll}>
        View All Messages
      </Button>
    </div>
  );
}
