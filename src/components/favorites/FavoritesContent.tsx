import { IconHeart, IconTrash } from '@tabler/icons-react';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { formatDate, formatScale, getLayerTypeLabel } from '../../lib/format';
import type { EnhancedPhoto } from '../../types/photo';

function FavoriteCard({ photo }: { photo: EnhancedPhoto }) {
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  return (
    <article className="group overflow-hidden rounded-lg border border-slate-950/9 bg-white/78 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-slate-950/14 hover:shadow-[0_16px_36px_rgba(15,23,42,0.1)] dark:border-white/9 dark:bg-white/4 dark:hover:border-white/14">
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
          <button
            type="button"
            onClick={() => removeFavorite(photo.objectId, photo.layerId)}
            aria-label={`Remove ${photo.name} from favorites`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
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
    <div className="app-empty-state">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-500/8 text-rose-500 ring-1 ring-rose-500/12">
        <IconHeart size={24} stroke={1.5} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-600 dark:text-slate-300">No favorites yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Heart a photo from search results to save it here for quick access.
        </p>
      </div>
      <a
        href="/search"
        className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:bg-white dark:text-slate-950"
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
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-950/8 pb-3 dark:border-white/8">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {favorites.length} {favorites.length === 1 ? 'photo' : 'photos'} saved
        </p>
        <button
          type="button"
          onClick={clearFavorites}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-500 transition hover:bg-red-500/8 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:text-slate-400"
        >
          <IconTrash size={14} />
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[30rem]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {favorites.map((photo) => (
          <FavoriteCard key={`${photo.layerId}-${photo.objectId}`} photo={photo} />
        ))}
      </div>
    </div>
  );
}
