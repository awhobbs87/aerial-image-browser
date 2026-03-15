import { Drawer, ScrollArea } from '@mantine/core';
import { useUIStore } from '@/stores/uiStore';
import { FilterPanel } from './FilterPanel';

export function MobileFilterSheet() {
  const { filterPanelOpen, setFilterPanelOpen } = useUIStore();

  return (
    <Drawer
      opened={filterPanelOpen}
      onClose={() => setFilterPanelOpen(false)}
      position="bottom"
      size="80%"
      radius="lg"
      title="Filters"
      styles={{
        body: { padding: 0 },
      }}
    >
      <ScrollArea h="100%" p="md">
        <FilterPanel onClose={() => setFilterPanelOpen(false)} />
      </ScrollArea>
    </Drawer>
  );
}
