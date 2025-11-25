import {
  History as HistoryIcon,
  TrendingUp,
  ZoomIn,
} from "@mui/icons-material";

export interface Filters {
  startDate: Date | null;
  endDate: Date | null;
  selectedScales: number[];
  layerTypes: {
    aerial: boolean;
    ortho: boolean;
    digital: boolean;
  };
}

export const FILTER_PRESETS = [
  {
    id: "historical",
    label: "Historical",
    icon: HistoryIcon,
    description: "Photos before 1980",
    filters: {
      startDate: null,
      endDate: new Date("1980-01-01"),
      selectedScales: [] as number[],
      layerTypes: { aerial: true, ortho: true, digital: false },
    },
  },
  {
    id: "modern",
    label: "Modern",
    icon: TrendingUp,
    description: "Photos from 2000 onwards",
    filters: {
      startDate: new Date("2000-01-01"),
      endDate: null,
      selectedScales: [] as number[],
      layerTypes: { aerial: true, ortho: true, digital: true },
    },
  },
  {
    id: "high-detail",
    label: "High Detail",
    icon: ZoomIn,
    description: "Scale 1:5,000 or smaller",
    filters: {
      startDate: null,
      endDate: null,
      selectedScales: [] as number[], // Will be populated dynamically
      layerTypes: { aerial: true, ortho: true, digital: true },
    },
  },
];

export const SCALE_CATEGORIES = [
  {
    id: "very-detailed",
    label: "Very Detailed",
    description: "Best quality, smallest area (1:5,000 or smaller)",
    icon: "🔍",
    maxScale: 5000,
    color: "success" as const,
  },
  {
    id: "detailed",
    label: "Detailed",
    description: "Good quality, medium area (1:5,000 - 1:15,000)",
    icon: "📸",
    minScale: 5001,
    maxScale: 15000,
    color: "primary" as const,
  },
  {
    id: "standard",
    label: "Standard",
    description: "Standard quality, larger area (1:15,000 - 1:40,000)",
    icon: "🗺️",
    minScale: 15001,
    maxScale: 40000,
    color: "secondary" as const,
  },
  {
    id: "overview",
    label: "Overview",
    description: "Wide coverage, less detail (larger than 1:40,000)",
    icon: "🌍",
    minScale: 40001,
    color: "warning" as const,
  },
];

