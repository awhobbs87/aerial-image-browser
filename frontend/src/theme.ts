import { createTheme } from "@mui/material/styles";

// Common theme options with enhanced visual polish
const commonTheme = {
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      letterSpacing: "0.02em",
    },
  },
  shape: {
    borderRadius: 12, // Increased for more modern look
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-6px)",
            boxShadow: "0 12px 24px rgba(0,0,0,0.12)",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
          padding: "8px 20px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          },
        },
        contained: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "scale(1.05)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        elevation1: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        },
        elevation2: {
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        },
        elevation3: {
          boxShadow: "0 8px 16px rgba(0,0,0,0.12)",
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          "&:before": {
            display: "none",
          },
          "&.Mui-expanded": {
            margin: 0,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
          transition: "all 0.2s ease-in-out",
          "&.Mui-selected": {
            transform: "scale(1.02)",
          },
        },
      },
    },
  },
};

// Light theme with enhanced color palette
export const lightTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: "light",
    primary: {
      main: "#667eea",
      light: "#8fa3f0",
      dark: "#5568d3",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#764ba2",
      light: "#9b6ec8",
      dark: "#5a3679",
      contrastText: "#ffffff",
    },
    success: {
      main: "#48bb78",
      light: "#68d391",
      dark: "#38a169",
    },
    error: {
      main: "#f56565",
      light: "#fc8181",
      dark: "#e53e3e",
    },
    warning: {
      main: "#ed8936",
      light: "#f6ad55",
      dark: "#dd6b20",
    },
    info: {
      main: "#4299e1",
      light: "#63b3ed",
      dark: "#3182ce",
    },
    background: {
      default: "#f7fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#1a202c",
      secondary: "#718096",
    },
    divider: "rgba(0, 0, 0, 0.08)",
  },
});

// Dark theme with enhanced color palette
export const darkTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: "dark",
    primary: {
      main: "#8fa3f0",
      light: "#b3c2f5",
      dark: "#667eea",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#9b6ec8",
      light: "#bb95dc",
      dark: "#764ba2",
      contrastText: "#ffffff",
    },
    success: {
      main: "#68d391",
      light: "#9ae6b4",
      dark: "#48bb78",
    },
    error: {
      main: "#fc8181",
      light: "#feb2b2",
      dark: "#f56565",
    },
    warning: {
      main: "#f6ad55",
      light: "#fbd38d",
      dark: "#ed8936",
    },
    info: {
      main: "#63b3ed",
      light: "#90cdf4",
      dark: "#4299e1",
    },
    background: {
      default: "#1a202c",
      paper: "#2d3748",
    },
    text: {
      primary: "#f7fafc",
      secondary: "#cbd5e0",
    },
    divider: "rgba(255, 255, 255, 0.12)",
  },
});
