import React, { useState, useEffect } from 'react';
import { AlertCircle, RotateCcw, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { financeApiGet, financeApiPost } from '../../../lib/financeApi';

interface HistoryEntry {
  id: string;
  version: number;
  name: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  createdAt: string;
  createdBy: string;
  changes?: string;
}

interface FeeStructureHistoryProps {
  structureId: string;
}

export function FeeStructureHistory({ structureId }: FeeStructureHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<HistoryEntry | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [structureId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await financeApiGet(`/api/tenant/finance/fee-structures/${structureId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const result = await response.json();
      setHistory(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (version: HistoryEntry) => {
    if (!confirm(`Are you sure you want to rollback to version ${version.version}?`)) {
      return;
    }

    try {
      const response = await financeApiPost(`/api/tenant/finance/fee-structures/${structureId}/rollback`, {
        targetVersion: version.version,
      });

      if (!response.ok) {
        throw new Error('Failed to rollback fee structure');
      }

      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const SkeletonRow = () => (
    <TableRow>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHistory}
                className="border-red-300 hover:bg-red-100"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map(i => (
                    <SkeletonRow key={i} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No history available</p>
              <p className="text-sm text-gray-500 mt-1">Version history will appear here as changes are made</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant="outline">v{entry.version}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(entry.effectiveFrom)}</TableCell>
                      <TableCell>
                        {entry.effectiveTo ? formatDate(entry.effectiveTo) : '—'}
                      </TableCell>
                      <TableCell>{entry.createdBy}</TableCell>
                      <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog open={showComparison && selectedVersion?.id === entry.id} onOpenChange={(open) => {
                            if (open) {
                              setSelectedVersion(entry);
                              setShowComparison(true);
                            } else {
                              setShowComparison(false);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Version {entry.version} Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-gray-600">Effective From</p>
                                    <p className="font-medium">{formatDate(entry.effectiveFrom)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Effective To</p>
                                    <p className="font-medium">{entry.effectiveTo ? formatDate(entry.effectiveTo) : '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Created By</p>
                                    <p className="font-medium">{entry.createdBy}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Created At</p>
                                    <p className="font-medium">{formatDate(entry.createdAt)}</p>
                                  </div>
                                </div>
                                {entry.changes && (
                                  <div>
                                    <p className="text-sm text-gray-600 mb-2">Changes</p>
                                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                                      {entry.changes}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRollback(entry)}
                            title="Rollback to this version"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default FeeStructureHistory;
