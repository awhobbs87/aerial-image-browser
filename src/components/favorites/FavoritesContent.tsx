import { HeartIcon, TrashIcon } from '@phosphor-icons/react';
import { Badge } from '@cloudflare/kumo/components/badge';
import { Button, LinkButton } from '@cloudflare/kumo/components/button';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { formatDate, formatScale, getLayerTypeLabel } from '../../lib/format';
import type { EnhancedPhoto } from '../../types/photo';

function FavoriteCard({ photo }: { photo: EnhancedPhoto }) {
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  return (
    <LayerCard className="group overflow-hidden rounded-2xl border border-slate-950/9 bg-white/78 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-slate-950/14 hover:shadow-[0_16px_36px_rgba(15,23,42,0.1)] dark:border-border dark:bg-card dark:hover:border-white/14">
      <a
        href={`/viewer/${photo.layerId}/${photo.name}`}
        className="block overflow-hidden bg-slate-950"
      >
        <img
          src={photo.thumbnailUrl}
          alt={photo.name}
          loading="lazy"
          className="aspect-4/3 w-full object-cover transition duration-300 group-hover:scale-[1.025]"
        />
      </a>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-bold text-slate-950 dark:text-slate-50">
            {photo.name}
          </h3>
          <Button
            type="button"
            onClick={() => removeFavorite(photo.objectId, photo.layerId)}
            aria-label={`Remove ${photo.name} from favorites`}
            icon={TrashIcon}
            variant="ghost"
            shape="square"
            size="lg"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="info" className="text-[11px] font-bold">
            {getLayerTypeLabel(photo.layerId)}
          </Badge>
          {photo.year > 0 && (
            <Badge variant="secondary" className="text-[11px] font-bold">
              {photo.year}
            </Badge>
          )}
          {photo.scale > 0 && (
            <Badge variant="secondary" className="text-[11px] font-bold">
              {formatScale(photo.scale)}
            </Badge>
          )}
        </div>

        {photo.dateFlown > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(photo.dateFlown)}
          </p>
        )}
      </div>
    </LayerCard>
  );
}

function EmptyState() {
  return (
    <div className="app-empty-state">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-500/8 text-rose-500 ring-1 ring-rose-500/12">
        <HeartIcon size={24} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-600 dark:text-slate-300">No favorites yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Heart a photo from search results to save it here for quick access.
        </p>
      </div>
      <LinkButton href="/search" variant="primary" size="lg" className="mt-2">
        Search photos
      </LinkButton>
    </div>
  );
}

export function FavoritesContent() {
  const favorites = useFavoritesStore((s) => s.favorites);
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);

  if (favorites.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-950/8 pb-3 dark:border-border">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {favorites.length} {favorites.length === 1 ? 'photo' : 'photos'} saved
        </p>
        <Button
          type="button"
          onClick={clearFavorites}
          icon={TrashIcon}
          variant="secondary-destructive"
          size="lg"
        >
          Clear all
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[30rem]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {favorites.map((photo) => (
          <FavoriteCard key={`${photo.layerId}-${photo.objectId}`} photo={photo} />
        ))}
      </div>
    </div>
  );
}
