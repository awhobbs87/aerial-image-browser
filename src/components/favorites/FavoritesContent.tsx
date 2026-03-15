import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconHeart, IconTrash } from '@tabler/icons-react';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { formatDate, formatScale, getLayerTypeLabel } from '../../lib/format';
import type { EnhancedPhoto } from '../../types/photo';
import classes from './FavoritesContent.module.css';

function FavoriteCard({ photo }: { photo: EnhancedPhoto }) {
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  return (
    <Card className={classes.card} padding="sm" radius="md" withBorder>
      <Card.Section>
        <a href={`/viewer/${photo.layerId}/${photo.name}`}>
          <Image
            src={photo.thumbnailUrl}
            height={180}
            alt={photo.name}
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='180'%3E%3Crect fill='%23e9ecef' width='300' height='180'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23868e96' font-size='14'%3ENo preview%3C/text%3E%3C/svg%3E"
          />
        </a>
      </Card.Section>

      <Stack gap="xs" mt="sm">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600} size="sm" truncate>
            {photo.name}
          </Text>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={() => removeFavorite(photo.objectId, photo.layerId)}
            aria-label={`Remove ${photo.name} from favorites`}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        <Group gap="xs">
          <Badge size="xs" variant="light" color="emerald">
            {getLayerTypeLabel(photo.layerId)}
          </Badge>
          {photo.year > 0 && (
            <Badge size="xs" variant="light" color="gray">
              {photo.year}
            </Badge>
          )}
          {photo.scale > 0 && (
            <Badge size="xs" variant="light" color="gray">
              {formatScale(photo.scale)}
            </Badge>
          )}
        </Group>

        {photo.dateFlown > 0 && (
          <Text size="xs" c="dimmed">
            {formatDate(photo.dateFlown)}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

function EmptyState() {
  return (
    <Stack align="center" gap="md" py="xl">
      <IconHeart size={48} stroke={1.2} opacity={0.3} />
      <Stack align="center" gap={4}>
        <Title order={4} c="dimmed">
          No favorites yet
        </Title>
        <Text size="sm" c="dimmed" maw={360} ta="center">
          Heart a photo from search results to save it here for quick access.
        </Text>
      </Stack>
      <Button component="a" href="/" variant="light" color="emerald" size="sm">
        Search photos
      </Button>
    </Stack>
  );
}

export function FavoritesContent() {
  const favorites = useFavoritesStore((s) => s.favorites);
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);

  if (favorites.length === 0) {
    return <EmptyState />;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {favorites.length} {favorites.length === 1 ? 'photo' : 'photos'} saved
        </Text>
        <Button
          variant="subtle"
          color="red"
          size="xs"
          leftSection={<IconTrash size={14} />}
          onClick={clearFavorites}
        >
          Clear all
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4 }} spacing="md">
        {favorites.map((photo) => (
          <FavoriteCard key={`${photo.layerId}-${photo.objectId}`} photo={photo} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
