/**
 * @file theme.ts
 * @license GPL-3.0
 *
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * DISCLAIMER: This software is provided "as is" without any warranty.
 * Use at your own risk. The author assumes no responsibility for any
 * damages or losses arising from the use of this software.
 */

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
