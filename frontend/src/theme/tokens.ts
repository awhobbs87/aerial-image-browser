/**
 * Design System Tokens
 * Centralized design tokens for consistent UI
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export const fontSize = {
  xs: '0.7rem',
  sm: '0.75rem',
  md: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
} as const;

export const shadows = {
  sm: '0 1px 3px rgba(0, 77, 64, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 4px 12px rgba(0, 77, 64, 0.15), 0 2px 4px rgba(0, 0, 0, 0.08)',
  lg: '0 8px 24px rgba(0, 77, 64, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)',
  xl: '0 12px 32px rgba(0, 77, 64, 0.25), 0 6px 12px rgba(0, 0, 0, 0.12)',
} as const;

export const shadowsDark = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.25)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)',
  xl: '0 12px 32px rgba(0, 0, 0, 0.6), 0 6px 12px rgba(0, 0, 0, 0.35)',
} as const;

export const layerTypeColors = {
  aerial: {
    main: '#0891b2', // Cyan
    light: '#22d3ee',
    dark: '#0e7490',
    border: '#0891b2',
  },
  ortho: {
    main: '#10b981', // Emerald (keep green)
    light: '#34d399',
    dark: '#059669',
    border: '#10b981',
  },
  digital: {
    main: '#f59e0b', // Amber (instead of red)
    light: '#fbbf24',
    dark: '#d97706',
    border: '#f59e0b',
  },
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  popover: 1400,
  toast: 1500,
} as const;

export const glassmorphism = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
  },
  dark: {
    background: 'rgba(30, 41, 59, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  },
} as const;

export const focusRing = {
  width: '3px',
  offset: '2px',
  color: '#004d40',
  style: 'solid',
} as const;
