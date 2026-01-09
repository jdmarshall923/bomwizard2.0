'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnDef,
  Row,
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
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BomItem } from '@/types/bom';
import { ColumnDefinition, COLUMN_DEFINITIONS, getVisibleColumns, ColumnVisibilitySettings } from '@/types/settings';
import { EditableCell, COST_SOURCE_OPTIONS, PM_OPTIONS } from './EditableCell';
import { ColumnGroupToggle } from './ColumnGroupToggle';
import { useColumnSettings } from '@/lib/hooks/useColumnSettings';

/**
 * Phase 14: Excel-Like BOM Table
 * 
 * Features:
 * - Inline cell editing with click-to-edit
 * - Keyboard navigation (Tab, Enter, Arrow keys)
 * - Column group toggles
 * - Override indicators
 * - Group row highlighting (olive green for level 0/1)
 * - Sorting and pagination
 */

interface ExcelTableProps {
  items: BomItem[];
  projectId: string;
  onItemUpdate: (itemId: string, field: string, value: any) => Promise<void>;
  onItemClick?: (item: BomItem) => void;
  selectedItemId?: string | null;
  loading?: boolean;
  pageSize?: number;
  readOnly?: boolean;
}

interface CellPosition {
  rowIndex: number;
  columnId: string;
}

