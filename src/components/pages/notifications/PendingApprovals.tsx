import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  CircularProgress,
  Alert,
  Checkbox,
  TablePagination,
  Card,
  CardContent,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HistoryIcon from '@mui/icons-material/History';

interface Approval {
  id: string;
  type: string;
  referenceId: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export const PendingApprovals: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchApprovals();
    fetchStats();
  }, [typeFilter, statusFilter]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);

      const response = await fetch(`/api/tenant/approvals?${params}`, {
        headers: {
          'x-tenant-id': localStorage.getItem('tenantId') || '',
          'x-user-id': localStorage.getItem('userId') || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch approvals');
      const result = await response.json();
      setApprovals(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tenant/approvals/statistics', {
        headers: {
          'x-tenant-id': localStorage.getItem('tenantId') || '',
          'x-user-id': localStorage.getItem('userId') || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch statistics');
      const result = await response.json();
      setStats(result.data);
    } catch (err) {
      console.error('Failed to fetch approval statistics:', err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/tenant/approvals/${id}/approve`, {
        method: 'POST',
        headers: {
          'x-tenant-id': localStorage.getItem('tenantId') || '',
          'x-user-id': localStorage.getItem('userId') || '',
        },
      });

      if (!response.ok) throw new Error('Failed to approve');
      await fetchApprovals();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!selectedApprovalId) return;

    try {
      const response = await fetch(`/api/tenant/approvals/${selectedApprovalId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': localStorage.getItem('tenantId') || '',
          'x-user-id': localStorage.getItem('userId') || '',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (!response.ok) throw new Error('Failed to reject');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedApprovalId(null);
      await fetchApprovals();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedApprovals.length === 0) return;

    try {
      const response = await fetch('/api/tenant/approvals/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': localStorage.getItem('tenantId') || '',
          'x-user-id': localStorage.getItem('userId') || '',
        },
        body: JSON.stringify({ ids: selectedApprovals }),
      });

      if (!response.ok) throw new Error('Failed to bulk approve');
      setSelectedApprovals([]);
      await fetchApprovals();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk approve');
    }
  };

  const handleBulkReject = async () => {
    if (selectedApprovals.length === 0) return;

    try {
      const response = await fetch('/api/tenant/approvals/bulk-reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': localStorage.getItem('tenantId') || '',
          'x-user-id': localStorage.getItem('userId') || '',
        },
        body: JSON.stringify({ ids: selectedApprovals, reason: rejectionReason }),
      });

      if (!response.ok) throw new Error('Failed to bulk reject');
      setBulkRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedApprovals([]);
      await fetchApprovals();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk reject');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApprovals(approvals.map(a => a.id));
    } else {
      setSelectedApprovals([]);
    }
  };

  const handleSelectApproval = (id: string) => {
    setSelectedApprovals(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedApprovals = approvals.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <h2>Pending Approvals</h2>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      </Box>

      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbc02d' }}>
                  {stats.pending}
                </Box>
                <Box sx={{ color: '#666', fontSize: '0.9rem' }}>Pending</Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>
                  {stats.approved}
                </Box>
                <Box sx={{ color: '#666', fontSize: '0.9rem' }}>Approved</Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ fontSize: '2rem', fontWeight: 'bold', color: '#f44336' }}>
                  {stats.rejected}
                </Box>
                <Box sx={{ color: '#666', fontSize: '0.9rem' }}>Rejected</Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>
                  {stats.total}
                </Box>
                <Box sx={{ color: '#666', fontSize: '0.9rem' }}>Total</Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={typeFilter}
            label="Filter by Type"
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="fee-waiver">Fee Waiver</MenuItem>
            <MenuItem value="leave-request">Leave Request</MenuItem>
            <MenuItem value="promotion">Promotion</MenuItem>
            <MenuItem value="transfer">Transfer</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>

        {selectedApprovals.length > 0 && (
          <>
            <Button
              variant="contained"
              color="success"
              onClick={handleBulkApprove}
            >
              Approve Selected ({selectedApprovals.length})
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => setBulkRejectDialogOpen(true)}
            >
              Reject Selected ({selectedApprovals.length})
            </Button>
          </>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedApprovals.length > 0 && selectedApprovals.length < approvals.length
                  }
                  checked={approvals.length > 0 && selectedApprovals.length === approvals.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedApprovals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No approvals found
                </TableCell>
              </TableRow>
            ) : (
              paginatedApprovals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedApprovals.includes(approval.id)}
                      onChange={() => handleSelectApproval(approval.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={approval.type} size="small" />
                  </TableCell>
                  <TableCell>{approval.description}</TableCell>
                  <TableCell>{approval.requestedBy}</TableCell>
                  <TableCell>{new Date(approval.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={approval.status}
                      color={approval.status === 'pending' ? 'warning' : approval.status === 'approved' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {approval.status === 'pending' && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleApprove(approval.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => {
                              setSelectedApprovalId(approval.id);
                              setRejectDialogOpen(true);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<HistoryIcon />}
                        onClick={() => {
                          setSelectedApprovalId(approval.id);
                          setHistoryDialogOpen(true);
                        }}
                      >
                        History
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={approvals.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Reject Approval</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReject} variant="contained" color="error">
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={bulkRejectDialogOpen} onClose={() => setBulkRejectDialogOpen(false)}>
        <DialogTitle>Reject Selected Approvals</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkReject} variant="contained" color="error">
            Reject All
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approval History</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {selectedApprovalId && (
              <Box sx={{ fontSize: '0.9rem', color: '#666' }}>
                <Box sx={{ mb: 1 }}>
                  <strong>Approval ID:</strong> {selectedApprovalId}
                </Box>
                <Box>
                  <strong>Status:</strong> {approvals.find(a => a.id === selectedApprovalId)?.status}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingApprovals;
