'use client';

import { NewPartStats } from '@/types/newPart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Plus,
  Zap,
  RefreshCw,
  Search,
  X,
  AlertTriangle,
} from 'lucide-react';

interface NewPartsHeaderProps {
  stats: NewPartStats;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddPart: () => void;
  onSyncBom: () => void;
  onRefresh: () => void;
  isSyncing?: boolean;
  isLoading?: boolean;
}

export function NewPartsHeader({
  stats,
  searchQuery,
  onSearchChange,
  onAddPart,
  onSyncBom,
  onRefresh,
  isSyncing = false,
  isLoading = false,
}: NewPartsHeaderProps) {
  const criticalCount = stats?.byPriority?.critical || 0;
  const missingInfoCount = stats?.total - (stats?.byStatus?.complete || 0); // Simplified

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
      {/* Left: Title + Metrics */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            New Parts
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-[var(--text-secondary)]">
              {stats?.total || 0} parts
            </span>
            {criticalCount > 0 && (
              <>
                <span className="text-[var(--text-tertiary)]">•</span>
                <Badge 
                  variant="outline" 
                  className="h-5 px-1.5 text-xs bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-[var(--accent-red)]/30"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {criticalCount} critical
                </Badge>
              </>
            )}
            {stats?.completedThisWeek > 0 && (
              <>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-xs text-[var(--accent-green)]">
                  +{stats.completedThisWeek} this week
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Search + Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search parts..."
            className="pl-9 h-9 bg-[var(--bg-tertiary)] border-[var(--border-subtle)] text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" />
            </button>
          )}
        </div>

        {/* Actions */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncBom}
          disabled={isSyncing}
          className="h-9 border-[var(--border-subtle)]"
        >
          <Zap className={cn("h-4 w-4 mr-1.5", isSyncing && "animate-pulse")} />
          {isSyncing ? 'Syncing...' : 'Sync BOM'}
        </Button>

        <Button
          size="sm"
          onClick={onAddPart}
          className="h-9 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Part
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 w-9"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}



