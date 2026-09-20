import type { ReactElement } from 'react';
import { Tooltip as KumoTooltip, TooltipProvider } from '@cloudflare/kumo/components/tooltip';

interface TooltipProps {
  label: string;
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  return (
    <TooltipProvider delay={120} closeDelay={80}>
      <KumoTooltip content={label} side={side} render={children} />
    </TooltipProvider>
  );
}
