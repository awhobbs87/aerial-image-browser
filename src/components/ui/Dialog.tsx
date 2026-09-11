import { IconX } from '@tabler/icons-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import {
  Dialog as DialogRoot,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  accessibleTitle?: string;
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
  accessibleTitle = 'Photo preview',
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
    <DialogRoot open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        overlayClassName="z-overlay bg-slate-950/62 backdrop-blur-[3px]"
        className={cn(
          'z-modal gap-0 overflow-hidden border-border bg-popover p-0 text-popover-foreground shadow-[0_28px_80px_rgba(15,23,42,0.28)]',
          sheet === 'bottom'
            ? 'top-auto right-0 bottom-0 left-0 max-h-[82dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl rounded-b-none pb-[env(safe-area-inset-bottom)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:pb-0'
            : 'top-auto bottom-0 left-0 max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl rounded-b-none sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(92vw,42rem)] sm:max-w-none sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
          className,
        )}
      >
        {!title && <DialogTitle className="sr-only">{accessibleTitle}</DialogTitle>}
        {title && (
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <DialogTitle className="text-sm font-bold">{title}</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close dialog">
                <IconX size={16} />
              </Button>
            </DialogClose>
          </div>
        )}
        {children}
      </DialogContent>
    </DialogRoot>
  );
}
