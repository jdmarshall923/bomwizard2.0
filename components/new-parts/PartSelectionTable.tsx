'use client';

import { useState, useMemo } from 'react';
import { NewPart } from '@/types/newPart';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { InlineEditCell } from './InlineEditCell';
import {
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Package,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Clock,
  Truck,
  Ship,
  Plane,
} from 'lucide-react';

interface PartSelectionTableProps {
  parts: NewPart[];
  selectedIds: Set<string>;
  onToggleSelection: (partId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onPartClick?: (part: NewPart) => void;
  onUpdatePart?: (partId: string, updates: Partial<NewPart>) => void;
  showGroupHeaders?: boolean;
}

export function PartSelectionTable({
  parts,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onClearAll,
  onPartClick,
  onUpdatePart,
  showGroupHeaders = true,
}: PartSelectionTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showLateOnly, setShowLateOnly] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group parts by groupCode
  const groupedParts = useMemo(() => {
    const groups = new Map<string, NewPart[]>();
    
    parts.forEach(part => {
      const groupCode = part.groupCode || 'Ungrouped';
      if (!groups.has(groupCode)) {
        groups.set(groupCode, []);
      }
      groups.get(groupCode)!.push(part);
    });
    
    // Sort groups alphabetically
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [parts]);

  // Filter parts
  const filteredParts = useMemo(() => {
    let filtered = parts;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.placeholderCode.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.groupCode.toLowerCase().includes(query) ||
        (p.vendorName?.toLowerCase().includes(query))
      );
    }
    
    if (showLateOnly) {
      const today = new Date();
      filtered = filtered.filter(p => {
        // Consider late if no order date set and lead time would require ordering now
        if (!p.quotedLeadTimeDays) return false;
        const leadTime = (p.quotedLeadTimeDays || 0) + (p.freightType === 'air' ? (p.airFreightDays || 5) : (p.seaFreightDays || 35));
        // This is a simplified check - in reality would check against gate dates
        return leadTime > 60; // Flag if lead time > 60 days as potentially at risk
      });
    }
    
    return filtered;
  }, [parts, searchQuery, showLateOnly]);

  // Group the filtered parts
  const filteredGroupedParts = useMemo(() => {
    const groups = new Map<string, NewPart[]>();
    
    filteredParts.forEach(part => {
      const groupCode = part.groupCode || 'Ungrouped';
      if (!groups.has(groupCode)) {
        groups.set(groupCode, []);
      }
      groups.get(groupCode)!.push(part);
    });
    
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [filteredParts]);

  const toggleGroup = (groupCode: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupCode)) {
      newExpanded.delete(groupCode);
    } else {
      newExpanded.add(groupCode);
    }
    setExpandedGroups(newExpanded);
  };

  const isGroupSelected = (groupCode: string): boolean => {
    const groupParts = groupedParts.get(groupCode) || [];
    return groupParts.every(p => selectedIds.has(p.id));
  };

  const isGroupPartiallySelected = (groupCode: string): boolean => {
    const groupParts = groupedParts.get(groupCode) || [];
    const selectedCount = groupParts.filter(p => selectedIds.has(p.id)).length;
    return selectedCount > 0 && selectedCount < groupParts.length;
  };

  const toggleGroupSelection = (groupCode: string) => {
    const groupParts = groupedParts.get(groupCode) || [];
    const allSelected = isGroupSelected(groupCode);
    
    groupParts.forEach(part => {
      if (allSelected) {
        if (selectedIds.has(part.id)) {
          onToggleSelection(part.id);
        }
      } else {
        if (!selectedIds.has(part.id)) {
          onToggleSelection(part.id);
        }
      }
    });
  };

  // Expand all groups by default on mount
  useState(() => {
    setExpandedGroups(new Set(groupedParts.keys()));
  });

  return (
    <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-[var(--accent-blue)]" />
            Select Parts for Timeline
            <Badge className="ml-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              {selectedIds.size} of {parts.length} selected
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onSelectAll} className="text-xs">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs">
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Search and Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts..."
              className="pl-9 h-8 text-sm bg-[var(--bg-tertiary)] border-[var(--border-subtle)]"
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
          
          <Button
            variant={showLateOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowLateOnly(!showLateOnly)}
            className={cn(
              "h-8 text-xs",
              showLateOnly && "bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90"
            )}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            At Risk
          </Button>
        </div>
        
        {/* Parts Table with Groups */}
        <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden max-h-[400px] overflow-y-auto">
          {filteredGroupedParts.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-8 w-8 text-[var(--text-tertiary)] mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">No parts match your search</p>
            </div>
          ) : (
            showGroupHeaders ? (
              // Grouped view
              Array.from(filteredGroupedParts.entries()).map(([groupCode, groupParts]) => (
                <div key={groupCode}>
                  {/* Group Header */}
                  <div 
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-tertiary)]/80"
                    onClick={() => toggleGroup(groupCode)}
                  >
                    <Checkbox
                      checked={isGroupPartiallySelected(groupCode) ? "indeterminate" : isGroupSelected(groupCode)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupSelection(groupCode);
                      }}
                      className="h-4 w-4"
                    />
                    {expandedGroups.has(groupCode) ? (
                      <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                    )}
                    <span className="font-mono text-xs font-medium text-[var(--accent-blue)]">
                      {groupCode}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      ({groupParts.length} parts)
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-auto">
                      {groupParts.filter(p => selectedIds.has(p.id)).length} selected
                    </span>
                  </div>
                  
                  {/* Group Parts */}
                  {expandedGroups.has(groupCode) && (
                    <div>
                      {groupParts.map(part => (
                        <PartRow
                          key={part.id}
                          part={part}
                          isSelected={selectedIds.has(part.id)}
                          onToggle={() => onToggleSelection(part.id)}
                          onClick={() => onPartClick?.(part)}
                          onUpdate={onUpdatePart ? (updates) => onUpdatePart(part.id, updates) : undefined}
                          indent
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Flat view
              filteredParts.map(part => (
                <PartRow
                  key={part.id}
                  part={part}
                  isSelected={selectedIds.has(part.id)}
                  onToggle={() => onToggleSelection(part.id)}
                  onClick={() => onPartClick?.(part)}
                  onUpdate={onUpdatePart ? (updates) => onUpdatePart(part.id, updates) : undefined}
                />
              ))
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Individual part row component with inline editing
function PartRow({
  part,
  isSelected,
  onToggle,
  onClick,
  onUpdate,
  indent = false,
}: {
  part: NewPart;
  isSelected: boolean;
  onToggle: () => void;
  onClick?: () => void;
  onUpdate?: (updates: Partial<NewPart>) => void;
  indent?: boolean;
}) {
  const hasLeadTime = !!part.quotedLeadTimeDays;
  const hasVendor = !!part.vendorName;
  const freightDays = part.freightType === 'air' ? (part.airFreightDays || 5) : (part.seaFreightDays || 35);
  const totalLeadTime = (part.quotedLeadTimeDays || 0) + freightDays;
  
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-tertiary)]/50 transition-colors",
        indent && "pl-10",
        isSelected && "bg-[var(--accent-blue)]/5"
      )}
    >
      <Checkbox
        checked={isSelected}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="h-4 w-4"
      />
      
      {/* Part info */}
      <div 
        className="w-40 min-w-0 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm text-[var(--accent-blue)] truncate">
            {part.placeholderCode}
          </span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] truncate">{part.description}</p>
      </div>
      
      {/* Vendor - inline editable */}
      <div className="w-28">
        {onUpdate ? (
          <InlineEditCell
            value={part.vendorName || ''}
            placeholder="Add vendor"
            onSave={(value) => onUpdate({ vendorName: value })}
            className="text-xs"
          />
        ) : (
          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] truncate">
            <Truck className="h-3 w-3 flex-shrink-0" />
            {hasVendor ? part.vendorName : '-'}
          </div>
        )}
      </div>
      
      {/* Lead time - inline editable */}
      <div className="w-20">
        {onUpdate ? (
          <InlineEditCell
            value={part.quotedLeadTimeDays?.toString() || ''}
            placeholder="Lead"
            onSave={(value) => onUpdate({ quotedLeadTimeDays: parseInt(value) || undefined })}
            type="number"
            suffix="d"
            className="text-xs text-center w-14"
          />
        ) : (
          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <Clock className="h-3 w-3" />
            {hasLeadTime ? `${part.quotedLeadTimeDays}d` : '-'}
          </div>
        )}
      </div>
      
      {/* Freight type toggle */}
      <div className="w-16">
        {onUpdate ? (
          <button
            onClick={() => {
              const newFreight = part.freightType === 'air' ? 'sea' : 'air';
              onUpdate({ freightType: newFreight });
            }}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
              part.freightType === 'air'
                ? 'bg-sky-400/20 text-sky-400'
                : 'bg-teal-500/20 text-teal-500'
            )}
          >
            {part.freightType === 'air' ? (
              <>
                <Plane className="h-3 w-3" />
                Air
              </>
            ) : (
              <>
                <Ship className="h-3 w-3" />
                Sea
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            {part.freightType === 'air' ? <Plane className="h-3 w-3" /> : <Ship className="h-3 w-3" />}
            {freightDays}d
          </div>
        )}
      </div>
      
      {/* Total */}
      <div className="w-14 text-xs text-[var(--text-secondary)] text-right">
        {hasLeadTime ? (
          <span className="font-medium">{totalLeadTime}d</span>
        ) : (
          <span className="text-[var(--text-tertiary)]">-</span>
        )}
      </div>
      
      {/* Status indicator */}
      <div className="w-5">
        {hasLeadTime && hasVendor ? (
          <CheckCircle2 className="h-4 w-4 text-[var(--accent-green)]" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-[var(--accent-orange)]" />
        )}
      </div>
    </div>
  );
}

