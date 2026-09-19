export const THEME = {
  colors: {
    brand: {
      50: '#e7ecfa',
      100: '#c5d0f2',
      200: '#9eb2ea',
      300: '#7794e1',
      400: '#5a77da',
      500: '#3b5bdb',
      600: '#3553c2',
      700: '#2c479e',
      800: '#243b7e',
      900: '#1e3288',
    },
    accent: '#d946ef',
    background: '#f8fafc',
    surface: '#ffffff',
    text: {
      primary: '#1a202c',
      secondary: '#64748b',
      muted: '#94a3b8',
    },
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  spacing: (n) => n * 4,
  text: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    h1: 28,
  },
};

export const STATUS_COLORS = {
  todo: '#3b82f6',
  in_progress: '#f59e0b',
  review: '#8b5cf6',
  blocked: '#ef4444',
  completed: '#10b981',
};

export const PRIORITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7f1d1d',
};

export const ROLE_COLORS = {
  superadmin: '#7c3aed',
  admin: '#ea580c',
  user: '#16a34a',
};

export const STATUS_LABELS = {
  todo: 'À faire',
  in_progress: 'En cours',
  review: 'En revue',
  blocked: 'Bloqué',
  completed: 'Terminé',
};

export const PRIORITY_LABELS = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
};