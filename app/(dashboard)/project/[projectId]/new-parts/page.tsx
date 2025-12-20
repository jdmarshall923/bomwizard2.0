'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useNewParts } from '@/lib/hooks/useNewParts';
import { useProject } from '@/lib/context/ProjectContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { createNewPart, syncBomItemsToNewParts } from '@/lib/bom/newPartService';
import {
  NewPartKanban,
  NewPartDetailDrawer,
  NewPartStatsCards,
  NewPartProgress,
} from '@/components/new-parts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Filter,
  Kanban,
  List,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Table,
  X,
  Zap,
} from 'lucide-react';
import { NewPart } from '@/types/newPart';

export default function NewPartsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { project, loading: projectLoading } = useProject();
  const { user } = useAuth();

  const {
    newParts,
    partsByStatus,
    stats,
    columns,
    isLoading,
    error,
    selectedPart,
    setSelectedPart,
    moveToStatus,
    updatePartDetails,
    completePart,
    deletePart,
    refresh,
    filterPriority,
    setFilterPriority,
    searchQuery,
    setSearchQuery,
    filteredParts,
  } = useNewParts({ projectId });

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);
  const [newPartData, setNewPartData] = useState({
    placeholderCode: '',
    description: '',
    groupCode: '',
    quantity: 1,
    priority: 'medium' as const,
    requestNotes: '',
  });

  const handleSyncParts = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncBomItemsToNewParts(projectId, user?.email || 'system');
      setSyncResult(result);
      if (result.synced > 0) {
        refresh();
      }
      // Clear result after 5 seconds
      setTimeout(() => setSyncResult(null), 5000);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncResult({ synced: 0, errors: ['Sync failed'] });
    }
    setIsSyncing(false);
  };

  const handleCreatePart = async () => {
    if (!newPartData.placeholderCode || !newPartData.description) return;

    setIsCreating(true);
    try {
      await createNewPart(
        projectId,
        {
          placeholderCode: newPartData.placeholderCode,
          description: newPartData.description,
          groupCode: newPartData.groupCode,
          quantity: newPartData.quantity,
          priority: newPartData.priority,
          requestNotes: newPartData.requestNotes,
        },
        user?.email || 'Unknown'
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

  if (projectLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-[var(--bg-tertiary)] rounded animate-pulse" />
            <div className="h-4 w-64 bg-[var(--bg-tertiary)] rounded animate-pulse mt-2" />
          </div>
        </div>
        <NewPartStatsCards stats={stats} isLoading={true} />
        <div className="h-96 bg-[var(--bg-secondary)]/50 rounded-xl animate-pulse" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">New Part Tracker</h1>
            <Badge className="bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/30">
              Phase 7
            </Badge>
          </div>
          <p className="text-[var(--text-secondary)] mt-1">
            Track new parts through design, engineering, and procurement
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
          <Button onClick={refresh} variant="outline" size="sm" className="border-[var(--border-subtle)]">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
                onClick={() => {
                  setNewPartData({
                    ...newPartData,
                    placeholderCode: generatePlaceholderCode(),
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Part
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
                  <Label>Description</Label>
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
          "flex items-center gap-2 p-3 rounded-lg border",
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

      {/* Stats Cards */}
      <NewPartStatsCards stats={stats} />

      {/* Pipeline Progress */}
      <NewPartProgress stats={stats} />

      {/* Filters & View Controls */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search parts by code, description, or group..."
                className="pl-9 bg-[var(--bg-tertiary)] border-[var(--border-subtle)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Priority Filter */}
              <Select
                value={filterPriority || 'all'}
                onValueChange={(value) => setFilterPriority(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-36 bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
                  <Filter className="h-4 w-4 mr-2 text-[var(--text-tertiary)]" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    viewMode === 'kanban'
                      ? 'bg-[var(--accent-blue)] text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Kanban className="h-4 w-4" />
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    viewMode === 'table'
                      ? 'bg-[var(--accent-blue)] text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Table className="h-4 w-4" />
                  Table
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {(searchQuery || filterPriority) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-tertiary)]">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterPriority && (
                <Badge variant="secondary" className="text-xs">
                  Priority: {filterPriority}
                  <button onClick={() => setFilterPriority(null)} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterPriority(null);
                }}
                className="text-xs text-[var(--accent-blue)] hover:underline ml-auto"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      {newParts.length === 0 ? (
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-blue)]/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-[var(--accent-blue)]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No new parts yet</h3>
            <p className="text-[var(--text-secondary)] text-center max-w-md mb-6">
              New parts appear here when you add items to the BOM with the "New Part" flag checked,
              or you can create them manually.
            </p>
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
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <NewPartKanban
          partsByStatus={partsByStatus}
          onPartClick={setSelectedPart}
          onMoveStatus={moveToStatus}
          isLoading={isLoading}
        />
      ) : (
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">All New Parts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[var(--bg-tertiary)]">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Code
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Group
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Final Code
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {(searchQuery || filterPriority ? filteredParts : newParts).map((part) => (
                    <tr
                      key={part.id}
                      onClick={() => setSelectedPart(part)}
                      className="hover:bg-[var(--bg-tertiary)]/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-[var(--accent-blue)]">
                        {part.placeholderCode}
                      </td>
                      <td className="px-4 py-3 text-sm line-clamp-1">{part.description}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {part.groupCode}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={cn(
                            'text-xs',
                            part.status === 'complete'
                              ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                              : part.status === 'procurement'
                              ? 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]'
                              : 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                          )}
                        >
                          {part.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={cn(
                            'text-xs',
                            part.priority === 'critical'
                              ? 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                              : part.priority === 'high'
                              ? 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                          )}
                        >
                          {part.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-[var(--accent-green)]">
                        {part.finalItemCode || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}

