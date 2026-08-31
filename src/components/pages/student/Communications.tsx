import React, { useEffect, useState } from 'react';
import { AlertCircle, Bell, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Button } from '../../ui/button';

interface Announcement {
  id: string;
  title: string;
  date: string;
  sender: string;
  preview: string;
  body: string;
  audience: string;
}

export function Communications() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 10;

  const fetchAnnouncements = async (newOffset = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      const auth = localStorage.getItem('auth');
      if (!auth) { setError('Not authenticated'); return; }
      const { token } = JSON.parse(auth);
      const res = await fetch(`/api/student/announcements?limit=${LIMIT}&offset=${newOffset}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch announcements');
      const data = await res.json();
      setAnnouncements(data.announcements);
      setTotal(data.total);
      setOffset(newOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const filtered = announcements.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.sender.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm w-full sm:w-64"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => fetchAnnouncements()}>Retry</Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <Bell className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-3 text-gray-600">No announcements found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const isExpanded = expandedId === a.id;
            return (
              <div key={a.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <button
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{isExpanded ? '' : a.preview}</p>
                      <div className="mt-2 flex gap-3 text-xs text-gray-500">
                        <span>{a.sender}</span>
                        <span>•</span>
                        <span>{a.date}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-700 leading-relaxed">{a.body}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => fetchAnnouncements(offset - LIMIT)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={offset + LIMIT >= total} onClick={() => fetchAnnouncements(offset + LIMIT)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Communications;
