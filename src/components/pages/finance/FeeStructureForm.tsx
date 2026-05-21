import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { FeeItemsTable } from './FeeItemsTable';
import { financeApiGet, financeApiPost, financeApiPut } from '../../../lib/financeApi';

interface FeeItem {
  id?: string;
  category: string;
  description: string;
  amount: number;
  applicableClasses: string[];
  isMandatory: boolean;
}

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

interface FeeStructureFormProps {
  structure?: FeeStructure | null;
  onClose: () => void;
}

const ACADEMIC_SESSIONS = ['2024/2025', '2025/2026', '2026/2027'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
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

export function FeeStructureForm({ structure, onClose }: FeeStructureFormProps) {
  const [formData, setFormData] = useState({
    name: structure?.name || '',
    academicSession: structure?.academicSession || ACADEMIC_SESSIONS[0],
    term: structure?.term || TERMS[0],
    effectiveFrom: structure?.effectiveFrom?.split('T')[0] || '',
    effectiveTo: structure?.effectiveTo?.split('T')[0] || '',
  });

  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (structure?.id) {
      fetchStructureDetails();
    }
  }, [structure?.id]);

  const fetchStructureDetails = async () => {
    if (!structure?.id) return;

    try {
      const response = await financeApiGet(`/api/tenant/finance/fee-structures/${structure.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch fee structure details');
      }
      const result = await response.json();
      const data = result.data;

      setFormData({
        name: data.name,
        academicSession: data.academicSession,
        term: data.term,
        effectiveFrom: data.effectiveFrom?.split('T')[0] || '',
        effectiveTo: data.effectiveTo?.split('T')[0] || '',
      });

      if (data.feeItems) {
        setFeeItems(data.feeItems.map((item: any) => ({
          id: item.id,
          category: item.category,
          description: item.description,
          amount: item.amount,
          applicableClasses: item.applicableClasses || [],
          isMandatory: item.isMandatory,
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fee structure');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.academicSession) errors.academicSession = 'Academic session is required';
    if (!formData.term) errors.term = 'Term is required';
    if (!formData.effectiveFrom) errors.effectiveFrom = 'Effective from date is required';

    if (formData.effectiveFrom && formData.effectiveTo) {
      if (new Date(formData.effectiveFrom) >= new Date(formData.effectiveTo)) {
        errors.effectiveTo = 'Effective to date must be after effective from date';
      }
    }

    if (feeItems.length === 0) {
      errors.feeItems = 'At least one fee item is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleAddFeeItem = () => {
    setFeeItems(prev => [...prev, {
      category: FEE_CATEGORIES[0],
      description: '',
      amount: 0,
      applicableClasses: [],
      isMandatory: true,
    }]);
  };

  const handleUpdateFeeItem = (index: number, item: FeeItem) => {
    setFeeItems(prev => {
      const updated = [...prev];
      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveFeeItem = (index: number) => {
    setFeeItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        academicSession: formData.academicSession,
        term: formData.term,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || null,
        feeItems: feeItems.map(item => ({
          category: item.category,
          description: item.description,
          amount: parseFloat(item.amount.toString()),
          applicableClasses: item.applicableClasses,
          isMandatory: item.isMandatory,
        })),
        createdBy: 'current-user', // TODO: Get from auth context
      };

      const url = structure?.id
        ? `/api/tenant/finance/fee-structures/${structure.id}`
        : '/api/tenant/finance/fee-structures';

      const method = structure?.id ? 'PUT' : 'POST';

      const response = method === 'PUT'
        ? await financeApiPut(url, payload)
        : await financeApiPost(url, payload);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save fee structure');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const totalFees = feeItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Fee Structure Name</Label>
            <Input
              id="name"
              placeholder="e.g., 2025/2026 Session - Term 1"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={validationErrors.name ? 'border-red-500' : ''}
            />
            {validationErrors.name && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="academicSession">Academic Session</Label>
              <Select value={formData.academicSession} onValueChange={(value) => handleInputChange('academicSession', value)}>
                <SelectTrigger className={validationErrors.academicSession ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_SESSIONS.map(session => (
                    <SelectItem key={session} value={session}>{session}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.academicSession && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.academicSession}</p>
              )}
            </div>

            <div>
              <Label htmlFor="term">Term</Label>
              <Select value={formData.term} onValueChange={(value) => handleInputChange('term', value)}>
                <SelectTrigger className={validationErrors.term ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map(term => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.term && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.term}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="effectiveFrom">Effective From</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => handleInputChange('effectiveFrom', e.target.value)}
                className={validationErrors.effectiveFrom ? 'border-red-500' : ''}
              />
              {validationErrors.effectiveFrom && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.effectiveFrom}</p>
              )}
            </div>

            <div>
              <Label htmlFor="effectiveTo">Effective To (Optional)</Label>
              <Input
                id="effectiveTo"
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => handleInputChange('effectiveTo', e.target.value)}
                className={validationErrors.effectiveTo ? 'border-red-500' : ''}
              />
              {validationErrors.effectiveTo && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.effectiveTo}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fee Items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddFeeItem}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Fee Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {validationErrors.feeItems && (
            <p className="text-sm text-red-600">{validationErrors.feeItems}</p>
          )}

          {feeItems.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-600">No fee items added yet</p>
              <p className="text-sm text-gray-500 mt-1">Click "Add Fee Item" to get started</p>
            </div>
          ) : (
            <FeeItemsTable
              items={feeItems}
              onUpdate={handleUpdateFeeItem}
              onRemove={handleRemoveFeeItem}
              categories={FEE_CATEGORIES}
              classes={CLASSES}
            />
          )}

          {/* Total Fees Summary */}
          {feeItems.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Total Fees:</span>
                <span className="text-lg font-bold text-gray-900">
                  ₦{totalFees.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Saving...' : structure?.id ? 'Update Fee Structure' : 'Create Fee Structure'}
        </Button>
      </div>
    </form>
  );
}

export default FeeStructureForm;
