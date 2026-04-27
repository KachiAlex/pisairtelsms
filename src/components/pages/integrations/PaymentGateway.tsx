import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Typography,
} from '@mui/material';
import { paymentGatewayApi } from '../../../api/tenant/integrations/payment-gateway';

interface PaymentGatewayConfig {
  id: string;
  provider: 'stripe' | 'paystack';
  mode: 'test' | 'live';
  apiKey: string;
  secretKey: string;
  webhookUrl?: string;
  webhookSecret?: string;
  isActive: boolean;
}

interface Transaction {
  id: string;
  provider: 'stripe' | 'paystack';
  referenceId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  studentId?: string;
  description?: string;
  createdAt: Date;
}

export default function PaymentGateway() {
  const [config, setConfig] = useState<PaymentGatewayConfig | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    provider: 'stripe' as 'stripe' | 'paystack',
    mode: 'test' as 'test' | 'live',
    apiKey: '',
    secretKey: '',
    webhookUrl: '',
    webhookSecret: '',
  });

  const tenantId = 'tenant-1'; // Replace with actual tenant ID

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    try {
      const cfg = paymentGatewayApi.getConfig(tenantId);
      setConfig(cfg);
      if (cfg) {
        setFormData({
          provider: cfg.provider,
          mode: cfg.mode,
          apiKey: cfg.apiKey,
          secretKey: cfg.secretKey,
          webhookUrl: cfg.webhookUrl || '',
          webhookSecret: cfg.webhookSecret || '',
        });
      }

      const txns = paymentGatewayApi.getTransactions(tenantId, 10, 0);
      setTransactions(txns.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    try {
      setError(null);
      const userId = 'user-1'; // Replace with actual user ID
      const newConfig = paymentGatewayApi.upsertConfig(tenantId, userId, formData);
      setConfig(newConfig);
      setSuccess('Payment gateway configuration saved successfully');
      setOpenDialog(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Payment Gateway Integration
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Configuration Card */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Payment Gateway Configuration"
          action={
            <Button variant="contained" onClick={() => setOpenDialog(true)}>
              {config ? 'Edit' : 'Configure'}
            </Button>
          }
        />
        <CardContent>
          {config ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Provider
                </Typography>
                <Typography variant="body1">{config.provider.toUpperCase()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Mode
                </Typography>
                <Chip label={config.mode.toUpperCase()} color={config.mode === 'live' ? 'error' : 'default'} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  API Key
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {config.apiKey.substring(0, 10)}...
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip label={config.isActive ? 'Active' : 'Inactive'} color={config.isActive ? 'success' : 'default'} />
              </Grid>
            </Grid>
          ) : (
            <Typography color="textSecondary">No payment gateway configured yet</Typography>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader title="Transaction History" />
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>Reference ID</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map(txn => (
                    <TableRow key={txn.id}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {txn.referenceId.substring(0, 12)}...
                      </TableCell>
                      <TableCell>{txn.provider.toUpperCase()}</TableCell>
                      <TableCell align="right">
                        {txn.currency} {txn.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip label={txn.status} color={getStatusColor(txn.status) as any} size="small" />
                      </TableCell>
                      <TableCell>{new Date(txn.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      No transactions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Payment Gateway</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={formData.provider}
              onChange={e => setFormData({ ...formData, provider: e.target.value as 'stripe' | 'paystack' })}
              label="Provider"
            >
              <MenuItem value="stripe">Stripe</MenuItem>
              <MenuItem value="paystack">Paystack</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Mode</InputLabel>
            <Select
              value={formData.mode}
              onChange={e => setFormData({ ...formData, mode: e.target.value as 'test' | 'live' })}
              label="Mode"
            >
              <MenuItem value="test">Test</MenuItem>
              <MenuItem value="live">Live</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="API Key"
            value={formData.apiKey}
            onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
            sx={{ mb: 2 }}
            type="password"
          />

          <TextField
            fullWidth
            label="Secret Key"
            value={formData.secretKey}
            onChange={e => setFormData({ ...formData, secretKey: e.target.value })}
            sx={{ mb: 2 }}
            type="password"
          />

          <TextField
            fullWidth
            label="Webhook URL"
            value={formData.webhookUrl}
            onChange={e => setFormData({ ...formData, webhookUrl: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Webhook Secret"
            value={formData.webhookSecret}
            onChange={e => setFormData({ ...formData, webhookSecret: e.target.value })}
            type="password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveConfig} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
