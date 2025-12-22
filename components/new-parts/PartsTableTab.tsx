'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { NewPart, NewPartStatus, ColumnConfig, DEFAULT_COLUMNS, GroupedParts } from '@/types/newPart';
import { UNASSIGNED_GROUP_CODE } from '@/types/bom';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewPartsTable } from './NewPartsTable';
import { BulkActions } from './BulkActions';
import { ColumnPicker } from './ColumnPicker';
import {
  AlertTriangle,
  Clock,
  Filter,
  Search,
  X,
} from 'lucide-react';

type QuickFilter = 'all' | 'missing-info' | 'long-lead' | 'unassigned' | 'sprint-at-risk' | 'sprint-late' | 'prod-at-risk' | 'prod-late';
type GroupByOption = 'none' | 'group' | 'status' | 'vendor';

interface PartsTableTabProps {
  parts: NewPart[];
  groups: { code: string; description?: string }[];
  onPartClick: (part: NewPart) => void;
  onUpdatePart: (partId: string, updates: Partial<NewPart>) => Promise<void>;
  onDeletePart: (partId: string) => Promise<void>;
  onMoveStatus: (partId: string, newStatus: NewPartStatus) => Promise<void>;
  onBulkUpdate: (partIds: string[], updates: Partial<NewPart>) => Promise<void>;
  className?: string;
}

