import { Tabs } from '@cloudflare/kumo/components/tabs';
import { Button, LinkButton } from '@cloudflare/kumo/components/button';
import { AppProviders } from '@/components/common/AppProviders';
import { useComparisonStore } from '@/stores/comparisonStore';
import { ComparisonTray } from '@/components/compare/ComparePhotoButton';
import { CompareSlider } from '@/components/compare/CompareSlider';
import { CompareSideBySide } from '@/components/compare/CompareSideBySide';
import { ThenNow } from '@/components/compare/ThenNow';
import { photoDateLabel } from '@/lib/photo-metadata';
import { formatScale } from '@/lib/format';
function CompareContent() {
  const { photoA, photoB, mode, setMode, clear } = useComparisonStore();
  const first = photoA || photoB;
  return (
    <div className="space-y-4">
      <ComparisonTray />
      {!first ? (
        <div className="app-empty-state">
          <h2>Select photos to compare</h2>
          <p>Open a photo preview and choose Add to compare.</p>
          <LinkButton href="/search">Browse imagery</LinkButton>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/search" variant="secondary">
              Choose another photo
            </LinkButton>
            <Button variant="ghost" onClick={clear}>
              Clear comparison
            </Button>
          </div>
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as typeof mode)}
            tabs={[
              { value: 'slider', label: 'Slider' },
              { value: 'side-by-side', label: 'Side by side' },
              { value: 'then-now', label: 'Modern reference' },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            Historical scans may differ in rotation, scale and coverage. These views are not
            geographically aligned and should not be used for precise measurements.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[photoA, photoB].map(
              (photo, i) =>
                photo && (
                  <div key={i} className="rounded-xl bg-card p-3 text-sm">
                    <p className="font-semibold">
                      {photoDateLabel(photo)} · {photo.name}
                    </p>
                    <p>
                      {photo.layerName || 'Survey unknown'} ·{' '}
                      {formatScale(photo.scale) || 'Scale unknown'}
                    </p>
                  </div>
                ),
            )}
          </div>
          {mode === 'then-now' ? (
            <ThenNow photo={first} />
          ) : photoA && photoB ? (
            mode === 'slider' ? (
              <CompareSlider photoA={photoA} photoB={photoB} />
            ) : (
              <CompareSideBySide photoA={photoA} photoB={photoB} />
            )
          ) : (
            <p role="status">
              Choose a second photo, ideally from another year covering the same location.
            </p>
          )}
        </>
      )}
    </div>
  );
}
export function CompareIsland() {
  return (
    <AppProviders>
      <CompareContent />
    </AppProviders>
  );
}
