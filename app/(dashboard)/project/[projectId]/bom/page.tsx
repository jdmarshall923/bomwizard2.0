'use client';

import { useParams } from 'next/navigation';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TemplateBomPanel } from '@/components/bom/TemplateBomPanel';
import { WorkingBomPanel } from '@/components/bom/WorkingBomPanel';
import { BomTransferBar } from '@/components/bom/BomTransferBar';
import { ItemEditDrawer } from '@/components/bom/ItemEditDrawer';
import { AddGroupDialog } from '@/components/bom/AddGroupDialog';
import { BatchAddItemsDialog } from '@/components/bom/BatchAddItemsDialog';
import { useBom, useTemplateBom } from '@/lib/hooks/useBom';
import { transferItemsToWorkingBom, getDuplicateCount } from '@/lib/bom/transferService';
import { applyVendorPricesToBom } from '@/lib/bom/vendorPriceService';
import { getBomGroups } from '@/lib/bom/templateBomService';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProject } from '@/lib/context/ProjectContext';
import type { BomItem, BomGroup, TemplateBomItem } from '@/types';
import { 
  AlertCircle,
  RefreshCw,
  Settings2,
  FileBox,
  Plus,
  Wrench,
  Import,
  History,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

export default function BomControlPanelPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { user } = useAuth();
  const { project } = useProject();

  // Selection state
  const [selectedTemplateItems, setSelectedTemplateItems] = useState<Set<string>>(new Set());
  const [selectedWorkingItem, setSelectedWorkingItem] = useState<BomItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Dialog state
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  
  // Panel expand/collapse state
  const [isTemplatePanelCollapsed, setIsTemplatePanelCollapsed] = useState(false);

  // Transfer state
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<{
    success: boolean;
    transferred: number;
    skipped: number;
    message?: string;
  } | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Pricing state
  const [applyingPrices, setApplyingPrices] = useState(false);

  // BOM groups state
  const [bomGroups, setBomGroups] = useState<BomGroup[]>([]);

  // Fetch Working BOM data
  const { 
    bomItems, 
    assemblies, 
    loading: workingLoading, 
    error: workingError,
    updateBomItem,
    deleteBomItem,
    stats: workingStats,
    filterItems: filterWorkingItems,
    getAssemblyCodes: getWorkingAssemblyCodes,
  } = useBom(projectId);

  // Fetch Template BOM data
  const {
    templateItems,
    loading: templateLoading,
    error: templateError,
    hasTemplate,
  } = useTemplateBom(projectId);

  // Load BOM groups
  useEffect(() => {
    if (projectId && hasTemplate) {
      getBomGroups(projectId).then(setBomGroups).catch(console.error);
    }
  }, [projectId, hasTemplate]);

  // Check for duplicates when selection changes
  useEffect(() => {
    if (selectedTemplateItems.size > 0 && templateItems.length > 0) {
      getDuplicateCount(projectId, templateItems, Array.from(selectedTemplateItems))
        .then(setDuplicateCount)
        .catch(console.error);
    } else {
      setDuplicateCount(0);
    }
  }, [selectedTemplateItems, templateItems, projectId]);

  // Get assembly codes for filter
  const assemblyCodes = useMemo(() => {
    return getWorkingAssemblyCodes();
  }, [getWorkingAssemblyCodes]);

  // Handle transfer from template to working BOM
  const handleTransfer = useCallback(async () => {
    if (selectedTemplateItems.size === 0 || !user) return;
    
    setTransferring(true);
    setTransferResult(null);

    try {
      const result = await transferItemsToWorkingBom(
        projectId,
        templateItems,
        Array.from(selectedTemplateItems),
        true, // Apply pricing
        user.uid,
        user.displayName || user.email || undefined
      );

      setTransferResult({
        success: result.success,
        transferred: result.transferred,
        skipped: result.skipped,
        message: result.versionCreated 
          ? `Version ${result.versionNumber} created` 
          : undefined,
      });

      // Clear selection after successful transfer
      if (result.success && result.transferred > 0) {
        setSelectedTemplateItems(new Set());
      }
    } catch (err) {
      console.error('Transfer failed:', err);
      setTransferResult({
        success: false,
        transferred: 0,
        skipped: 0,
        message: 'Transfer failed',
      });
    } finally {
      setTransferring(false);
    }
  }, [selectedTemplateItems, templateItems, projectId, user]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedTemplateItems(new Set());
    setTransferResult(null);
  }, []);

  // Dismiss transfer result
  const handleDismissResult = useCallback(() => {
    setTransferResult(null);
  }, []);

  // Handle working item click
  const handleWorkingItemClick = useCallback((item: BomItem) => {
    setSelectedWorkingItem(item);
    setIsDrawerOpen(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async (itemId: string, updates: Partial<BomItem>) => {
    await updateBomItem(itemId, updates);
  }, [updateBomItem]);

  // Handle delete
  const handleDeleteItem = useCallback(async (itemId: string) => {
    try {
      await deleteBomItem(itemId);
      setIsDrawerOpen(false);
      setSelectedWorkingItem(null);
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error('Failed to delete item', {
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  }, [deleteBomItem]);

  // Handle drawer close
  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedWorkingItem(null), 300);
  }, []);

  // Handle group added
  const handleGroupAdded = (group: BomGroup) => {
    setBomGroups(prev => [...prev, group]);
  };

  // Handle add items result
  const handleAddItemsResult = (result: { 
    itemsCreated: number; 
    newPartsCount: number; 
    groupCreated?: BomGroup;
  }) => {
    // Add new group to state if created
    if (result.groupCreated) {
      setBomGroups(prev => [...prev, result.groupCreated!]);
    }
    // Note: Items will be automatically refreshed via useBom hook
    console.log(`Added ${result.itemsCreated} items (${result.newPartsCount} new parts)`);
  };

  // Handle apply vendor prices
  const handleApplyVendorPrices = async () => {
    setApplyingPrices(true);
    try {
      const result = await applyVendorPricesToBom(projectId);
      toast.success('Vendor prices applied', {
        description: `Updated pricing for ${result?.updated || 0} items.`,
      });
    } catch (err) {
      console.error('Error applying vendor prices:', err);
      toast.error('Failed to apply prices', {
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setApplyingPrices(false);
    }
  };

  // Error state
  const error = workingError || templateError;
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">BOM Control Panel</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage your Bill of Materials
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

  // No template state
  if (!templateLoading && !hasTemplate && bomItems.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">BOM Control Panel</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage your Bill of Materials
          </p>
        </div>
        <Card className="border-[var(--accent-orange)]/30 bg-[var(--accent-orange)]/5">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileBox className="h-16 w-16 text-[var(--accent-orange)] mb-4" />
              <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">No BOM Data</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
                Import a BOM from Infor to get started. The import will create a Template BOM 
                that you can then use to build your Working BOM.
              </p>
              <Button 
                onClick={() => window.location.href = `/project/${projectId}/import`}
                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90"
              >
                <Import className="h-4 w-4 mr-2" />
                Import BOM
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">BOM Control Panel</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            Select items from Template BOM to build your Working BOM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = `/project/${projectId}/versions`}
          >
            <History className="h-4 w-4 mr-2" />
            Version History
          </Button>
          {hasTemplate && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = `/project/${projectId}/configure`}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Configure Groups
            </Button>
          )}
        </div>
      </div>

      {/* Main content - Master Detail Layout */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className={cn(
          'flex-1 grid gap-4 min-h-0 transition-all duration-300',
          isTemplatePanelCollapsed ? 'grid-cols-1' : 'grid-cols-12'
        )}>
          {/* Left Panel - Template BOM (collapsible) */}
          {!isTemplatePanelCollapsed && (
            <div className="col-span-4 min-h-0">
              <Card className="h-full border-[var(--accent-blue)]/20 overflow-hidden">
                {templateLoading ? (
                  <div className="h-full p-4 space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <TemplateBomPanel
                    items={templateItems}
                    loading={templateLoading}
                    selectedItems={selectedTemplateItems}
                    onSelectionChange={setSelectedTemplateItems}
                  />
                )}
              </Card>
            </div>
          )}

          {/* Right Panel - Working BOM */}
          <div className={cn(
            'min-h-0',
            isTemplatePanelCollapsed ? 'col-span-1' : 'col-span-8'
          )}>
            <Card className="h-full border-[var(--accent-green)]/20 overflow-hidden">
              <WorkingBomPanel
                items={bomItems}
                assemblies={assemblies}
                loading={workingLoading}
                stats={workingStats || undefined}
                onItemClick={handleWorkingItemClick}
                onAddItems={() => setIsAddItemsOpen(true)}
                onAddGroup={() => setIsAddGroupOpen(true)}
                onApplyPrices={handleApplyVendorPrices}
                applyingPrices={applyingPrices}
                selectedItemId={selectedWorkingItem?.id}
                assemblyCodes={assemblyCodes}
                filterItems={filterWorkingItems}
                projectName={project?.name || 'BOM'}
                isExpanded={isTemplatePanelCollapsed}
                onToggleExpand={() => setIsTemplatePanelCollapsed(!isTemplatePanelCollapsed)}
              />
            </Card>
          </div>
        </div>

        {/* Transfer Bar */}
        <div className="mt-4">
          <Card className="border-[var(--border-subtle)]">
            <BomTransferBar
              selectedCount={selectedTemplateItems.size}
              duplicateCount={duplicateCount}
              onTransfer={handleTransfer}
              onClear={handleClearSelection}
              transferring={transferring}
              lastTransferResult={transferResult}
              onDismissResult={handleDismissResult}
            />
          </Card>
        </div>
      </div>

      {/* Item Edit Drawer */}
      <ItemEditDrawer
        item={selectedWorkingItem}
        open={isDrawerOpen}
        onClose={handleDrawerClose}
        onSave={handleSave}
        onDelete={handleDeleteItem}
      />

      {/* Add Group Dialog */}
      <AddGroupDialog
        open={isAddGroupOpen}
        onOpenChange={setIsAddGroupOpen}
        projectId={projectId}
        existingGroups={bomGroups}
        onGroupAdded={handleGroupAdded}
      />

      {/* Add Items Dialog */}
      <BatchAddItemsDialog
        open={isAddItemsOpen}
        onOpenChange={setIsAddItemsOpen}
        projectId={projectId}
        groups={bomGroups}
        existingItems={bomItems}
        onItemsAdded={handleAddItemsResult}
      />
    </div>
  );
}
