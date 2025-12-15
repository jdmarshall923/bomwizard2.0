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
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BomFilters as BomFiltersType } from '@/lib/hooks/useBom';

interface BomFiltersProps {
  filters: BomFiltersType;
  onFiltersChange: (filters: BomFiltersType) => void;
  assemblyCodes: string[];
  itemCount?: number;
  filteredCount?: number;
}

export function BomFilters({ 
  filters, 
  onFiltersChange, 
  assemblyCodes,
  itemCount = 0,
  filteredCount = 0,
}: BomFiltersProps) {
  const hasActiveFilters = 
    filters.searchTerm || 
    filters.showNewParts || 
    filters.showPlaceholders || 
    filters.showCostChanges ||
    filters.assemblyCode ||
    filters.costSource;

  const activeFilterCount = [
    filters.showNewParts,
    filters.showPlaceholders,
    filters.showCostChanges,
    filters.assemblyCode,
    filters.costSource,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onFiltersChange({
      searchTerm: '',
      showNewParts: false,
      showPlaceholders: false,
      showCostChanges: false,
      assemblyCode: null,
      costSource: null,
    });
  };

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
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="estimate">Estimate</SelectItem>
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
