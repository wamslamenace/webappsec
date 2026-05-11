import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const nextMode = mode === 'light' ? 'dark' : 'light';

  return (
    <Tooltip title={t('common.switchMode', { mode: t(`common.${nextMode}`) })}>
      <IconButton
        color="inherit"
        onClick={toggleTheme}
        sx={{ 
          ml: 1,
          transition: 'transform 0.3s ease-in-out',
          '&:hover': {
            transform: 'rotate(180deg)',
          }
        }}
      >
        {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;