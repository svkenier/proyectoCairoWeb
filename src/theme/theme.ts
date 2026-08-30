/**
 * Tema global de Material UI para petRescue.
 *
 * Principios de diseño (Sharp UI & Visual Consistency):
 * - Sharp UI: Bordes completamente rectos (borderRadius: 0) para una estética geométrica, sobria y profesional.
 * - Paleta cromática neutra: Escala de grises profundos con un solo color de acento.
 * - Tipografía estructurada con jerarquía estricta.
 */

import { createTheme, type PaletteOptions } from '@mui/material/styles';
import type {} from '@mui/material/themeCssVarsAugmentation';

// ─── Paleta de colores ────────────────────────────────────────────────────────

const palette: PaletteOptions = {
  mode: 'light',

  primary: {
    main:        '#102A43', // Azul Cairo Profundo
    light:       '#1E3A5F',
    dark:        '#0B1E36',
    contrastText: '#FFFFFF',
  },

  secondary: {
    main:        '#F59E0B', // Amarillo/Dorado Cairo
    light:       '#FBBF24',
    dark:        '#D97706',
    contrastText: '#0B1E36', // Texto oscuro para accesibilidad sobre dorado
  },

  error: {
    main:  '#DC2626',
    light: '#F87171',
    dark:  '#991B1B',
  },

  warning: {
    main:  '#F59E0B',
    light: '#FBBF24',
    dark:  '#B45309',
  },

  success: {
    main:  '#059669',
    light: '#34D399',
    dark:  '#064E3B',
  },

  info: {
    main:  '#2563EB',
    light: '#60A5FA',
    dark:  '#1E3A8A',
  },

  background: {
    default: '#FDFBF7', // Fondo general limpio
    paper:   '#FFFFFF', // Fondo de tarjetas
  },

  text: {
    primary:   '#102A43', // Azul Cairo Profundo o slate-900
    secondary: '#334155', // slate-700
    disabled:  '#64748B', // slate-500
  },

  divider: '#E2E8F0', // slate-200
};

// ─── Tipografía ───────────────────────────────────────────────────────────────

const fontFamily = [
  '"Inter"',
  '"Segoe UI"',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(', ');

// ─── Duración de transiciones ─────────────────────────────────────────────────

const TRANSITION_DURATION = {
  shortest: 150,
  shorter:  200,
  short:    250,
  standard: 300,
  complex:  375,
  entering: 225,
  leaving:  195,
} as const;

// ─── Creación del tema ────────────────────────────────────────────────────────

const theme = createTheme({
  palette,

  // ─── Tipografía ───────────────────────────────────────────────────────────
  typography: {
    fontFamily,
    fontSize: 14,

    h1: {
      fontWeight: 800,
      fontSize: 'clamp(2rem, 5vw, 3rem)',
      lineHeight: 1.2,
      letterSpacing: '-0.03em',
      color: '#102A43',
    },
    h2: {
      fontWeight: 800,
      fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
      lineHeight: 1.25,
      letterSpacing: '-0.02em',
      color: '#102A43',
    },
    h3: {
      fontWeight: 700,
      fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 700,
      fontSize: 'clamp(1rem, 2vw, 1.35rem)',
      lineHeight: 1.35,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
      color: '#334155',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#334155',
    },
    caption: {
      fontSize: '0.75rem',
      color: '#64748B',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
    overline: {
      fontWeight: 700,
      fontSize: '0.75rem',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
  },

  transitions: {
    duration: TRANSITION_DURATION,
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut:   'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
      sharp:     'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },

  // ─── Bordes completamente rectos (Sharp UI) ─────────────────────────────────
  shape: {
    borderRadius: 0, 
  },

  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.05)',
    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03)',
    '0 6px 10px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.03)',
    '0 8px 15px rgba(0,0,0,0.07), 0 3px 6px rgba(0,0,0,0.04)',
    '0 10px 20px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
    '0 12px 25px rgba(0,0,0,0.08)',
    '0 15px 30px rgba(0,0,0,0.09)',
    '0 20px 40px rgba(0,0,0,0.09)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
    '0 25px 50px rgba(0,0,0,0.10)',
  ],

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*, *::before, *::after': {
          boxSizing: 'border-box',
        },
        html: {
          scrollBehavior: 'smooth',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        body: {
          backgroundColor: '#FFFFFF',
          color: '#1E293B',
        },
        ':target': {
          scrollMarginTop: '80px',
        },
      },
    },

    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 0, // Sharp UI
          boxShadow: 'none',
          transition: 'transform 200ms cubic-bezier(0.4,0,0.2,1)',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp UI
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 10,
          paddingBottom: 10,
          transition: 'background-color 200ms, border-color 200ms',
          '&:active': {
            transform: 'scale(0.99)',
          },
        },
        containedPrimary: {
          backgroundColor: '#102A43',
          '&:hover': {
            backgroundColor: '#0B1E36',
          },
        },
        outlined: {
          borderWidth: '1px',
          borderColor: '#CBD5E1',
          color: '#102A43',
          '&:hover': {
            borderWidth: '1px',
            backgroundColor: '#F8FAFC',
            borderColor: '#94A3B8',
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp UI
          backgroundColor: '#FFFFFF',
          transition: 'border-color 200ms',
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#102A43',
            borderWidth: '2px',
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp UI
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0, // Sharp UI
          border: '1px solid #E2E8F0',
          boxShadow: '0 25px 50px rgba(0,0,0,0.10)',
        },
      },
    },

    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 0, // Sharp UI
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            backgroundColor: '#F8FAFC',
            color: '#334155',
            borderBottom: '2px solid #E2E8F0',
          },
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#E2E8F0',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#102A43',
          color: '#FFFFFF',
          fontSize: '0.75rem',
          borderRadius: 0, // Sharp UI
          padding: '8px 12px',
          fontWeight: 600,
        },
        arrow: {
          color: '#102A43',
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp UI
          height: 4,
        },
      },
    },

    MuiSkeleton: {
      defaultProps: {
        animation: 'wave',
      },
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp UI
          backgroundColor: '#F1F5F9',
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp UI
          fontSize: '0.875rem',
          fontWeight: 500,
          border: '1px solid',
        },
        standardError: {
          borderColor: '#FECACA',
          backgroundColor: '#FEF2F2',
          color: '#991B1B',
        },
        standardWarning: {
          borderColor: '#FDE68A',
          backgroundColor: '#FFFBEB',
          color: '#92400E',
        },
        standardInfo: {
          borderColor: '#BFDBFE',
          backgroundColor: '#EFF6FF',
          color: '#1E3A8A',
        },
        standardSuccess: {
          borderColor: '#A7F3D0',
          backgroundColor: '#ECFDF5',
          color: '#064E3B',
        },
      },
    },
  },
});

export default theme;

// ─── Tokens utilitarios exportados ───────────────────────────────────────────

/** Duración estándar de animaciones de sección (AnimatedSection). */
export const SECTION_ANIMATION_DURATION = 500; // ms

/** Color del borde de tarjetas (constante compartida con sx props). */
export const CARD_BORDER = '1px solid #E2E8F0';

/** Fondo de tarjeta (constante compartida). */
export const CARD_BG = '#FFFFFF';

/** Número máximo de columnas en el grid del catálogo. */
export const CATALOG_COLS = { xs: 1, sm: 2, md: 3, lg: 4 } as const;
