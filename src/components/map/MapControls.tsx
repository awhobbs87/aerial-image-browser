import { ActionIcon, Stack, Tooltip } from '@mantine/core';
import { IconPlus, IconMinus, IconCurrentLocation, IconSearch } from '@tabler/icons-react';
import classes from './MapControls.module.css';

interface MapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onLocateMe?: () => void;
  onSearchHere?: () => void;
  showSearchHere?: boolean;
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onLocateMe,
  onSearchHere,
  showSearchHere = false,
}: MapControlsProps) {
  return (
    <div className={classes.controls}>
      <Stack gap={4}>
        {showSearchHere && (
          <Tooltip label="Search this area" position="left" withArrow>
            <ActionIcon
              variant="white"
              size="lg"
              onClick={onSearchHere}
              aria-label="Search this area"
            >
              <IconSearch size={18} />
            </ActionIcon>
          </Tooltip>
        )}
        <Tooltip label="Zoom in" position="left" withArrow>
          <ActionIcon variant="white" size="lg" onClick={onZoomIn} aria-label="Zoom in">
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Zoom out" position="left" withArrow>
          <ActionIcon variant="white" size="lg" onClick={onZoomOut} aria-label="Zoom out">
            <IconMinus size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="My location" position="left" withArrow>
          <ActionIcon variant="white" size="lg" onClick={onLocateMe} aria-label="My location">
            <IconCurrentLocation size={18} />
          </ActionIcon>
        </Tooltip>
      </Stack>
    </div>
  );
}
