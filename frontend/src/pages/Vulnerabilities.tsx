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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  CircularProgress,
  Alert,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
} from '@mui/material';
import {
  Visibility,
  Edit,
  Feedback,
  OpenInNew,
  Delete,
  Refresh,
  ExpandMore,
} from '@mui/icons-material';
import { vulnerabilityAPI } from '../services/api';
import { Vulnerability } from '../types';
import CommandBlock from '../components/CommandBlock';
import { useTranslation } from 'react-i18next';

// Function to format text with bold patterns
const formatTextWithBold = (text: string, lineIndex: number) => {
  if (!text.includes('**')) {
    return text;
  }

  const parts = [];
  let lastIndex = 0;
  let keyIndex = 0;
  
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        parts.push(
          <span key={`text-${lineIndex}-${keyIndex++}`}>{beforeText}</span>
        );
      }
    }
    
    // Add bold text
    parts.push(
      <strong key={`bold-${lineIndex}-${keyIndex++}`} style={{ color: '#1976d2', fontWeight: 'bold' }}>
        {match[1]}
      </strong>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push(
        <span key={`text-${lineIndex}-${keyIndex++}`}>{remainingText}</span>
      );
    }
  }
  
  return parts.length > 0 ? parts : text;
};

const Vulnerabilities: React.FC = () => {
  const [scanGroups, setScanGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [vulnToDelete, setVulnToDelete] = useState<Vulnerability | null>(null);
  const { t } = useTranslation();
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchVulnerabilities = async () => {
    try {
      setLoading(true);
      const data = await vulnerabilityAPI.getVulnerabilitiesByScans();
      setScanGroups(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('vulnerabilities.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVulnerabilities();
  }, [severityFilter, statusFilter]);

  const handleStatusUpdate = async (vulnId: number, newStatus: string) => {
    try {
      await vulnerabilityAPI.updateStatus(vulnId, newStatus);
      setScanGroups(groups =>
        groups.map(group => ({
          ...group,
          vulnerabilities: group.vulnerabilities.map((v: Vulnerability) =>
            v.id === vulnId ? { ...v, status: newStatus as any } : v
          )
        }))
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || t('vulnerabilities.errorUpdateStatus'));
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedVuln || !feedbackRating) return;

    try {
      await vulnerabilityAPI.addFeedback(selectedVuln.id, {
        rating: feedbackRating,
        comment: feedbackComment,
        feedback_type: 'recommendation',
      });
      setFeedbackDialog(false);
      setFeedbackRating(null);
      setFeedbackComment('');
      setSelectedVuln(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('vulnerabilities.feedback.errorSubmit'));
    }
  };

  const handleDeleteVulnerability = async () => {
    if (!vulnToDelete) return;

    try {
      await vulnerabilityAPI.deleteVulnerability(vulnToDelete.id);
      setScanGroups(groups =>
        groups.map(group => ({
          ...group,
          vulnerabilities: group.vulnerabilities.filter((v: Vulnerability) => v.id !== vulnToDelete.id)
        })).filter(group => group.vulnerabilities.length > 0)
      );
      setDeleteDialog(false);
      setVulnToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('vulnerabilities.delete.errorDelete'));
    }
  };

  const handleRefreshCVE = async (vulnId: number) => {
    try {
      const updatedVuln = await vulnerabilityAPI.refreshCVEData(vulnId);
      setScanGroups(groups =>
        groups.map(group => ({
          ...group,
          vulnerabilities: group.vulnerabilities.map((v: Vulnerability) =>
            v.id === vulnId ? updatedVuln : v
          )
        }))
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || t('vulnerabilities.errorRefreshCVE'));
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'error';
      case 'patched':
        return 'success';
      case 'ignored':
        return 'default';
      case 'false_positive':
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

  const filteredScanGroups = scanGroups.map(group => ({
    ...group,
    vulnerabilities: group.vulnerabilities.filter((vuln: Vulnerability) => {
      // Apply severity filter
      const severityMatch = !severityFilter || vuln.severity === severityFilter;
      
      // Apply status filter
      const statusMatch = !statusFilter || vuln.status === statusFilter;
      
      // Apply search filter
      const searchMatch = !searchFilter ||
        vuln.service_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        vuln.description?.toLowerCase().includes(searchFilter.toLowerCase());
      
      return severityMatch && statusMatch && searchMatch;
    })
  })).filter(group => group.vulnerabilities.length > 0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('vulnerabilities.title')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('vulnerabilities.filters.severity')}</InputLabel>
                <Select
                  value={severityFilter}
                  label={t('vulnerabilities.filters.severity')}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  <MenuItem value="Critical">{t('dashboard.severity.critical')}</MenuItem>
                  <MenuItem value="High">{t('dashboard.severity.high')}</MenuItem>
                  <MenuItem value="Medium">{t('dashboard.severity.medium')}</MenuItem>
                  <MenuItem value="Low">{t('dashboard.severity.low')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('vulnerabilities.filters.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('vulnerabilities.filters.status')}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  <MenuItem value="open">{t('vulnerabilities.status.open')}</MenuItem>
                  <MenuItem value="patched">{t('vulnerabilities.status.patched')}</MenuItem>
                  <MenuItem value="ignored">{t('vulnerabilities.status.ignored')}</MenuItem>
                  <MenuItem value="false_positive">{t('vulnerabilities.status.false_positive')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={6}>
              <TextField
                fullWidth
                label={t('common.search')}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={t('vulnerabilities.filters.searchPlaceholder')}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Vulnerabilities Table */}
      {filteredScanGroups.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                {t('vulnerabilities.noVulns')}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {t('vulnerabilities.uploadToView')}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        filteredScanGroups.map((scanGroup, groupIndex) => (
          <Accordion key={scanGroup.scan.id} defaultExpanded={true}>
            <AccordionSummary expandIcon={<ExpandMore />} id={`scan-panel-${groupIndex}`}>
              <Typography variant="subtitle1" sx={{ flexBasis: '33.33%', flexShrink: 0 }}>
                {scanGroup.scan.original_filename || scanGroup.scan.filename}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>
                {t('scanUpload.uploaded')}: {new Date(scanGroup.scan.upload_time).toLocaleString()}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  {t('common.vulnerabilities')}
                </Typography>
                <Chip
                  label={scanGroup.vulnerabilities.length}
                  color="primary"
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('vulnerabilities.table.service')}</TableCell>
                    <TableCell>{t('vulnerabilities.table.port')}</TableCell>
                    <TableCell>{t('vulnerabilities.table.severity')}</TableCell>
                    <TableCell>{t('vulnerabilities.table.cveId')}</TableCell>
                    <TableCell>{t('vulnerabilities.table.cvssScore')}</TableCell>
                    <TableCell>{t('vulnerabilities.table.status')}</TableCell>
                    <TableCell>{t('vulnerabilities.table.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scanGroup.vulnerabilities.map((vuln: Vulnerability) => (
                    <TableRow key={vuln.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {vuln.service_name}
                        </Typography>
                        {vuln.service_version && (
                          <Typography variant="caption" color="textSecondary">
                            v{vuln.service_version}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{vuln.port}</TableCell>
                      <TableCell>
                        <Chip
                          label={vuln.severity ? t(`dashboard.severity.${vuln.severity.toLowerCase()}`) : t('common.all')}
                          color={getSeverityColor(vuln.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {vuln.cve_id ? (
                          <Link
                            href={`https://nvd.nist.gov/vuln/detail/${vuln.cve_id}`}
                            target="_blank"
                            rel="noopener"
                          >
                            {vuln.cve_id}
                            <OpenInNew sx={{ ml: 0.5, fontSize: 14 }} />
                          </Link>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {vuln.cvss_score ? vuln.cvss_score.toFixed(1) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={vuln.status}
                            onChange={(e) => handleStatusUpdate(vuln.id, e.target.value)}
                          >
                            <MenuItem value="open">{t('vulnerabilities.status.open')}</MenuItem>
                            <MenuItem value="patched">{t('vulnerabilities.status.patched')}</MenuItem>
                            <MenuItem value="ignored">{t('vulnerabilities.status.ignored')}</MenuItem>
                            <MenuItem value="false_positive">{t('vulnerabilities.status.false_positive')}</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => setSelectedVuln(vuln)}
                          color="primary"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          onClick={() => {
                            setSelectedVuln(vuln);
                            setFeedbackDialog(true);
                          }}
                          color="secondary"
                        >
                          <Feedback />
                        </IconButton>
                        <IconButton
                          onClick={() => handleRefreshCVE(vuln.id)}
                          color="info"
                          title={t('vulnerabilities.refreshCVETitle')}
                        >
                          <Refresh />
                        </IconButton>
                        <IconButton
                          onClick={() => {
                            setVulnToDelete(vuln);
                            setDeleteDialog(true);
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

            {scanGroup.vulnerabilities.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="textSecondary">
                  No vulnerabilities found
                </Typography>
              </Box>
            )}

          </AccordionDetails>
        </Accordion>
        ))
      )}

      {/* Vulnerability Details Dialog */}
      <Dialog
        open={!!selectedVuln && !feedbackDialog}
        onClose={() => setSelectedVuln(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('vulnerabilities.details.title')}</DialogTitle>
        <DialogContent>
          {selectedVuln && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedVuln.service_name} {selectedVuln.service_version}
              </Typography>
              
              {selectedVuln.scan && (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  <strong>{t('vulnerabilities.details.sourceFile')}:</strong> {selectedVuln.scan.original_filename || selectedVuln.scan.filename}
                </Typography>
              )}
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>{t('vulnerabilities.table.port')}:</strong> {selectedVuln.port}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>{t('vulnerabilities.details.protocol')}:</strong> {selectedVuln.protocol}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>{t('vulnerabilities.table.severity')}:</strong> 
                    <Chip
                      label={selectedVuln.severity ? t(`dashboard.severity.${selectedVuln.severity.toLowerCase()}`) : 'Unknown'}
                      color={getSeverityColor(selectedVuln.severity) as any}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>{t('vulnerabilities.table.cvssScore')}:</strong> {selectedVuln.cvss_score ? selectedVuln.cvss_score.toFixed(1) : 'N/A'}
                  </Typography>
                </Grid>
                {selectedVuln.cve_id && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>{t('vulnerabilities.table.cveId')}:</strong> 
                      <Link
                        href={`https://nvd.nist.gov/vuln/detail/${selectedVuln.cve_id}`}
                        target="_blank"
                        rel="noopener"
                        sx={{ ml: 1 }}
                      >
                        {selectedVuln.cve_id}
                        <OpenInNew sx={{ ml: 0.5, fontSize: 14 }} />
                      </Link>
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>{t('vulnerabilities.table.status')}:</strong> 
                    <Chip
                      label={t(`vulnerabilities.status.${selectedVuln.status}`)}
                      color={getStatusColor(selectedVuln.status) as any}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
              </Grid>

              {selectedVuln.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('vulnerabilities.details.description')}
                  </Typography>
                  <Typography variant="body2">
                    {formatTextWithBold(selectedVuln.description, 0)}
                  </Typography>
                </Box>
              )}

              {selectedVuln.recommendation && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('vulnerabilities.details.recommendations')}
                  </Typography>
                  <Box sx={{ pl: 1 }}>
                    {selectedVuln.recommendation.split(/\n/).filter(line => line.trim()).map((line, index) => {
                      const cleanLine = line.trim();
                      if (!cleanLine) return null;
                      
                      // Check if it's a heading (starts with ## or **)
                      if (cleanLine.startsWith('##') || cleanLine.match(/^\*\*.*\*\*$/)) {
                        const title = cleanLine.replace(/[#*]/g, '').trim();
                        return (
                          <Typography key={index} variant="subtitle2" fontWeight="bold" color="primary" sx={{ mt: 2, mb: 1 }}>
                            {title}
                          </Typography>
                        );
                      }
                      
                      // Check if it's a main point (starts with * or -)
                      if (cleanLine.match(/^[\*\-]\s/)) {
                        const content = cleanLine.replace(/^[\*\-]\s/, '');
                        return (
                          <Typography key={index} variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'flex-start' }}>
                            <span style={{ marginRight: '8px', color: '#1976d2', fontWeight: 'bold' }}>•</span>
                            <span>{formatTextWithBold(content, index)}</span>
                          </Typography>
                        );
                      }
                      
                      // Check if it's a numbered list item
                      if (cleanLine.match(/^\d+\./)) {
                        return (
                          <Typography key={index} variant="body2" sx={{ mb: 1, ml: 1 }}>
                            {formatTextWithBold(cleanLine, index)}
                          </Typography>
                        );
                      }
                      
                      // Regular text
                      return (
                        <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                          {formatTextWithBold(cleanLine, index)}
                        </Typography>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {selectedVuln.remediation_commands && selectedVuln.remediation_commands.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('vulnerabilities.details.terminalCommands')}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {t('vulnerabilities.details.terminalNote')}
                  </Typography>
                  {selectedVuln.remediation_commands.map((command, index) => (
                    <CommandBlock key={index} command={command} index={index} />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedVuln(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog
        open={feedbackDialog}
        onClose={() => setFeedbackDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('vulnerabilities.feedback.title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              {t('vulnerabilities.feedback.question')}
            </Typography>
            <Rating
              value={feedbackRating}
              onChange={(_, newValue) => setFeedbackRating(newValue)}
              size="large"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('vulnerabilities.feedback.additionalComments')}
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder={t('vulnerabilities.feedback.placeholder')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={handleFeedbackSubmit}
            variant="contained"
            disabled={!feedbackRating}
          >
            {t('common.submit')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('vulnerabilities.delete.title')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('vulnerabilities.delete.question')}
          </Typography>
          {vulnToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                {vulnToDelete.service_name} {vulnToDelete.service_version}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Port: {vulnToDelete.port} • Severity: {vulnToDelete.severity}
              </Typography>
              {vulnToDelete.cve_id && (
                <Typography variant="body2" color="textSecondary">
                  CVE: {vulnToDelete.cve_id}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={handleDeleteVulnerability}
            variant="contained"
            color="error"
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Vulnerabilities;