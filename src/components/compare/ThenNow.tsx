import { useState } from 'react';
import { SegmentedControl, Stack, Text, Paper, Image, Center } from '@mantine/core';
import type { EnhancedPhoto } from '@/types/photo';

interface ThenNowProps {
  photo: EnhancedPhoto;
}

export function ThenNow({ photo }: ThenNowProps) {
  const [view, setView] = useState<'then' | 'now'>('then');

  const historicalUrl = `/api/images/thumbnail/${photo.layerId}/${photo.name}`;

  // Esri World Imagery tile at approximate center of photo footprint
  // This is a simple static export -- real implementation would use the actual photo bounds
  const satelliteUrl = photo.rings && photo.rings[0]
    ? `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${getBbox(photo.rings)}&size=800,600&format=jpg&f=image`
    : null;

  return (
    <Stack gap="md">
      <Center>
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as 'then' | 'now')}
          data={[
            { label: `Then (${photo.year || 'Historical'})`, value: 'then' },
            { label: 'Now (Satellite)', value: 'now' },
          ]}
        />
      </Center>

      <Paper radius="md" style={{ overflow: 'hidden', aspectRatio: '4/3' }}>
        {view === 'then' ? (
          <Image
            src={historicalUrl}
            alt={`${photo.name} - Historical`}
            fit="contain"
            h="100%"
            w="100%"
          />
        ) : satelliteUrl ? (
          <Image
            src={satelliteUrl}
            alt={`${photo.name} - Current satellite`}
            fit="contain"
            h="100%"
            w="100%"
          />
        ) : (
          <Center h="100%">
            <Text c="dimmed">Satellite imagery unavailable for this location</Text>
          </Center>
        )}
      </Paper>

      <Text size="sm" c="dimmed" ta="center">
        {view === 'then'
          ? `Historical aerial photo from ${photo.year || 'unknown year'}`
          : 'Current Esri World Imagery satellite view'}
      </Text>
    </Stack>
  );
}

function getBbox(rings: number[][][]): string {
  if (!rings[0] || rings[0].length === 0) return '0,0,0,0';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const point of rings[0]) {
    if (point[0] < minX) minX = point[0];
    if (point[1] < minY) minY = point[1];
    if (point[0] > maxX) maxX = point[0];
    if (point[1] > maxY) maxY = point[1];
  }
  return `${minX},${minY},${maxX},${maxY}`;
}
