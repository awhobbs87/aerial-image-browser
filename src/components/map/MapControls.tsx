import { IconPlus, IconMinus, IconCurrentLocation, IconSearch } from '@tabler/icons-react';
import { Tooltip } from '@/components/ui/Tooltip';

interface MapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onLocateMe?: () => void;
  onSearchHere?: () => void;
  showSearchHere?: boolean;
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip label={label} side="left">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-950/10 bg-white/90 text-slate-700 shadow-md backdrop-blur-md transition duration-100 hover:bg-white hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-white/10 dark:bg-slate-950/85 dark:text-slate-200 dark:hover:bg-slate-900"
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onLocateMe,
  onSearchHere,
  showSearchHere = false,
}: MapControlsProps) {
  return (
    <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-1.5">
      {showSearchHere && (
        <ControlButton label="Search this area" onClick={onSearchHere}>
          <IconSearch size={18} />
        </ControlButton>
      )}
      <ControlButton label="Zoom in" onClick={onZoomIn}>
        <IconPlus size={18} />
      </ControlButton>
      <ControlButton label="Zoom out" onClick={onZoomOut}>
        <IconMinus size={18} />
      </ControlButton>
      <ControlButton label="My location" onClick={onLocateMe}>
        <IconCurrentLocation size={18} />
      </ControlButton>
    </div>
  );
}
