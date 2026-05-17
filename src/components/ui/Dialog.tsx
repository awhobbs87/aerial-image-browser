import * as DialogPrimitive from '@radix-ui/react-dialog';
import { IconX } from '@tabler/icons-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  sheet?: 'bottom' | 'center';
}

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
  sheet = 'center',
}: DialogProps) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-slate-950/55 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-modal border border-slate-950/10 bg-white text-slate-950 shadow-2xl outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-50',
            sheet === 'bottom'
              ? 'right-0 bottom-0 left-0 max-h-[82dvh] rounded-t-2xl pb-[calc(64px+env(safe-area-inset-bottom))] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:pb-0'
              : 'top-1/2 left-1/2 max-h-[86dvh] w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            className,
          )}
        >
          {title && (
            <div className="flex items-center justify-between border-b border-slate-950/10 px-4 py-3 dark:border-white/10">
              <DialogPrimitive.Title className="text-sm font-bold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Close className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
                <IconX size={16} />
              </DialogPrimitive.Close>
            </div>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
