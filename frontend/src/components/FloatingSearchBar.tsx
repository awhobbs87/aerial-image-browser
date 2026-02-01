import React, { useState, useCallback } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  Button,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Search, MyLocation, AutoAwesome } from "@mui/icons-material";
import geocodingService from "../lib/geocoding";

interface FloatingSearchBarProps {
  onSearch: (lat: number, lon: number, name: string) => void;
  onAISearchClick: () => void;
  loading?: boolean;
}

const QUICK_JUMP_LOCATIONS = [
  { name: "Hobart", lat: -42.8821, lon: 147.3272 },
  { name: "Launceston", lat: -41.4332, lon: 147.1441 },
];

const FloatingSearchBar: React.FC<FloatingSearchBarProps> = ({
  onSearch,
  onAISearchClick,
  loading = false,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchValue.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const results = await geocodingService.searchLocations(searchValue, 1);
      if (results.length > 0) {
        const result = results[0];
        const locationName = geocodingService.formatLocationName(result);
        onSearch(result.lat, result.lon, locationName);
        setSearchValue("");
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchValue, isSearching, onSearch]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const handleQuickJump = (location: (typeof QUICK_JUMP_LOCATIONS)[0]) => {
    onSearch(location.lat, location.lon, location.name);
  };

  const handleNearMe = async () => {
    if (geolocating) return;

    setGeolocating(true);
    try {
      const location = await geocodingService.getCurrentLocation();
      if (location) {
        const result = await geocodingService.reverseGeocode(
          location.lat,
          location.lon,
        );
        const locationName = result
          ? geocodingService.formatLocationName(result)
          : "Current Location";
        onSearch(location.lat, location.lon, locationName);
      }
    } catch (error) {
      console.error("Geolocation error:", error);
    } finally {
      setGeolocating(false);
    }
  };

  const isLoading = loading || isSearching;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 420,
        px: 2,
        zIndex: 1000,
      }}
    >
      <Box
        sx={{
          backdropFilter: "blur(12px) saturate(180%)",
          WebkitBackdropFilter: "blur(12px) saturate(180%)",
          background: "rgba(30, 41, 59, 0.85)",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        {/* Search Input */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Search Tasmania..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search
                    sx={{ color: "rgba(148, 163, 184, 0.8)", fontSize: 20 }}
                  />
                </InputAdornment>
              ),
              endAdornment: isSearching ? (
                <InputAdornment position="end">
                  <CircularProgress size={18} sx={{ color: "#10B981" }} />
                </InputAdornment>
              ) : null,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                fontSize: "0.875rem",
                color: "#F1F5F9",
                transition: "all 0.2s ease",
                "& fieldset": {
                  borderColor: "rgba(148, 163, 184, 0.2)",
                  transition: "all 0.2s ease",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(148, 163, 184, 0.35)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#10B981",
                  borderWidth: "1px",
                },
              },
              "& .MuiOutlinedInput-input": {
                "&::placeholder": {
                  color: "rgba(148, 163, 184, 0.6)",
                  opacity: 1,
                },
              },
            }}
          />
          {/* Search Button */}
          <IconButton
            onClick={handleSearch}
            disabled={isLoading || !searchValue.trim()}
            sx={{
              bgcolor: "#10B981",
              color: "#fff",
              borderRadius: "12px",
              width: 42,
              height: 42,
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: "#059669",
                boxShadow: "0 0 16px rgba(16, 185, 129, 0.4)",
              },
              "&.Mui-disabled": {
                bgcolor: "rgba(148, 163, 184, 0.2)",
                color: "rgba(148, 163, 184, 0.5)",
              },
            }}
          >
            <Search sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>

        {/* Quick Jump Chips */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            component="span"
            sx={{
              fontSize: "0.7rem",
              fontWeight: 500,
              color: "rgba(148, 163, 184, 0.7)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Quick Jump
          </Box>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {QUICK_JUMP_LOCATIONS.map((location) => (
              <Chip
                key={location.name}
                label={location.name}
                onClick={() => handleQuickJump(location)}
                disabled={isLoading}
                size="small"
                sx={{
                  height: 26,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  color: "#F1F5F9",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  borderRadius: "13px",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    borderColor: "rgba(16, 185, 129, 0.4)",
                    boxShadow: "0 0 12px rgba(16, 185, 129, 0.3)",
                  },
                  "&:active": {
                    transform: "scale(0.97)",
                  },
                  "& .MuiChip-label": {
                    px: 1.25,
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* Near Me Button */}
          <Button
            variant="contained"
            onClick={handleNearMe}
            disabled={geolocating || loading}
            startIcon={
              geolocating ? (
                <CircularProgress size={16} sx={{ color: "#fff" }} />
              ) : (
                <MyLocation sx={{ fontSize: 18 }} />
              )
            }
            sx={{
              flex: 1,
              height: 36,
              borderRadius: "18px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              background: "linear-gradient(135deg, #0891b2 0%, #10b981 100%)",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "linear-gradient(135deg, #0e7490 0%, #059669 100%)",
                boxShadow: "0 6px 20px rgba(16, 185, 129, 0.35)",
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
              "&.Mui-disabled": {
                background: "rgba(148, 163, 184, 0.2)",
                color: "rgba(148, 163, 184, 0.5)",
              },
            }}
          >
            Near Me
          </Button>

          {/* AI Search Button */}
          <Button
            variant="outlined"
            onClick={onAISearchClick}
            disabled={loading}
            startIcon={<AutoAwesome sx={{ fontSize: 18 }} />}
            sx={{
              flex: 1,
              height: 36,
              borderRadius: "18px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              color: "#A855F7",
              borderColor: "rgba(168, 85, 247, 0.5)",
              borderWidth: "1px",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: "#A855F7",
                backgroundColor: "rgba(168, 85, 247, 0.12)",
                boxShadow: "0 0 16px rgba(168, 85, 247, 0.25)",
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
              "&.Mui-disabled": {
                borderColor: "rgba(148, 163, 184, 0.2)",
                color: "rgba(148, 163, 184, 0.5)",
              },
            }}
          >
            AI Search
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default FloatingSearchBar;
