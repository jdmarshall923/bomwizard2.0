'use client';

import { NewPartStatus } from '@/types/bom';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Filter,
  AlertTriangle,
  Kanban,
  Table,
  ChevronDown,
  X,
  Columns3,
} from 'lucide-react';

export type ViewMode = 'table' | 'kanban';
export type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
export type StatusFilter = 'all' | NewPartStatus;

interface TableFiltersProps {
  // Filter state
  statusFilter: StatusFilter;
  priorityFilter: PriorityFilter;
  showMissingInfo: boolean;
  missingInfoCount: number;
  
  // Callbacks
  onStatusChange: (status: StatusFilter) => void;
  onPriorityChange: (priority: PriorityFilter) => void;
  onMissingInfoToggle: () => void;
  
  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  // Group visibility
  groupBy: 'none' | 'group' | 'status' | 'vendor';
  onGroupByChange: (groupBy: 'none' | 'group' | 'status' | 'vendor') => void;
  
  // Active filter count for indicator
  activeFilterCount: number;
  onClearFilters: () => void;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'added', label: 'Added' },
  { value: 'pending', label: 'Pending' },
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'complete', label: 'Complete' },
  { value: 'on_hold', label: 'On Hold' },
];

const PRIORITY_OPTIONS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'All Priority' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const GROUP_OPTIONS: { value: 'none' | 'group' | 'status' | 'vendor'; label: string }[] = [
  { value: 'none', label: 'No Grouping' },
  { value: 'group', label: 'By BOM Group' },
  { value: 'status', label: 'By Status' },
  { value: 'vendor', label: 'By Vendor' },
];

export function TableFilters({
  statusFilter,
  priorityFilter,
  showMissingInfo,
  missingInfoCount,
  onStatusChange,
  onPriorityChange,
  onMissingInfoToggle,
  viewMode,
  onViewModeChange,
  groupBy,
  onGroupByChange,
  activeFilterCount,
  onClearFilters,
}: TableFiltersProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 px-1">
      {/* Left: Filters */}
      <div className="flex items-center gap-2">
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 w-32 text-xs bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select value={priorityFilter} onValueChange={onPriorityChange}>
          <SelectTrigger className="h-8 w-32 text-xs bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
            {PRIORITY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Missing Info Toggle */}
        <Button
          variant={showMissingInfo ? 'default' : 'outline'}
          size="sm"
          onClick={onMissingInfoToggle}
          className={cn(
            'h-8 text-xs',
            showMissingInfo 
              ? 'bg-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/90 text-white' 
              : 'border-[var(--border-subtle)]'
          )}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Missing Info
          {missingInfoCount > 0 && (
            <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-white/20">
              {missingInfoCount}
            </Badge>
          )}
        </Button>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-3 w-3 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Right: Grouping + View Toggle */}
      <div className="flex items-center gap-2">
        {/* Group By */}
        {viewMode === 'table' && (
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger className="h-8 w-36 text-xs bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
              <Columns3 className="h-3 w-3 mr-1.5 text-[var(--text-tertiary)]" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
              {GROUP_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-0.5">
          <button
            onClick={() => onViewModeChange('table')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
              viewMode === 'table'
                ? 'bg-[var(--accent-blue)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            <Table className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            onClick={() => onViewModeChange('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
              viewMode === 'kanban'
                ? 'bg-[var(--accent-blue)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            <Kanban className="h-3.5 w-3.5" />
            Kanban
          </button>
        </div>
      </div>
    </div>
  );
}

