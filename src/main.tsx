import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './App';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: 'rgba(255,80,0,1)', // SIXT Orange
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
    borderRadius: 12, // Rounded corners like SIXT website
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8, // Rounded corners
          padding: '12px 32px',
        },
        contained: {
          background: 'linear-gradient(135deg, rgba(255,80,0,1) 0%, rgba(255,80,0,0.8) 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, rgba(204,64,0,1) 0%, rgba(204,64,0,0.8) 100%)',
          },
          '&:disabled': {
            background: 'rgba(0,0,0,0.12)',
            color: 'rgba(0,0,0,0.26)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Rounded corners
          backgroundImage: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16, // More rounded for cards
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