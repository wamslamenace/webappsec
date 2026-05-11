import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error,
  Schedule,
  ContentCopy,
  Info,
  ExpandMore,
  FlashOn,
  PlayArrow,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { scanAPI } from '../services/api';
import { Scan } from '../types';
import { useAuth } from '../hooks/useAuth';
import { TextField, Grid, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox } from '@mui/material';
import { useTranslation } from 'react-i18next';

const ScanUpload: React.FC = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [target, setTarget] = useState('');
  const [scanType, setScanType] = useState('quick');
  const [useNikto, setUseNikto] = useState(false);
  const [useZap, setUseZap] = useState(false);
  const [useSelenium, setUseSelenium] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [uploadedScans, setUploadedScans] = useState<Scan[]>([]);
  const [error, setError] = useState<string>('');
  const { t } = useTranslation();

  // WebSocket for progress updates
  React.useEffect(() => {
    if (!user || !scanning) return;

    const token = localStorage.getItem('access_token');
    const wsUrl = `${process.env.REACT_APP_API_URL?.replace('http', 'ws') || 'ws://localhost:8000'}/api/v1/ws/connect?token=${token}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        if (message.type === 'scan_progress' || message.type === 'scan_status') {
          const data = message.data;
          setScanProgress(data.progress);
          setScanStatus(data.message);
          
          if (data.status === 'completed' || data.status === 'failed' || data.progress >= 100) {
            setScanning(false);
          }
        } else if (message.type === 'scan_complete') {
          setScanProgress(100);
          setScanStatus(t('scanUpload.liveScan.success'));
          setScanning(false);
          // Optional: Refresh history or show result
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    return () => {
      ws.close();
    };
  }, [user, scanning]);

  const handleLiveScan = async () => {
    if (!target) {
      setError(t('scanUpload.liveScan.errorTarget'));
      return;
    }

    setScanning(true);
    setScanProgress(0);
    setScanStatus(t('scanUpload.liveScan.initializing'));
    setError('');

    try {
      const scan = await scanAPI.runLiveScan(target, scanType, useNikto, useZap, useSelenium);
      setUploadedScans(prev => [scan, ...prev]);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('scanUpload.errorScanStart'));
      setScanning(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    setError('');
    
    for (const file of acceptedFiles) {
      if (!file.name.endsWith('.xml')) {
        setError(t('scanUpload.errorXmlOnly'));
        continue;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        setError(t('scanUpload.errorSize'));
        continue;
      }

      setUploading(true);
      try {
        const scan = await scanAPI.upload(file);
        setUploadedScans(prev => [scan, ...prev]);
      } catch (err: any) {
        setError(err.response?.data?.detail || t('scanUpload.errorUpload'));
      } finally {
        setUploading(false);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
    },
    multiple: true,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'processing':
        return <Schedule color="warning" />;
      default:
        return <Schedule />;
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('scanUpload.title')}
      </Typography>

      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive
            ? t('scanUpload.dropzone.active')
            : t('scanUpload.dropzone.inactive')}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t('scanUpload.dropzone.supports')}
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          disabled={uploading || scanning}
        >
          {t('scanUpload.selectFiles')}
        </Button>
      </Paper>

      {/* Live Scan Section */}
      <Paper sx={{ p: 4, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FlashOn color="primary" />
          <Typography variant="h6">{t('scanUpload.liveScan.title')}</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" mb={3}>
          {t('scanUpload.liveScan.description')}
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('scanUpload.liveScan.targetLabel')}
              variant="outlined"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={scanning}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>{t('scanUpload.liveScan.scanType')}</InputLabel>
              <Select
                value={scanType}
                onChange={(e) => setScanType(e.target.value as string)}
                label={t('scanUpload.liveScan.scanType')}
                disabled={scanning}
              >
                <MenuItem value="quick">Quick Scan (Standard)</MenuItem>
                <MenuItem value="service">Service/Script Scan (Deep)</MenuItem>
                <MenuItem value="vuln">Vulnerability Scan (Complete)</MenuItem>
                <MenuItem value="full">Full Port Scan (Slow)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <FormControlLabel
                control={<Checkbox checked={useNikto} onChange={(e) => setUseNikto(e.target.checked)} disabled={scanning} />}
                label={
                  <Tooltip title="Run Nikto web server scanner for common vulnerabilities and misconfigurations.">
                    <span>Nikto Scan</span>
                  </Tooltip>
                }
              />
              <FormControlLabel
                control={<Checkbox checked={useZap} onChange={(e) => setUseZap(e.target.checked)} disabled={scanning} />}
                label={
                  <Tooltip title="Run OWASP ZAP active scanner (deep automated vulnerability scan).">
                    <span>OWASP ZAP</span>
                  </Tooltip>
                }
              />
              <FormControlLabel
                control={<Checkbox checked={useSelenium} onChange={(e) => setUseSelenium(e.target.checked)} disabled={scanning} />}
                label={
                  <Tooltip title="Use Selenium for dynamic JavaScript crawling to discover more endpoints.">
                    <span>Dynamic Crawl (Selenium)</span>
                  </Tooltip>
                }
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={3} sx={{ ml: 'auto' }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              startIcon={scanning ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
              onClick={handleLiveScan}
              disabled={scanning || !target}
              sx={{ height: '56px' }}
            >
              {scanning ? t('scanUpload.liveScan.scanning') : t('scanUpload.liveScan.startScan')}
            </Button>
          </Grid>
        </Grid>

        {scanning && (
          <Box sx={{ mt: 3 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" fontWeight="bold">
                {scanStatus || t('scanUpload.liveScan.performing')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {scanProgress}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={scanProgress} sx={{ height: 10, borderRadius: 5 }} />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'inline-block' }}>
              {t('scanUpload.liveScan.note')}
            </Typography>
          </Box>
        )}
      </Paper>

      {uploading && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            {t('scanUpload.uploading')}
          </Typography>
          <LinearProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {uploadedScans.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('scanUpload.recentUploads')}
          </Typography>
          <List>
            {uploadedScans.map((scan) => (
              <ListItem key={scan.id} divider>
                <ListItemIcon>
                  {getStatusIcon(scan.status)}
                </ListItemIcon>
                <ListItemText
                  primary={scan.filename}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {t('scanUpload.uploaded')}: {new Date(scan.upload_time).toLocaleString()}
                      </Typography>
                      {scan.file_size && (
                        <Typography variant="body2" color="textSecondary">
                          {t('scanUpload.size')}: {(scan.file_size / 1024).toFixed(1)} KB
                        </Typography>
                      )}
                      {scan.error_message && (
                        <Typography variant="body2" color="error">
                          {t('common.error')}: {scan.error_message}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Chip
                  label={scan.status}
                  color={getStatusColor(scan.status) as any}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="h6" gutterBottom>
            {t('scanUpload.instructions.title')}
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>{t('scanUpload.instructions.item1')}</li>
              <li>{t('scanUpload.instructions.item2')}</li>
              <li>{t('scanUpload.instructions.item3')}</li>
              <li>{t('scanUpload.instructions.item4')}</li>
            </ul>
          </Typography>
        </Alert>
      </Box>

      {/* Nmap Information Box */}
      <Box sx={{ mt: 3 }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={1}>
              <Info color="primary" />
              <Typography variant="h6">{t('scanUpload.whatIsNmap.title')}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
                {t('scanUpload.whatIsNmap.description')}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, mb: 1 }}>
                {t('scanUpload.whatIsNmap.generateCommands')}
              </Typography>
              
              {/* Ubuntu/Linux Commands */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  {t('scanUpload.whatIsNmap.ubuntu')}
                </Typography>
                <Box sx={{ 
                  bgcolor: '#f5f5f5', 
                  p: 2, 
                  borderRadius: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  fontFamily: 'monospace'
                }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    sudo nmap -sV -sC -oX scan_results.xml &lt;target_ip&gt;
                  </Typography>
                  <Tooltip title={t('scanUpload.whatIsNmap.copyCommand')}>
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard('sudo nmap -sV -sC -oX scan_results.xml <target_ip>')}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* macOS Commands */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  {t('scanUpload.whatIsNmap.macos')}
                </Typography>
                <Box sx={{ 
                  bgcolor: '#f5f5f5', 
                  p: 2, 
                  borderRadius: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  fontFamily: 'monospace'
                }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    brew install nmap && nmap -sV -sC -oX scan_results.xml &lt;target_ip&gt;
                  </Typography>
                  <Tooltip title={t('scanUpload.whatIsNmap.copyCommand')}>
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard('brew install nmap && nmap -sV -sC -oX scan_results.xml <target_ip>')}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Typography variant="caption" color="textSecondary">
                {t('scanUpload.whatIsNmap.note')}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};

export default ScanUpload;