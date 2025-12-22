'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useNewParts } from '@/lib/hooks/useNewParts';
import { useProject } from '@/lib/context/ProjectContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { createNewPart, syncBomItemsToNewParts, updateNewPart, fillMissingTargetDates } from '@/lib/bom/newPartService';
import {
  NewPartDetailDrawer,
  PartsTableTab,
  TimelineTab,
  SummaryStatsBar,
} from '@/components/new-parts';
import { PplImportDialog } from '@/components/import/PplImportDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Calendar,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Table,
  X,
  Zap,
} from 'lucide-react';
import { NewPart } from '@/types/newPart';
import { UNASSIGNED_GROUP_CODE } from '@/types/bom';
import { Timestamp } from 'firebase/firestore';

export default function NewPartsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { project, loading: projectLoading } = useProject();
  const { user } = useAuth();

  const {
    newParts,
    stats,
    isLoading,
    error,
    selectedPart,
    setSelectedPart,
    moveToStatus,
    updatePartDetails,
    completePart,
    deletePart,
    refresh,
  } = useNewParts({ projectId });

  const [activeTab, setActiveTab] = useState<'table' | 'timeline'>('table');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);
  const [isFillingDates, setIsFillingDates] = useState(false);
  const [fillDatesResult, setFillDatesResult] = useState<{ updated: number } | null>(null);
  const [newPartData, setNewPartData] = useState({
    placeholderCode: '',
    description: '',
    groupCode: '',
    quantity: 1,
    priority: 'medium' as const,
    requestNotes: '',
  });

  // Get unique groups from parts
  const groups = useMemo(() => {
    const groupSet = new Map<string, { code: string; description?: string }>();
    newParts.forEach((part) => {
      const code = part.groupCode || UNASSIGNED_GROUP_CODE;
      if (!groupSet.has(code)) {
        groupSet.set(code, { code, description: undefined });
      }
    });
    return Array.from(groupSet.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [newParts]);

  const handleSyncParts = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncBomItemsToNewParts(projectId, user?.email || 'system');
      setSyncResult(result);
      if (result.synced > 0) {
        refresh();
      }
      setTimeout(() => setSyncResult(null), 5000);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncResult({ synced: 0, errors: ['Sync failed'] });
    }
    setIsSyncing(false);
  };

  const handleFillDates = async () => {
    if (!project) return;
    
    setIsFillingDates(true);
    setFillDatesResult(null);
    try {
      const result = await fillMissingTargetDates(projectId, project);
      setFillDatesResult(result);
      if (result.updated > 0) {
        refresh();
      }
      setTimeout(() => setFillDatesResult(null), 5000);
    } catch (err) {
      console.error('Fill dates failed:', err);
    }
    setIsFillingDates(false);
  };

  const handleCreatePart = async () => {
    if (!newPartData.placeholderCode || !newPartData.description) return;

    setIsCreating(true);
    try {
      // Pass project to auto-fill target dates from PACE gates
      await createNewPart(
        projectId,
        {
          placeholderCode: newPartData.placeholderCode,
          description: newPartData.description,
          groupCode: newPartData.groupCode || UNASSIGNED_GROUP_CODE,
          quantity: newPartData.quantity,
          priority: newPartData.priority,
          requestNotes: newPartData.requestNotes,
        },
        user?.email || 'Unknown',
        project || undefined // Pass project for auto-filling target dates
      );
      setShowAddDialog(false);
      setNewPartData({
        placeholderCode: '',
        description: '',
        groupCode: '',
        quantity: 1,
        priority: 'medium',
        requestNotes: '',
      });
    } catch (err) {
      console.error('Failed to create part:', err);
    }
    setIsCreating(false);
  };

  // Generate next placeholder code
  const generatePlaceholderCode = () => {
    const existing = newParts
      .map((p) => p.placeholderCode)
      .filter((code) => code.match(/^Bxxx\d{3}$/))
      .map((code) => parseInt(code.slice(4)))
      .filter((n) => !isNaN(n));
    
    const nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `Bxxx${String(nextNum).padStart(3, '0')}`;
  };

  // Handle bulk updates
  const handleBulkUpdate = async (partIds: string[], updates: Partial<NewPart>) => {
    const promises = partIds.map((id) => updatePartDetails(id, updates));
    await Promise.all(promises);
  };

  // Handle stats filter click
  const handleStatsFilterClick = (filter: string) => {
    setActiveTab('table');
    // The PartsTableTab will handle the filter internally
  };

  if (projectLoading || isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-6">
          <div>
            <div className="h-8 w-48 bg-[var(--bg-tertiary)] rounded animate-pulse" />
            <div className="h-4 w-64 bg-[var(--bg-tertiary)] rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="flex-1 bg-[var(--bg-secondary)]/50 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-[var(--accent-red)]" />
        <p className="text-[var(--text-secondary)]">Failed to load new parts</p>
        <Button onClick={refresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold">New Parts Tracker</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Track new parts through design, engineering, and procurement • {newParts.length} parts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSyncParts} 
            variant="outline" 
            size="sm" 
            className="border-[var(--border-subtle)]"
            disabled={isSyncing}
            title="Sync BOM items with isNewPart flag to the tracker"
          >
            <Zap className={cn("h-4 w-4 mr-2", isSyncing && "animate-pulse")} />
            {isSyncing ? 'Syncing...' : 'Sync BOM'}
          </Button>
          
          <Button 
            onClick={handleFillDates} 
            variant="outline" 
            size="sm" 
            className="border-[var(--border-subtle)]"
            disabled={isFillingDates || !project?.gates?.sprint?.date}
            title="Fill target dates from PACE gates (Sprint MRD = 2 weeks before Sprint)"
          >
            <Calendar className={cn("h-4 w-4 mr-2", isFillingDates && "animate-pulse")} />
            {isFillingDates ? 'Filling...' : 'Fill Dates'}
          </Button>
          
          <Button 
            onClick={() => setShowImportDialog(true)} 
            variant="outline" 
            size="sm" 
            className="border-[var(--border-subtle)]"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import PPL
          </Button>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
                size="sm"
                onClick={() => {
                  setNewPartData({
                    ...newPartData,
                    placeholderCode: generatePlaceholderCode(),
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
              <DialogHeader>
                <DialogTitle>Add New Part</DialogTitle>
                <DialogDescription>
                  Create a new part to track through the design and procurement process.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Placeholder Code</Label>
                    <Input
                      value={newPartData.placeholderCode}
                      onChange={(e) => setNewPartData({ ...newPartData, placeholderCode: e.target.value })}
                      placeholder="e.g., Bxxx001"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newPartData.quantity}
                      onChange={(e) => setNewPartData({ ...newPartData, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input
                    value={newPartData.description}
                    onChange={(e) => setNewPartData({ ...newPartData, description: e.target.value })}
                    placeholder="Part description..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Group Code</Label>
                    <Input
                      value={newPartData.groupCode}
                      onChange={(e) => setNewPartData({ ...newPartData, groupCode: e.target.value })}
                      placeholder="e.g., GRP-FRAME"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newPartData.priority}
                      onValueChange={(value: any) => setNewPartData({ ...newPartData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newPartData.requestNotes}
                    onChange={(e) => setNewPartData({ ...newPartData, requestNotes: e.target.value })}
                    placeholder="Additional notes about this part..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePart}
                  disabled={!newPartData.placeholderCode || !newPartData.description || isCreating}
                  className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
                >
                  {isCreating ? 'Creating...' : 'Create Part'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sync Result Notification */}
      {syncResult && (
        <div className={cn(
          "flex items-center gap-2 mx-6 mb-4 p-3 rounded-lg border",
          syncResult.synced > 0 
            ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30" 
            : syncResult.errors.length > 0 
            ? "bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30"
            : "bg-[var(--bg-tertiary)] border-[var(--border-subtle)]"
        )}>
          {syncResult.synced > 0 ? (
            <>
              <Zap className="h-4 w-4 text-[var(--accent-green)]" />
              <span className="text-sm text-[var(--accent-green)]">
                Synced {syncResult.synced} BOM item{syncResult.synced !== 1 ? 's' : ''} to the tracker
              </span>
            </>
          ) : syncResult.errors.length > 0 ? (
            <>
              <AlertCircle className="h-4 w-4 text-[var(--accent-red)]" />
              <span className="text-sm text-[var(--accent-red)]">
                {syncResult.errors[0]}
              </span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-sm text-[var(--text-secondary)]">
                No new BOM items to sync - all tracked items are already in the tracker
              </span>
            </>
          )}
          <button onClick={() => setSyncResult(null)} className="ml-auto">
            <X className="h-4 w-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" />
          </button>
        </div>
      )}

      {/* Fill Dates Result Notification */}
      {fillDatesResult && (
        <div className={cn(
          "flex items-center gap-2 mx-6 mb-4 p-3 rounded-lg border",
          fillDatesResult.updated > 0 
            ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30" 
            : "bg-[var(--bg-tertiary)] border-[var(--border-subtle)]"
        )}>
          {fillDatesResult.updated > 0 ? (
            <>
              <Calendar className="h-4 w-4 text-[var(--accent-green)]" />
              <span className="text-sm text-[var(--accent-green)]">
                Updated {fillDatesResult.updated} part{fillDatesResult.updated !== 1 ? 's' : ''} with target dates from PACE gates
              </span>
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-sm text-[var(--text-secondary)]">
                All parts already have target dates set
              </span>
            </>
          )}
          <button onClick={() => setFillDatesResult(null)} className="ml-auto">
            <X className="h-4 w-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" />
          </button>
        </div>
      )}

      {/* Two-Tab Layout */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'table' | 'timeline')} className="flex-1 flex flex-col min-h-0">
        <div className="px-6">
          <TabsList className="w-auto bg-[var(--bg-tertiary)]">
            <TabsTrigger value="table" className="gap-2">
              <Table className="h-4 w-4" />
              Parts Table
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Table Tab */}
        <TabsContent value="table" className="flex-1 m-0 flex flex-col min-h-0">
          {newParts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-blue)]/10 flex items-center justify-center mb-4">
                <Table className="h-8 w-8 text-[var(--accent-blue)]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No new parts yet</h3>
              <p className="text-[var(--text-secondary)] text-center max-w-md mb-6">
                New parts appear here when you add items to the BOM with the "New Part" flag checked,
                import from PPL, or create them manually.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowImportDialog(true)}
                  variant="outline"
                  className="border-[var(--border-subtle)]"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import PPL
                </Button>
                <Button
                  onClick={() => {
                    setNewPartData({
                      ...newPartData,
                      placeholderCode: generatePlaceholderCode(),
                    });
                    setShowAddDialog(true);
                  }}
                  className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Part
                </Button>
              </div>
            </div>
          ) : (
            <PartsTableTab
              parts={newParts}
              groups={groups}
              onPartClick={setSelectedPart}
              onUpdatePart={updatePartDetails}
              onDeletePart={deletePart}
              onMoveStatus={moveToStatus}
              onBulkUpdate={handleBulkUpdate}
              className="flex-1"
            />
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="flex-1 m-0 flex flex-col min-h-0">
          <TimelineTab
            parts={newParts}
            project={project}
            groups={groups}
            onPartClick={setSelectedPart}
            className="flex-1"
          />
        </TabsContent>
      </Tabs>

      {/* Summary Stats Bar */}
      <SummaryStatsBar 
        stats={stats} 
        onFilterClick={handleStatsFilterClick}
      />

      {/* Detail Drawer */}
      <NewPartDetailDrawer
        part={selectedPart}
        open={!!selectedPart}
        onClose={() => setSelectedPart(null)}
        onUpdate={updatePartDetails}
        onComplete={completePart}
        onDelete={deletePart}
        onMoveStatus={moveToStatus}
      />

      {/* PPL Import Dialog */}
      <PplImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        projectId={projectId}
        createdBy={user?.email || 'Unknown'}
        onImportComplete={refresh}
      />
    </div>
  );
}
