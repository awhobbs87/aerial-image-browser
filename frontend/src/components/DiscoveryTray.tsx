import { Box, IconButton, Typography, Tooltip } from "@mui/material";
import { Search, Layers, History } from "@mui/icons-material";

type PanelType = "search" | "layers" | "history" | null;

interface DiscoveryTrayProps {
  activePanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

interface NavItem {
  id: PanelType;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { id: "search", icon: <Search />, label: "Search" },
  { id: "layers", icon: <Layers />, label: "Layers" },
  { id: "history", icon: <History />, label: "Time Travel" },
];

export default function DiscoveryTray({
  activePanel,
  onPanelChange,
  expanded,
  onExpandedChange,
}: DiscoveryTrayProps) {
  const handlePanelClick = (panel: PanelType) => {
    if (activePanel === panel) {
      onPanelChange(null);
    } else {
      onPanelChange(panel);
    }
  };

  return (
    <Box
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
      sx={{
        position: "fixed",
        left: 0,
        top: 48,
        bottom: 0,
        width: expanded ? 320 : 56,
        background: "rgba(18, 18, 18, 0.85)",
        backdropFilter: "blur(16px)",
        borderRight: "1px solid rgba(148, 163, 184, 0.1)",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        zIndex: 1200,
        // Hide on mobile - takes up too much space
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        py: 2,
        px: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {navItems.map((item) => {
          const isActive = activePanel === item.id;

          const button = (
            <Box
              key={item.id}
              onClick={() => handlePanelClick(item.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                cursor: "pointer",
                borderRadius: "12px",
                transition: "all 0.2s ease",
                overflow: "hidden",
                "&:hover": {
                  "& .nav-button": {
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                  },
                },
              }}
            >
              <IconButton
                className="nav-button"
                sx={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  borderRadius: "12px",
                  color: isActive ? "#10B981" : "#64748B",
                  backgroundColor: isActive
                    ? "rgba(16, 185, 129, 0.15)"
                    : "transparent",
                  boxShadow: isActive
                    ? "0 0 12px rgba(16, 185, 129, 0.4)"
                    : "none",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                  },
                  "& .MuiSvgIcon-root": {
                    fontSize: 22,
                  },
                }}
              >
                {item.icon}
              </IconButton>
              <Typography
                sx={{
                  color: isActive ? "#10B981" : "#94A3B8",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: "nowrap",
                  opacity: expanded ? 1 : 0,
                  transform: expanded ? "translateX(0)" : "translateX(-8px)",
                  transition: "opacity 0.2s ease, transform 0.2s ease",
                  transitionDelay: expanded ? "0.1s" : "0s",
                }}
              >
                {item.label}
              </Typography>
            </Box>
          );

          if (!expanded) {
            return (
              <Tooltip key={item.id} title={item.label} placement="right" arrow>
                {button}
              </Tooltip>
            );
          }

          return button;
        })}
      </Box>
    </Box>
  );
}
