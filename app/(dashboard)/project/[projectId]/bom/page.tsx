'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BomTree } from '@/components/bom/BomTree';
import { BomTable } from '@/components/bom/BomTable';
import { BomFilters } from '@/components/bom/BomFilters';
import { ItemEditDrawer } from '@/components/bom/ItemEditDrawer';
import { useBom } from '@/lib/hooks/useBom';
import type { BomFilters as BomFiltersType } from '@/lib/hooks/useBom';
import type { BomItem } from '@/types';
import { 
  TreePine, 
  Table as TableIcon, 
  Package,
  Boxes,
  PoundSterling,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Download,
  Plus,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'tree' | 'table';

const defaultFilters: BomFiltersType = {
  searchTerm: '',
  showNewParts: false,
  showPlaceholders: false,
  showCostChanges: false,
  assemblyCode: null,
  costSource: null,
};

export default function BomExplorerPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [filters, setFilters] = useState<BomFiltersType>(defaultFilters);
  const [selectedItem, setSelectedItem] = useState<BomItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch BOM data
  const { 
    bomItems, 
    assemblies, 
    loading, 
    error,
    updateBomItem,
    stats,
    filterItems,
    getAssemblyCodes,
  } = useBom(projectId);

  // Get assembly codes for filter
  const assemblyCodes = useMemo(() => getAssemblyCodes(), [getAssemblyCodes]);

  // Filter items
  const filteredItems = useMemo(() => {
    return filterItems(filters);
  }, [filterItems, filters]);

  // Handle item click
  const handleItemClick = useCallback((item: BomItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async (itemId: string, updates: Partial<BomItem>) => {
    await updateBomItem(itemId, updates);
  }, [updateBomItem]);

  // Handle drawer close
  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedItem(null), 300);
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">BOM Explorer</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            View and edit BOM data with hierarchical structure
          </p>
        </div>
        <Card className="border-[var(--accent-red)]/30 bg-[var(--accent-red)]/5">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertCircle className="h-12 w-12 text-[var(--accent-red)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Error Loading BOM</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mb-4">
                {error.message || 'An unexpected error occurred'}
              </p>
              {error.message?.includes('index') && (
                <p className="text-xs text-[var(--text-tertiary)] mb-4">
                  This error usually means a Firestore index needs to be created. Check the console for a link.
                </p>
              )}
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">BOM Explorer</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            View and edit BOM data with hierarchical structure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-blue)]/10">
                <Package className="h-5 w-5 text-[var(--accent-blue)]" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12" /> : stats?.totalItems || 0}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Total Items</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-blue)]/10">
                <Boxes className="h-5 w-5 text-[var(--accent-blue)]" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12" /> : stats?.totalAssemblies || 0}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Assemblies</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-green)]/10">
                <PoundSterling className="h-5 w-5 text-[var(--accent-green)]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--accent-green)]">
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    `£${(stats?.totalCost || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
                  )}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Total Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-blue)]/10">
                <Sparkles className="h-5 w-5 text-[var(--accent-blue)]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--accent-blue)]">
                  {loading ? <Skeleton className="h-8 w-12" /> : stats?.newPartsCount || 0}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">New Parts</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-orange)]/10">
                <AlertCircle className="h-5 w-5 text-[var(--accent-orange)]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--accent-orange)]">
                  {loading ? <Skeleton className="h-8 w-12" /> : stats?.placeholdersCount || 0}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Placeholders</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-green)]/10">
                <TrendingUp className="h-5 w-5 text-[var(--accent-green)]" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    `£${(stats?.materialCost || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
                  )}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Material Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <Card className="bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            {/* Filters */}
            <div className="flex-1">
              <BomFilters
                filters={filters}
                onFiltersChange={setFilters}
                assemblyCodes={assemblyCodes}
                itemCount={bomItems.length}
                filteredCount={filteredItems.length}
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="bg-[var(--bg-tertiary)]">
                  <TabsTrigger 
                    value="tree" 
                    className={cn(
                      'data-[state=active]:bg-[var(--accent-blue)] data-[state=active]:text-white'
                    )}
                  >
                    <TreePine className="h-4 w-4 mr-2" />
                    Tree
                  </TabsTrigger>
                  <TabsTrigger 
                    value="table"
                    className={cn(
                      'data-[state=active]:bg-[var(--accent-blue)] data-[state=active]:text-white'
                    )}
                  >
                    <TableIcon className="h-4 w-4 mr-2" />
                    Table
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM Content */}
      <Card className="bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {viewMode === 'tree' ? (
              <>
                <TreePine className="h-5 w-5 text-[var(--accent-blue)]" />
                BOM Tree View
              </>
            ) : (
              <>
                <TableIcon className="h-5 w-5 text-[var(--accent-blue)]" />
                BOM Table View
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'tree' ? (
            <BomTree
              items={filteredItems}
              assemblies={assemblies}
              onItemClick={handleItemClick}
              selectedItemId={selectedItem?.id}
              loading={loading}
            />
          ) : (
            <BomTable
              items={filteredItems}
              onItemClick={handleItemClick}
              selectedItemId={selectedItem?.id}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>

      {/* Item Edit Drawer */}
      <ItemEditDrawer
        item={selectedItem}
        open={isDrawerOpen}
        onClose={handleDrawerClose}
        onSave={handleSave}
      />
    </div>
  );
}
