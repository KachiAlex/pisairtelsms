import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';

interface ClassOverride {
  id?: string;
  className: string;
  feeCategory: string;
  originalAmount: number;
  overrideAmount: number;
  reason: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface ClassLevelOverrideProps {
  feeStructureId: string;
  onClose?: () => void;
}

const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];
const FEE_CATEGORIES = [
  'Tuition',
  'Development Levy',
  'Exam Fees',
  'Activity Fees',
  'Transport',
  'Meals',
  'Uniforms',
  'Technology',
  'Sports',
  'Library',
];

export function ClassLevelOverride({ feeStructureId, onClose }: ClassLevelOverrideProps) {
  const [overrides, setOverrides] = useState<ClassOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOverride, setEditingOverride] = useState<ClassOverride | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    className: CLASSES[0],
    feeCategory: FEE_CATEGORIES[0],
    originalAmount: 0,
    overrideAmount: 0,
    reason: '',
    effectiveFrom: '',
    effectiveTo: '',
  });

  useEffect(() => {
    fetchOverrides();
  }, [feeStructureId]);

  const fetchOverrides = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/tenant/finance/fee-structures/${feeStructureId}/class-overrides`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch class overrides');
      }
      const result = await response.json();
      setOverrides(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOverride = () => {
    setEditingOverride(null);
    setFormData({
      className: CLASSES[0],
      feeCategory: FEE_CATEGORIES[0],
      originalAmount: 0,
      overrideAmount: 0,
      reason: '',
      effectiveFrom: '',
      effectiveTo: '',
    });
    setShowForm(true);
  };

  const handleEditOverride = (override: ClassOverride) => {
    setEditingOverride(override);
    setFormData({
      className: override.className,
      feeCategory: override.feeCategory,
      originalAmount: override.originalAmount,
      overrideAmount: override.overrideAmount,
      reason: override.reason,
      effectiveFrom: override.effectiveFrom?.split('T')[0] || '',
      effectiveTo: override.effectiveTo?.split('T')[0] || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.className || !formData.feeCategory || !formData.overrideAmount) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        className: formData.className,
        feeCategory: formData.feeCategory,
        originalAmount: parseFloat(formData.originalAmount.toString()),
        overrideAmount: parseFloat(formData.overrideAmount.toString()),
        reason: formData.reason,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || null,
      };

      const url = editingOverride?.id
        ? `/api/tenant/finance/fee-structures/${feeStructureId}/class-overrides/${editingOverride.id}`
        : `/api/tenant/finance/fee-structures/${feeStructureId}/class-overrides`;

      const method = editingOverride?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save override');
      }

      setShowForm(false);
      fetchOverrides();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this override?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tenant/finance/fee-structures/${feeStructureId}/class-overrides/${id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete override');
      }

      setOverrides(overrides.filter(o => o.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete override');
    }
  };

  const handlePreview = async () => {
    try {
      const response = await fetch(
        `/api/tenant/finance/fee-structures/${feeStructureId}/class-overrides/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ overrides }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const result = await response.json();
      setPreviewData(result.data);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getImpactPercentage = (original: number, override: number) => {
    if (original === 0) return 0;
    return ((override - original) / original * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Class-Level Fee Overrides</h3>
          <p className="text-sm text-gray-600 mt-1">Override school-wide fees for specific classes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={overrides.length === 0}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Impact
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleAddOverride}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Override
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingOverride ? 'Edit Class Override' : 'Add Class Override'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="className">Class</Label>
                    <Select value={formData.className} onValueChange={(value) => setFormData(prev => ({ ...prev, className: value }))}>
                      <SelectTrigger id="className">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASSES.map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="feeCategory">Fee Category</Label>
                    <Select value={formData.feeCategory} onValueChange={(value) => setFormData(prev => ({ ...prev, feeCategory: value }))}>
                      <SelectTrigger id="feeCategory">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FEE_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="originalAmount">Original Amount (₦)</Label>
                    <Input
                      id="originalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.originalAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, originalAmount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="overrideAmount">Override Amount (₦)</Label>
                    <Input
                      id="overrideAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.overrideAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, overrideAmount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason">Reason for Override</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g., SS 3 has additional exam fees"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="effectiveFrom">Effective From</Label>
                    <Input
                      id="effectiveFrom"
                      type="date"
                      value={formData.effectiveFrom}
                      onChange={(e) => setFormData(prev => ({ ...prev, effectiveFrom: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="effectiveTo">Effective To (Optional)</Label>
                    <Input
                      id="effectiveTo"
                      type="date"
                      value={formData.effectiveTo}
                      onChange={(e) => setFormData(prev => ({ ...prev, effectiveTo: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Override'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overrides Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ) : overrides.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No overrides configured</p>
              <p className="text-sm text-gray-500 mt-1">Add class-level overrides to customize fees</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Fee Category</TableHead>
                    <TableHead className="text-right">Original Amount</TableHead>
                    <TableHead className="text-right">Override Amount</TableHead>
                    <TableHead className="text-right">Impact</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrides.map((override) => (
                    <TableRow key={override.id}>
                      <TableCell className="font-medium">{override.className}</TableCell>
                      <TableCell>{override.feeCategory}</TableCell>
                      <TableCell className="text-right">{formatCurrency(override.originalAmount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(override.overrideAmount)}</TableCell>
                      <TableCell className="text-right">
                        <span className={getImpactPercentage(override.originalAmount, override.overrideAmount) > '0' ? 'text-red-600' : 'text-green-600'}>
                          {getImpactPercentage(override.originalAmount, override.overrideAmount)}%
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(override.effectiveFrom)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{override.reason}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOverride(override)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => override.id && handleDelete(override.id)}
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

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Impact Preview</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Total Original Fees</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(previewData.totalOriginal || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Total After Overrides</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(previewData.totalAfterOverrides || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Impact by Class</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {previewData.byClass?.map((item: any) => (
                      <div key={item.class} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{item.class}</span>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {formatCurrency(item.original)} → {formatCurrency(item.override)}
                          </p>
                          <p className={`text-sm font-semibold ${item.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.difference > 0 ? '+' : ''}{formatCurrency(item.difference)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClassLevelOverride;
