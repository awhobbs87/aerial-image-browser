import { IconKeyboard } from '@tabler/icons-react';
import { Dialog } from '@/components/ui/Dialog';

interface KeyboardShortcutsHelpProps {
  opened: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['/', 'Ctrl', 'K'], description: 'Focus search' },
  { keys: ['Escape'], description: 'Close panel / blur search' },
  { keys: ['G'], description: 'Toggle grid view' },
  { keys: ['T'], description: 'Toggle timeline view' },
  { keys: ['F'], description: 'Toggle filter panel' },
  { keys: ['M'], description: 'Toggle map expanded' },
  { keys: ['1'], description: 'Comparison: slider mode' },
  { keys: ['2'], description: 'Comparison: side-by-side mode' },
  { keys: ['3'], description: 'Comparison: then vs now mode' },
  { keys: ['?'], description: 'Show this help' },
];

export function KeyboardShortcutsHelp({ opened, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog
      open={opened}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        <span className="inline-flex items-center gap-2">
          <IconKeyboard size={18} />
          Keyboard Shortcuts
        </span>
      }
      className="overflow-hidden"
    >
      <div className="max-h-[70dvh] overflow-y-auto p-3">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wider text-slate-500 uppercase dark:text-slate-400">
              <th className="px-2 py-2 font-bold">Shortcut</th>
              <th className="px-2 py-2 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((shortcut) => (
              <tr
                key={shortcut.description}
                className="border-t border-slate-950/10 dark:border-white/10"
              >
                <td className="px-2 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span key={i} className="inline-flex items-center gap-1">
                        {i > 0 && <span className="text-xs text-slate-400">+</span>}
                        <kbd className="rounded-md border border-slate-950/10 bg-slate-950/5 px-1.5 py-0.5 text-xs font-bold dark:border-white/10 dark:bg-white/10">
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-2 text-slate-600 dark:text-slate-300">
                  {shortcut.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
