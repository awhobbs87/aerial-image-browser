import { useState, useCallback } from 'react';
import {
  Modal,
  TextInput,
  Button,
  Stack,
  Text,
  Group,
  Paper,
  Badge,
  Loader,
  Alert,
} from '@mantine/core';
import { IconSparkles, IconSearch, IconMapPin, IconCalendar, IconZoom } from '@tabler/icons-react';
import { api } from '@/lib/api-client';
import { geocodeSearch } from '@/lib/geocoding';
import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';

interface AISearchModalProps {
  opened: boolean;
  onClose: () => void;
  onSearch?: (lat: number, lon: number, label: string) => void;
}

interface ParsedQuery {
  location: string;
  startYear?: number;
  endYear?: number;
  resolution?: string;
  imageType?: string;
  additionalContext?: string;
}

export function AISearchModal({ opened, onClose, onSearch }: AISearchModalProps) {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { setQuery: setSearchQuery, setLocation } = useSearchStore();
  const { setDateRange, setLayers } = useFilterStore();

  const handleSubmit = useCallback(async () => {
    if (!query.trim()) return;

    setIsProcessing(true);
    setError(null);
    setParsed(null);

    try {
      // Step 1: AI parses the natural language query
      const parseResponse = await api.post<{
        success: boolean;
        data: ParsedQuery;
      }>('/api/ai/parse-search', { query });

      if (!parseResponse.success) {
        setError('Failed to parse search query');
        return;
      }

      const parsedData = parseResponse.data;
      setParsed(parsedData);

      // Step 2: Geocode the extracted location
      const geoResults = await geocodeSearch(parsedData.location, 3);

      if (geoResults.length === 0) {
        setError(`Could not find location: "${parsedData.location}"`);
        return;
      }

      const topResult = geoResults[0];

      // Step 3: Apply parsed filters
      if (parsedData.startYear || parsedData.endYear) {
        setDateRange(parsedData.startYear ?? null, parsedData.endYear ?? null);
      }

      if (parsedData.imageType) {
        const layerMap: Record<string, number[]> = {
          aerial: [0],
          ortho: [1],
          digital: [2],
        };
        if (layerMap[parsedData.imageType]) {
          setLayers(layerMap[parsedData.imageType]);
        }
      }

      // Step 4: Set search location
      setSearchQuery(parsedData.location);
      setLocation(topResult.lat, topResult.lon);

      onSearch?.(topResult.lat, topResult.lon, parsedData.location);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsProcessing(false);
    }
  }, [query, setSearchQuery, setLocation, setDateRange, setLayers, onSearch, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleSubmit();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSparkles size={20} />
          <Text fw={600}>AI Search</Text>
        </Group>
      }
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Describe what you're looking for in natural language.
        </Text>

        <TextInput
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Find aerial photos of Sandy Bay from the 1950s"
          size="md"
          leftSection={<IconSearch size={18} />}
          rightSection={
            isProcessing ? (
              <Loader size="xs" />
            ) : (
              <Text size="xs" c="dimmed" fw={500} style={{ fontSize: 10 }}>
                Enter
              </Text>
            )
          }
          autoFocus
        />

        <Group gap="xs">
          <Text size="xs" c="dimmed">
            Try:
          </Text>
          {[
            'Hobart CBD in the 1940s',
            'High resolution photos of Launceston',
            'Port Arthur historical aerials',
          ].map((suggestion) => (
            <Badge
              key={suggestion}
              variant="light"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setQuery(suggestion);
              }}
            >
              {suggestion}
            </Badge>
          ))}
        </Group>

        {parsed && (
          <Paper p="sm" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="xs" fw={600} c="dimmed">
                Parsed query:
              </Text>
              <Group gap="md">
                <Group gap={4}>
                  <IconMapPin size={14} />
                  <Text size="sm">{parsed.location}</Text>
                </Group>
                {(parsed.startYear || parsed.endYear) && (
                  <Group gap={4}>
                    <IconCalendar size={14} />
                    <Text size="sm">
                      {parsed.startYear || '...'} - {parsed.endYear || '...'}
                    </Text>
                  </Group>
                )}
                {parsed.imageType && (
                  <Badge size="sm" variant="light">
                    {parsed.imageType}
                  </Badge>
                )}
                {parsed.resolution && (
                  <Group gap={4}>
                    <IconZoom size={14} />
                    <Text size="sm">{parsed.resolution} res</Text>
                  </Group>
                )}
              </Group>
            </Stack>
          </Paper>
        )}

        {error && (
          <Alert color="red" variant="light" title="Error">
            {error}
          </Alert>
        )}

        <Button
          onClick={handleSubmit}
          loading={isProcessing}
          leftSection={<IconSparkles size={16} />}
          disabled={!query.trim()}
          fullWidth
        >
          Search with AI
        </Button>
      </Stack>
    </Modal>
  );
}
