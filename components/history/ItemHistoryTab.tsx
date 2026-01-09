'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Filter, 
  ChevronDown, 
  RefreshCw,
  User,
  Calendar,
  Edit3,
  Upload,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ChangeRecord, ChangeType } from '@/types/changes';
import { COLUMN_DEFINITIONS } from '@/types/settings';
import { getItemHistory } from '@/lib/services/changeTrackingService';
import { CellChangeCard } from './CellChangeCard';

/**
 * Phase 14: Item History Tab
 * 
 * Shows the complete change history for a BOM item.
 * Displayed in the ItemEditDrawer as a tab.
 */

interface ItemHistoryTabProps {
  projectId: string;
  itemId: string;
  itemCode: string;
}

interface HistoryFilters {
  field: string | null;
  changeType: ChangeType | null;
}

export function ItemHistoryTab({
  projectId,
  itemId,
  itemCode,
}: ItemHistoryTabProps) {
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>({
    field: null,
    changeType: null,
  });
  const [hasMore, setHasMore] = useState(false);
  
  // Load history
  const loadHistory = useCallback(async (append = false) => {
    if (!projectId || !itemId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { changes: loadedChanges } = await getItemHistory(
        projectId,
        itemId,
        { limit: 50 }
      );
      
      setChanges(append ? [...changes, ...loadedChanges] : loadedChanges);
      setHasMore(loadedChanges.length === 50);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError(err instanceof Error ? err : new Error('Failed to load history'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, itemId, changes]);
  
  // Load on mount
  useEffect(() => {
    loadHistory();
  }, [projectId, itemId]); // Don't include loadHistory to avoid infinite loop
  
  // Filter changes
  const filteredChanges = changes.filter(change => {
    if (filters.field && change.field !== filters.field) return false;
    if (filters.changeType && change.changeType !== filters.changeType) return false;
    return true;
  });
  
  // Get unique fields from changes
  const uniqueFields = [...new Set(changes.map(c => c.field))];
  
  // Get unique change types from changes
  const uniqueChangeTypes = [...new Set(changes.map(c => c.changeType))];
  
  // Loading state
  if (isLoading && changes.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          Failed to Load History
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {error.message}
        </p>
        <Button variant="outline" onClick={() => loadHistory()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }
  
  // Empty state
  if (changes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          No Change History
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Changes to this item will appear here.
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with filters */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[var(--text-tertiary)]" />
          <span className="font-medium">History</span>
          <Badge variant="secondary">{filteredChanges.length}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Field filter */}
          <Select
            value={filters.field || 'all'}
            onValueChange={(value) => setFilters(prev => ({
              ...prev,
              field: value === 'all' ? null : value,
            }))}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="All Fields" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              {uniqueFields.map(field => (
                <SelectItem key={field} value={field}>
                  {COLUMN_DEFINITIONS[field]?.displayName || field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Change type filter */}
          <Select
            value={filters.changeType || 'all'}
            onValueChange={(value) => setFilters(prev => ({
              ...prev,
              changeType: value === 'all' ? null : value as ChangeType,
            }))}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueChangeTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {getChangeTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Changes list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredChanges.map((change, index) => (
            <CellChangeCard 
              key={change.id} 
              change={change}
              showItemInfo={false}
            />
          ))}
          
          {/* Load more button */}
          {hasMore && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => loadHistory(true)}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-2" />
              )}
              Load More
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getChangeTypeLabel(type: ChangeType): string {
  const labels: Record<ChangeType, string> = {
    manual: 'Manual Edit',
    import: 'Import',
    sync: 'Sync',
    calculated: 'Calculated',
    override: 'Override',
    bulk: 'Bulk Edit',
    revert: 'Revert',
  };
  return labels[type] || type;
}

function getChangeTypeIcon(type: ChangeType) {
  switch (type) {
    case 'manual':
      return <Edit3 className="h-4 w-4" />;
    case 'import':
      return <Upload className="h-4 w-4" />;
    case 'sync':
      return <RefreshCw className="h-4 w-4" />;
    case 'calculated':
      return <Zap className="h-4 w-4" />;
    case 'override':
      return <Edit3 className="h-4 w-4" />;
    case 'bulk':
      return <Edit3 className="h-4 w-4" />;
    case 'revert':
      return <RotateCcw className="h-4 w-4" />;
    default:
      return <History className="h-4 w-4" />;
  }
}
