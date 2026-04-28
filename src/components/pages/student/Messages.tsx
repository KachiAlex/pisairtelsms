import React, { useEffect, useState } from 'react';
import { AlertCircle, Mail, ChevronLeft, Send } from 'lucide-react';
import { Button } from '../../ui/button';

interface Reply {
  id: string;
  sender: string;
  date: string;
  body: string;
}

interface Message {
  id: string;
  sender: string;
  subject: string;
  date: string;
  body: string;
  isRead: boolean;
  replies: Reply[];
}

export function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const getToken = () => {
    const auth = localStorage.getItem('auth');
    return auth ? JSON.parse(auth).token : null;
  };

  const fetchMessages = async (newOffset = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getToken();
      if (!token) { setError('Not authenticated'); return; }
      const res = await fetch(`/api/student/messages?limit=${LIMIT}&offset=${newOffset}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data.messages);
      setTotal(data.total);
      setOffset(newOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleMarkRead = async (id: string) => {
    const token = getToken();
    if (!token) return;
    await fetch(`/api/student/messages?id=${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, isRead: true } : null);
  };

  const handleOpenMessage = (msg: Message) => {
    setSelected(msg);
    if (!msg.isRead) handleMarkRead(msg.id);
  };

  const handleSendReply = async () => {
    if (!selected || !replyText.trim()) return;
    try {
      setIsSending(true);
      const token = getToken();
      const res = await fetch(`/api/student/messages?id=${selected.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText }),
      });
      if (!res.ok) throw new Error('Failed to send reply');
      const { reply } = await res.json();
      setSelected(prev => prev ? { ...prev, replies: [...prev.replies, reply] } : null);
      setReplyText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const unreadCount = messages.filter(m => !m.isRead).length;

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{selected.subject}</h2>
            <div className="mt-2 flex gap-4 text-sm text-gray-500">
              <span>From: {selected.sender}</span>
              <span>{selected.date}</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-gray-700 leading-relaxed">{selected.body}</p>
          </div>
          {selected.replies.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Replies</h3>
              {selected.replies.map(r => (
                <div key={r.id} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{r.sender}</span>
                    <span>{r.date}</span>
                  </div>
                  <p className="text-sm text-gray-700">{r.body}</p>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Reply</h3>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleSendReply} disabled={isSending || !replyText.trim()} className="gap-2">
              <Send className="h-4 w-4" />
              {isSending ? 'Sending...' : 'Send Reply'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        {unreadCount > 0 && (
          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
            {unreadCount} unread
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => fetchMessages()}>Retry</Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />)}
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <Mail className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-3 text-gray-600">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map(msg => (
            <button
              key={msg.id}
              onClick={() => handleOpenMessage(msg)}
              className={`w-full text-left rounded-lg border p-4 transition hover:shadow-sm ${msg.isRead ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${msg.isRead ? 'text-gray-900' : 'text-blue-900 font-semibold'}`}>{msg.sender}</span>
                    {!msg.isRead && <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">{msg.subject}</p>
                  <p className="mt-1 text-xs text-gray-500">{msg.date}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => fetchMessages(offset - LIMIT)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={offset + LIMIT >= total} onClick={() => fetchMessages(offset + LIMIT)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;
