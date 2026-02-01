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
  xs: "0.7rem",
  sm: "0.75rem",
  md: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
} as const;

// Unified color tokens for both themes
export const colorTokens = {
  light: {
    surface: "#FFFFFF",
    surfaceAlt: "#F9FAFB",
    surfaceElevated: "#FFFFFF",
    border: "rgba(0, 0, 0, 0.08)",
    borderHover: "rgba(0, 0, 0, 0.12)",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    textTertiary: "#9CA3AF",
    accent: "#059669", // Emerald green - brighter for light mode
    accentHover: "#047857",
    accentLight: "rgba(5, 150, 105, 0.1)",
    divider: "rgba(0, 0, 0, 0.08)",
  },
  dark: {
    surface: "#1A1A1A",
    surfaceAlt: "#242424",
    surfaceElevated: "#2A2A2A",
    border: "rgba(255, 255, 255, 0.1)",
    borderHover: "rgba(255, 255, 255, 0.15)",
    textPrimary: "#EAEAEA",
    textSecondary: "#B4B4B4",
    textTertiary: "#8A8A8A",
    accent: "#10B981", // Emerald green - brighter for dark mode
    accentHover: "#34D399",
    accentLight: "rgba(16, 185, 129, 0.15)",
    divider: "rgba(255, 255, 255, 0.1)",
  },
} as const;

export const shadows = {
  sm: "0 1px 3px rgba(0, 77, 64, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
  md: "0 4px 12px rgba(0, 77, 64, 0.15), 0 2px 4px rgba(0, 0, 0, 0.08)",
  lg: "0 8px 24px rgba(0, 77, 64, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)",
  xl: "0 12px 32px rgba(0, 77, 64, 0.25), 0 6px 12px rgba(0, 0, 0, 0.12)",
} as const;

export const shadowsDark = {
  sm: "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
  md: "0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.25)",
  lg: "0 8px 24px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)",
  xl: "0 12px 32px rgba(0, 0, 0, 0.6), 0 6px 12px rgba(0, 0, 0, 0.35)",
} as const;

export const layerTypeColors = {
  aerial: {
    main: "#0891b2", // Cyan
    light: "#22d3ee",
    dark: "#0e7490",
    border: "#0891b2",
  },
  ortho: {
    main: "#10b981", // Emerald (keep green)
    light: "#34d399",
    dark: "#059669",
    border: "#10b981",
  },
  digital: {
    main: "#f59e0b", // Amber (instead of red)
    light: "#fbbf24",
    dark: "#d97706",
    border: "#f59e0b",
  },
} as const;

export const transitions = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  base: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
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
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(20px) saturate(180%)",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
  },
  dark: {
    background: "rgba(30, 41, 59, 0.75)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(20px) saturate(180%)",
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
  },
} as const;

/**
 * Premium GIS Glassmorphism - Tasmania Aerial Photos
 * Deep Charcoal + Emerald Green palette
 */
export const premiumGlass = {
  // Core palette
  colors: {
    deepCharcoal: "#121212",
    slateGray: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      900: "#0F172A",
    },
    emerald: {
      50: "#ECFDF5",
      100: "#D1FAE5",
      200: "#A7F3D0",
      300: "#6EE7B7",
      400: "#34D399",
      500: "#10B981",
      600: "#059669",
      700: "#047857",
      800: "#065F46",
      900: "#064E3B",
    },
    violet: {
      400: "#A855F7",
      500: "#8B5CF6",
    },
  },

  // Hover glow effects
  glowEffects: {
    emerald: {
      subtle: "0 0 8px rgba(16, 185, 129, 0.2)",
      medium: "0 0 12px rgba(16, 185, 129, 0.3)",
      strong: "0 0 20px rgba(16, 185, 129, 0.4)",
      intense: "0 0 30px rgba(16, 185, 129, 0.5)",
    },
    cyan: {
      subtle: "0 0 8px rgba(34, 211, 238, 0.2)",
      medium: "0 0 12px rgba(34, 211, 238, 0.3)",
      strong: "0 0 20px rgba(34, 211, 238, 0.4)",
    },
    violet: {
      subtle: "0 0 8px rgba(168, 85, 247, 0.2)",
      medium: "0 0 12px rgba(168, 85, 247, 0.3)",
      strong: "0 0 20px rgba(168, 85, 247, 0.4)",
    },
  },

  // Glassmorphic surfaces
  surfaces: {
    navigation: {
      background: "rgba(18, 18, 18, 0.75)",
      backdropFilter: "blur(12px) saturate(180%)",
      border: "1px solid rgba(148, 163, 184, 0.08)",
    },
    panel: {
      background: "rgba(18, 18, 18, 0.88)",
      backdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(148, 163, 184, 0.1)",
    },
    card: {
      background: "rgba(30, 41, 59, 0.85)",
      backdropFilter: "blur(12px) saturate(180%)",
      border: "1px solid rgba(148, 163, 184, 0.15)",
    },
    chip: {
      background: "rgba(255, 255, 255, 0.08)",
      backgroundHover: "rgba(16, 185, 129, 0.15)",
      border: "1px solid rgba(148, 163, 184, 0.15)",
    },
  },

  // Pill button styles
  pillButton: {
    borderRadius: "20px",
    padding: "8px 20px",
    small: {
      borderRadius: "16px",
      padding: "6px 16px",
      height: "32px",
    },
    medium: {
      borderRadius: "20px",
      padding: "8px 20px",
      height: "40px",
    },
  },
} as const;

export const focusRing = {
  width: "3px",
  offset: "2px",
  color: "#004d40",
  style: "solid",
} as const;
