import type { ReactNode } from 'react';
import {
  Tooltip as TooltipRoot,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip';

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={80}>
      <TooltipRoot>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} sideOffset={7} className="z-dropdown px-2 py-1 font-medium">
          {label}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}
