'use client';

import { useState, useMemo, useCallback } from 'react';
import { BomItem, Assembly } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BomTree } from './BomTree';
import { BomTable } from './BomTable';
import { BomFilters } from './BomFilters';
import { ExportDropdown } from './ExportDropdown';
import type { BomFilters as BomFiltersType } from '@/lib/hooks/useBom';
import {
  Wrench,
  TreePine,
  Table as TableIcon,
  Package,
  PoundSterling,
  Sparkles,
  AlertCircle,
  Plus,
  Layers,
  RefreshCw,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkingBomPanelProps {
  items: BomItem[];
  assemblies: Assembly[];
  loading?: boolean;
  stats?: {
    totalItems: number;
    totalAssemblies: number;
    totalCost: number;
    materialCost: number;
    landingCost: number;
    labourCost: number;
    newPartsCount: number;
    placeholdersCount: number;
    newPartTrackingCount?: number; // Phase 3.7: New part tracking count
  };
  onItemClick?: (item: BomItem) => void;
  onAddItems?: () => void; // Phase 3.75: Single "Add Items" button
  onAddGroup?: () => void;
  onApplyPrices?: () => void;
  applyingPrices?: boolean;
  selectedItemId?: string | null;
  assemblyCodes: string[];
  filterItems: (filters: BomFiltersType) => BomItem[];
  projectName?: string; // For export filename
  isExpanded?: boolean;  // Phase 14: Expand to full width
  onToggleExpand?: () => void;
}

type ViewMode = 'tree' | 'table';

const defaultFilters: BomFiltersType = {
  searchTerm: '',
  showNewParts: false,
  showPlaceholders: false,
  showCostChanges: false,
  showAddedItems: false,
  showNewPartTracking: false,
  assemblyCode: null,
  costSource: null,
};

export function WorkingBomPanel({
  items,
  assemblies,
  loading = false,
  stats,
  onItemClick,
  onAddItems,
  onAddGroup,
  onApplyPrices,
  applyingPrices = false,
  selectedItemId,
  assemblyCodes,
  filterItems,
  projectName = 'BOM',
  isExpanded = false,
  onToggleExpand,
}: WorkingBomPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [filters, setFilters] = useState<BomFiltersType>(defaultFilters);

  // Apply filters
  const filteredItems = useMemo(() => {
    return filterItems(filters);
  }, [filterItems, filters]);

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <Skeleton className="h-8 w-48 mb-2" />
          <div className="flex gap-2">
            <Skeleton className="h-16 w-24" />
            <Skeleton className="h-16 w-24" />
            <Skeleton className="h-16 w-24" />
          </div>
        </div>
        <div className="flex-1 p-3">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[var(--accent-green)]" />
            Working BOM
          </h3>
          <div className="flex items-center gap-1">
            {/* Expand/Collapse Button - Phase 14 */}
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onToggleExpand}
                title={isExpanded ? 'Show Template BOM' : 'Expand Table'}
              >
                {isExpanded ? (
                  <>
                    <PanelLeft className="h-3.5 w-3.5 mr-1" />
                    Show Template
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 mr-1" />
                    Expand
                  </>
                )}
              </Button>
            )}
            {onApplyPrices && items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onApplyPrices}
                disabled={applyingPrices}
              >
                {applyingPrices ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <PoundSterling className="h-3.5 w-3.5 mr-1" />
                )}
                Apply Prices
              </Button>
            )}
            {/* Export Dropdown - Phase 14 */}
            <ExportDropdown 
              items={filteredItems}
              projectName={projectName}
              variant="ghost"
              size="sm"
            />
            {onAddGroup && items.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAddGroup}>
                <Layers className="h-3.5 w-3.5 mr-1" />
                Add Group
              </Button>
            )}
            {onAddItems && (
              <Button
                size="sm"
                className="h-7 text-xs bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90"
                onClick={onAddItems}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Items
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && items.length > 0 && (
          <div className="grid grid-cols-5 gap-2">
            <div className="bg-[var(--bg-secondary)]/50 rounded-md p-2">
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
                <span className="text-lg font-bold">{stats.totalItems}</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">Items</p>
            </div>
            <div className="bg-[var(--bg-secondary)]/50 rounded-md p-2">
              <div className="flex items-center gap-1.5">
                <PoundSterling className="h-3.5 w-3.5 text-[var(--accent-green)]" />
                <span className="text-lg font-bold text-[var(--accent-green)]">
                  £{stats.totalCost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">Total Cost</p>
            </div>
            <div className="bg-[var(--bg-secondary)]/50 rounded-md p-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
                <span className="text-lg font-bold text-[var(--accent-blue)]">
                  {stats.newPartsCount}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">New Parts</p>
            </div>
            <div className="bg-[var(--bg-secondary)]/50 rounded-md p-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-[var(--accent-orange)]" />
                <span className="text-lg font-bold text-[var(--accent-orange)]">
                  {stats.placeholdersCount}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">Placeholders</p>
            </div>
            {(stats.newPartTrackingCount ?? 0) > 0 && (
              <div className="bg-[var(--bg-secondary)]/50 rounded-md p-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent-purple)]" />
                  <span className="text-lg font-bold text-[var(--accent-purple)]">
                    {stats.newPartTrackingCount}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)]">Tracking</p>
              </div>
            )}
          </div>
        )}

        {/* Filters and view toggle */}
        {items.length > 0 && (
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <BomFilters
                filters={filters}
                onFiltersChange={setFilters}
                assemblyCodes={assemblyCodes}
                itemCount={items.length}
                filteredCount={filteredItems.length}
                compact
              />
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8 bg-[var(--bg-tertiary)]">
                <TabsTrigger
                  value="tree"
                  className="h-6 px-2 text-xs data-[state=active]:bg-[var(--accent-green)] data-[state=active]:text-white"
                >
                  <TreePine className="h-3.5 w-3.5 mr-1" />
                  Tree
                </TabsTrigger>
                <TabsTrigger
                  value="table"
                  className="h-6 px-2 text-xs data-[state=active]:bg-[var(--accent-green)] data-[state=active]:text-white"
                >
                  <TableIcon className="h-3.5 w-3.5 mr-1" />
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <Wrench className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No Working BOM
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-4">
              Select items from the Template BOM on the left, then click "Copy Selected"
              to add them to your Working BOM.
            </p>
            {onAddItems && (
              <Button
                onClick={onAddItems}
                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Items
              </Button>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto p-3">
            {viewMode === 'tree' ? (
              <BomTree
                items={filteredItems}
                assemblies={assemblies}
                onItemClick={onItemClick}
                selectedItemId={selectedItemId}
                loading={loading}
              />
            ) : (
              <BomTable
                items={filteredItems}
                onItemClick={onItemClick}
                selectedItemId={selectedItemId}
                loading={loading}
                pageSize={50}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