export function PartsTableTab({
  parts,
  groups,
  onPartClick,
  onUpdatePart,
  onDeletePart,
  onMoveStatus,
  onBulkUpdate,
  className,
}: PartsTableTabProps) {
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  
  // View state
  const [groupBy, setGroupBy] = useState<GroupByOption>('group');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newPartsColumns');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_COLUMNS;
  });

  // Save column preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('newPartsColumns', JSON.stringify(columns));
    }
  }, [columns]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, groupFilter, quickFilter]);

  // Filter parts
  const filteredParts = useMemo(() => {
    let result = parts;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (part) =>
          part.placeholderCode.toLowerCase().includes(query) ||
          part.description.toLowerCase().includes(query) ||
          (part.groupCode || '').toLowerCase().includes(query) ||
          (part.vendorName || '').toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((part) => part.status === statusFilter);
    }

    // Group filter
    if (groupFilter !== 'all') {
      if (groupFilter === UNASSIGNED_GROUP_CODE) {
        result = result.filter((part) => !part.groupCode || part.groupCode === UNASSIGNED_GROUP_CODE);
      } else {
        result = result.filter((part) => part.groupCode === groupFilter);
      }
    }

    // Quick filters
    switch (quickFilter) {
      case 'missing-info':
        result = result.filter((part) => !part.vendorName || (!part.baseLeadTimeDays && !part.quotedLeadTimeDays));
        break;
      case 'long-lead':
        // Parts with >60 days lead time (placeholder logic)
        result = result.filter((part) => {
          const lead = part.baseLeadTimeDays || part.quotedLeadTimeDays || 0;
          return lead > 60;
        });
        break;
      case 'unassigned':
        result = result.filter((part) => !part.groupCode || part.groupCode === UNASSIGNED_GROUP_CODE);
        break;
      case 'sprint-at-risk':
        result = result.filter((part) => !part.sprintPoNumber && part.status !== 'complete' && part.sprintTargetDate);
        break;
      case 'sprint-late':
        result = result.filter((part) => part.sprintPoLate);
        break;
      case 'prod-at-risk':
        result = result.filter((part) => !part.productionPoNumber && part.status !== 'complete' && part.productionTargetDate);
        break;
      case 'prod-late':
        result = result.filter((part) => part.productionPoLate);
        break;
    }

    return result;
  }, [parts, searchQuery, statusFilter, groupFilter, quickFilter]);

  // Selection handlers
  const toggleSelection = useCallback((partId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredParts.map((p) => p.id)));
  }, [filteredParts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk action handlers
  const handleBulkSetVendor = async (vendor: { code?: string; name: string }) => {
    await onBulkUpdate(Array.from(selectedIds), {
      vendorCode: vendor.code,
      vendorName: vendor.name,
    });
    clearSelection();
  };

  const handleBulkMarkOrdered = async (order: { poNumber: string; poDate: Date; type: 'sprint' | 'production' | 'both' }) => {
    const updates: Partial<NewPart> = {};
    const timestamp = { toDate: () => order.poDate } as any; // Simplified for now

    if (order.type === 'sprint' || order.type === 'both') {
      updates.sprintPoNumber = order.poNumber;
      updates.sprintPoDate = timestamp;
    }
    if (order.type === 'production' || order.type === 'both') {
      updates.productionPoNumber = order.poNumber;
      updates.productionPoDate = timestamp;
    }

    await onBulkUpdate(Array.from(selectedIds), updates);
    clearSelection();
  };

  const handleBulkUpdateFreight = async (freightType: 'sea' | 'air') => {
    await onBulkUpdate(Array.from(selectedIds), { freightType });
    clearSelection();
  };

  const handleBulkChangeStatus = async (status: NewPartStatus) => {
    await onBulkUpdate(Array.from(selectedIds), { status });
    clearSelection();
  };

  const handleBulkAssignGroup = async (groupCode: string) => {
    await onBulkUpdate(Array.from(selectedIds), { groupCode });
    clearSelection();
  };

  // Get unique groups for filter
  const uniqueGroups = useMemo(() => {
    const groupSet = new Set(parts.map((p) => p.groupCode || UNASSIGNED_GROUP_CODE));
    return Array.from(groupSet).sort();
  }, [parts]);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || groupFilter !== 'all' || quickFilter !== 'all';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parts, vendors, groups..."
            className="pl-9 h-9 bg-[var(--bg-tertiary)] border-[var(--border-subtle)]"
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

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9 bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="added">Added</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="engineering">Engineering</SelectItem>
            <SelectItem value="procurement">Procurement</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>

        {/* Group Filter */}
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-40 h-9 bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {uniqueGroups.map((group) => (
              <SelectItem key={group} value={group}>
                {group === UNASSIGNED_GROUP_CODE ? 'Unassigned' : group}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Quick Filters */}
        <div className="flex items-center gap-1">
          <Button
            variant={quickFilter === 'missing-info' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQuickFilter(quickFilter === 'missing-info' ? 'all' : 'missing-info')}
            className={cn(
              'h-8 text-xs gap-1.5',
              quickFilter === 'missing-info' 
                ? 'bg-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/90' 
                : 'border-[var(--border-subtle)]'
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            Missing Info
          </Button>
          <Button
            variant={quickFilter === 'long-lead' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQuickFilter(quickFilter === 'long-lead' ? 'all' : 'long-lead')}
            className={cn(
              'h-8 text-xs gap-1.5',
              quickFilter === 'long-lead' 
                ? 'bg-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/90' 
                : 'border-[var(--border-subtle)]'
            )}
          >
            <Clock className="h-3 w-3" />
            Long Lead
          </Button>
        </div>

        {/* Group By */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-[var(--text-tertiary)]">Group by:</span>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
            <SelectTrigger className="w-28 h-8 text-xs bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="group">BOM Group</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Column Picker */}
        <ColumnPicker columns={columns} onColumnsChange={setColumns} />
      </div>

      {/* Bulk Actions (when items selected) */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
          <BulkActions
            selectedCount={selectedIds.size}
            totalCount={filteredParts.length}
            onClearSelection={clearSelection}
            onBulkSetVendor={handleBulkSetVendor}
            onBulkMarkOrdered={handleBulkMarkOrdered}
            onBulkUpdateFreight={handleBulkUpdateFreight}
            onBulkChangeStatus={handleBulkChangeStatus}
            onBulkAssignGroup={handleBulkAssignGroup}
            groups={groups}
          />
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30">
          <Filter className="h-3 w-3 text-[var(--text-tertiary)]" />
          <span className="text-xs text-[var(--text-tertiary)]">
            Showing {filteredParts.length} of {parts.length} parts
          </span>
          {searchQuery && (
            <Badge variant="secondary" className="text-xs h-5">
              Search: "{searchQuery}"
              <button onClick={() => setSearchQuery('')} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs h-5">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter('all')} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {quickFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs h-5">
              {quickFilter.replace('-', ' ')}
              <button onClick={() => setQuickFilter('all')} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setGroupFilter('all');
              setQuickFilter('all');
            }}
            className="text-xs text-[var(--accent-blue)] hover:underline ml-auto"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0">
        <NewPartsTable
          parts={filteredParts}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onPartClick={onPartClick}
          onUpdatePart={(partId, updates) => onUpdatePart(partId, updates)}
          onDeletePart={onDeletePart}
          onMoveStatus={onMoveStatus}
          groupBy={groupBy}
          columns={columns}
          className="h-full"
        />
      </div>
    </div>
  );
}

