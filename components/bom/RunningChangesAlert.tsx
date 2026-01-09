'use client';

import { AlertTriangle, ArrowRight, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RunningChangesAlertProps {
  /** Number of affected parts */
  affectedCount: number;
  /** Whether the running changes are still loading */
  loading?: boolean;
  /** Callback when user clicks to view affected parts */
  onViewAffectedParts: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Alert banner shown in BOM Explorer when there are running changes
 * that affect parts in the current project's BOM
 */
export function RunningChangesAlert({
  affectedCount,
  loading = false,
  onViewAffectedParts,
  className,
}: RunningChangesAlertProps) {
  // Don't show if no affected parts (and not loading)
  if (!loading && affectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 p-3 rounded-lg border',
        'bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/30',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {loading ? (
          <RefreshCcw className="h-5 w-5 text-[var(--accent-orange)] animate-spin" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-[var(--accent-orange)]" />
        )}
        <div>
          <p className="font-medium text-[var(--text-primary)]">
            {loading ? (
              'Checking for running changes...'
            ) : (
              <>Running Changes Detected</>
            )}
          </p>
          {!loading && (
            <p className="text-sm text-[var(--text-secondary)]">
              {affectedCount} {affectedCount === 1 ? 'part' : 'parts'} in this BOM {affectedCount === 1 ? 'is' : 'are'} affected by active running changes.
            </p>
          )}
        </div>
      </div>
      
      {!loading && (
        <Button
          variant="outline"
          size="sm"
          onClick={onViewAffectedParts}
          className="border-[var(--accent-orange)] text-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/10"
        >
          View Affected Parts
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
