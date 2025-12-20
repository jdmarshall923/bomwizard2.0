'use client';

import { BomItem } from '@/types';
import { useState, useMemo } from 'react';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertCircle,
  Package,
  Boxes
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BomTableProps {
  items: BomItem[];
  onItemClick?: (item: BomItem) => void;
  selectedItemId?: string | null;
  loading?: boolean;
  pageSize?: number;
  readOnly?: boolean;
}

const columnHelper = createColumnHelper<BomItem>();

export function BomTable({ 
  items, 
  onItemClick,
  selectedItemId,
  loading = false,
  pageSize = 25,
  readOnly = false,
}: BomTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const isPlaceholder = (itemCode: string) => {
    // Complete B code = B + exactly 6 numbers (e.g., B123456)
    // Placeholder = starts with B but doesn't have complete 6-digit code
    const startsWithB = itemCode?.startsWith('B');
    const isCompleteBCode = /^B\d{6}$/.test(itemCode || '');
    return startsWithB && !isCompleteBCode;
  };

  const columns = useMemo(() => [
    columnHelper.accessor('assemblyCode', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Assembly
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-[var(--accent-blue)]" />
          <span className="font-medium">{row.getValue('assemblyCode')}</span>
        </div>
      ),
    }),
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
        const item = row.original;
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
    data: items,
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
              {['Assembly', 'Item Code', 'Description', 'Level', 'Qty', 'Material', 'Landing', 'Labour', 'Extended', 'Source', 'Status'].map(header => (
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
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  'transition-colors',
                  !readOnly && 'cursor-pointer hover:bg-[var(--bg-tertiary)]',
                  readOnly && 'cursor-default',
                  selectedItemId === row.original.id && 'bg-[var(--accent-blue)]/10',
                  row.original.isNewPart && 'bg-[var(--accent-purple)]/5'
                )}
                onClick={() => !readOnly && onItemClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
