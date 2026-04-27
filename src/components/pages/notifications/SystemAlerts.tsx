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
  Chip,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TablePagination,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: {
    critical: number;
    error: number;
    warning: number;
    info: number;
  };
}

export const SystemAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [severityFilter, statusFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('status', statusFilter);
      if (severityFilter) params.append('severity', severityFilter);

      const response = await fetch(`/api/tenant/alerts?${params}`, {
        headers: {
          'x-tenant-id': localStorage.getItem('tenantId') || '',
          'x-user-id': localStorage.getItem('userId') || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch alerts');
      const result = await response.json();
      setAlerts(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tenant/alerts/statistics/summary', {
        headers: {
          'x-tenant-id': localStorage.getItem('tenantId') || '',
          'x-user-id': localStorage.getItem('userId') || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch statistics');
      const result = await response.json();
      setStats(result.data);
    } catch (err) {
      console.error('Failed to fetch alert statistics:', err);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      const response = await fetch(`/api/tenant/alerts/${id}/acknowledge`, {
        method: 'POST',
        headers: {
          'x-tenant-id': localStorage.getItem('tenantId') || '',
          'x-user-id': localStorage.getItem('userId') || '',
        },
      });

      if (!response.ok) throw new Error('Failed to acknowledge alert');
      await fetchAlerts();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const response = await fetch(`/api/tenant/alerts/${id}/resolve`, {
        method: 'POST',
        headers: {
          'x-tenant-id': localStorage.getItem('tenantId') || '',
          'x-user-id': localStorage.getItem('userId') || '',
        },
      });

      if (!response.ok) throw new Error('Failed to resolve alert');
      await fetchAlerts();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon sx={{ color: '#d32f2f' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f57c00' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: '#fbc02d' }} />;
      default:
        return <InfoIcon sx={{ color: '#1976d2' }} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'error':
        return 'warning';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedAlerts = alerts.slice(
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
        <h2>System Alerts</h2>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      </Box>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ fontSize: '2rem', fontWeight: 'bold', color: '#d32f2f' }}>
                    {stats.bySeverity.critical}
                  </Box>
                  <Box sx={{ color: '#666', fontSize: '0.9rem' }}>Critical</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57c00' }}>
                    {stats.bySeverity.error}
                  </Box>
                  <Box sx={{ color: '#666', fontSize: '0.9rem' }}>Errors</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbc02d' }}>
                    {stats.bySeverity.warning}
                  </Box>
                  <Box sx={{ color: '#666', fontSize: '0.9rem' }}>Warnings</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
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
          </Grid>
        </Grid>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Severity</InputLabel>
          <Select
            value={severityFilter}
            label="Severity"
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <MenuItem value="">All Severities</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="error">Error</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="info">Info</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="acknowledged">Acknowledged</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Severity</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedAlerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No alerts found
                </TableCell>
              </TableRow>
            ) : (
              paginatedAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>{getSeverityIcon(alert.severity)}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{alert.title}</TableCell>
                  <TableCell>{alert.message}</TableCell>
                  <TableCell>
                    {alert.category && <Chip label={alert.category} size="small" />}
                  </TableCell>
                  <TableCell>{new Date(alert.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={alert.status}
                      color={getSeverityColor(alert.severity) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {alert.status === 'active' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleAcknowledge(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {alert.status !== 'resolved' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleResolve(alert.id)}
                        >
                          Resolve
                        </Button>
                      )}
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
          count={alerts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
};

export default SystemAlerts;
