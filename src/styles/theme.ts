import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * Tasmania Aerial Photo Explorer -- Mantine theme
 *
 * Single source of truth for colors, typography, spacing, and component defaults.
 * Dark/light mode is system-detecting by default (`colorScheme: 'auto'` set in MantineProvider).
 */

const emerald: MantineColorsTuple = [
  "#e6fcf1",
  "#d0f4e0",
  "#a3e8c1",
  "#72db9f",
  "#4ed185",
  "#38ca74",
  "#2ac56a",
  "#1cad59",
  "#10994d",
  "#00853e",
];

const slate: MantineColorsTuple = [
  "#f8fafc",
  "#f1f5f9",
  "#e2e8f0",
  "#cbd5e1",
  "#94a3b8",
  "#64748b",
  "#475569",
  "#334155",
  "#1e293b",
  "#0f172a",
];

export const theme = createTheme({
  primaryColor: "emerald",
  colors: { emerald, slate },

  fontFamily:
    "var(--font-inter), -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  headings: {
    fontFamily:
      "var(--font-inter), -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    fontWeight: "700",
  },

  radius: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
  },

  defaultRadius: "md",

  breakpoints: {
    xs: "36em",
    sm: "48em",
    md: "62em",
    lg: "75em",
    xl: "88em",
  },

  components: {
    Button: {
      defaultProps: {
        radius: "xl",
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: "xl",
      },
    },
    Card: {
      defaultProps: {
        radius: "md",
        shadow: "sm",
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
        centered: true,
      },
    },
    Drawer: {
      defaultProps: {
        radius: "lg",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
    Skeleton: {
      defaultProps: {
        radius: "md",
      },
    },
  },
});
