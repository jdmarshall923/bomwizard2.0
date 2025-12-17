'use client';

import { BomItem, Assembly } from '@/types';
import { 
  ChevronRight, 
  ChevronDown, 
  Package, 
  Boxes, 
  Sparkles,
  AlertCircle,
  PoundSterling
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface BomTreeProps {
  items: BomItem[];
  assemblies?: Assembly[];
  onItemClick?: (item: BomItem) => void;
  onAssemblyClick?: (assemblyCode: string) => void;
  selectedItemId?: string | null;
  loading?: boolean;
  readOnly?: boolean;
}

interface TreeNode {
  type: 'assembly' | 'item';
  assemblyCode: string;
  assembly?: Assembly;
  items: BomItem[];
  totalCost: number;
  itemCount: number;
  newPartsCount: number;
  placeholdersCount: number;
  newPartTrackingCount: number; // Items flagged as isNewPart
}

export function BomTree({ 
  items, 
  assemblies = [],
  onItemClick, 
  onAssemblyClick,
  selectedItemId,
  loading = false,
  readOnly = false,
}: BomTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  // Build tree structure grouped by assembly/group
  const treeNodes: TreeNode[] = useMemo(() => {
    const groups: Record<string, BomItem[]> = {};
    
    items.forEach(item => {
      // Use groupCode if available, fall back to assemblyCode, then 'UNASSIGNED'
      const groupKey = item.groupCode || item.assemblyCode || 'UNASSIGNED';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return Object.entries(groups)
      .map(([assemblyCode, assemblyItems]) => {
        const assembly = assemblies.find(a => a.code === assemblyCode);
        return {
          type: 'assembly' as const,
          assemblyCode,
          assembly,
          items: assemblyItems.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
          totalCost: assemblyItems.reduce((sum, item) => sum + (item.extendedCost || 0), 0),
          itemCount: assemblyItems.length,
          newPartsCount: assemblyItems.filter(item => item.partCategory === 'new_part').length,
          placeholdersCount: assemblyItems.filter(item => 
            item.itemCode?.startsWith('B') && /^B\d/.test(item.itemCode)
          ).length,
          newPartTrackingCount: assemblyItems.filter(item => item.isNewPart).length,
        };
      })
      .sort((a, b) => a.assemblyCode.localeCompare(b.assemblyCode));
  }, [items, assemblies]);

  const toggleExpand = useCallback((assemblyCode: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(assemblyCode)) {
        next.delete(assemblyCode);
      } else {
        next.add(assemblyCode);
      }
      return next;
    });
  }, []);

  const toggleExpandAll = useCallback(() => {
    if (expandAll) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(treeNodes.map(node => node.assemblyCode)));
    }
    setExpandAll(!expandAll);
  }, [expandAll, treeNodes]);

  const isExpanded = useCallback((assemblyCode: string) => {
    return expanded.has(assemblyCode);
  }, [expanded]);

  const isPlaceholder = useCallback((itemCode: string) => {
    return itemCode?.startsWith('B') && /^B\d/.test(itemCode);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-[var(--border-subtle)] rounded-lg p-4">
            <Skeleton className="h-6 w-48 mb-3" />
            <div className="space-y-2 pl-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Boxes className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No BOM Items</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm">
          Import a BOM file to see items here, or create items manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Expand/Collapse Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[var(--text-secondary)]">
          {treeNodes.length} assemblies • {items.length} items
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleExpandAll}
          className="text-xs"
        >
          {expandAll ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      {/* Tree Nodes */}
      {treeNodes.map((node) => (
        <div 
          key={node.assemblyCode} 
          className="border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)] transition-colors"
        >
          {/* Assembly Header */}
          <div 
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
            onClick={() => toggleExpand(node.assemblyCode)}
          >
            <button 
              className="p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.assemblyCode);
              }}
            >
              {isExpanded(node.assemblyCode) ? (
                <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
              )}
            </button>
            
            <Boxes className="h-5 w-5 text-[var(--accent-blue)]" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">
                  {node.assemblyCode}
                </span>
                {node.assembly?.assemblyType === 'bco' && (
                  <Badge variant="outline" className="text-xs">BCO</Badge>
                )}
              </div>
              {node.assembly?.description && (
                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                  {node.assembly.description}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs">
              {node.newPartTrackingCount > 0 && (
                <Badge className="bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] border-[var(--accent-purple)]/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {node.newPartTrackingCount} tracking
                </Badge>
              )}
              {node.newPartsCount > 0 && (
                <Badge className="bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border-[var(--accent-blue)]/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {node.newPartsCount} new
                </Badge>
              )}
              {node.placeholdersCount > 0 && (
                <Badge className="bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] border-[var(--accent-orange)]/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {node.placeholdersCount} placeholder
                </Badge>
              )}
              <span className="text-[var(--text-secondary)]">
                {node.itemCount} items
              </span>
              <span className="font-medium text-[var(--accent-green)] flex items-center gap-1">
                <PoundSterling className="h-3 w-3" />
                £{node.totalCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Items List (Expanded) */}
          {isExpanded(node.assemblyCode) && (
            <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
              {node.items.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 transition-colors',
                    !readOnly && 'cursor-pointer hover:bg-[var(--bg-tertiary)]',
                    readOnly && 'cursor-default',
                    selectedItemId === item.id && 'bg-[var(--accent-blue)]/10 border-l-2 border-l-[var(--accent-blue)]',
                    item.isNewPart && 'bg-[var(--accent-purple)]/5 border-l-2 border-l-[var(--accent-purple)]',
                    !item.isNewPart && item.partCategory === 'new_part' && 'bg-[var(--accent-blue)]/5',
                    !item.isNewPart && isPlaceholder(item.itemCode) && 'bg-[var(--accent-orange)]/5',
                    index !== node.items.length - 1 && 'border-b border-[var(--border-subtle)]'
                  )}
                  onClick={() => !readOnly && onItemClick?.(item)}
                >
                  {/* Indentation */}
                  <div className="w-6" />
                  
                  {/* Level indicator */}
                  {item.level > 1 && (
                    <div 
                      className="flex items-center"
                      style={{ paddingLeft: `${(item.level - 1) * 16}px` }}
                    >
                      <div className="w-4 h-px bg-[var(--border-default)]" />
                    </div>
                  )}
                  
                  {/* Icon */}
                  <Package className={cn(
                    'h-4 w-4 flex-shrink-0',
                    item.partCategory === 'new_part' 
                      ? 'text-[var(--accent-blue)]' 
                      : isPlaceholder(item.itemCode)
                        ? 'text-[var(--accent-orange)]'
                        : 'text-[var(--text-tertiary)]'
                  )} />
                  
                  {/* Item Code */}
                  <span className={cn(
                    'font-mono text-sm flex-shrink-0 w-24',
                    item.partCategory === 'new_part' && 'text-[var(--accent-blue)] font-medium',
                    isPlaceholder(item.itemCode) && 'text-[var(--accent-orange)]'
                  )}>
                    {item.itemCode}
                  </span>
                  
                  {/* Description */}
                  <span className="text-sm text-[var(--text-secondary)] flex-1 truncate">
                    {item.itemDescription}
                  </span>
                  
                  {/* Quantity */}
                  <span className="text-sm text-[var(--text-tertiary)] w-16 text-right">
                    Qty: {item.quantity}
                  </span>
                  
                  {/* Cost */}
                  <span className={cn(
                    'text-sm font-medium w-24 text-right',
                    item.extendedCost > 100 
                      ? 'text-[var(--accent-green)]' 
                      : 'text-[var(--text-primary)]'
                  )}>
                    £{item.extendedCost?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </span>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-1 w-28 justify-end">
                    {item.isNewPart && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] px-1.5 py-0 border-[var(--accent-purple)] text-[var(--accent-purple)] bg-[var(--accent-purple)]/10"
                      >
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        {item.newPartStatus || 'pending'}
                      </Badge>
                    )}
                    {item.partCategory === 'new_part' && !item.isNewPart && (
                      <Sparkles className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
                    )}
                    {isPlaceholder(item.itemCode) && (
                      <AlertCircle className="h-3.5 w-3.5 text-[var(--accent-orange)]" />
                    )}
                    {item.costSource && !item.isNewPart && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          item.costSource === 'contract' && 'border-[var(--accent-green)] text-[var(--accent-green)]',
                          item.costSource === 'quote' && 'border-[var(--accent-blue)] text-[var(--accent-blue)]',
                          item.costSource === 'estimate' && 'border-[var(--accent-orange)] text-[var(--accent-orange)]'
                        )}
                      >
                        {item.costSource}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
