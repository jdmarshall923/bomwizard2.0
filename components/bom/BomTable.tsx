'use client';

import { BomItem } from '@/types';
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ChevronDown,
  ChevronRightIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertCircle,
  Package,
  Boxes,
  FolderOpen,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Simplified column groups for current BomTable
type TableColumnGroup = 'core' | 'costing' | 'status';

interface TableColumnGroupDef {
  id: TableColumnGroup;
  displayName: string;
  columns: string[];
  alwaysVisible?: boolean;
}

const TABLE_COLUMN_GROUPS: TableColumnGroupDef[] = [
  { 
    id: 'core', 
    displayName: 'Core', 
    columns: ['itemCode', 'group', 'itemDescription', 'level', 'quantity'],
    alwaysVisible: true,
  },
  { 
    id: 'costing', 
    displayName: 'Costing', 
    columns: ['materialCost', 'landingCost', 'labourCost', 'extendedCost', 'costSource'],
  },
  { 
    id: 'status', 
    displayName: 'Status', 
    columns: ['isNewPart'],
  },
];

interface BomTableProps {
  items: BomItem[];
  onItemClick?: (item: BomItem) => void;
  selectedItemId?: string | null;
  loading?: boolean;
  pageSize?: number;
  readOnly?: boolean;
  showColumnToggles?: boolean;
}

const columnHelper = createColumnHelper<BomItem>();

