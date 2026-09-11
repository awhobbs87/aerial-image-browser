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
      className="flex flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <FilterPanel />
      </div>
    </Dialog>
  );
}
