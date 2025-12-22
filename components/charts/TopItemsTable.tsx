'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BomItem } from '@/types';
import { Crown, AlertTriangle, Sparkles, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopItemsTableProps {
  items: BomItem[];
  totalCost: number;
  isLoading?: boolean;
}

function formatCurrency(value: number, compact: boolean = false): string {
  if (compact) {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(1)}K`;
    }
  }
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CostSourceBadge({ source }: { source: string }) {
  const styles: Record<string, { color: string; icon?: React.ReactNode }> = {
    contract: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    quote: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    estimate: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    placeholder: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <AlertTriangle className="h-3 w-3 mr-0.5" /> },
  };
  
  const style = styles[source] || styles.placeholder;
  
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', style.color)}>
      {style.icon}
      {source}
    </Badge>
  );
}

export function TopItemsTable({ items, totalCost, isLoading = false }: TopItemsTableProps) {
  if (isLoading) {
    return (
      <Card className="border-[var(--border-subtle)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Top Cost Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-pulse text-[var(--text-secondary)]">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card className="border-[var(--border-subtle)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Top Cost Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex flex-col items-center justify-center text-center">
            <Package className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
            <p className="text-[var(--text-secondary)] mb-2">No items in BOM</p>
            <p className="text-sm text-[var(--text-tertiary)] max-w-sm">
              Add items to your BOM to see the highest cost components
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate cumulative percentage
  let cumulative = 0;
  const itemsWithCumulative = items.map((item) => {
    const percent = totalCost > 0 ? ((item.extendedCost || 0) / totalCost) * 100 : 0;
    cumulative += percent;
    return { ...item, percent, cumulative };
  });

  // Find items that make up 80% of cost (Pareto)
  const paretoIndex = itemsWithCumulative.findIndex(i => i.cumulative >= 80);

  return (
    <Card className="border-[var(--border-subtle)]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              Top Cost Items
            </CardTitle>
            <CardDescription className="mt-1">
              {items.length} highest cost items ({items.slice(0, paretoIndex + 1).length} make up 80%)
            </CardDescription>
          </div>
          
          {/* Pareto Badge */}
          <Badge variant="outline" className="px-2.5 py-1 border-amber-500/30 text-amber-400">
            <Sparkles className="h-3 w-3 mr-1" />
            Pareto: Top {paretoIndex + 1} = 80%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border-subtle)] hover:bg-transparent">
                <TableHead className="w-8 text-[10px] text-[var(--text-secondary)]">#</TableHead>
                <TableHead className="text-[10px] text-[var(--text-secondary)]">Item</TableHead>
                <TableHead className="text-[10px] text-[var(--text-secondary)]">Assembly</TableHead>
                <TableHead className="text-[10px] text-[var(--text-secondary)] text-center">Qty</TableHead>
                <TableHead className="text-[10px] text-[var(--text-secondary)] text-right">Unit Cost</TableHead>
                <TableHead className="text-[10px] text-[var(--text-secondary)] text-right">Extended</TableHead>
                <TableHead className="text-[10px] text-[var(--text-secondary)] text-right">% Total</TableHead>
                <TableHead className="text-[10px] text-[var(--text-secondary)]">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsWithCumulative.map((item, index) => {
                const unitCost = (item.materialCost || 0) + (item.landingCost || 0) + (item.labourCost || 0);
                const isAbovePareto = index <= paretoIndex;
                
                return (
                  <TableRow 
                    key={item.id}
                    className={cn(
                      'border-[var(--border-subtle)]',
                      isAbovePareto && 'bg-amber-500/5',
                      item.isPlaceholder && 'bg-red-500/5',
                      item.isNewPart && 'bg-blue-500/5'
                    )}
                  >
                    <TableCell className="font-medium text-xs">
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                        index === 0 && 'bg-amber-500/30 text-amber-400',
                        index === 1 && 'bg-slate-400/30 text-slate-400',
                        index === 2 && 'bg-amber-700/30 text-amber-600',
                        index > 2 && 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      )}>
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-medium text-[var(--text-primary)]">
                              {item.itemCode}
                            </p>
                            {item.isPlaceholder && (
                              <AlertTriangle className="h-3 w-3 text-amber-400" />
                            )}
                            {item.isNewPart && (
                              <Sparkles className="h-3 w-3 text-blue-400" />
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1 max-w-[150px]">
                            {item.itemDescription}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-[var(--bg-tertiary)]">
                        {item.groupCode || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-[var(--text-primary)]">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right text-xs text-[var(--text-secondary)]">
                      {formatCurrency(unitCost)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-[var(--text-primary)]">
                      {formatCurrency(item.extendedCost || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {item.percent.toFixed(1)}%
                        </span>
                        {/* Mini progress bar */}
                        <div className="w-12 h-1 bg-[var(--bg-tertiary)] rounded-full mt-0.5 overflow-hidden">
                          <div 
                            className={cn(
                              'h-full rounded-full',
                              isAbovePareto ? 'bg-amber-400' : 'bg-blue-400'
                            )}
                            style={{ width: `${Math.min(100, item.percent * 2)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <CostSourceBadge source={item.costSource || 'placeholder'} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {/* Footer Stats */}
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex justify-between items-center">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500/30" />
              <span className="text-[10px] text-[var(--text-secondary)]">80% of total cost</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] text-[var(--text-secondary)]">Placeholder</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] text-[var(--text-secondary)]">New Part</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--text-secondary)]">Top {items.length} items total</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {formatCurrency(items.reduce((sum, i) => sum + (i.extendedCost || 0), 0))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


