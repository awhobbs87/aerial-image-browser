/**
 * ResultsPanel - Glassmorphic floating results panel for the redesigned GIS interface
 *
 * Features:
 * - Slides in from left when search results are available
 * - Glassmorphic styling with backdrop blur
 * - Collapsible for maximum map visibility
 * - Shows PhotoGrid, Timeline, or Gallery views
 */

import React, { useState, useCallback } from "react";
import {
  Box,
  IconButton,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Stack,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  GridView,
  Timeline,
  PhotoLibrary,
  FilterList,
  CompareArrows,
  History,
  AutoAwesome,
  Close,
} from "@mui/icons-material";
import type { EnhancedPhoto } from "../types/api";
import type { Filters } from "./filterPanelConfig";
import PhotoGrid from "./PhotoGrid";
import PhotoTimeline from "./PhotoTimeline";
import PhotoViewer from "./PhotoViewer";
import FilterPanel from "./FilterPanel";
import { FILTER_PRESETS } from "./filterPanelConfig";

type ResultsViewMode = "grid" | "timeline" | "gallery";

interface ResultsPanelProps {
  photos: EnhancedPhoto[];
  loading: boolean;
  error: Error | null;
  favorites: Set<string>;
  onFavorite: (photo: EnhancedPhoto) => void;
  onShowOnMap: (photo: EnhancedPhoto) => void;
  onPhotoHover: (photo: EnhancedPhoto | null) => void;
  onVisiblePhotosChange?: (photos: EnhancedPhoto[]) => void;
  // Comparison
  comparisonSelection: Set<string>;
  onToggleComparisonSelection: (photo: EnhancedPhoto) => void;
  comparisonPhotos: EnhancedPhoto[];
  onOpenComparison: () => void;
  onOpenThenNow: () => void;
  onClearComparison: () => void;
  // Filters
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  availableScales: number[];
  dateRange: { min: number; max: number } | null;
  hasActiveFilters: boolean;
  onQuickFilterPreset: (presetId: string) => void;
  // Location info
  searchedLocation?: string | null;
  // AI Filters
  appliedAIFilters?: {
    dateRange?: { start?: string; end?: string };
    resolution?: string;
    imageTypes?: string[];
  } | null;
  onClearAIFilters?: () => void;
  // Panel open state (controlled from parent to re-open on new search)
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const getPhotoKey = (photo: EnhancedPhoto) =>
  `${photo.layerId}-${photo.OBJECTID}`;

export default function ResultsPanel({
  photos,
  loading,
  error,
  favorites,
  onFavorite,
  onShowOnMap,
  onPhotoHover,
  onVisiblePhotosChange,
  comparisonSelection,
  onToggleComparisonSelection,
  comparisonPhotos,
  onOpenComparison,
  onOpenThenNow,
  onClearComparison,
  filters,
  searchedLocation,
  onFiltersChange,
  availableScales,
  dateRange,
  hasActiveFilters,
  onQuickFilterPreset,
  appliedAIFilters,
  onClearAIFilters,
  isOpen: controlledIsOpen,
  onOpenChange,
}: ResultsPanelProps) {
  // Use controlled state if provided, otherwise fall back to internal state
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = useCallback(
    (open: boolean) => {
      if (onOpenChange) {
        onOpenChange(open);
      } else {
        setInternalIsOpen(open);
      }
    },
    [onOpenChange],
  );
  const [viewMode, setViewMode] = useState<ResultsViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);

  const handleViewModeChange = useCallback(
    (
      _event: React.MouseEvent<HTMLElement>,
      newMode: ResultsViewMode | null,
    ) => {
      if (newMode) {
        setViewMode(newMode);
      }
    },
    [],
  );

  const panelWidth = 420;

