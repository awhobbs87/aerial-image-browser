import { useMemo, useRef } from 'react';
import { Timeline, Text, Group, Stack, ScrollArea, Card, Image, Skeleton, Center, Badge, UnstyledButton } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import type { EnhancedPhoto } from '@/types/photo';
import classes from './PhotoTimeline.module.css';

interface PhotoTimelineProps {
  photos: EnhancedPhoto[];
  isLoading: boolean;
  onPhotoClick?: (photo: EnhancedPhoto) => void;
}

export function PhotoTimeline({ photos, isLoading, onPhotoClick }: PhotoTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const groupedByYear = useMemo(() => {
    const groups: Map<number, EnhancedPhoto[]> = new Map();
    for (const photo of photos) {
      const year = photo.year || 0;
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year)!.push(photo);
    }
    // Sort by year descending
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [photos]);

  const years = groupedByYear.map(([year]) => year);

  const scrollToYear = (year: number) => {
    const el = document.getElementById(`timeline-year-${year}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isLoading) {
    return (
      <Stack gap="md">
        {Array.from({ length: 5 }).map((_, i) => (
          <Group key={i} gap="md" align="flex-start">
            <Skeleton circle height={40} />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Skeleton height={20} width={80} />
              <Group gap="sm">
                <Skeleton height={90} width={120} radius="md" />
                <Skeleton height={90} width={120} radius="md" />
                <Skeleton height={90} width={120} radius="md" />
              </Group>
            </Stack>
          </Group>
        ))}
      </Stack>
    );
  }

  if (photos.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">No photos to display in timeline</Text>
      </Center>
    );
  }

  return (
    <div ref={containerRef}>
      {/* Year jump nav */}
      <ScrollArea type="never" className={classes.yearNav}>
        <Group gap={4} wrap="nowrap">
          {years.filter(y => y > 0).map((year) => (
            <UnstyledButton
              key={year}
              className={classes.yearChip}
              onClick={() => scrollToYear(year)}
            >
              <Text size="xs" fw={600}>{year}</Text>
            </UnstyledButton>
          ))}
        </Group>
      </ScrollArea>

      {/* Timeline */}
      <Timeline active={groupedByYear.length - 1} bulletSize={32} lineWidth={2} mt="md">
        {groupedByYear.map(([year, yearPhotos]) => (
          <Timeline.Item
            key={year}
            id={`timeline-year-${year}`}
            bullet={<IconCalendar size={16} />}
            title={
              <Group gap="xs">
                <Text fw={700}>{year || 'Unknown'}</Text>
                <Badge size="sm" variant="light">{yearPhotos.length}</Badge>
              </Group>
            }
          >
            <ScrollArea type="hover" scrollbarSize={6} mt="xs">
              <Group gap="sm" wrap="nowrap" pb="xs">
                {yearPhotos.map((photo) => (
                  <Card
                    key={`${photo.layerId}-${photo.objectId}`}
                    shadow="xs"
                    radius="md"
                    padding={0}
                    className={classes.thumbCard}
                    onClick={() => onPhotoClick?.(photo)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Image
                      src={`/api/images/thumbnail/${photo.layerId}/${photo.name}`}
                      alt={photo.name}
                      h={90}
                      w={120}
                      fit="cover"
                      fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='90'%3E%3Crect fill='%23e0e0e0' width='120' height='90'/%3E%3C/svg%3E"
                    />
                    <Text size="xs" p={4} lineClamp={1} ta="center">
                      {photo.name}
                    </Text>
                  </Card>
                ))}
              </Group>
            </ScrollArea>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  );
}
