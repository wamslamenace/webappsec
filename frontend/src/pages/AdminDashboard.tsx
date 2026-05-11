import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Refresh,
  Delete,
  Download,
  TrendingUp,
  TrendingDown,
  SmartToy,
  Feedback,
  Analytics,
  Settings,
  Visibility,
  FilterList,
  Clear,
} from '@mui/icons-material';
import { adminAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

interface FeedbackOverview {
  overview: {
    period_days: number;
    total_feedback: number;
    active_users: number;
    average_rating: number;
    learning_status: string;
    cached_improvements: number;
  };
  analytics: any;
  insights: any;
  trends: any;
  learning_status: any;
  recent_feedback: FeedbackItem[];
}

interface FeedbackItem {
  id: number;
  user_id: number;
  rating: number;
  comment: string;
  feedback_type: string;
  analysis_type: string;
  is_helpful: boolean;
  created_at: string;
  vulnerability_id?: number;
  conversation_id?: string;
}

interface DetailedFeedbackItem extends FeedbackItem {
  user?: {
    id: number;
    email: string;
    full_name: string;
  };
}

interface DetailedFeedback {
  feedback: DetailedFeedbackItem[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [overview, setOverview] = useState<FeedbackOverview | null>(null);
  const [detailedFeedback, setDetailedFeedback] = useState<DetailedFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters for detailed feedback
  const [filters, setFilters] = useState({
    page: 1,
    page_size: 20,
    feedback_type: '',
    analysis_type: '',
    min_rating: '',
    max_rating: '',
    days: 30
  });
  
  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; feedbackId: number | null }>({
    open: false,
    feedbackId: null
  });
  const [learningDialog, setLearningDialog] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 1) {
      loadDetailedFeedback();
    }
  }, [activeTab, filters]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getFeedbackOverview(filters.days);
      setOverview(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.errorLoadOverview'));
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedFeedback = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getDetailedFeedback(filters);
      setDetailedFeedback(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.errorLoadDetailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshLearning = async () => {
    try {
      setRefreshing(true);
      await adminAPI.refreshLearning();
      await loadOverview();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.learning.errorRefresh'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleApplyAllLearning = async () => {
    try {
      setRefreshing(true);
      await adminAPI.applyLearningAllTypes();
      
      
      if (overview) {
        setOverview({
          ...overview,
          overview: {
            ...overview.overview,
            cached_improvements: overview.overview.cached_improvements + 1 // +1 per apply learning action
          }
        });
      }
      
      setLearningDialog(false);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.learning.errorApply'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!deleteDialog.feedbackId) return;
    
    try {
      await adminAPI.deleteFeedback(deleteDialog.feedbackId);
      setDeleteDialog({ open: false, feedbackId: null });
      if (activeTab === 0) {
        await loadOverview();
      } else {
        await loadDetailedFeedback();
      }
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.delete.error'));
    }
  };

  const loadSystemStatus = async () => {
    try {
      const data = await adminAPI.getSystemStatus();
      setSystemStatus(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.errorLoadStatus'));
    }
  };

  const handleExportData = async () => {
    try {
      const data = await adminAPI.exportFeedbackData(filters.days);
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(data.export_data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `feedback_export_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.errorExport'));
    }
  };

  const getSeverityColor = (rating: number) => {
    if (rating >= 4) return 'success';
    if (rating >= 3) return 'info';
    if (rating >= 2) return 'warning';
    return 'error';
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 2) {
      loadSystemStatus();
    }
  };

  if (loading && !overview) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          {t('admin.title')}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportData}
          >
            {t('common.export')}
          </Button>
          <Button
            variant="contained"
            startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
            onClick={handleRefreshLearning}
            disabled={refreshing}
          >
            {t('admin.refreshLearning')}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label={t('admin.tabs.overview')} />
        <Tab label={t('admin.tabs.detailed')} />
        <Tab label={t('admin.tabs.system')} />
      </Tabs>

      {/* Overview Tab */}
      {activeTab === 0 && overview && (
        <Box>
          {/* Key Metrics */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        {t('admin.metrics.totalFeedback')}
                      </Typography>
                      <Typography variant="h4">
                        {overview.overview.total_feedback}
                      </Typography>
                    </Box>
                    <Feedback color="primary" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        {t('admin.metrics.activeUsers')}
                      </Typography>
                      <Typography variant="h4">
                        {overview.overview.active_users}
                      </Typography>
                    </Box>
                    <TrendingUp color="success" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        {t('admin.metrics.averageRating')}
                      </Typography>
                      <Typography variant="h4">
                        {overview.overview.average_rating}/5
                      </Typography>
                    </Box>
                    <Analytics color={overview.overview.average_rating >= 3 ? 'success' : 'warning'} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        {t('admin.metrics.learningStatus')}
                      </Typography>
                      <Chip
                        label={overview.overview.learning_status}
                        color={overview.overview.learning_status === 'active' ? 'success' : 'warning'}
                        size="small"
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {t('admin.learning.improvementsLoaded', { count: overview.overview.cached_improvements })}
                      </Typography>
                    </Box>
                    <SmartToy color="primary" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Learning System Status */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">{t('admin.learning.title')}</Typography>
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={() => setLearningDialog(true)}
                >
                  {t('admin.learning.manage')}
                </Button>
              </Box>
              
              <Grid container spacing={3}>
                {Object.entries(overview.learning_status.available_analysis_types || {}).map(([type, data]: [string, any]) => (
                  <Grid item xs={12} sm={6} md={4} key={type}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {type.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min((data?.improvement_count || 0) * 10, 100)}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption">
                        {t('admin.learning.improvementsLoaded', { count: data?.improvement_count || 0 })}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Recent Feedback */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('admin.recentFeedback')}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('admin.table.user')}</TableCell>
                      <TableCell>{t('admin.table.rating')}</TableCell>
                      <TableCell>{t('admin.table.type')}</TableCell>
                      <TableCell>{t('admin.table.comment')}</TableCell>
                      <TableCell>{t('admin.table.date')}</TableCell>
                      <TableCell>{t('admin.table.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {overview.recent_feedback.slice(0, 10).map((feedback) => (
                      <TableRow key={feedback.id}>
                        <TableCell>{t('admin.table.user')} {feedback.user_id}</TableCell>
                        <TableCell>
                          <Chip
                            label={feedback.rating}
                            color={getSeverityColor(feedback.rating) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {feedback.feedback_type}
                            </Typography>
                            {feedback.analysis_type && (
                              <Typography variant="caption" color="textSecondary">
                                {feedback.analysis_type}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200 }}>
                            {feedback.comment ? `${feedback.comment.substring(0, 100)}...` : t('admin.table.comment')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Tooltip title={t('common.delete')}>
                            <IconButton
                              size="small"
                              onClick={() => setDeleteDialog({ open: true, feedbackId: feedback.id })}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Detailed Feedback Tab */}
      {activeTab === 1 && (
        <Box>
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">{t('admin.filters.title')}</Typography>
                <Button
                  startIcon={<Clear />}
                  onClick={() => setFilters({
                    page: 1,
                    page_size: 20,
                    feedback_type: '',
                    analysis_type: '',
                    min_rating: '',
                    max_rating: '',
                    days: 30
                  })}
                >
                  {t('admin.filters.clear')}
                </Button>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('admin.filters.feedbackType')}</InputLabel>
                    <Select
                      value={filters.feedback_type}
                      label={t('admin.filters.feedbackType')}
                      onChange={(e) => setFilters(prev => ({ ...prev, feedback_type: e.target.value, page: 1 }))}
                    >
                      <MenuItem value="">{t('admin.filters.all')}</MenuItem>
                      <MenuItem value="vulnerability">Vulnerability</MenuItem>
                      <MenuItem value="analysis">Analysis</MenuItem>
                      <MenuItem value="query">Query</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('admin.filters.analysisType')}</InputLabel>
                    <Select
                      value={filters.analysis_type}
                      label={t('admin.filters.analysisType')}
                      onChange={(e) => setFilters(prev => ({ ...prev, analysis_type: e.target.value, page: 1 }))}
                    >
                      <MenuItem value="">{t('admin.filters.all')}</MenuItem>
                      <MenuItem value="vulnerability_assessment">Vulnerability Assessment</MenuItem>
                      <MenuItem value="business_impact">Business Impact</MenuItem>
                      <MenuItem value="patch_recommendation">Patch Recommendation</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('admin.filters.minRating')}</InputLabel>
                    <Select
                      value={filters.min_rating}
                      label={t('admin.filters.minRating')}
                      onChange={(e) => setFilters(prev => ({ ...prev, min_rating: e.target.value, page: 1 }))}
                    >
                      <MenuItem value="">{t('admin.filters.any')}</MenuItem>
                      <MenuItem value="1">1+</MenuItem>
                      <MenuItem value="2">2+</MenuItem>
                      <MenuItem value="3">3+</MenuItem>
                      <MenuItem value="4">4+</MenuItem>
                      <MenuItem value="5">5</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('admin.filters.maxRating')}</InputLabel>
                    <Select
                      value={filters.max_rating}
                      label={t('admin.filters.maxRating')}
                      onChange={(e) => setFilters(prev => ({ ...prev, max_rating: e.target.value, page: 1 }))}
                    >
                      <MenuItem value="">{t('admin.filters.any')}</MenuItem>
                      <MenuItem value="1">1</MenuItem>
                      <MenuItem value="2">1-2</MenuItem>
                      <MenuItem value="3">1-3</MenuItem>
                      <MenuItem value="4">1-4</MenuItem>
                      <MenuItem value="5">1-5</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('admin.filters.timePeriod')}</InputLabel>
                    <Select
                      value={filters.days}
                      label={t('admin.filters.timePeriod')}
                      onChange={(e) => setFilters(prev => ({ ...prev, days: Number(e.target.value), page: 1 }))}
                    >
                      <MenuItem value={7}>{t('admin.filters.last7Days')}</MenuItem>
                      <MenuItem value={30}>{t('admin.filters.last30Days')}</MenuItem>
                      <MenuItem value={90}>{t('admin.filters.last90Days')}</MenuItem>
                      <MenuItem value={365}>{t('admin.filters.lastYear')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Detailed Feedback Table */}
          {detailedFeedback && (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    {t('admin.tabs.detailed')} ({detailedFeedback.pagination.total_items} total)
                  </Typography>
                </Box>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('admin.table.id')}</TableCell>
                        <TableCell>{t('admin.table.user')}</TableCell>
                        <TableCell>{t('admin.table.rating')}</TableCell>
                        <TableCell>{t('admin.table.type')}</TableCell>
                        <TableCell>{t('admin.table.comment')}</TableCell>
                        <TableCell>{t('admin.table.date')}</TableCell>
                        <TableCell>{t('admin.table.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailedFeedback.feedback.map((feedback) => (
                        <TableRow key={feedback.id}>
                          <TableCell>{feedback.id}</TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {feedback.user?.full_name || 'Unknown'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {feedback.user?.email || `User ${feedback.user_id}`}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={feedback.rating}
                              color={getSeverityColor(feedback.rating) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {feedback.feedback_type}
                              </Typography>
                              {feedback.analysis_type && (
                                <Typography variant="caption" color="textSecondary">
                                  {feedback.analysis_type}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2">
                              {feedback.comment || t('admin.table.comment')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {new Date(feedback.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Tooltip title={t('common.view')}>
                              <IconButton size="small">
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('common.delete')}>
                              <IconButton
                                size="small"
                                onClick={() => setDeleteDialog({ open: true, feedbackId: feedback.id })}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {detailedFeedback.pagination.total_pages > 1 && (
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Pagination
                      count={detailedFeedback.pagination.total_pages}
                      page={detailedFeedback.pagination.page}
                      onChange={(_, page) => setFilters(prev => ({ ...prev, page }))}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* System Status Tab */}
      {activeTab === 2 && systemStatus && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('admin.system.overview')}
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>{t('admin.system.totalUsers')}:</Typography>
                      <Typography fontWeight="bold">{systemStatus.system_overview.total_users}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>{t('admin.system.totalFeedback')}:</Typography>
                      <Typography fontWeight="bold">{systemStatus.system_overview.total_feedback}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>{t('admin.system.totalScans')}:</Typography>
                      <Typography fontWeight="bold">{systemStatus.system_overview.total_scans}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>{t('admin.system.totalVulnerabilities')}:</Typography>
                      <Typography fontWeight="bold">{systemStatus.system_overview.total_vulnerabilities}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('admin.system.health')}
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    {Object.entries(systemStatus.health_indicators).map(([key, value]: [string, any]) => (
                      <Box key={key} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography>{key.replace('_', ' ').toUpperCase()}:</Typography>
                        <Chip
                          label={value}
                          color={
                            value === 'healthy' || value === 'active' ? 'success' :
                            value === 'low_activity' ? 'warning' : 'error'
                          }
                          size="small"
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, feedbackId: null })}>
        <DialogTitle>{t('admin.delete.title')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('admin.delete.description')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, feedbackId: null })}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleDeleteFeedback} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Learning Management Dialog */}
      <Dialog open={learningDialog} onClose={() => setLearningDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('admin.learning.dialogTitle')}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {t('admin.learning.dialogDescription')}
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            {t('admin.learning.dialogAlert')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLearningDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleApplyAllLearning} 
            variant="contained"
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={20} /> : <SmartToy />}
          >
            {t('admin.learning.manage')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;