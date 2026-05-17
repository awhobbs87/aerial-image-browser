import { useUIStore } from '@/stores/uiStore';
import { FilterPanel } from './FilterPanel';
import { Dialog } from '@/components/ui/Dialog';

export function MobileFilterSheet() {
  const { filterPanelOpen, setFilterPanelOpen } = useUIStore();

  return (
    <Dialog
      open={filterPanelOpen}
      onOpenChange={setFilterPanelOpen}
      title="Filters"
      sheet="bottom"
      className="overflow-hidden"
    >
      <div className="max-h-[calc(82dvh-3.25rem)] overflow-y-auto">
        <FilterPanel onClose={() => setFilterPanelOpen(false)} />
      </div>
    </Dialog>
  );
}
