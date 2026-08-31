import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Download, Filter, ChevronDown } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { financeApiGet } from '../../../lib/financeApi';

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId: string;
  timestamp: string;
  ipAddress?: string;
}

export function AuditLog() {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);

  useEffect(() => {
    fetchAuditLog();
  }, []);

  const fetchAuditLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (userFilter) params.append('user', userFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await financeApiGet(`/api/tenant/finance/audit-log?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit log');
      }
      const data = await response.json();
      setAuditEntries(data.data || []);

      // Extract unique entity types and actions
      const types = [...new Set((data.data || []).map((e: AuditEntry) => e.entityType))];
      const acts = [...new Set((data.data || []).map((e: AuditEntry) => e.action))];
      setEntityTypes(types as string[]);
      setActions(acts as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchAuditLog();
  };

  const handleExportAuditTrail = () => {
    const csv = [
      ['Entity Type', 'Entity ID', 'Action', 'User', 'Timestamp', 'Old Values', 'New Values'].join(','),
      ...auditEntries.map((entry) =>
        [
          entry.entityType,
          entry.entityId,
          entry.action,
          entry.userId,
          entry.timestamp,
          JSON.stringify(entry.oldValues || {}),
          JSON.stringify(entry.newValues || {}),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'reverse':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeBadgeColor = (entityType: string) => {
    switch (entityType) {
      case 'fee_structure':
        return 'bg-purple-100 text-purple-800';
      case 'payment':
        return 'bg-green-100 text-green-800';
      case 'adjustment':
        return 'bg-orange-100 text-orange-800';
      case 'exemption':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEntries = auditEntries.filter((entry) => {
    const matchesEntityType = !entityTypeFilter || entry.entityType === entityTypeFilter;
    const matchesAction = !actionFilter || entry.action === actionFilter;
    const matchesUser = !userFilter || entry.userId.toLowerCase().includes(userFilter.toLowerCase());
    return matchesEntityType && matchesAction && matchesUser;
  });

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Audit Entries</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{auditEntries.length}</p>
            </div>
            <Button
              onClick={handleExportAuditTrail}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Trail
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="entityType">Entity Type</Label>
              <select
                id="entityType"
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
              >
                <option value="">All Types</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="action">Action</Label>
              <select
                id="action"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
              >
                <option value="">All Actions</option>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="user">User</Label>
              <Input
                id="user"
                placeholder="Filter by user..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleApplyFilters}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit Trail ({filteredEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No audit entries found</p>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === entry.id ? null : entry.id)
                    }
                    className="w-full p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <Badge className={getEntityTypeBadgeColor(entry.entityType)}>
                        {entry.entityType.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={getActionBadgeColor(entry.action)}>
                        {entry.action}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {entry.entityId}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {entry.userId} • {formatDate(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        expandedId === entry.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expandedId === entry.id && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-4">
                      {entry.oldValues && Object.keys(entry.oldValues).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Old Values
                          </h4>
                          <div className="bg-white p-3 rounded border border-gray-200 text-xs font-mono text-gray-600 overflow-x-auto">
                            <pre>{JSON.stringify(entry.oldValues, null, 2)}</pre>
                          </div>
                        </div>
                      )}

                      {entry.newValues && Object.keys(entry.newValues).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            New Values
                          </h4>
                          <div className="bg-white p-3 rounded border border-gray-200 text-xs font-mono text-gray-600 overflow-x-auto">
                            <pre>{JSON.stringify(entry.newValues, null, 2)}</pre>
                          </div>
                        </div>
                      )}

                      {entry.ipAddress && (
                        <div className="text-xs text-gray-600">
                          <p>
                            <span className="font-medium">IP Address:</span> {entry.ipAddress}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Immutability Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Note:</span> This audit log is immutable. All entries are
            permanent and cannot be deleted. Only reversals are recorded for corrections.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuditLog;
