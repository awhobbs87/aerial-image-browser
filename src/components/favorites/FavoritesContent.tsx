import { IconHeart, IconTrash } from '@tabler/icons-react';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { formatDate, formatScale, getLayerTypeLabel } from '../../lib/format';
import type { EnhancedPhoto } from '../../types/photo';

function FavoriteCard({ photo }: { photo: EnhancedPhoto }) {
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-950/10 bg-white/75 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5">
      <a
        href={`/viewer/${photo.layerId}/${photo.name}`}
        className="block overflow-hidden bg-slate-950"
      >
        <img
          src={photo.thumbnailUrl}
          alt={photo.name}
          loading="lazy"
          className="h-44 w-full object-cover transition duration-200 hover:scale-[1.025]"
        />
      </a>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-bold text-slate-950 dark:text-slate-50">
            {photo.name}
          </h3>
          <button
            type="button"
            onClick={() => removeFavorite(photo.objectId, photo.layerId)}
            aria-label={`Remove ${photo.name} from favorites`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          >
            <IconTrash size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className="rounded-full bg-sky-600/10 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300">
            {getLayerTypeLabel(photo.layerId)}
          </span>
          {photo.year > 0 && (
            <span className="rounded-full bg-slate-950/5 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {photo.year}
            </span>
          )}
          {photo.scale > 0 && (
            <span className="rounded-full bg-slate-950/5 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {formatScale(photo.scale)}
            </span>
          )}
        </div>

        {photo.dateFlown > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(photo.dateFlown)}
          </p>
        )}
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <IconHeart size={48} stroke={1.2} className="text-slate-400" />
      <div>
        <h2 className="text-base font-bold text-slate-600 dark:text-slate-300">No favorites yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Heart a photo from search results to save it here for quick access.
        </p>
      </div>
      <a
        href="/"
        className="rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        Search photos
      </a>
    </div>
  );
}

export function FavoritesContent() {
  const favorites = useFavoritesStore((s) => s.favorites);
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);

  if (favorites.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {favorites.length} {favorites.length === 1 ? 'photo' : 'photos'} saved
        </p>
        <button
          type="button"
          onClick={clearFavorites}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-red-500 transition hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        >
          <IconTrash size={14} />
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {favorites.map((photo) => (
          <FavoriteCard key={`${photo.layerId}-${photo.objectId}`} photo={photo} />
        ))}
      </div>
    </div>
  );
}
