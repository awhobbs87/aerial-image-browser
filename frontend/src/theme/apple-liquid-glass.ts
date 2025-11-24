/**
 * Apple Liquid Glass Design Tokens
 * 
 * Design system tokens for macOS Sonoma-style translucent, frosted glass interface.
 * These tokens provide the foundation for the sidebar redesign.
 */

export const appleLiquidGlass = {
  // Opacity Levels
  opacity: {
    translucent: {
      light: 0.85,
      dark: 0.85,
    },
    frosted: {
      light: 0.7,
      dark: 0.7,
    },
    module: {
      light: 0.6,
      dark: 0.6,
    },
    active: {
      light: 0.95,
      dark: 0.95,
    },
    disabled: 0.35,
  },

  // Background Colors (with opacity)
  backgrounds: {
    sidebar: {
      light: 'rgba(255, 255, 255, 0.85)',
      dark: 'rgba(28, 28, 30, 0.85)',
    },
    module: {
      light: 'rgba(255, 255, 255, 0.6)',
      dark: 'rgba(42, 42, 42, 0.6)',
    },
    frosted: {
      light: 'rgba(255, 255, 255, 0.7)',
      dark: 'rgba(42, 42, 42, 0.7)',
    },
    card: {
      light: 'rgba(255, 255, 255, 0.95)',
      dark: 'rgba(42, 42, 42, 0.95)',
    },
    button: {
      default: {
        light: 'rgba(0, 0, 0, 0.04)',
        dark: 'rgba(255, 255, 255, 0.08)',
      },
      active: {
        light: 'rgba(5, 150, 105, 0.15)',
        dark: 'rgba(16, 185, 129, 0.25)',
      },
      hover: {
        light: 'rgba(0, 0, 0, 0.06)',
        dark: 'rgba(255, 255, 255, 0.12)',
      },
    },
    segmented: {
      container: {
        light: 'rgba(0, 0, 0, 0.04)',
        dark: 'rgba(255, 255, 255, 0.08)',
      },
      selected: {
        light: 'rgba(255, 255, 255, 0.9)',
        dark: 'rgba(60, 60, 60, 0.9)',
      },
    },
    chip: {
      default: {
        light: 'rgba(255, 255, 255, 0.6)',
        dark: 'rgba(60, 60, 60, 0.6)',
      },
      hover: {
        light: 'rgba(5, 150, 105, 0.1)',
        dark: 'rgba(16, 185, 129, 0.15)',
      },
      active: {
        light: 'rgba(5, 150, 105, 0.15)',
        dark: 'rgba(16, 185, 129, 0.2)',
      },
    },
  },

  // Border Colors
  borders: {
    hairline: {
      light: 'rgba(0, 0, 0, 0.06)',
      dark: 'rgba(255, 255, 255, 0.08)',
    },
    subtle: {
      light: 'rgba(0, 0, 0, 0.08)',
      dark: 'rgba(255, 255, 255, 0.1)',
    },
    medium: {
      light: 'rgba(0, 0, 0, 0.1)',
      dark: 'rgba(255, 255, 255, 0.15)',
    },
    active: {
      light: 'rgba(5, 150, 105, 0.3)',
      dark: 'rgba(16, 185, 129, 0.4)',
    },
    card: {
      light: 'rgba(0, 0, 0, 0.06)',
      dark: 'rgba(255, 255, 255, 0.1)',
    },
  },

  // Text Colors
  text: {
    primary: {
      light: 'rgba(0, 0, 0, 0.9)',
      dark: 'rgba(255, 255, 255, 0.95)',
    },
    secondary: {
      light: 'rgba(0, 0, 0, 0.6)',
      dark: 'rgba(255, 255, 255, 0.7)',
    },
    tertiary: {
      light: 'rgba(0, 0, 0, 0.5)',
      dark: 'rgba(255, 255, 255, 0.6)',
    },
    hint: {
      light: 'rgba(0, 0, 0, 0.5)',
      dark: 'rgba(255, 255, 255, 0.6)',
    },
  },

  // Backdrop Filters
  backdrop: {
    sidebar: 'blur(20px)',
    module: 'blur(30px) saturate(180%)',
    chip: 'blur(10px)',
    segmented: 'blur(10px)',
  },

  // Gradients
  gradients: {
    sidebar: {
      light: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.85) 100%)',
      dark: 'linear-gradient(180deg, rgba(28,28,30,0.9) 0%, rgba(28,28,30,0.85) 100%)',
    },
    divider: {
      light: 'linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.08) 20%, rgba(0, 0, 0, 0.08) 80%, transparent 100%)',
      dark: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 20%, rgba(255, 255, 255, 0.1) 80%, transparent 100%)',
    },
  },

  // Shadows
  shadows: {
    // Light Mode
    light: {
      subtle: '0 1px 3px rgba(0, 0, 0, 0.06)',
      medium: '0 4px 12px rgba(0, 0, 0, 0.08)',
      elevated: '0 8px 24px rgba(0, 0, 0, 0.12)',
      card: '0 2px 8px rgba(0, 0, 0, 0.06)',
      cardHover: '0 4px 12px rgba(0, 0, 0, 0.1)',
      segmented: '0 2px 8px rgba(0, 0, 0, 0.1)',
      inner: 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',
      innerFrosted: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    },
    // Dark Mode
    dark: {
      subtle: '0 1px 3px rgba(0, 0, 0, 0.3)',
      medium: '0 4px 12px rgba(0, 0, 0, 0.4)',
      elevated: '0 8px 24px rgba(0, 0, 0, 0.5)',
      card: '0 2px 8px rgba(0, 0, 0, 0.3)',
      cardHover: '0 4px 12px rgba(0, 0, 0, 0.4)',
      segmented: '0 2px 8px rgba(0, 0, 0, 0.3)',
      inner: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      innerFrosted: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)',
    },
  },

  // Border Radius
  radius: {
    small: '8px',
    medium: '10px',
    large: '12px',
    capsule: '20px',
  },

  // Spacing
  spacing: {
    module: 24, // Vertical spacing between major modules
    internal: 16, // Horizontal padding within modules
    content: 20, // Top padding for content area
    cardGap: 12, // Gap between photo cards
    yearHeader: {
      top: 20,
      bottom: 12,
    },
  },

  // Typography
  typography: {
    yearHeader: {
      fontSize: '20px',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    moduleTitle: {
      fontSize: '15px',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '0.01em',
    },
    body: {
      fontSize: '13px',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0',
    },
    hint: {
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
    label: {
      fontSize: '11px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    button: {
      fontSize: '13px',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0.02em',
    },
    chip: {
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
  },

  // Transitions
  transitions: {
    standard: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    enter: 'all 0.2s cubic-bezier(0.0, 0, 0.2, 1)',
    exit: 'all 0.2s cubic-bezier(0.4, 0, 1, 1)',
    background: 'background-color 0.2s ease',
    transform: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Transforms
  transforms: {
    hover: {
      button: 'scale(1.02)',
      card: 'translateY(-2px)',
    },
    active: 'scale(0.98)',
  },
};

/**
 * Helper function to get theme-aware values
 */
export function getThemeValue<T>(
  values: { light: T; dark: T },
  isDark: boolean
): T {
  return isDark ? values.dark : values.light;
}

/**
 * Helper function to create backdrop-filter with fallback
 */
export function createBackdropFilter(filter: string) {
  return {
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
    // Fallback for browsers without backdrop-filter support
    '@supports not (backdrop-filter: blur(20px))': {
      opacity: 0.95, // Increase opacity when blur not supported
    },
  };
}

/**
 * Helper function to create frosted glass effect
 */
export function createFrostedGlass(isDark: boolean) {
  return {
    background: getThemeValue(appleLiquidGlass.backgrounds.frosted, isDark),
    ...createBackdropFilter(appleLiquidGlass.backdrop.module),
    border: `1px solid ${getThemeValue(appleLiquidGlass.borders.subtle, isDark)}`,
    boxShadow: getThemeValue(
      {
        light: `${appleLiquidGlass.shadows.light.medium}, ${appleLiquidGlass.shadows.light.innerFrosted}`,
        dark: `${appleLiquidGlass.shadows.dark.medium}, ${appleLiquidGlass.shadows.dark.innerFrosted}`,
      },
      isDark
    ),
  };
}

/**
 * Helper function to create translucent module
 */
export function createTranslucentModule(isDark: boolean) {
  return {
    background: getThemeValue(appleLiquidGlass.backgrounds.module, isDark),
    ...createBackdropFilter(appleLiquidGlass.backdrop.module),
    border: `1px solid ${getThemeValue(appleLiquidGlass.borders.hairline, isDark)}`,
    borderRadius: appleLiquidGlass.radius.large,
  };
}

