'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Copy,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BomTransferBarProps {
  selectedCount: number;
  duplicateCount?: number;
  onTransfer: () => void;
  onClear: () => void;
  transferring?: boolean;
  lastTransferResult?: {
    success: boolean;
    transferred: number;
    skipped: number;
    message?: string;
  } | null;
  onDismissResult?: () => void;
}

export function BomTransferBar({
  selectedCount,
  duplicateCount = 0,
  onTransfer,
  onClear,
  transferring = false,
  lastTransferResult,
  onDismissResult,
}: BomTransferBarProps) {
  const hasSelection = selectedCount > 0;
  const newItemsCount = selectedCount - duplicateCount;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50',
        hasSelection && 'bg-[var(--accent-blue)]/5 border-[var(--accent-blue)]/20'
      )}
    >
      {/* Transfer result notification */}
      {lastTransferResult && (
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
            lastTransferResult.success
              ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
              : 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]'
          )}
        >
          {lastTransferResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span>
            {lastTransferResult.transferred} item{lastTransferResult.transferred !== 1 ? 's' : ''} copied
            {lastTransferResult.skipped > 0 && `, ${lastTransferResult.skipped} skipped (duplicates)`}
          </span>
          {onDismissResult && (
            <button
              onClick={onDismissResult}
              className="ml-1 hover:opacity-70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Selection info */}
      {!lastTransferResult && (
        <>
          {hasSelection ? (
            <div className="flex items-center gap-2 text-sm">
              <Badge
                variant="outline"
                className="bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/30"
              >
                {selectedCount} selected
              </Badge>
              {duplicateCount > 0 && (
                <span className="flex items-center gap-1 text-[var(--accent-orange)] text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {duplicateCount} already in Working BOM
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-[var(--text-secondary)]">
              Select items from Template BOM to copy
            </span>
          )}
        </>
      )}

      <div className="flex-1" />

      {/* Action buttons */}
      {hasSelection && !lastTransferResult && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear Selection
          </Button>
          <Button
            size="sm"
            onClick={onTransfer}
            disabled={transferring || newItemsCount === 0}
            className={cn(
              'h-8 text-xs',
              'bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90'
            )}
          >
            {transferring ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1" />
            )}
            Copy {newItemsCount > 0 ? newItemsCount : selectedCount} to Working BOM
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </>
      )}
    </div>
  );
}


