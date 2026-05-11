import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Visibility,
  Delete,
  Download,
  Refresh,
} from '@mui/icons-material';
import { scanAPI } from '../services/api';
import { Scan } from '../types';
import { useTranslation } from 'react-i18next';

const ScanHistory: React.FC = () => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scanToDelete, setScanToDelete] = useState<Scan | null>(null);
  const { t } = useTranslation();

  const fetchScans = async () => {
    try {
      setLoading(true);
      const data = await scanAPI.getHistory();
      setScans(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('scanHistory.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleViewScan = async (scan: Scan) => {
    try {
      const detailedScan = await scanAPI.getScan(scan.id);
      setSelectedScan(detailedScan);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('scanHistory.errorLoadDetails'));
    }
  };

  const handleDeleteScan = async () => {
    if (!scanToDelete) return;

    try {
      await scanAPI.deleteScan(scanToDelete.id);
      setScans(scans.filter(scan => scan.id !== scanToDelete.id));
      setDeleteDialogOpen(false);
      setScanToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('scanHistory.delete.error'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {t('scanHistory.title')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchScans}
        >
          {t('common.refresh')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('scanHistory.table.filename')}</TableCell>
                  <TableCell>{t('scanHistory.table.status')}</TableCell>
                  <TableCell>{t('scanHistory.table.uploadTime')}</TableCell>
                  <TableCell>{t('scanHistory.table.fileSize')}</TableCell>
                  <TableCell>{t('scanHistory.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scans.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell>{scan.filename}</TableCell>
                    <TableCell>
                      <Chip
                        label={t(`scanHistory.status.${scan.status}`)}
                        color={getStatusColor(scan.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(scan.upload_time).toLocaleString()}
                    </TableCell>
                    <TableCell>{formatFileSize(scan.file_size)}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleViewScan(scan)}
                        color="primary"
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setScanToDelete(scan);
                          setDeleteDialogOpen(true);
                        }}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {scans.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                {t('scanHistory.noScans')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t('scanHistory.uploadFirst')}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Scan Details Dialog */}
      <Dialog
        open={!!selectedScan}
        onClose={() => setSelectedScan(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('scanHistory.details.title')}</DialogTitle>
        <DialogContent>
          {selectedScan && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedScan.filename}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                {t('scanHistory.details.status')}: {t(`scanHistory.status.${selectedScan.status}`)}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                {t('scanHistory.details.uploaded')}: {new Date(selectedScan.upload_time).toLocaleString()}
              </Typography>
              {selectedScan.processed_at && (
                <Typography variant="body2" color="textSecondary" paragraph>
                  {t('scanHistory.details.processed')}: {new Date(selectedScan.processed_at).toLocaleString()}
                </Typography>
              )}
              {selectedScan.error_message && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {selectedScan.error_message}
                </Alert>
              )}
              {selectedScan.parsed_data && (
                <Box mt={2}>
                  <Typography variant="h6" gutterBottom>
                    {t('scanHistory.details.summary')}
                  </Typography>
                  <Typography variant="body2">
                    {t('scanHistory.details.totalHosts')}: {selectedScan.parsed_data.total_hosts || 0}
                  </Typography>
                  <Typography variant="body2">
                    {t('scanHistory.details.totalServices')}: {selectedScan.parsed_data.total_services || 0}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedScan(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{t('scanHistory.delete.title')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('scanHistory.delete.question', { filename: scanToDelete?.filename })}
            {t('scanHistory.delete.description')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDeleteScan} color="error">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScanHistory;