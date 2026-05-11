import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Security,
  Assessment,
  TrendingUp,
  CloudUpload,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardAPI } from '../services/api';
import { DashboardMetrics, TrendData } from '../types';
import { useTranslation } from 'react-i18next';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsData, trendsData] = await Promise.all([
          dashboardAPI.getMetrics(),
          dashboardAPI.getTrends(30),
        ]);
        setMetrics(metricsData);
        setTrends(trendsData);
      } catch (err: any) {
        setError(err.response?.data?.detail || t('dashboard.errorLoading'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const severityColors = {
    Critical: '#d32f2f',
    High: '#f57c00',
    Medium: '#fbc02d',
    Low: '#388e3c',
  };

  const pieData = metrics ? [
    { name: t('dashboard.severity.critical'), value: metrics.vulnerabilities.critical, color: severityColors.Critical },
    { name: t('dashboard.severity.high'), value: metrics.vulnerabilities.high, color: severityColors.High },
    { name: t('dashboard.severity.medium'), value: metrics.vulnerabilities.medium, color: severityColors.Medium },
    { name: t('dashboard.severity.low'), value: metrics.vulnerabilities.low, color: severityColors.Low },
  ].filter(item => item.value > 0) : [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('dashboard.title')}
      </Typography>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CloudUpload color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    {t('dashboard.totalScans')}
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.total_scans || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Security color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    {t('dashboard.totalVulnerabilities')}
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.vulnerabilities.total || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assessment color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    {t('dashboard.patchCompletion')}
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.patch_completion_rate.toFixed(1) || 0}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    {t('dashboard.avgCvssScore')}
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.avg_cvss_score || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.trends')}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends?.vulnerability_trends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => {
                    const d = new Date(date);
                    return d.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    });
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.severityDistribution')}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Critical Vulnerabilities Alert */}
      {metrics && metrics.vulnerabilities.critical > 0 && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <Typography variant="h6">
            ⚠️ {t('dashboard.criticalAlert', { count: metrics.vulnerabilities.critical })}
          </Typography>
          <Typography>
            {t('dashboard.immediateAction')}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Dashboard;