import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Edit2, Trash2, Calendar, DollarSign, FileText } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import ExemptionForm from './ExemptionForm';

interface Exemption {
  id: string;
  studentId: string;
  feeAssignmentId: string;
  exemptionType: string;
  amount?: number;
  percentage?: number;
  reason: string;
  approvedBy: string;
  approvalDate: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface ExemptionManagementProps {
  studentId: string;
  feeAssignmentId: string;
  maxAmount: number;
  onExemptionApplied?: () => void;
}

export function ExemptionManagement({
  studentId,
  feeAssignmentId,
  maxAmount,
  onExemptionApplied,
}: ExemptionManagementProps) {
  const [exemptions, setExemptions] = useState<Exemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchExemptions();
  }, [studentId, feeAssignmentId]);

  const fetchExemptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/tenant/finance/fee-assignments/${feeAssignmentId}/exemptions`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch exemptions');
      }
      const data = await response.json();
      setExemptions(data.exemptions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExemption = async (exemptionId: string) => {
    if (!confirm('Are you sure you want to delete this exemption?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tenant/finance/fee-assignments/${feeAssignmentId}/exemptions/${exemptionId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        throw new Error('Failed to delete exemption');
      }
      setExemptions(exemptions.filter((e) => e.id !== exemptionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete exemption');
    }
  };

  const handleApproveExemption = async (exemptionId: string) => {
    try {
      const response = await fetch(
        `/api/tenant/finance/fee-assignments/${feeAssignmentId}/exemptions/${exemptionId}/approve`,
        { method: 'POST' }
      );
      if (!response.ok) {
        throw new Error('Failed to approve exemption');
      }
      await fetchExemptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve exemption');
    }
  };

  const handleRejectExemption = async (exemptionId: string) => {
    try {
      const response = await fetch(
        `/api/tenant/finance/fee-assignments/${feeAssignmentId}/exemptions/${exemptionId}/reject`,
        { method: 'POST' }
      );
      if (!response.ok) {
        throw new Error('Failed to reject exemption');
      }
      await fetchExemptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject exemption');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExemptions = exemptions.filter(
    (e) => filterStatus === 'all' || e.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Exemptions</h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Add Exemption'}
        </Button>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium mb-4">Create New Exemption</h4>
          <ExemptionForm
            studentId={studentId}
            feeAssignmentId={feeAssignmentId}
            maxAmount={maxAmount}
            onSuccess={() => {
              setShowForm(false);
              fetchExemptions();
              if (onExemptionApplied) {
                onExemptionApplied();
              }
            }}
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filterStatus === status
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'all' && ` (${exemptions.length})`}
            {status !== 'all' && ` (${exemptions.filter((e) => e.status === status).length})`}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredExemptions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No exemptions found</p>
        </div>
      )}

      {/* Exemptions List */}
      {!loading && filteredExemptions.length > 0 && (
        <div className="space-y-3">
          {filteredExemptions.map((exemption) => (
            <div
              key={exemption.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium capitalize">
                      {exemption.exemptionType.replace(/_/g, ' ')}
                    </h4>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(
                        exemption.status
                      )}`}
                    >
                      {exemption.status.charAt(0).toUpperCase() + exemption.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{exemption.reason}</p>
                </div>
                <div className="flex gap-2">
                  {exemption.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApproveExemption(exemption.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRejectExemption(exemption.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteExemption(exemption.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Exemption Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span>
                    {exemption.amount
                      ? formatCurrency(exemption.amount)
                      : `${exemption.percentage}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDate(exemption.effectiveFrom)}
                    {exemption.effectiveTo && ` - ${formatDate(exemption.effectiveTo)}`}
                  </span>
                </div>
              </div>

              {/* Approval Info */}
              {exemption.status !== 'pending' && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                  <p>
                    {exemption.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                    {exemption.approvedBy} on {formatDate(exemption.approvalDate)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* History Section */}
      {!loading && exemptions.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-3">Exemption History</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p>Total exemptions: {exemptions.length}</p>
            <p>
              Total exempted amount: {formatCurrency(
                exemptions.reduce((sum, e) => sum + (e.amount || 0), 0)
              )}
            </p>
            <p>
              Active exemptions: {exemptions.filter((e) => e.status === 'approved').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExemptionManagement;
