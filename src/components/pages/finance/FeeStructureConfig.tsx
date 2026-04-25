import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, History, AlertCircle, RotateCcw } from 'lucide-react';
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
import { FeeStructureForm } from './FeeStructureForm';
import { FeeStructureHistory } from './FeeStructureHistory';
import { financeApiGet, financeApiDelete } from '../../../lib/financeApi';

interface FeeStructure {
  id: string;
  name: string;
  academicSession: string;
  term: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface FeeStructureConfigProps {
  onClose?: () => void;
}

export function FeeStructureConfig({ onClose }: FeeStructureConfigProps) {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<FeeStructure | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);

  useEffect(() => {
    fetchFeeStructures();
  }, []);

  const fetchFeeStructures = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await financeApiGet('/api/tenant/finance/fee-structures');
      if (!response.ok) {
        throw new Error('Failed to fetch fee structures');
      }
      const result = await response.json();
      setStructures(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStructures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) {
      return;
    }

    try {
      const response = await financeApiDelete(`/api/tenant/finance/fee-structures/${id}`);

      if (!response.ok) {
        throw new Error('Failed to delete fee structure');
      }

      setStructures(structures.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fee structure');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingStructure(null);
    fetchFeeStructures();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const SkeletonRow = () => (
    <TableRow>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* Error State */}
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
                onClick={fetchFeeStructures}
                className="border-red-300 hover:bg-red-100"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fee Structures</h2>
          <p className="text-sm text-gray-600 mt-1">Manage school-wide and class-level fee configurations</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setEditingStructure(null)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Fee Structure
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStructure ? 'Edit Fee Structure' : 'Create Fee Structure'}
              </DialogTitle>
            </DialogHeader>
            <FeeStructureForm
              structure={editingStructure}
              onClose={handleFormClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Fee Structures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Structures</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Status</TableHead>
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
          ) : structures.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No fee structures found</p>
              <p className="text-sm text-gray-500 mt-1">Create your first fee structure to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structures.map((structure) => (
                    <TableRow key={structure.id}>
                      <TableCell className="font-medium">{structure.name}</TableCell>
                      <TableCell>{structure.academicSession}</TableCell>
                      <TableCell>{structure.term}</TableCell>
                      <TableCell>{formatDate(structure.effectiveFrom)}</TableCell>
                      <TableCell>
                        {structure.effectiveTo ? formatDate(structure.effectiveTo) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(structure.status)}>
                          {structure.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog open={showHistory && selectedStructure?.id === structure.id} onOpenChange={(open) => {
                            if (open) {
                              setSelectedStructure(structure);
                              setShowHistory(true);
                            } else {
                              setShowHistory(false);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="View history"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Fee Structure History</DialogTitle>
                              </DialogHeader>
                              {selectedStructure && (
                                <FeeStructureHistory structureId={selectedStructure.id} />
                              )}
                            </DialogContent>
                          </Dialog>

                          <Dialog open={showForm && editingStructure?.id === structure.id} onOpenChange={(open) => {
                            if (open) {
                              setEditingStructure(structure);
                              setShowForm(true);
                            } else {
                              setShowForm(false);
                              setEditingStructure(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Fee Structure</DialogTitle>
                              </DialogHeader>
                              <FeeStructureForm
                                structure={editingStructure}
                                onClose={handleFormClose}
                              />
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(structure.id)}
                            title="Delete"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
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

export default FeeStructureConfig;
