'use client';

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
import { 
  Search, 
  X, 
  Sparkles, 
  AlertCircle, 
  TrendingUp,
  Filter,
  RotateCcw,
  PlusCircle,
  FileSearch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BomFilters as BomFiltersType } from '@/lib/hooks/useBom';

interface BomFiltersProps {
  filters: BomFiltersType;
  onFiltersChange: (filters: BomFiltersType) => void;
  assemblyCodes: string[];
  itemCount?: number;
  filteredCount?: number;
  compact?: boolean;
}

export function BomFilters({ 
  filters, 
  onFiltersChange, 
  assemblyCodes,
  itemCount = 0,
  filteredCount = 0,
  compact = false,
}: BomFiltersProps) {
  const hasActiveFilters = 
    filters.searchTerm || 
    filters.showNewParts || 
    filters.showPlaceholders || 
    filters.showCostChanges ||
    filters.showAddedItems ||
    filters.showNewPartTracking ||
    filters.assemblyCode ||
    filters.costSource;

  const activeFilterCount = [
    filters.showNewParts,
    filters.showPlaceholders,
    filters.showCostChanges,
    filters.showAddedItems,
    filters.showNewPartTracking,
    filters.assemblyCode,
    filters.costSource,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onFiltersChange({
      searchTerm: '',
      showNewParts: false,
      showPlaceholders: false,
      showCostChanges: false,
      showAddedItems: false,
      showNewPartTracking: false,
      assemblyCode: null,
      costSource: null,
    });
  };

  // Compact mode for use in panels
  if (compact) {
    return (
      <div className="space-y-2">
        {/* Compact: Search + Quick filters in one row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Search..."
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
              className="pl-7 pr-7 h-7 text-xs"
            />
            {filters.searchTerm && (
              <button
                onClick={() => onFiltersChange({ ...filters, searchTerm: '' })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick filter buttons - compact */}
          <Button
            variant={filters.showNewParts ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onFiltersChange({ ...filters, showNewParts: !filters.showNewParts })}
            className={cn(
              'h-7 w-7 p-0',
              filters.showNewParts && 'bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]'
            )}
            title="New Parts"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant={filters.showPlaceholders ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onFiltersChange({ ...filters, showPlaceholders: !filters.showPlaceholders })}
            className={cn(
              'h-7 w-7 p-0',
              filters.showPlaceholders && 'bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)]'
            )}
            title="Placeholders"
          >
            <AlertCircle className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant={filters.showAddedItems ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onFiltersChange({ ...filters, showAddedItems: !filters.showAddedItems })}
            className={cn(
              'h-7 w-7 p-0',
              filters.showAddedItems && 'bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80'
            )}
            title="Added Items"
          >
            <PlusCircle className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant={filters.showNewPartTracking ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onFiltersChange({ ...filters, showNewPartTracking: !filters.showNewPartTracking })}
            className={cn(
              'h-7 w-7 p-0',
              filters.showNewPartTracking && 'bg-[var(--accent-pink)] hover:bg-[var(--accent-pink)]/80'
            )}
            title="New Part Tracking"
          >
            <FileSearch className="h-3.5 w-3.5" />
          </Button>

          {/* Reset */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-7 w-7 p-0 text-[var(--text-secondary)]"
              title="Reset filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Count */}
          <span className="text-[10px] text-[var(--text-secondary)] whitespace-nowrap">
            {filteredCount === itemCount ? (
              `${itemCount}`
            ) : (
              `${filteredCount}/${itemCount}`
            )}
          </span>
        </div>
      </div>
    );
  }

  // Full mode (default)
  return (
    <div className="space-y-4">
      {/* Main filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search by code, description..."
            value={filters.searchTerm}
            onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
            className="pl-10 pr-10"
          />
          {filters.searchTerm && (
            <button
              onClick={() => onFiltersChange({ ...filters, searchTerm: '' })}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Assembly Filter */}
        <Select
          value={filters.assemblyCode || 'all'}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            assemblyCode: value === 'all' ? null : value 
          })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Assemblies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assemblies</SelectItem>
            {assemblyCodes.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Cost Source Filter */}
        <Select
          value={filters.costSource || 'all'}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            costSource: value === 'all' ? null : value 
          })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Cost Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="placeholder">Placeholder</SelectItem>
            <SelectItem value="estimate">Estimate</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Quick filter toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--text-tertiary)] mr-1">
          <Filter className="h-3 w-3 inline mr-1" />
          Quick filters:
        </span>
        
        <Button
          variant={filters.showNewParts ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFiltersChange({ ...filters, showNewParts: !filters.showNewParts })}
          className={cn(
            'text-xs h-7',
            filters.showNewParts && 'bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]'
          )}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          New Parts
        </Button>
        
        <Button
          variant={filters.showPlaceholders ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFiltersChange({ ...filters, showPlaceholders: !filters.showPlaceholders })}
          className={cn(
            'text-xs h-7',
            filters.showPlaceholders && 'bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)]'
          )}
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Placeholders
        </Button>
        
        <Button
          variant={filters.showCostChanges ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFiltersChange({ ...filters, showCostChanges: !filters.showCostChanges })}
          className={cn(
            'text-xs h-7',
            filters.showCostChanges && 'bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80'
          )}
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          Cost Changes
        </Button>

        <Button
          variant={filters.showAddedItems ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFiltersChange({ ...filters, showAddedItems: !filters.showAddedItems })}
          className={cn(
            'text-xs h-7',
            filters.showAddedItems && 'bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80'
          )}
        >
          <PlusCircle className="h-3 w-3 mr-1" />
          Added Items
        </Button>

        <Button
          variant={filters.showNewPartTracking ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFiltersChange({ ...filters, showNewPartTracking: !filters.showNewPartTracking })}
          className={cn(
            'text-xs h-7',
            filters.showNewPartTracking && 'bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80'
          )}
        >
          <FileSearch className="h-3 w-3 mr-1" />
          New Part Tracking
        </Button>

        {/* Filter summary */}
        <div className="ml-auto flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </Badge>
          )}
          <span className="text-xs text-[var(--text-secondary)]">
            {filteredCount === itemCount ? (
              `${itemCount} items`
            ) : (
              `${filteredCount} of ${itemCount} items`
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
