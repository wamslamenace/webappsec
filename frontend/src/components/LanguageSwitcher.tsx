import React from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { Translate } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    handleClose();
  };

  return (
    <>
      <Tooltip title={i18n.language === 'fr' ? 'Changer de langue' : 'Change Language'}>
        <IconButton color="inherit" onClick={handleOpen}>
          <Translate />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => changeLanguage('en')} selected={i18n.language === 'en'}>
          English
        </MenuItem>
        <MenuItem onClick={() => changeLanguage('fr')} selected={i18n.language === 'fr'}>
          Français
        </MenuItem>
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
