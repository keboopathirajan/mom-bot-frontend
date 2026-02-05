import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './App';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#FF5500', // SIXT Orange
      light: '#FF7733',
      dark: '#CC4400',
    },
    secondary: {
      main: '#1A1A1A', // SIXT Black
      light: '#333333',
      dark: '#000000',
    },
    background: {
      default: '#FFFFFF',
      paper: '#F8F9FA',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Helvetica Neue", "Arial", sans-serif', // SIXT's font stack
    h4: {
      fontWeight: 700,
      color: '#1A1A1A',
    },
    h6: {
      fontWeight: 600,
      color: '#1A1A1A',
    },
  },
  shape: {
    borderRadius: 0, // Sharp corners for SIXT design
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'uppercase',
          fontWeight: 700,
          borderRadius: 0, // Sharp corners
          padding: '12px 32px',
        },
        contained: {
          backgroundColor: '#FF5500',
          '&:hover': {
            backgroundColor: '#CC4400',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp corners for SIXT design
          backgroundImage: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);