export function ExcelTable({
  items,
  projectId,
  onItemUpdate,
  onItemClick,
  selectedItemId,
  loading = false,
  pageSize = 50,
  readOnly = false,
}: ExcelTableProps) {
  // Column visibility settings
  const {
    visibility,
    visibleColumns,
    toggleGroup,
    presets,
    activePreset,
    applyPreset,
    saveAsPreset,
    deletePreset,
    reset,
    isLoading: settingsLoading,
    isSaving,
  } = useColumnSettings({ projectId });
  
  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  
  // Refs for keyboard navigation
  const tableRef = useRef<HTMLTableElement>(null);
  
  // Get select options for a column
  const getSelectOptions = useCallback((columnId: string) => {
    switch (columnId) {
      case 'costSource':
        return COST_SOURCE_OPTIONS;
      case 'purchasedOrManufactured':
        return PM_OPTIONS;
      default:
        return undefined;
    }
  }, []);
  
  // Handle cell edit
  const handleCellSave = useCallback(async (
    itemId: string,
    field: string,
    value: any
  ) => {
    try {
      await onItemUpdate(itemId, field, value);
    } catch (error) {
      console.error('Failed to update cell:', error);
    }
  }, [onItemUpdate]);
  
  // Navigate to adjacent cell
  const navigateToCell = useCallback((
    currentRow: number,
    currentColumn: string,
    direction: 'up' | 'down' | 'left' | 'right'
  ) => {
    const editableColumns = visibleColumns.filter(col => col.editable);
    const currentColIndex = editableColumns.findIndex(col => col.id === currentColumn);
    
    let newRow = currentRow;
    let newColIndex = currentColIndex;
    
    switch (direction) {
      case 'up':
        newRow = Math.max(0, currentRow - 1);
        break;
      case 'down':
        newRow = Math.min(items.length - 1, currentRow + 1);
        break;
      case 'left':
        if (currentColIndex > 0) {
          newColIndex = currentColIndex - 1;
        } else if (currentRow > 0) {
          newRow = currentRow - 1;
          newColIndex = editableColumns.length - 1;
        }
        break;
      case 'right':
        if (currentColIndex < editableColumns.length - 1) {
          newColIndex = currentColIndex + 1;
        } else if (currentRow < items.length - 1) {
          newRow = currentRow + 1;
          newColIndex = 0;
        }
        break;
    }
    
    if (editableColumns[newColIndex]) {
      setSelectedCell({ rowIndex: newRow, columnId: editableColumns[newColIndex].id });
      setEditingCell({ rowIndex: newRow, columnId: editableColumns[newColIndex].id });
    }
  }, [visibleColumns, items.length]);
  
  // Build TanStack Table columns from visible column definitions
  const columns = useMemo(() => {
    return visibleColumns.map((colDef): ColumnDef<BomItem, any> => ({
      id: colDef.id,
      accessorKey: colDef.id,
      header: ({ column }) => {
        // Only add sorting to non-editable or key columns
        const canSort = !colDef.calculated;
        
        if (canSort) {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              {colDef.shortName || colDef.displayName}
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-1 h-3 w-3" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-1 h-3 w-3" />
              ) : (
                <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
              )}
            </Button>
          );
        }
        
        return <span>{colDef.shortName || colDef.displayName}</span>;
      },
      cell: ({ row, column }) => {
        const item = row.original;
        const rowIndex = row.index;
        const columnId = column.id;
        const value = item[columnId as keyof BomItem];
        const isGroupRow = item.level <= 1 && item.itemType === 'group';
        
        // Check if this cell is being edited
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId;
        const isSelected = selectedCell?.rowIndex === rowIndex && selectedCell?.columnId === columnId;
        
        return (
          <EditableCell
            column={colDef}
            value={value as any}
            cellMetadata={item.cellMetadata?.[columnId]}
            onSave={(newValue) => handleCellSave(item.id, columnId, newValue)}
            onNavigate={(dir) => navigateToCell(rowIndex, columnId, dir)}
            onStartEdit={() => setEditingCell({ rowIndex, columnId })}
            onEndEdit={() => setEditingCell(null)}
            isEditing={isEditing}
            isSelected={isSelected}
            disabled={readOnly || isGroupRow}
            selectOptions={getSelectOptions(columnId)}
            isGroupRow={isGroupRow}
          />
        );
      },
      size: colDef.width,
      minSize: colDef.minWidth,
      maxSize: colDef.maxWidth,
    }));
  }, [visibleColumns, editingCell, selectedCell, readOnly, handleCellSave, navigateToCell, getSelectOptions]);
  
  // Initialize table
  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
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
  
  // Handle row click
  const handleRowClick = useCallback((item: BomItem) => {
    if (!readOnly && onItemClick) {
      onItemClick(item);
    }
  }, [readOnly, onItemClick]);
  
  // Check if row is a group row (level 0 or 1 with group type)
  const isGroupRow = useCallback((item: BomItem) => {
    return item.level <= 1 && item.itemType === 'group';
  }, []);
  
  // Loading state
  if (loading || settingsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="rounded-md border border-[var(--border-subtle)]">
          <Table>
            <TableHeader>
              <TableRow>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <TableHead key={i}><Skeleton className="h-4 w-16" /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (!items.length) {
    return (
      <div className="space-y-4">
        <ColumnGroupToggle
          visibleGroups={visibility.visibleGroups}
          onToggleGroup={toggleGroup}
          presets={presets}
          activePreset={activePreset}
          onApplyPreset={applyPreset}
          onSaveAsPreset={saveAsPreset}
          onDeletePreset={deletePreset}
          onReset={reset}
          isSaving={isSaving}
        />
        <div className="flex flex-col items-center justify-center py-12 text-center border border-[var(--border-subtle)] rounded-lg">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No BOM Items</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Import a BOM or add items to get started.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Column group toggles */}
      <ColumnGroupToggle
        visibleGroups={visibility.visibleGroups}
        onToggleGroup={toggleGroup}
        presets={presets}
        activePreset={activePreset}
        onApplyPreset={applyPreset}
        onSaveAsPreset={saveAsPreset}
        onDeletePreset={deletePreset}
        onReset={reset}
        isSaving={isSaving}
      />
      
      {/* Table */}
      <div className="rounded-md border border-[var(--border-subtle)] overflow-hidden">
        <div className="overflow-x-auto">
          <Table ref={tableRef}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-[var(--bg-secondary)]/50">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-[var(--text-secondary)] whitespace-nowrap"
                      style={{ width: header.getSize() }}
                    >
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
                const item = row.original;
                const isGroup = isGroupRow(item);
                
                return (
                  <TableRow
                    key={row.id}
                    onClick={() => handleRowClick(item)}
                    className={cn(
                      'transition-colors',
                      // Group row styling (olive green)
                      isGroup && 'bg-[#808000]/20 hover:bg-[#808000]/30',
                      // Selected row
                      selectedItemId === item.id && !isGroup && 'bg-[var(--accent-blue)]/10',
                      // New part highlighting
                      item.isNewPart && !isGroup && 'bg-[var(--accent-purple)]/5',
                      // Hover
                      !isGroup && 'hover:bg-[var(--bg-tertiary)]',
                      // Cursor
                      !readOnly && onItemClick && 'cursor-pointer'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'p-0', // Remove padding, EditableCell handles it
                          isGroup && 'font-semibold'
                        )}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-[var(--text-secondary)]">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            items.length
          )}{' '}
          of {items.length} items
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
