import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Download,
  Visibility,
  Assessment,
  Delete,
} from '@mui/icons-material';
import { reportAPI, scanAPI } from '../services/api';
import { Report, Scan } from '../types';
import { useTranslation } from 'react-i18next';

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generateDialog, setGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { t } = useTranslation();
  
  // Form state
  const [selectedScanId, setSelectedScanId] = useState<number | ''>('');
  const reportType = 'detailed';
  const [reportFormat, setReportFormat] = useState<'html' | 'pdf'>('html');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [reportsData, scansData] = await Promise.all([
        reportAPI.getReports(),
        scanAPI.getHistory(),
      ]);
      setReports(reportsData);
      setScans(scansData.filter(scan => scan.status === 'completed'));
    } catch (err: any) {
      setError(err.response?.data?.detail || t('reports.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedScanId) return;

    try {
      setGenerating(true);
      const report = await reportAPI.generate({
        scan_id: selectedScanId as number,
        report_type: reportType,
        format: reportFormat,
      });
      setReports(prev => [report, ...prev]);
      setGenerateDialog(false);
      setSelectedScanId('');
      setSuccess(t('reports.dialog.success', { title: report.title }));
    } catch (err: any) {
      setError(err.response?.data?.detail || t('reports.errorGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: number) => {
    try {
      const report = reports.find(r => r.id === reportId);
      const blob = await reportAPI.downloadReport(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = report?.format || 'html';
      a.download = `${report?.title?.replace(/[^a-zA-Z0-9]/g, '_') || `report_${reportId}`}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('reports.errorDownload'));
    }
  };

  const handleViewReport = async (reportId: number) => {
    try {
      const report = await reportAPI.getReport(reportId);
      setSelectedReport(report);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('reports.errorView'));
    }
  };

  const handleDeleteClick = (report: Report) => {
    setReportToDelete(report);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;

    try {
      setDeleting(true);
      await reportAPI.deleteReport(reportToDelete.id);
      setReports(prev => prev.filter(r => r.id !== reportToDelete.id));
      setDeleteDialog(false);
      setReportToDelete(null);
      setSuccess(t('reports.delete.success', { title: reportToDelete.title }));
    } catch (err: any) {
      setError(err.response?.data?.detail || t('reports.errorDelete'));
    } finally {
      setDeleting(false);
    }
  };

  const getReportTypeColor = (type: string) => {
    return 'primary';  // Single report type uses primary color
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return '📄';
      case 'html':
        return '🌐';
      case 'json':
        return '📊';
      default:
        return '📋';
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
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {t('reports.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setGenerateDialog(true)}
          disabled={scans.length === 0}
        >
          {t('reports.generate')}
        </Button>
      </Box>


      {scans.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('reports.noScans')}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('reports.table.title')}</TableCell>
                  <TableCell>{t('reports.table.type')}</TableCell>
                  <TableCell>{t('reports.table.format')}</TableCell>
                  <TableCell>{t('reports.table.generated')}</TableCell>
                  <TableCell>{t('reports.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {report.title || `Report ${report.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.report_type}
                        color={getReportTypeColor(report.report_type) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{getFormatIcon(report.format)}</span>
                        <Chip
                          label={report.format.toUpperCase()}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(report.generated_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t('reports.previewTitle')}>
                        <IconButton
                          onClick={() => handleViewReport(report.id)}
                          color="primary"
                          size="small"
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('reports.downloadTitle')}>
                        <IconButton
                          onClick={() => handleDownloadReport(report.id)}
                          color="secondary"
                          size="small"
                        >
                          <Download />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('reports.deleteTitle')}>
                        <IconButton
                          onClick={() => handleDeleteClick(report)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {reports.length === 0 && (
            <Box textAlign="center" py={4}>
              <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {t('reports.noReports')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t('reports.generateFirst')}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Generate Report Dialog */}
      <Dialog
        open={generateDialog}
        onClose={() => setGenerateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Assessment color="primary" />
            {t('reports.dialog.title')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('reports.dialog.description')}
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>{t('reports.dialog.selectScan')}</InputLabel>
                <Select
                  value={selectedScanId}
                  label={t('reports.dialog.selectScan')}
                  onChange={(e) => setSelectedScanId(e.target.value as number)}
                >
                  {scans.map((scan) => (
                    <MenuItem key={scan.id} value={scan.id}>
                      <Box>
                        <Typography variant="body1">{scan.filename}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Uploaded: {new Date(scan.upload_time).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>{t('reports.dialog.format')}</InputLabel>
                <Select
                  value={reportFormat}
                  label={t('reports.dialog.format')}
                  onChange={(e) => setReportFormat(e.target.value as 'html' | 'pdf')}
                >
                  <MenuItem value="html">
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>🌐</span>
                      <Box>
                        <Typography variant="body2">HTML</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Web format
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                  <MenuItem value="pdf">
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>📄</span>
                      <Box>
                        <Typography variant="body2">PDF</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Professional print document
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          {selectedScanId && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {t('reports.dialog.detailedReport')}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialog(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={handleGenerateReport}
            variant="contained"
            disabled={!selectedScanId || generating}
            startIcon={generating ? <CircularProgress size={20} /> : <Assessment />}
          >
            {generating ? t('reports.dialog.generating') : t('reports.generate')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Report Content Dialog */}
      <Dialog
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">{selectedReport?.title}</Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip
                  label={selectedReport?.report_type}
                  color={getReportTypeColor(selectedReport?.report_type || '') as any}
                  size="small"
                />
                <Chip
                  label={`${getFormatIcon(selectedReport?.format || '')} ${selectedReport?.format?.toUpperCase()}`}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Generated: {selectedReport?.generated_at && new Date(selectedReport.generated_at).toLocaleString()}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ height: '100%', overflow: 'auto' }}>
          {selectedReport?.format === 'pdf' ? (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" gutterBottom>
                {t('reports.preview.pdfTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                {t('reports.preview.pdfDescription')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => selectedReport && handleDownloadReport(selectedReport.id)}
                size="large"
              >
                {t('reports.preview.downloadPdf')}
              </Button>
            </Box>
          ) : selectedReport?.content ? (
            <Box
              sx={{
                '& h1, & h2, & h3': { 
                  color: 'primary.main', 
                  mt: 3, 
                  mb: 2,
                  borderBottom: '2px solid',
                  borderColor: 'primary.light',
                  pb: 1
                },
                '& h1': { fontSize: '2rem' },
                '& h2': { fontSize: '1.5rem' },
                '& h3': { fontSize: '1.25rem' },
                '& p': { mb: 2, lineHeight: 1.6 },
                '& ul, & ol': { pl: 3, mb: 2 },
                '& li': { mb: 1 },
                '& strong': { color: 'text.primary' },
                '& code': { 
                  backgroundColor: 'grey.100',
                  padding: '2px 6px',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                },
                '& pre': {
                  backgroundColor: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.875rem'
                },
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
              dangerouslySetInnerHTML={{ __html: selectedReport.content }}
            />
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                {t('reports.preview.noContent')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedReport(null)}>{t('common.close')}</Button>
          <Button
            onClick={() => selectedReport && handleDownloadReport(selectedReport.id)}
            variant="contained"
            startIcon={<Download />}
          >
            {t('common.download')} {selectedReport?.format?.toUpperCase()}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Report Confirmation Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Delete color="error" />
            {t('reports.delete.title')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {t('reports.delete.question', { title: reportToDelete?.title })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('reports.delete.description')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <Delete />}
          >
            {deleting ? t('reports.delete.deleting') : t('reports.deleteTitle')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Reports;