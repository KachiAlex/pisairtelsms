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
  LinearProgress,
} from '@mui/material';
import { lmsApi } from '../../../api/tenant/integrations/lms';

interface LMSConfig {
  id: string;
  provider: 'moodle' | 'canvas';
  baseUrl: string;
  apiKey: string;
  syncStatus: 'synced' | 'pending'