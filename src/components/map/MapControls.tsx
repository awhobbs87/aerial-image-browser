import {
  CrosshairIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  type Icon,
} from '@phosphor-icons/react';
import { Button } from '@cloudflare/kumo/components/button';
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
  icon,
}: {
  label: string;
  onClick?: () => void;
  icon: Icon;
}) {
  return (
    <Tooltip label={label} side="left">
      <Button
        type="button"
        onClick={onClick}
        aria-label={label}
        icon={icon}
        variant="secondary"
        shape="square"
        size="lg"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-950/10 bg-white/90 text-slate-700 shadow-md backdrop-blur-md transition duration-100 hover:bg-white hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-border dark:bg-slate-950/85 dark:text-slate-200 dark:hover:bg-slate-900"
      />
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
        <ControlButton label="Search this area" onClick={onSearchHere} icon={MagnifyingGlassIcon} />
      )}
      <ControlButton label="Zoom in" onClick={onZoomIn} icon={PlusIcon} />
      <ControlButton label="Zoom out" onClick={onZoomOut} icon={MinusIcon} />
      <ControlButton label="My location" onClick={onLocateMe} icon={CrosshairIcon} />
    </div>
  );
}
