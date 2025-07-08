import { createTheme, alpha } from '@mui/material';

const primaryColor = '#1976d2';
const secondaryColor = '#0f2730';

export const theme = createTheme({
  typography: {
    fontFamily: 'Noka, sans-serif',
    allVariants: {
      color: '#fefefe',
    },
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 300,
    },
  },
  palette: {
    primary: {
      main: primaryColor,
      light: alpha(primaryColor, 0.5),
      dark: alpha(primaryColor, 0.9),
    },
    secondary: {
      main: secondaryColor,
      light: alpha(secondaryColor, 0.5),
      dark: alpha(secondaryColor, 0.9),
    },
    error: {
      main: '#d32f2f',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            backgroundColor: alpha('#ffffff', 0.12), // Adjust contrast for disabled background
            color: alpha('#ffffff', 0.5), // Adjust contrast for disabled text
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: 'cornsilk',
        },
      },
    },
  },
});
