'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { TemplateBomItem } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Boxes,
  Package,
  X,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateBomPanelProps {
  items: TemplateBomItem[];
  loading?: boolean;
  selectedItems: Set<string>;
  onSelectionChange: (selectedItems: Set<string>) => void;
}

interface GroupNode {
  groupCode: string;
  description: string;
  items: TemplateBomItem[];
  itemCount: number;
}

type CheckboxState = 'checked' | 'unchecked' | 'indeterminate';

export function TemplateBomPanel({
  items,
  loading = false,
  selectedItems,
  onSelectionChange,
}: TemplateBomPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Build group structure from items
  const groups: GroupNode[] = useMemo(() => {
    const groupMap = new Map<string, TemplateBomItem[]>();

    items.forEach((item) => {
      const groupCode = item.groupCode || 'UNASSIGNED';
      if (!groupMap.has(groupCode)) {
        groupMap.set(groupCode, []);
      }
      groupMap.get(groupCode)!.push(item);
    });

    return Array.from(groupMap.entries())
      .map(([groupCode, groupItems]) => {
        // Find the group header item (level 0 with matching itemCode)
        const groupHeader = groupItems.find(
          (item) => item.level === 0 && item.itemCode === groupCode
        );
        return {
          groupCode,
          description: groupHeader?.itemDescription || groupCode,
          items: groupItems.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
          itemCount: groupItems.filter((item) => item.itemCode !== groupCode).length,
        };
      })
      .sort((a, b) => a.groupCode.localeCompare(b.groupCode));
  }, [items]);

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    const term = searchTerm.toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.itemCode.toLowerCase().includes(term) ||
            item.itemDescription.toLowerCase().includes(term)
        ),
      }))
      .filter(
        (group) =>
          group.items.length > 0 ||
          group.groupCode.toLowerCase().includes(term) ||
          group.description.toLowerCase().includes(term)
      );
  }, [groups, searchTerm]);

  // Get checkbox state for a group
  const getGroupCheckboxState = useCallback(
    (group: GroupNode): CheckboxState => {
      const selectableItems = group.items.filter(
        (item) => item.itemCode !== group.groupCode
      );
      if (selectableItems.length === 0) return 'unchecked';

      const selectedCount = selectableItems.filter((item) =>
        selectedItems.has(item.id)
      ).length;

      if (selectedCount === 0) return 'unchecked';
      if (selectedCount === selectableItems.length) return 'checked';
      return 'indeterminate';
    },
    [selectedItems]
  );

  // Get selection count for a group
  const getGroupSelectionCount = useCallback(
    (group: GroupNode): { selected: number; total: number } => {
      const selectableItems = group.items.filter(
        (item) => item.itemCode !== group.groupCode
      );
      const selectedCount = selectableItems.filter((item) =>
        selectedItems.has(item.id)
      ).length;
      return { selected: selectedCount, total: selectableItems.length };
    },
    [selectedItems]
  );

  // Toggle group selection (cascading)
  const toggleGroupSelection = useCallback(
    (group: GroupNode) => {
      const selectableItems = group.items.filter(
        (item) => item.itemCode !== group.groupCode
      );
      const currentState = getGroupCheckboxState(group);
      const newSelected = new Set(selectedItems);

      if (currentState === 'checked' || currentState === 'indeterminate') {
        // Uncheck all items in group
        selectableItems.forEach((item) => newSelected.delete(item.id));
      } else {
        // Check all items in group
        selectableItems.forEach((item) => newSelected.add(item.id));
      }

      onSelectionChange(newSelected);
    },
    [selectedItems, onSelectionChange, getGroupCheckboxState]
  );

  // Toggle individual item selection
  const toggleItemSelection = useCallback(
    (itemId: string) => {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      onSelectionChange(newSelected);
    },
    [selectedItems, onSelectionChange]
  );

  // Toggle group expand/collapse
  const toggleExpand = useCallback((groupCode: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupCode)) {
        next.delete(groupCode);
      } else {
        next.add(groupCode);
      }
      return next;
    });
  }, []);

  // Expand all groups
  const expandAll = useCallback(() => {
    setExpanded(new Set(groups.map((g) => g.groupCode)));
  }, [groups]);

  // Collapse all groups
  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  // Select all items
  const selectAll = useCallback(() => {
    const allSelectableIds = items
      .filter((item) => !item.itemCode.startsWith('GRP-'))
      .map((item) => item.id);
    onSelectionChange(new Set(allSelectableIds));
  }, [items, onSelectionChange]);

  // Clear selection
  const clearSelection = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  // Total selection stats
  const selectionStats = useMemo(() => {
    const totalSelectable = items.filter(
      (item) => !item.itemCode.startsWith('GRP-')
    ).length;
    return {
      selected: selectedItems.size,
      total: totalSelectable,
    };
  }, [items, selectedItems]);

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)]/30">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-subtle)] space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Boxes className="h-4 w-4 text-[var(--accent-blue)]" />
            Template BOM
          </h3>
          <Badge variant="outline" className="text-xs">
            {items.length} items
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" />
            </button>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 text-xs">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={expandAll}
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={collapseAll}
          >
            Collapse All
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={selectAll}
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearSelection}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Selection summary */}
      {selectionStats.selected > 0 && (
        <div className="px-3 py-2 bg-[var(--accent-blue)]/10 border-b border-[var(--accent-blue)]/20 text-xs">
          <span className="text-[var(--accent-blue)] font-medium">
            {selectionStats.selected} of {selectionStats.total} items selected
          </span>
        </div>
      )}

      {/* Groups list */}
      <div className="flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-8 w-8 text-[var(--text-tertiary)] mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">
              {searchTerm ? 'No items match your search' : 'No template items'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredGroups.map((group) => {
              const isExpanded = expanded.has(group.groupCode);
              const checkboxState = getGroupCheckboxState(group);
              const { selected, total } = getGroupSelectionCount(group);

              return (
                <div
                  key={group.groupCode}
                  className="border border-[var(--border-subtle)] rounded-md overflow-hidden bg-[var(--bg-primary)]"
                >
                  {/* Group header */}
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors',
                      checkboxState !== 'unchecked' && 'bg-[var(--accent-blue)]/5'
                    )}
                  >
                    {/* Expand/collapse button */}
                    <button
                      onClick={() => toggleExpand(group.groupCode)}
                      className="p-0.5 hover:bg-[var(--bg-elevated)] rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                      )}
                    </button>

                    {/* Checkbox with indeterminate support */}
                    <GroupCheckbox
                      state={checkboxState}
                      onChange={() => toggleGroupSelection(group)}
                    />

                    {/* Group info */}
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => toggleExpand(group.groupCode)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {group.groupCode}
                        </span>
                        {selected > 0 && (
                          <span className="text-[10px] text-[var(--accent-blue)]">
                            ({selected}/{total})
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">
                        {group.description}
                      </p>
                    </div>

                    {/* Item count badge */}
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 shrink-0"
                    >
                      {total}
                    </Badge>
                  </div>

                  {/* Group items */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
                      {group.items
                        .filter((item) => item.itemCode !== group.groupCode)
                        .map((item) => {
                          const isSelected = selectedItems.has(item.id);
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                'flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0',
                                isSelected && 'bg-[var(--accent-blue)]/10'
                              )}
                              onClick={() => toggleItemSelection(item.id)}
                            >
                              {/* Indentation */}
                              <div
                                className="shrink-0"
                                style={{ width: `${(item.level || 1) * 12}px` }}
                              />

                              {/* Checkbox */}
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleItemSelection(item.id)}
                                className="h-3.5 w-3.5"
                              />

                              {/* Item icon */}
                              <Package
                                className={cn(
                                  'h-3 w-3 shrink-0',
                                  isSelected
                                    ? 'text-[var(--accent-blue)]'
                                    : 'text-[var(--text-tertiary)]'
                                )}
                              />

                              {/* Item code */}
                              <span
                                className={cn(
                                  'font-mono text-[11px] shrink-0',
                                  isSelected && 'text-[var(--accent-blue)] font-medium'
                                )}
                              >
                                {item.itemCode}
                              </span>

                              {/* Description */}
                              <span className="text-[11px] text-[var(--text-secondary)] truncate flex-1">
                                {item.itemDescription}
                              </span>

                              {/* Quantity */}
                              <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                                x{item.quantity}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Custom checkbox component with indeterminate state support
 */
function GroupCheckbox({
  state,
  onChange,
}: {
  state: CheckboxState;
  onChange: () => void;
}) {
  const checkboxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      const input = checkboxRef.current.querySelector('input');
      if (input) {
        input.indeterminate = state === 'indeterminate';
      }
    }
  }, [state]);

  return (
    <button
      ref={checkboxRef}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        'flex items-center justify-center h-4 w-4 rounded border transition-colors',
        state === 'checked' &&
          'bg-[var(--accent-blue)] border-[var(--accent-blue)]',
        state === 'indeterminate' &&
          'bg-[var(--accent-blue)]/50 border-[var(--accent-blue)]',
        state === 'unchecked' &&
          'bg-transparent border-[var(--border-default)] hover:border-[var(--accent-blue)]'
      )}
    >
      {state === 'checked' && (
        <CheckSquare className="h-3 w-3 text-white" />
      )}
      {state === 'indeterminate' && (
        <MinusSquare className="h-3 w-3 text-white" />
      )}
    </button>
  );
}


