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
  IconButton,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { biometricDevicesApi } from '../../../api/tenant/integrations/biometric-devices';

interface BiometricDevice {
  id: string;
  deviceName: string;
  deviceType: 'fingerprint' | 'face' | 'iris' | 'palm';
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSync?: Date;
  attendanceCount: number;
  errorCount: number;
}

export default function BiometricDevices() {
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    deviceName: '',
    deviceType: 'fingerprint' as 'fingerprint' | 'face' | 'iris' | 'palm',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: '',
    ipAddress: '',
  });

  const tenantId = 'tenant-1'; // Replace with actual tenant ID

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = () => {
    setLoading(true);
    try {
      const result = biometricDevicesApi.getDevices(tenantId, 50, 0);
      setDevices(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDevice = () => {
    try {
      setError(null);
      const userId = 'user-1'; // Replace with actual user ID
      const newDevice = biometricDevicesApi.registerDevice(tenantId, userId, formData);
      setDevices([newDevice, ...devices]);
      setSuccess('Device registered successfully');
      setOpenDialog(false);
      setFormData({
        deviceName: '',
        deviceType: 'fingerprint',
        manufacturer: '',
        model: '',
        serialNumber: '',
        location: '',
        ipAddress: '',
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register device');
    }
  };

  const handleStartSync = (deviceId: string) => {
    try {
      setError(null);
      biometricDevicesApi.startAttendanceSync(tenantId, deviceId);
      setSuccess('Sync started for device');
      loadDevices();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sync');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'maintenance':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Biometric Devices</Typography>
        <Button variant="contained" onClick={() => setOpenDialog(true)}>
          Register Device
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Devices Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Device Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sync Status</TableCell>
              <TableCell>Records</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.length > 0 ? (
              devices.map(device => (
                <React.Fragment key={device.id}>
                  <TableRow>
                    <TableCell>{device.deviceName}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{device.deviceType}</TableCell>
                    <TableCell>{device.location}</TableCell>
                    <TableCell>
                      <Chip label={device.status} color={getStatusColor(device.status) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={device.syncStatus} color={getSyncStatusColor(device.syncStatus) as any} size="small" />
                    </TableCell>
                    <TableCell>{device.attendanceCount}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => handleStartSync(device.id)}
                        disabled={device.status !== 'active'}
                      >
                        Sync
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0 }}>
                      <Collapse in={expandedDevice === device.id} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, backgroundColor: '#fafafa' }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Manufacturer
                              </Typography>
                              <Typography variant="body2">{device.manufacturer}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Model
                              </Typography>
                              <Typography variant="body2">{device.model}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Serial Number
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {device.serialNumber}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Last Sync
                              </Typography>
                              <Typography variant="body2">
                                {device.lastSync ? new Date(device.lastSync).toLocaleString() : 'Never'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Errors
                              </Typography>
                              <Typography variant="body2">{device.errorCount}</Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No devices registered yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Registration Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Register Biometric Device</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Device Name"
            value={formData.deviceName}
            onChange={e => setFormData({ ...formData, deviceName: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Device Type</InputLabel>
            <Select
              value={formData.deviceType}
              onChange={e => setFormData({ ...formData, deviceType: e.target.value as any })}
              label="Device Type"
            >
              <MenuItem value="fingerprint">Fingerprint</MenuItem>
              <MenuItem value="face">Face Recognition</MenuItem>
              <MenuItem value="iris">Iris Scanner</MenuItem>
              <MenuItem value="palm">Palm Scanner</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Manufacturer"
            value={formData.manufacturer}
            onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Model"
            value={formData.model}
            onChange={e => setFormData({ ...formData, model: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Serial Number"
            value={formData.serialNumber}
            onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Location"
            value={formData.location}
            onChange={e => setFormData({ ...formData, location: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="IP Address (Optional)"
            value={formData.ipAddress}
            onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleRegisterDevice} variant="contained">
            Register
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
