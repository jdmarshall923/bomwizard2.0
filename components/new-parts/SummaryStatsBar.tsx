'use client';

import { cn } from '@/lib/utils';
import { NewPartStats } from '@/types/newPart';
import { AlertTriangle, CheckCircle2, Clock, Package, Ship, XCircle } from 'lucide-react';

interface SummaryStatsBarProps {
  stats: NewPartStats;
  onFilterClick?: (filter: string) => void;
  className?: string;
}

export function SummaryStatsBar({ stats, onFilterClick, className }: SummaryStatsBarProps) {
  return (
    <div className={cn(
      'flex items-center gap-4 px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm text-xs',
      className
    )}>
      {/* Total */}
      <button 
        onClick={() => onFilterClick?.('all')}
        className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <Package className="h-3.5 w-3.5" />
        <span className="font-medium">{stats.total}</span>
        <span>parts</span>
      </button>

      <div className="h-4 w-px bg-[var(--border-subtle)]" />

      {/* Ordered */}
      <button 
        onClick={() => onFilterClick?.('ordered')}
        className="flex items-center gap-1.5 text-[var(--accent-green)] hover:opacity-80 transition-opacity"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="font-medium">{stats.ordered}</span>
        <span>ordered</span>
      </button>

      <div className="h-4 w-px bg-[var(--border-subtle)]" />

      {/* Sprint Status */}
      <div className="flex items-center gap-3">
        <span className="text-[var(--text-tertiary)]">Sprint:</span>
        <button 
          onClick={() => onFilterClick?.('sprint-at-risk')}
          className={cn(
            "flex items-center gap-1 transition-opacity",
            stats.sprintAtRisk > 0 
              ? "text-[var(--accent-orange)] hover:opacity-80" 
              : "text-[var(--text-tertiary)]"
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          <span className="font-medium">{stats.sprintAtRisk}</span>
          <span>at risk</span>
        </button>
        <button 
          onClick={() => onFilterClick?.('sprint-late')}
          className={cn(
            "flex items-center gap-1 transition-opacity",
            stats.sprintLate > 0 
              ? "text-[var(--accent-red)] hover:opacity-80" 
              : "text-[var(--text-tertiary)]"
          )}
        >
          <XCircle className="h-3 w-3" />
          <span className="font-medium">{stats.sprintLate}</span>
          <span>late</span>
        </button>
      </div>

      <div className="h-4 w-px bg-[var(--border-subtle)]" />

      {/* Production Status */}
      <div className="flex items-center gap-3">
        <span className="text-[var(--text-tertiary)]">Prod:</span>
        <button 
          onClick={() => onFilterClick?.('prod-at-risk')}
          className={cn(
            "flex items-center gap-1 transition-opacity",
            stats.productionAtRisk > 0 
              ? "text-[var(--accent-orange)] hover:opacity-80" 
              : "text-[var(--text-tertiary)]"
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          <span className="font-medium">{stats.productionAtRisk}</span>
          <span>at risk</span>
        </button>
        <button 
          onClick={() => onFilterClick?.('prod-late')}
          className={cn(
            "flex items-center gap-1 transition-opacity",
            stats.productionLate > 0 
              ? "text-[var(--accent-red)] hover:opacity-80" 
              : "text-[var(--text-tertiary)]"
          )}
        >
          <XCircle className="h-3 w-3" />
          <span className="font-medium">{stats.productionLate}</span>
          <span>late</span>
        </button>
      </div>

      {/* Long Lead Time Indicator (if any) */}
      {stats.longLeadTime > 0 && (
        <>
          <div className="h-4 w-px bg-[var(--border-subtle)]" />
          <button 
            onClick={() => onFilterClick?.('long-lead')}
            className="flex items-center gap-1.5 text-[var(--accent-orange)] hover:opacity-80 transition-opacity"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">{stats.longLeadTime}</span>
            <span>early order</span>
          </button>
        </>
      )}

      {/* Unassigned (if any) */}
      {stats.unassigned > 0 && (
        <>
          <div className="ml-auto h-4 w-px bg-[var(--border-subtle)]" />
          <button 
            onClick={() => onFilterClick?.('unassigned')}
            className="flex items-center gap-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Ship className="h-3.5 w-3.5" />
            <span className="font-medium">{stats.unassigned}</span>
            <span>unassigned</span>
          </button>
        </>
      )}
    </div>
  );
}

