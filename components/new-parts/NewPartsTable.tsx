'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { NewPart, NewPartStatus, ColumnConfig } from '@/types/newPart';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InlineEditCell } from './InlineEditCell';
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Ship,
  Plane,
  Trash2,
  ExternalLink,
  Package,
} from 'lucide-react';

// Row height for virtualization
const ROW_HEIGHT = 44;
const GROUP_HEADER_HEIGHT = 36;

// Status colors and labels
const STATUS_CONFIG: Record<NewPartStatus, { label: string; color: string; bg: string }> = {
  added: { label: 'Added', color: 'text-[var(--accent-blue)]', bg: 'bg-[var(--accent-blue)]/10' },
  pending: { label: 'Pending', color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--bg-tertiary)]' },
  design: { label: 'Design', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  engineering: { label: 'Engineering', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  procurement: { label: 'Procurement', color: 'text-[var(--accent-orange)]', bg: 'bg-[var(--accent-orange)]/10' },
  complete: { label: 'Complete', color: 'text-[var(--accent-green)]', bg: 'bg-[var(--accent-green)]/10' },
  on_hold: { label: 'On Hold', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  cancelled: { label: 'Cancelled', color: 'text-[var(--accent-red)]', bg: 'bg-[var(--accent-red)]/10' },
};

type GroupByOption = 'none' | 'group' | 'status' | 'vendor';

interface GroupedRow {
  type: 'group';
  key: string;
  label: string;
  count: number;
  isExpanded: boolean;
}

interface PartRow {
  type: 'part';
  part: NewPart;
  groupKey: string;
}

type VirtualRow = GroupedRow | PartRow;

interface NewPartsTableProps {
  parts: NewPart[];
  selectedIds: Set<string>;
  onToggleSelection: (partId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onPartClick: (part: NewPart) => void;
  onUpdatePart: (partId: string, updates: Partial<NewPart>) => void;
  onDeletePart: (partId: string) => void;
  onMoveStatus: (partId: string, newStatus: NewPartStatus) => void;
  groupBy: GroupByOption;
  columns: ColumnConfig[];
  className?: string;
}

export function NewPartsTable({
  parts,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onPartClick,
  onUpdatePart,
  onDeletePart,
  onMoveStatus,
  groupBy,
  columns,
  className,
}: NewPartsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set()); // Track collapsed, not expanded

  // Get visible columns
  const visibleColumns = useMemo(() => columns.filter(c => c.isVisible), [columns]);
  
  // Check if a specific column is visible
  const isColumnVisible = useCallback((columnId: string) => {
    return visibleColumns.some(c => c.id === columnId);
  }, [visibleColumns]);

  // Sync horizontal scroll between header and body
  const handleBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  // Get group key for a part
  const getGroupKey = useCallback((part: NewPart): string => {
    switch (groupBy) {
      case 'group': return part.groupCode || 'Ungrouped';
      case 'status': return part.status;
      case 'vendor': return part.vendorName || 'No Vendor';
      default: return 'all';
    }
  }, [groupBy]);

  // Reset collapsed groups when groupBy changes
  useEffect(() => {
    setCollapsedGroups(new Set());
  }, [groupBy]);

  // Group parts and create virtual rows
  const virtualRows = useMemo(() => {
    if (groupBy === 'none') {
      return parts.map(part => ({ type: 'part' as const, part, groupKey: 'all' }));
    }

    // Group parts
    const groups = new Map<string, NewPart[]>();
    parts.forEach(part => {
      const key = getGroupKey(part);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(part);
    });

    // Sort groups
    const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    // Build virtual rows with groups (expanded by default, track collapsed)
    const rows: VirtualRow[] = [];
    sortedGroups.forEach(([key, groupParts]) => {
      const isExpanded = !collapsedGroups.has(key); // Default expanded
      rows.push({
        type: 'group',
        key,
        label: groupBy === 'status' ? STATUS_CONFIG[key as NewPartStatus]?.label || key : key,
        count: groupParts.length,
        isExpanded,
      });
      if (isExpanded) {
        groupParts.forEach(part => {
          rows.push({ type: 'part', part, groupKey: key });
        });
      }
    });

    return rows;
  }, [parts, groupBy, collapsedGroups, getGroupKey]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key); // Was collapsed, now expand
      } else {
        next.add(key); // Was expanded, now collapse
      }
      return next;
    });
  }, []);

  // Memoized callbacks for virtualizer
  const estimateSize = useCallback(
    (index: number) => virtualRows[index]?.type === 'group' ? GROUP_HEADER_HEIGHT : ROW_HEIGHT,
    [virtualRows]
  );
  
  const getItemKey = useCallback(
    (index: number) => {
      const row = virtualRows[index];
      if (!row) return `row-${index}`;
      return row.type === 'group' ? `group-${row.key}` : `part-${row.part.id}`;
    },
    [virtualRows]
  );

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 15,
    getItemKey,
  });

  const allSelected = parts.length > 0 && selectedIds.size === parts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < parts.length;

  return (
    <div className={cn('flex flex-col border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)]/50 backdrop-blur-sm overflow-hidden', className)}>
      {/* Fixed Header - scrolls horizontally with body */}
      <div 
        ref={headerRef}
        className="h-10 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex items-center h-full px-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider min-w-max">
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <Checkbox
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={() => allSelected ? onClearSelection() : onSelectAll()}
              className="h-4 w-4"
            />
          </div>
          {isColumnVisible('placeholderCode') && <div className="w-24 flex-shrink-0 px-2">Code</div>}
          {isColumnVisible('description') && <div className="w-[200px] flex-shrink-0 px-2">Description</div>}
          {isColumnVisible('status') && <div className="w-28 flex-shrink-0 px-2">Status</div>}
          {isColumnVisible('vendorName') && <div className="w-28 flex-shrink-0 px-2">Vendor</div>}
          {isColumnVisible('baseLeadTimeDays') && <div className="w-20 flex-shrink-0 px-2 text-center">Lead</div>}
          {isColumnVisible('freightType') && <div className="w-16 flex-shrink-0 px-2 text-center">Frt</div>}
          {isColumnVisible('sprintStatus') && <div className="w-20 flex-shrink-0 px-2 text-center">Sprint</div>}
          {isColumnVisible('productionStatus') && <div className="w-20 flex-shrink-0 px-2 text-center">Prod</div>}
          {isColumnVisible('finalItemCode') && <div className="w-24 flex-shrink-0 px-2">Final Code</div>}
          {/* Drawing columns */}
          {isColumnVisible('drawingNumber') && <div className="w-24 flex-shrink-0 px-2">Drawing #</div>}
          {isColumnVisible('drawingRevision') && <div className="w-16 flex-shrink-0 px-2">Rev</div>}
          {isColumnVisible('drawingWorkflowState') && <div className="w-24 flex-shrink-0 px-2">Workflow</div>}
          {/* Assignment columns */}
          {isColumnVisible('projectCoordinator') && <div className="w-24 flex-shrink-0 px-2">Coordinator</div>}
          {isColumnVisible('buyer') && <div className="w-24 flex-shrink-0 px-2">Buyer</div>}
          {isColumnVisible('sqe') && <div className="w-24 flex-shrink-0 px-2">SQE</div>}
          {/* Pricing columns */}
          {isColumnVisible('quotedPrice') && <div className="w-20 flex-shrink-0 px-2 text-right">Price</div>}
          {isColumnVisible('currency') && <div className="w-16 flex-shrink-0 px-2">Curr</div>}
          {/* Sprint columns */}
          {isColumnVisible('sprintQuantity') && <div className="w-20 flex-shrink-0 px-2 text-right">Sprint Qty</div>}
          {isColumnVisible('sprintTargetDate') && <div className="w-24 flex-shrink-0 px-2">Sprint Date</div>}
          {isColumnVisible('sprintPoNumber') && <div className="w-24 flex-shrink-0 px-2">Sprint PO</div>}
          {/* Production columns */}
          {isColumnVisible('massProductionQuantity') && <div className="w-20 flex-shrink-0 px-2 text-right">Prod Qty</div>}
          {isColumnVisible('productionTargetDate') && <div className="w-24 flex-shrink-0 px-2">Prod Date</div>}
          {isColumnVisible('productionPoNumber') && <div className="w-24 flex-shrink-0 px-2">Prod PO</div>}
          <div className="w-10 flex-shrink-0" />
        </div>
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ height: 'calc(100% - 40px)' }}
        onScroll={handleBodyScroll}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            minWidth: 'max-content',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const row = virtualRows[virtualItem.index];

            if (row.type === 'group') {
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <GroupHeader
                    label={row.label}
                    count={row.count}
                    isExpanded={row.isExpanded}
                    onToggle={() => toggleGroup(row.key)}
                  />
                </div>
              );
            }

            const part = row.part;
            const isSelected = selectedIds.has(part.id);
            const hasMissingInfo = !part.vendorName || !part.quotedLeadTimeDays;

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <PartRowComponent
                  part={part}
                  isSelected={isSelected}
                  hasMissingInfo={hasMissingInfo}
                  onToggleSelection={() => onToggleSelection(part.id)}
                  onClick={() => onPartClick(part)}
                  onUpdate={(updates) => onUpdatePart(part.id, updates)}
                  onDelete={() => onDeletePart(part.id)}
                  onMoveStatus={(status) => onMoveStatus(part.id, status)}
                  isGrouped={groupBy !== 'none'}
                  isColumnVisible={isColumnVisible}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with selection info */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between h-10 px-4 border-t border-[var(--border-subtle)] bg-[var(--accent-blue)]/5">
          <span className="text-sm text-[var(--text-secondary)]">
            {selectedIds.size} of {parts.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 text-xs">
              Clear Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Group Header Component
function GroupHeader({
  label,
  count,
  isExpanded,
  onToggle,
}: {
  label: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center h-full px-2 bg-[var(--bg-tertiary)]/70 border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors min-w-max"
    >
      <div className="w-10 flex-shrink-0 flex items-center justify-center">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-[var(--accent-blue)]" />
        <span className="font-medium text-sm text-[var(--text-primary)]">{label}</span>
        <Badge className="h-5 px-1.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
          {count}
        </Badge>
      </div>
    </div>
  );
}

// Helper to format dates
const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
  if (!timestamp) return '—';
  return timestamp.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// Part Row Component - memoized to prevent unnecessary re-renders
const PartRowComponent = React.memo(function PartRowComponent({
  part,
  isSelected,
  hasMissingInfo,
  onToggleSelection,
  onClick,
  onUpdate,
  onDelete,
  onMoveStatus,
  isGrouped,
  isColumnVisible,
}: {
  part: NewPart;
  isSelected: boolean;
  hasMissingInfo: boolean;
  onToggleSelection: () => void;
  onClick: () => void;
  onUpdate: (updates: Partial<NewPart>) => void;
  onDelete: () => void;
  onMoveStatus: (status: NewPartStatus) => void;
  isGrouped: boolean;
  isColumnVisible: (columnId: string) => boolean;
}) {
  const statusConfig = STATUS_CONFIG[part.status] || STATUS_CONFIG.pending;

  return (
    <div
      className={cn(
        'flex items-center h-full px-2 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]/50 transition-colors group min-w-max',
        isSelected && 'bg-[var(--accent-blue)]/5',
        isGrouped && 'pl-6'
      )}
    >
      {/* Checkbox */}
      <div className="w-10 flex-shrink-0 flex items-center justify-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4"
        />
      </div>

      {/* Code */}
      {isColumnVisible('placeholderCode') && (
        <div
          className="w-24 flex-shrink-0 px-2 font-mono text-sm text-[var(--accent-blue)] cursor-pointer hover:underline"
          onClick={onClick}
        >
          {part.placeholderCode}
        </div>
      )}

      {/* Description */}
      {isColumnVisible('description') && (
        <div className="w-[200px] flex-shrink-0 px-2 text-sm truncate" title={part.description}>
          {part.description}
        </div>
      )}

      {/* Status */}
      {isColumnVisible('status') && (
        <div className="w-28 flex-shrink-0 px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                statusConfig.bg,
                statusConfig.color,
                'hover:opacity-80'
              )}>
                {statusConfig.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                key !== 'cancelled' && (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onMoveStatus(key as NewPartStatus)}
                    className={cn('text-xs', part.status === key && 'bg-[var(--bg-tertiary)]')}
                  >
                    {config.label}
                  </DropdownMenuItem>
                )
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Vendor - Inline Edit */}
      {isColumnVisible('vendorName') && (
        <div className="w-28 flex-shrink-0 px-2">
          <InlineEditCell
            value={part.vendorName || ''}
            placeholder="Add..."
            onSave={(value) => onUpdate({ vendorName: value })}
            className="text-xs"
          />
        </div>
      )}

      {/* Lead Time - Inline Edit */}
      {isColumnVisible('baseLeadTimeDays') && (
        <div className="w-20 flex-shrink-0 px-2 text-center">
          <InlineEditCell
            value={part.baseLeadTimeDays?.toString() || part.quotedLeadTimeDays?.toString() || ''}
            placeholder="—"
            onSave={(value) => onUpdate({ baseLeadTimeDays: parseInt(value) || undefined })}
            type="number"
            suffix="d"
            className="text-xs text-center w-12"
          />
        </div>
      )}

      {/* Freight Toggle */}
      {isColumnVisible('freightType') && (
        <div className="w-16 flex-shrink-0 px-2 flex justify-center">
          <button
            onClick={() => onUpdate({ freightType: part.freightType === 'air' ? 'sea' : 'air' })}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors',
              part.freightType === 'air'
                ? 'bg-sky-400/20 text-sky-400'
                : 'bg-teal-500/20 text-teal-500'
            )}
          >
            {part.freightType === 'air' ? (
              <Plane className="h-3 w-3" />
            ) : (
              <Ship className="h-3 w-3" />
            )}
          </button>
        </div>
      )}

      {/* Sprint Status */}
      {isColumnVisible('sprintStatus') && (
        <div className="w-20 flex-shrink-0 px-2 text-center">
          <span className={cn(
            'text-xs',
            part.sprintPoLate ? 'text-[var(--accent-red)]' :
            part.sprintReceived ? 'text-[var(--accent-green)]' :
            part.sprintPoNumber ? 'text-[var(--accent-green)]' : 'text-[var(--text-tertiary)]'
          )}>
            {part.sprintReceived ? 'Rcvd' : part.sprintPoLate ? 'Late' : part.sprintPoNumber ? 'Ord' : '—'}
          </span>
        </div>
      )}

      {/* Production Status */}
      {isColumnVisible('productionStatus') && (
        <div className="w-20 flex-shrink-0 px-2 text-center">
          <span className={cn(
            'text-xs',
            part.productionPoLate ? 'text-[var(--accent-red)]' :
            part.productionReceived ? 'text-[var(--accent-green)]' :
            part.productionPoNumber ? 'text-[var(--accent-green)]' : 'text-[var(--text-tertiary)]'
          )}>
            {part.productionReceived ? 'Rcvd' : part.productionPoLate ? 'Late' : part.productionPoNumber ? 'Ord' : '—'}
          </span>
        </div>
      )}

      {/* Final Code */}
      {isColumnVisible('finalItemCode') && (
        <div className="w-24 flex-shrink-0 px-2 font-mono text-xs text-[var(--accent-green)]">
          {part.finalItemCode || '—'}
        </div>
      )}

      {/* Drawing columns */}
      {isColumnVisible('drawingNumber') && (
        <div className="w-24 flex-shrink-0 px-2 text-xs font-mono">{part.drawingNumber || '—'}</div>
      )}
      {isColumnVisible('drawingRevision') && (
        <div className="w-16 flex-shrink-0 px-2 text-xs">{part.drawingRevision || '—'}</div>
      )}
      {isColumnVisible('drawingWorkflowState') && (
        <div className="w-24 flex-shrink-0 px-2 text-xs capitalize">{part.drawingWorkflowState?.replace('_', ' ') || '—'}</div>
      )}

      {/* Assignment columns */}
      {isColumnVisible('projectCoordinator') && (
        <div className="w-24 flex-shrink-0 px-2 text-xs truncate">{part.projectCoordinator || '—'}</div>
      )}
      {isColumnVisible('buyer') && (
        <div className="w-24 flex-shrink-0 px-2 text-xs truncate">{part.buyer || '—'}</div>
      )}
      {isColumnVisible('sqe') && (
        <div className="w-24 flex-shrink-0 px-2 text-xs truncate">{part.sqe || '—'}</div>
      )}

      {/* Pricing columns */}
      {isColumnVisible('quotedPrice') && (
        <div className="w-20 flex-shrink-0 px-2 text-xs text-right">
          {part.quotedPrice ? `${part.currency || '£'}${part.quotedPrice.toFixed(2)}` : '—'}
        </div>
      )}
      {isColumnVisible('currency') && (
        <div className="w-16 flex-shrink-0 px-2 text-xs">{part.currency || 'GBP'}</div>
      )}

      {/* Sprint columns */}
      {isColumnVisible('sprintQuantity') && (
        <div className="w-20 flex-shrink-0 px-2 text-xs text-right">{part.sprintQuantity || '—'}</div>
      )}
      {isColumnVisible('sprintTargetDate') && (
        <div className="w-24 flex-shrink-0 px-2 text-xs">{formatDate(part.sprintTargetDate)}</div>
      )}
      {isColumnVisible('sprintPoNumber') && (
        <div className="w-24 flex-shrink-0 px-2 text-xs font-mono">{part.sprintPoNumber || '—'}</div>
      )}

      {/* Production columns */}
      {isColumnVisible('massProductionQuantity') && (
        <div className="w-20 flex-shrink-0 px-2 text-xs text-right">{part.massProductionQuantity || '—'}</div>
      )}
      {isColumnVisible('productionTargetDate') && (
        <div className="w-24 flex-shrink-0 px-2 text-xs">{formatDate(part.productionTargetDate)}</div>
      )}
      {isColumnVisible('productionPoNumber') && (
        <div className="w-24 flex-shrink-0 px-2 text-xs font-mono">{part.productionPoNumber || '—'}</div>
      )}

      {/* Actions + Status Icon */}
      <div className="w-10 flex-shrink-0 flex items-center justify-center gap-1">
        {hasMissingInfo ? (
          <AlertTriangle className="h-3.5 w-3.5 text-[var(--accent-orange)]" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-green)] opacity-50" />
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] rounded transition-opacity">
              <MoreHorizontal className="h-4 w-4 text-[var(--text-tertiary)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
            <DropdownMenuItem onClick={onClick} className="text-xs">
              <ExternalLink className="h-3 w-3 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-xs text-[var(--accent-red)] focus:text-[var(--accent-red)]"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

