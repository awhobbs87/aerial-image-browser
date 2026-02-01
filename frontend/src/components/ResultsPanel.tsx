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
}: ResultsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
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
          left: isOpen ? 64 : -panelWidth + 64,
          top: 56,
          bottom: 16,
          width: panelWidth,
          zIndex: 1050,
          transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
            background: "rgba(18, 18, 18, 0.88)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderRadius: "16px",
            border: "1px solid rgba(148, 163, 184, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
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
            {viewMode === "gallery" ? (
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

        {/* Toggle Button */}
        <Tooltip
          title={isOpen ? "Collapse panel" : "Expand results"}
          placement="right"
        >
          <IconButton
            onClick={() => setIsOpen(!isOpen)}
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
              "&:hover": {
                bgcolor: "rgba(30, 41, 59, 0.95)",
                color: "#10B981",
              },
            }}
          >
            {isOpen ? (
              <ChevronLeft sx={{ fontSize: 18 }} />
            ) : (
              <ChevronRight sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Open Button (when panel is closed) */}
      {!isOpen && (
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
              "&:hover": {
                bgcolor: "rgba(30, 41, 59, 0.95)",
                boxShadow: "4px 0 24px rgba(16, 185, 129, 0.2)",
              },
            }}
          >
            <ChevronRight sx={{ fontSize: 24 }} />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