export function BomTable({ 
  items, 
  onItemClick,
  selectedItemId,
  loading = false,
  pageSize = 25,
  readOnly = false,
  showColumnToggles = true,
}: BomTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  
  // Column group visibility state - Phase 14 (simplified for this table)
  const [visibleGroups, setVisibleGroups] = useState<TableColumnGroup[]>(['core', 'costing', 'status']);
  
  // Expanded groups state - track which group rows are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Toggle a column group
  const handleToggleGroup = useCallback((groupId: TableColumnGroup) => {
    const group = TABLE_COLUMN_GROUPS.find(g => g.id === groupId);
    if (group?.alwaysVisible) return;
    
    setVisibleGroups(prev => {
      const isVisible = prev.includes(groupId);
      return isVisible 
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId];
    });
  }, []);
  
  // Toggle expand/collapse for a group row
  const handleToggleExpand = useCallback((groupCode: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupCode)) {
        newSet.delete(groupCode);
      } else {
        newSet.add(groupCode);
      }
      return newSet;
    });
  }, []);
  
  // Expand all groups
  const handleExpandAll = useCallback(() => {
    const allGroups = new Set(items.map(item => item.assemblyCode || item.groupCode).filter(Boolean) as string[]);
    setExpandedGroups(allGroups);
  }, [items]);
  
  // Collapse all groups
  const handleCollapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);
  
  // Process items to create group rows and filter based on expansion
  const processedItems = useMemo(() => {
    // Get unique groups
    const groupMap = new Map<string, { groupItem: BomItem | null; children: BomItem[] }>();
    
    items.forEach(item => {
      const groupCode = item.assemblyCode || item.groupCode || '';
      if (!groupCode) return;
      
      if (!groupMap.has(groupCode)) {
        groupMap.set(groupCode, { groupItem: null, children: [] });
      }
      
      const group = groupMap.get(groupCode)!;
      
      // Check if this item IS the group row (level 0 or 1, or itemType === 'group')
      if (item.itemType === 'group' || item.level === 0 || item.level === 1) {
        group.groupItem = item;
      } else {
        group.children.push(item);
      }
    });
    
    // Build the display list
    const result: BomItem[] = [];
    
    groupMap.forEach((group, groupCode) => {
      // Add the group header row
      if (group.groupItem) {
        // Use the existing group item
        result.push({
          ...group.groupItem,
          _isGroupRow: true,
          _childCount: group.children.length,
        } as BomItem & { _isGroupRow: boolean; _childCount: number });
      } else if (group.children.length > 0) {
        // Create a synthetic group row from first child
        const firstChild = group.children[0];
        result.push({
          id: `group-${groupCode}`,
          itemCode: groupCode,
          itemDescription: `${groupCode} Assembly`,
          assemblyCode: groupCode,
          groupCode: groupCode,
          level: 1,
          quantity: 1,
          itemType: 'group',
          _isGroupRow: true,
          _childCount: group.children.length,
        } as BomItem & { _isGroupRow: boolean; _childCount: number });
      }
      
      // Add children if expanded
      if (expandedGroups.has(groupCode)) {
        group.children.forEach(child => {
          result.push({
            ...child,
            _isGroupRow: false,
            _parentGroup: groupCode,
          } as BomItem & { _isGroupRow: boolean; _parentGroup: string });
        });
      }
    });
    
    return result;
  }, [items, expandedGroups]);
  
  // Map column group visibility to TanStack table visibility
  useEffect(() => {
    const newVisibility: VisibilityState = {};
    
    // Go through each group and set visibility for its columns
    TABLE_COLUMN_GROUPS.forEach(group => {
      const isVisible = group.alwaysVisible || visibleGroups.includes(group.id);
      group.columns.forEach(col => {
        newVisibility[col] = isVisible;
      });
    });
    
    setColumnVisibility(newVisibility);
  }, [visibleGroups]);

  const isPlaceholder = (itemCode: string) => {
    // Complete B code = B + exactly 6 numbers (e.g., B123456)
    // Placeholder = starts with B but doesn't have complete 6-digit code
    const startsWithB = itemCode?.startsWith('B');
    const isCompleteBCode = /^B\d{6}$/.test(itemCode || '');
    return startsWithB && !isCompleteBCode;
  };

  const columns = useMemo(() => [
    // Item Code - FIRST column with expand/collapse for groups
    columnHelper.accessor('itemCode', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Item Code
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const code = row.getValue('itemCode') as string;
        const item = row.original as BomItem & { _isGroupRow?: boolean; _childCount?: number; _parentGroup?: string };
        const isGroupRow = item._isGroupRow === true;
        const groupCode = item.assemblyCode || item.groupCode || '';
        const isExpanded = expandedGroups.has(groupCode);
        const childCount = (item as any)._childCount || 0;
        
        // Child row - indented
        if (!isGroupRow && item._parentGroup) {
          return (
            <div className="flex items-center gap-2 pl-6">
              <Package className={cn(
                'h-4 w-4',
                item.partCategory === 'new_part' 
                  ? 'text-[var(--accent-blue)]' 
                  : isPlaceholder(code)
                    ? 'text-[var(--accent-orange)]'
                    : 'text-[var(--text-tertiary)]'
              )} />
              <span className={cn(
                'font-mono',
                item.partCategory === 'new_part' && 'text-[var(--accent-blue)] font-medium',
                isPlaceholder(code) && 'text-[var(--accent-orange)]'
              )}>
                {code}
              </span>
              {item.partCategory === 'new_part' && (
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
              )}
              {isPlaceholder(code) && (
                <AlertCircle className="h-3.5 w-3.5 text-[var(--accent-orange)]" />
              )}
            </div>
          );
        }
        
        // Group row - with expand/collapse
        if (isGroupRow) {
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(groupCode);
                }}
                className="p-0.5 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-[var(--text-secondary)]" />
                )}
              </button>
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-[var(--accent-green)]" />
              ) : (
                <Folder className="h-4 w-4 text-[var(--accent-green)]" />
              )}
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {code}
              </span>
              {childCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {childCount}
                </Badge>
              )}
            </div>
          );
        }
        
        // Regular item (no grouping)
        return (
          <div className="flex items-center gap-2">
            <Package className={cn(
              'h-4 w-4',
              item.partCategory === 'new_part' 
                ? 'text-[var(--accent-blue)]' 
                : isPlaceholder(code)
                  ? 'text-[var(--accent-orange)]'
                  : 'text-[var(--text-tertiary)]'
            )} />
            <span className={cn(
              'font-mono',
              isGroupRow && 'font-bold text-[var(--text-primary)]',
              item.partCategory === 'new_part' && !isGroupRow && 'text-[var(--accent-blue)] font-medium',
              isPlaceholder(code) && !isGroupRow && 'text-[var(--accent-orange)]'
            )}>
              {code}
            </span>
            {item.partCategory === 'new_part' && !isGroupRow && (
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
            )}
            {isPlaceholder(code) && !isGroupRow && (
              <AlertCircle className="h-3.5 w-3.5 text-[var(--accent-orange)]" />
            )}
          </div>
        );
      },
    }),
    // Group - SECOND column (renamed from Assembly)
    columnHelper.accessor('assemblyCode', {
      id: 'group',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Group
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isGroupRow = item.itemType === 'group' || item.level === 0;
        
        return (
          <div className="flex items-center gap-2">
            {!isGroupRow && (
              <span className="text-[var(--text-secondary)] pl-4">
                {row.getValue('group')}
              </span>
            )}
            {isGroupRow && (
              <span className="font-medium text-[var(--accent-blue)]">
                {row.getValue('group')}
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('itemDescription', {
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-[var(--text-secondary)] line-clamp-1 max-w-[300px]">
          {row.getValue('itemDescription')}
        </span>
      ),
    }),
    columnHelper.accessor('level', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Level
          {column.getIsSorted() ? (
            column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          L{row.getValue('level')}
        </Badge>
      ),
    }),
    columnHelper.accessor('quantity', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Qty
          {column.getIsSorted() ? (
            column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-right block">{row.getValue('quantity')}</span>
      ),
    }),
    columnHelper.accessor('materialCost', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Material
          {column.getIsSorted() ? (
            column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-right block">
          £{(row.getValue('materialCost') as number)?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      ),
    }),
    columnHelper.accessor('landingCost', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Landing
          {column.getIsSorted() ? (
            column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-right block">
          £{(row.getValue('landingCost') as number)?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      ),
    }),
    columnHelper.accessor('labourCost', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Labour
          {column.getIsSorted() ? (
            column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-right block">
          £{(row.getValue('labourCost') as number)?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      ),
    }),
    columnHelper.accessor('extendedCost', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Extended
          {column.getIsSorted() ? (
            column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <span className={cn(
          'font-medium text-right block',
          (row.getValue('extendedCost') as number) > 100 
            ? 'text-[var(--accent-green)]' 
            : 'text-[var(--text-primary)]'
        )}>
          £{(row.getValue('extendedCost') as number)?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      ),
    }),
    columnHelper.accessor('costSource', {
      header: 'Source',
      cell: ({ row }) => {
        const source = row.getValue('costSource') as string;
        if (!source) return null;
        return (
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs',
              source === 'contract' && 'border-[var(--accent-green)] text-[var(--accent-green)]',
              source === 'quote' && 'border-[var(--accent-blue)] text-[var(--accent-blue)]',
              source === 'estimate' && 'border-[var(--accent-orange)] text-[var(--accent-orange)]'
            )}
          >
            {source}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('isNewPart', {
      header: 'Status',
      cell: ({ row }) => {
        const item = row.original;
        if (!item.isNewPart) return null;
        return (
          <Badge 
            variant="outline" 
            className="text-xs border-[var(--accent-purple)] text-[var(--accent-purple)] bg-[var(--accent-purple)]/10"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {item.newPartStatus || 'pending'}
          </Badge>
        );
      },
    }),
  ], []);

  const table = useReactTable({
    data: processedItems,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  if (loading) {
    return (
      <div className="rounded-md border border-[var(--border-subtle)]">
        <Table>
          <TableHeader>
            <TableRow>
              {['Item Code', 'Group', 'Description', 'Level', 'Qty', 'Material', 'Landing', 'Labour', 'Extended', 'Source', 'Status'].map(header => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map(i => (
              <TableRow key={i}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(j => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border border-[var(--border-subtle)] rounded-lg">
        <Package className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No BOM Items</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm">
          Import a BOM file to see items here, or create items manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column Group Toggles & Expand/Collapse - Phase 14 */}
      {showColumnToggles && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {TABLE_COLUMN_GROUPS.map((group) => {
              const isVisible = visibleGroups.includes(group.id);
              const isDisabled = group.alwaysVisible;
              
              return (
                <button
                  key={group.id}
                  onClick={() => !isDisabled && handleToggleGroup(group.id)}
                  disabled={isDisabled}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    'border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--accent-blue)]',
                    isVisible
                      ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]',
                    isDisabled && 'opacity-60 cursor-not-allowed',
                    group.alwaysVisible && 'cursor-default'
                  )}
                  title={`${group.columns.length} columns`}
                >
                  {isVisible && <span className="text-xs">✓</span>}
                  {group.displayName}
                </button>
              );
            })}
          </div>
          
          {/* Expand/Collapse All */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpandAll}
              className="h-7 text-xs"
            >
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              Expand All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCollapseAll}
              className="h-7 text-xs"
            >
              <ChevronRightIcon className="h-3.5 w-3.5 mr-1" />
              Collapse All
            </Button>
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="rounded-md border border-[var(--border-subtle)] overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-[var(--bg-secondary)]/50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-[var(--text-secondary)]">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const item = row.original as BomItem & { _isGroupRow?: boolean; _parentGroup?: string };
              const isGroupRow = item._isGroupRow === true;
              const isChildRow = !!item._parentGroup;
              const isNewPart = item.isNewPart && !isGroupRow;
              
              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    'transition-colors',
                    !readOnly && 'cursor-pointer hover:bg-[var(--bg-tertiary)]',
                    readOnly && 'cursor-default',
                    // Group rows - olive green background
                    isGroupRow && 'bg-[#808000]/20 hover:bg-[#808000]/30 font-semibold',
                    // Child rows - slightly indented look
                    isChildRow && 'bg-[var(--bg-primary)]',
                    // Selected row
                    selectedItemId === row.original.id && !isGroupRow && 'bg-[var(--accent-blue)]/10',
                    // New part rows - light yellow background
                    isNewPart && 'bg-yellow-100/50 dark:bg-yellow-900/20'
                  )}
                  onClick={() => !readOnly && onItemClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-[var(--text-secondary)]">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            processedItems.length
          )}{' '}
          of {processedItems.length} rows ({items.length} total items)
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-[var(--text-secondary)]">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
