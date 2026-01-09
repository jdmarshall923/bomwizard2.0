'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CellMetadata } from '@/types/bom';
import { format } from 'date-fns';

/**
 * Phase 14: Cell Override Indicator
 * 
 * Visual indicator (orange dot) that shows when a cell
 * value has been overridden from its original source.
 * 
 * Displays tooltip with override details and revert option.
 */

interface CellOverrideIndicatorProps {
  // Override metadata
  cellMetadata: CellMetadata;
  
  // Current and original values
  currentValue: string | number | null;
  fieldDisplayName: string;
  
  // Callbacks
  onRevert?: () => void;
  
  // Format helpers
  formatValue?: (value: any) => string;
  
  // Styling
  className?: string;
  size?: 'sm' | 'md';
}

export function CellOverrideIndicator({
  cellMetadata,
  currentValue,
  fieldDisplayName,
  onRevert,
  formatValue = (v) => v?.toString() ?? '—',
  className,
  size = 'sm',
}: CellOverrideIndicatorProps) {
  // Don't render if not overridden
  if (cellMetadata.source !== 'manual' || cellMetadata.originalValue === undefined) {
    return null;
  }
  
  // Format the override date
  const overrideDate = cellMetadata.overriddenAt?.toDate?.();
  const formattedDate = overrideDate 
    ? format(overrideDate, 'MMM d, yyyy \'at\' HH:mm')
    : 'Unknown date';
  
  // Source type display
  const originalSourceDisplay = {
    master: 'Master Data',
    calculated: 'Calculated',
    imported: 'Imported',
    contract: 'Vendor Contract',
  }[cellMetadata.source] || 'Original';
  
  // Dot size
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'rounded-full bg-[var(--accent-orange)] cursor-help',
              dotSize,
              className
            )}
            aria-label={`${fieldDisplayName} has been overridden`}
          />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs p-0 overflow-hidden"
        >
          <div className="p-3 space-y-3">
            {/* Header */}
            <div className="font-medium text-[var(--text-primary)]">
              Override Info
            </div>
            
            {/* Original value */}
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-tertiary)]">Original</div>
              <div className="font-mono text-sm">
                {formatValue(cellMetadata.originalValue)}
                <span className="text-[var(--text-tertiary)] ml-1">
                  ({originalSourceDisplay})
                </span>
              </div>
            </div>
            
            {/* New value */}
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-tertiary)]">Changed to</div>
              <div className="font-mono text-sm text-[var(--accent-orange)]">
                {formatValue(currentValue)}
              </div>
            </div>
            
            {/* Override details */}
            {(cellMetadata.overriddenBy || cellMetadata.overriddenAt) && (
              <div className="space-y-1">
                <div className="text-xs text-[var(--text-tertiary)]">
                  {cellMetadata.overriddenBy && (
                    <span>By {cellMetadata.overriddenBy}</span>
                  )}
                  {cellMetadata.overriddenBy && cellMetadata.overriddenAt && (
                    <span> • </span>
                  )}
                  {cellMetadata.overriddenAt && (
                    <span>{formattedDate}</span>
                  )}
                </div>
              </div>
            )}
            
            {/* Reason if provided */}
            {cellMetadata.overrideReason && (
              <div className="space-y-1">
                <div className="text-xs text-[var(--text-tertiary)]">Reason</div>
                <div className="text-sm text-[var(--text-secondary)] italic">
                  &ldquo;{cellMetadata.overrideReason}&rdquo;
                </div>
              </div>
            )}
            
            {/* Revert button */}
            {onRevert && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRevert();
                }}
                className="w-full gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revert to Original
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Standalone dot indicator (without tooltip)
 * For use in table cells where tooltip is handled separately
 */
export function OverrideDot({
  className,
  size = 'sm',
}: {
  className?: string;
  size?: 'sm' | 'md';
}) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  
  return (
    <span
      className={cn(
        'rounded-full bg-[var(--accent-orange)]',
        dotSize,
        className
      )}
    />
  );
}
