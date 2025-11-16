import { useState, useEffect } from 'react';
import { Fab, Zoom } from '@mui/material';
import { KeyboardArrowUp } from '@mui/icons-material';

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Zoom in={show}>
      <Fab
        color="primary"
        size="small"
        onClick={scrollToTop}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 4px 12px rgba(0, 0, 0, 0.5)'
              : '0 4px 12px rgba(0, 0, 0, 0.2)',
          '&:hover': {
            transform: 'scale(1.1)',
          },
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <KeyboardArrowUp />
      </Fab>
    </Zoom>
  );
}