  return (
    <>
      {/* Results Panel */}
      <Box
        sx={{
          position: "fixed",
          // Desktop: slide from left side
          // Mobile: slide up from bottom as a sheet
          left: {
            xs: 0,
            md: isOpen ? 64 : -panelWidth - 20,
          },
          right: { xs: 0, md: "auto" },
          top: {
            xs: isOpen ? "35%" : "100%", // Mobile: bottom sheet covers 65% of screen
            md: 56,
          },
          bottom: { xs: 0, md: 16 },
          width: { xs: "100%", md: panelWidth },
          zIndex: 1050,
          transition: {
            xs: "top 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            md: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          },
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Panel Content */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "rgba(18, 18, 18, 0.95)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderRadius: { xs: "20px 20px 0 0", md: "16px" },
            border: "1px solid rgba(148, 163, 184, 0.1)",
            borderBottom: {
              xs: "none",
              md: "1px solid rgba(148, 163, 184, 0.1)",
            },
            boxShadow: {
              xs: "0 -8px 32px rgba(0, 0, 0, 0.5)",
              md: "0 8px 32px rgba(0, 0, 0, 0.4)",
            },
            overflow: "hidden",
          }}
        >
          {/* Mobile drag handle */}
          <Box
            onClick={() => setIsOpen(!isOpen)}
            sx={{
              display: { xs: "flex", md: "none" },
              justifyContent: "center",
              py: 1.5,
              cursor: "pointer",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 4,
                borderRadius: 2,
                bgcolor: "rgba(148, 163, 184, 0.4)",
              }}
            />
          </Box>

          {/* Header */}
          <Box
            sx={{
              p: { xs: 1.5, md: 2 },
              pt: { xs: 0, md: 2 },
              borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
            }}
          >
            {/* Location Name */}
            {searchedLocation && (
              <Typography
                variant="body2"
                sx={{
                  color: "#94A3B8",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: "#10B981",
                    display: "inline-block",
                  }}
                />
                {searchedLocation}
              </Typography>
            )}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    color: "#F1F5F9",
                    fontSize: "0.95rem",
                  }}
                >
                  Results
                </Typography>
                <Chip
                  label={`${photos.length}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    bgcolor: "rgba(16, 185, 129, 0.2)",
                    color: "#10B981",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {/* Filter Toggle */}
                <Tooltip title={showFilters ? "Hide filters" : "Show filters"}>
                  <IconButton
                    onClick={() => setShowFilters(!showFilters)}
                    size="small"
                    sx={{
                      color: hasActiveFilters ? "#10B981" : "#94A3B8",
                      bgcolor: hasActiveFilters
                        ? "rgba(16, 185, 129, 0.15)"
                        : "transparent",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: "rgba(16, 185, 129, 0.15)",
                        color: "#10B981",
                      },
                    }}
                  >
                    <FilterList sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>

                {/* Close Panel */}
                <IconButton
                  onClick={() => setIsOpen(false)}
                  size="small"
                  sx={{
                    color: "#94A3B8",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: "rgba(148, 163, 184, 0.15)",
                      color: "#F1F5F9",
                    },
                  }}
                >
                  <ChevronLeft sx={{ fontSize: 20 }} />
                </IconButton>
              </Box>
            </Box>
          </Box>

          {/* AI Filters Banner */}
          {appliedAIFilters && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: "1px solid rgba(168, 85, 247, 0.2)",
                bgcolor: "rgba(168, 85, 247, 0.08)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <AutoAwesome sx={{ fontSize: 14, color: "#A855F7" }} />
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      color: "#A855F7",
                      fontWeight: 600,
                    }}
                  >
                    AI Filters
                  </Typography>
                  {appliedAIFilters.dateRange && (
                    <Chip
                      label={`${appliedAIFilters.dateRange.start?.slice(0, 4) || "any"} - ${appliedAIFilters.dateRange.end?.slice(0, 4) || "any"}`}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        bgcolor: "rgba(168, 85, 247, 0.15)",
                        color: "#C4B5FD",
                        border: "none",
                      }}
                    />
                  )}
                  {appliedAIFilters.resolution && (
                    <Chip
                      label={`${appliedAIFilters.resolution} detail`}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        bgcolor: "rgba(168, 85, 247, 0.15)",
                        color: "#C4B5FD",
                        border: "none",
                      }}
                    />
                  )}
                  {appliedAIFilters.imageTypes?.map((type) => (
                    <Chip
                      key={type}
                      label={type}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        bgcolor: "rgba(168, 85, 247, 0.15)",
                        color: "#C4B5FD",
                        border: "none",
                      }}
                    />
                  ))}
                </Box>
                <Tooltip title="Clear AI filters and search again with defaults">
                  <IconButton
                    onClick={onClearAIFilters}
                    size="small"
                    sx={{
                      color: "#A855F7",
                      "&:hover": { bgcolor: "rgba(168, 85, 247, 0.15)" },
                    }}
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  color: "rgba(168, 85, 247, 0.6)",
                  fontStyle: "italic",
                }}
              >
                Clearing will re-search with default filters
              </Typography>
            </Box>
          )}

          {/* Filters Section (Collapsible) */}
          {showFilters && (
            <Box
              sx={{
                p: 2,
                borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
                bgcolor: "rgba(30, 41, 59, 0.5)",
              }}
            >
              <FilterPanel
                filters={filters}
                onFiltersChange={onFiltersChange}
                availableScales={availableScales}
                dateRange={dateRange}
                showQuickFilters={false}
              />
            </Box>
          )}

          {/* Quick Filters */}
          {photos.length > 0 && !showFilters && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
              }}
            >
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {FILTER_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isActivePreset = (() => {
                    if (preset.id === "historical") {
                      return (
                        filters.endDate &&
                        new Date(filters.endDate).getFullYear() <= 1980
                      );
                    } else if (preset.id === "modern") {
                      return (
                        filters.startDate &&
                        new Date(filters.startDate).getFullYear() >= 2000
                      );
                    } else if (preset.id === "high-detail") {
                      return (
                        filters.selectedScales.length > 0 &&
                        filters.selectedScales.every((s: number) => s <= 5000)
                      );
                    }
                    return false;
                  })();

                  return (
                    <Chip
                      key={preset.id}
                      icon={<Icon sx={{ fontSize: 12 }} />}
                      label={preset.label}
                      onClick={() => onQuickFilterPreset(preset.id)}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        bgcolor: isActivePreset
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(255, 255, 255, 0.05)",
                        color: isActivePreset ? "#10B981" : "#94A3B8",
                        border: isActivePreset
                          ? "1px solid rgba(16, 185, 129, 0.4)"
                          : "1px solid rgba(148, 163, 184, 0.15)",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: "rgba(16, 185, 129, 0.15)",
                          borderColor: "rgba(16, 185, 129, 0.3)",
                        },
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* View Mode Toggle */}
          <Box
            sx={{
              px: 2,
              py: 1,
              borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  px: 1.5,
                  py: 0.5,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  textTransform: "none",
                  border: "none",
                  borderRadius: "8px !important",
                  color: "#94A3B8",
                  "&:hover": {
                    bgcolor: "rgba(148, 163, 184, 0.1)",
                  },
                  "&.Mui-selected": {
                    bgcolor: "rgba(16, 185, 129, 0.15)",
                    color: "#10B981",
                    "&:hover": {
                      bgcolor: "rgba(16, 185, 129, 0.2)",
                    },
                  },
                },
              }}
            >
              <ToggleButton value="grid">
                <GridView sx={{ fontSize: 16, mr: 0.5 }} />
                Grid
              </ToggleButton>
              <ToggleButton value="timeline">
                <Timeline sx={{ fontSize: 16, mr: 0.5 }} />
                Timeline
              </ToggleButton>
              <ToggleButton value="gallery">
                <PhotoLibrary sx={{ fontSize: 16, mr: 0.5 }} />
                Gallery
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Comparison Buttons */}
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip
                title={
                  comparisonPhotos.length >= 2
                    ? "Compare photos"
                    : "Select 2 photos to compare"
                }
              >
                <span>
                  <IconButton
                    onClick={onOpenComparison}
                    disabled={comparisonPhotos.length < 2}
                    size="small"
                    sx={{
                      color:
                        comparisonPhotos.length >= 2 ? "#10B981" : "#64748B",
                      bgcolor:
                        comparisonPhotos.length >= 2
                          ? "rgba(16, 185, 129, 0.15)"
                          : "transparent",
                      transition: "all 0.2s ease",
                      "&:hover:not(:disabled)": {
                        bgcolor: "rgba(16, 185, 129, 0.2)",
                      },
                    }}
                  >
                    <CompareArrows sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip
                title={
                  comparisonPhotos.length === 1
                    ? "Then vs Now"
                    : "Select 1 photo"
                }
              >
                <span>
                  <IconButton
                    onClick={onOpenThenNow}
                    disabled={comparisonPhotos.length !== 1}
                    size="small"
                    sx={{
                      color:
                        comparisonPhotos.length === 1 ? "#22d3ee" : "#64748B",
                      bgcolor:
                        comparisonPhotos.length === 1
                          ? "rgba(34, 211, 238, 0.15)"
                          : "transparent",
                      transition: "all 0.2s ease",
                      "&:hover:not(:disabled)": {
                        bgcolor: "rgba(34, 211, 238, 0.2)",
                      },
                    }}
                  >
                    <History sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          {/* Comparison Selection Chips */}
          {comparisonPhotos.length > 0 && (
            <Box
              sx={{
                px: 2,
                py: 1,
                borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
              }}
            >
              <Stack
                direction="row"
                spacing={0.5}
                flexWrap="wrap"
                useFlexGap
                alignItems="center"
              >
                {comparisonPhotos.map((photo) => (
                  <Chip
                    key={getPhotoKey(photo)}
                    label={photo.dateFormatted || "Unknown"}
                    size="small"
                    onDelete={() => onToggleComparisonSelection(photo)}
                    sx={{
                      height: 22,
                      fontSize: "0.65rem",
                      bgcolor: "rgba(16, 185, 129, 0.15)",
                      color: "#10B981",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      "& .MuiChip-deleteIcon": {
                        color: "#10B981",
                        fontSize: 14,
                        "&:hover": {
                          color: "#34D399",
                        },
                      },
                    }}
                  />
                ))}
                <Chip
                  label="Clear"
                  size="small"
                  onClick={onClearComparison}
                  sx={{
                    height: 22,
                    fontSize: "0.65rem",
                    bgcolor: "transparent",
                    color: "#94A3B8",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "rgba(148, 163, 184, 0.1)",
                    },
                  }}
                />
              </Stack>
            </Box>
          )}

          {/* Results Content */}
          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              px: 1.5,
              py: 1.5,
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(148, 163, 184, 0.3)",
                borderRadius: "3px",
              },
            }}
          >
            {/* Loading state */}
            {loading && photos.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 6,
                  gap: 2,
                }}
              >
                <CircularProgress size={32} sx={{ color: "#10B981" }} />
                <Typography
                  variant="body2"
                  sx={{ color: "#94A3B8", fontSize: "0.85rem" }}
                >
                  Searching for aerial photos...
                </Typography>
              </Box>
            ) : photos.length === 0 && !loading ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 6,
                  gap: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "#94A3B8", fontSize: "0.85rem" }}
                >
                  No photos found for this location.
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "#64748B", fontSize: "0.75rem" }}
                >
                  Try a different location or adjust your filters.
                </Typography>
              </Box>
            ) : viewMode === "gallery" ? (
              <PhotoViewer
                photo={photos[0] || null}
                photos={photos}
                open
                onClose={() => setViewMode("grid")}
                initialIndex={0}
              />
            ) : viewMode === "grid" ? (
              <PhotoGrid
                photos={photos}
                loading={loading}
                error={error}
                onFavorite={onFavorite}
                favorites={favorites}
                onShowOnMap={onShowOnMap}
                onPhotoHover={onPhotoHover}
                onVisiblePhotosChange={onVisiblePhotosChange}
                selection={comparisonSelection}
                onToggleSelect={onToggleComparisonSelection}
              />
            ) : (
              <PhotoTimeline
                photos={photos}
                loading={loading}
                error={error}
                onFavorite={onFavorite}
                favorites={favorites}
                onShowOnMap={onShowOnMap}
                onPhotoHover={onPhotoHover}
                selection={comparisonSelection}
                onToggleSelect={onToggleComparisonSelection}
              />
            )}
          </Box>
        </Box>

        {/* Collapse Button - Desktop only (mobile uses drag handle) */}
        {isOpen && (
          <Tooltip title="Collapse panel" placement="right">
            <IconButton
              onClick={() => setIsOpen(false)}
              sx={{
                position: "absolute",
                right: -16,
                top: "50%",
                transform: "translateY(-50%)",
                width: 32,
                height: 48,
                borderRadius: "0 8px 8px 0",
                bgcolor: "rgba(18, 18, 18, 0.9)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                borderLeft: "none",
                color: "#94A3B8",
                transition: "all 0.2s ease",
                // Hide on mobile - use drag handle instead
                display: { xs: "none", md: "flex" },
                "&:hover": {
                  bgcolor: "rgba(30, 41, 59, 0.95)",
                  color: "#10B981",
                },
              }}
            >
              <ChevronLeft sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Expand Button - Desktop: side button, Mobile: bottom tab */}
      {!isOpen && (
        <>
          {/* Desktop expand button */}
          <Tooltip title="Show results" placement="right">
            <IconButton
              onClick={() => setIsOpen(true)}
              sx={{
                position: "fixed",
                left: 64,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 1050,
                width: 40,
                height: 64,
                borderRadius: "0 12px 12px 0",
                bgcolor: "rgba(18, 18, 18, 0.9)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                borderLeft: "none",
                color: "#10B981",
                boxShadow: "4px 0 16px rgba(0, 0, 0, 0.3)",
                transition: "all 0.2s ease",
                // Hide on mobile
                display: { xs: "none", md: "flex" },
                "&:hover": {
                  bgcolor: "rgba(30, 41, 59, 0.95)",
                  boxShadow: "4px 0 24px rgba(16, 185, 129, 0.2)",
                },
              }}
            >
              <ChevronRight sx={{ fontSize: 24 }} />
            </IconButton>
          </Tooltip>

          {/* Mobile expand tab at bottom */}
          <Box
            onClick={() => setIsOpen(true)}
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1050,
              display: { xs: "flex", md: "none" },
              flexDirection: "column",
              alignItems: "center",
              py: 1.5,
              bgcolor: "rgba(18, 18, 18, 0.95)",
              backdropFilter: "blur(12px)",
              borderTop: "1px solid rgba(148, 163, 184, 0.15)",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.3)",
              cursor: "pointer",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 4,
                borderRadius: 2,
                bgcolor: "rgba(148, 163, 184, 0.4)",
                mb: 1,
              }}
            />
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#10B981",
              }}
            >
              {photos.length} Results
            </Typography>
          </Box>
        </>
      )}
    </>
  );
}
