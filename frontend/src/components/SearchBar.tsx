import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Autocomplete,
  Paper,
  Typography,
  Stack,
} from "@mui/material";
import { Search, MyLocation } from "@mui/icons-material";

interface LocationPreset {
  name: string;
  lat: number;
  lon: number;
}

const LOCATION_PRESETS: LocationPreset[] = [
  { name: "Hobart", lat: -42.8821, lon: 147.3272 },
  { name: "Launceston", lat: -41.4332, lon: 147.1441 },
  { name: "Devonport", lat: -41.1789, lon: 146.3503 },
  { name: "Burnie", lat: -41.0553, lon: 145.9099 },
];

interface SearchBarProps {
  onSearch: (lat: number, lon: number) => void;
  loading?: boolean;
}

export default function SearchBar({ onSearch, loading = false }: SearchBarProps) {
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<LocationPreset | null>(null);

  const handleSearch = () => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      alert("Please enter valid latitude and longitude coordinates");
      return;
    }

    if (latitude < -90 || latitude > 90) {
      alert("Latitude must be between -90 and 90");
      return;
    }

    if (longitude < -180 || longitude > 180) {
      alert("Longitude must be between -180 and 180");
      return;
    }

    onSearch(latitude, longitude);
  };

  const handlePresetChange = (_event: any, value: LocationPreset | null) => {
    setSelectedPreset(value);
    if (value) {
      setLat(value.lat.toString());
      setLon(value.lon.toString());
      onSearch(value.lat, value.lon);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Search for Aerial Photos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter coordinates or select a location to find aerial photography
      </Typography>

      <Stack spacing={2}>
        <Autocomplete
          options={LOCATION_PRESETS}
          getOptionLabel={(option) => option.name}
          value={selectedPreset}
          onChange={handlePresetChange}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Quick Locations"
              placeholder="Select a location..."
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <MyLocation sx={{ mr: 1, color: "action.active" }} />
                    {params.InputProps.startAdornment}
                  </>
                ),
              }}
            />
          )}
        />

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Latitude"
            type="number"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="-42.8821"
            fullWidth
            inputProps={{
              step: 0.0001,
              min: -90,
              max: 90,
            }}
          />
          <TextField
            label="Longitude"
            type="number"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="147.3272"
            fullWidth
            inputProps={{
              step: 0.0001,
              min: -180,
              max: 180,
            }}
          />
        </Box>

        <Button
          variant="contained"
          size="large"
          onClick={handleSearch}
          disabled={loading || !lat || !lon}
          startIcon={<Search />}
          sx={{ py: 1.5 }}
        >
          {loading ? "Searching..." : "Search Photos"}
        </Button>
      </Stack>
    </Paper>
  );
}
