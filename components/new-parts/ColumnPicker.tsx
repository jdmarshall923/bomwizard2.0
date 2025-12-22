'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ColumnConfig, DEFAULT_COLUMNS } from '@/types/newPart';
import { Settings2 } from 'lucide-react';

interface ColumnPickerProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  className?: string;
}

const COLUMN_GROUPS = [
  { id: 'basic', label: 'Basic', description: 'Essential columns' },
  { id: 'drawing', label: 'Drawing', description: 'Drawing & design info' },
  { id: 'assignments', label: 'Assignments', description: 'Team assignments' },
  { id: 'pricing', label: 'Pricing', description: 'Cost & pricing' },
  { id: 'sprint', label: 'Sprint Order', description: 'Sprint order details' },
  { id: 'production', label: 'Production Order', description: 'Production order details' },
  { id: 'planning', label: 'Planning', description: 'Forecasts & quantities' },
];

export function ColumnPicker({ columns, onColumnsChange, className }: ColumnPickerProps) {
  const [open, setOpen] = useState(false);

  const toggleColumn = (columnId: string) => {
    const updated = columns.map(col => 
      col.id === columnId ? { ...col, isVisible: !col.isVisible } : col
    );
    onColumnsChange(updated);
  };

  const toggleGroup = (groupId: string, visible: boolean) => {
    const updated = columns.map(col =>
      col.group === groupId ? { ...col, isVisible: visible } : col
    );
    onColumnsChange(updated);
  };

  const resetToDefaults = () => {
    onColumnsChange(DEFAULT_COLUMNS);
  };

  const getGroupColumns = (groupId: string) => {
    return columns.filter(col => col.group === groupId);
  };

  const isGroupVisible = (groupId: string) => {
    const groupCols = getGroupColumns(groupId);
    return groupCols.every(col => col.isVisible);
  };

  const isGroupPartial = (groupId: string) => {
    const groupCols = getGroupColumns(groupId);
    const visibleCount = groupCols.filter(col => col.isVisible).length;
    return visibleCount > 0 && visibleCount < groupCols.length;
  };

  const visibleCount = columns.filter(c => c.isVisible).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 border-[var(--border-subtle)] bg-[var(--bg-tertiary)]',
            className
          )}
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Columns</span>
          <span className="text-[var(--text-tertiary)]">({visibleCount})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 bg-[var(--bg-secondary)] border-[var(--border-subtle)]"
      >
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Column Visibility</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              className="h-6 text-xs text-[var(--accent-blue)]"
            >
              Reset
            </Button>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Choose which columns to display in the table
          </p>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {COLUMN_GROUPS.map((group) => {
            const groupCols = getGroupColumns(group.id);
            if (groupCols.length === 0) return null;

            return (
              <div key={group.id} className="border-b border-[var(--border-subtle)] last:border-0">
                {/* Group Header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGroup(group.id, !isGroupVisible(group.id))}
                  onKeyDown={(e) => e.key === 'Enter' && toggleGroup(group.id, !isGroupVisible(group.id))}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  <Checkbox
                    checked={isGroupVisible(group.id) ? true : isGroupPartial(group.id) ? 'indeterminate' : false}
                    className="h-3.5 w-3.5 pointer-events-none"
                  />
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium">{group.label}</span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-2">
                      ({groupCols.filter(c => c.isVisible).length}/{groupCols.length})
                    </span>
                  </div>
                </div>

                {/* Group Columns */}
                <div className="pl-7 pb-2 space-y-0.5">
                  {groupCols.map((col) => (
                    <div
                      key={col.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleColumn(col.id)}
                      onKeyDown={(e) => e.key === 'Enter' && toggleColumn(col.id)}
                      className="flex items-center gap-2 w-full px-3 py-1 hover:bg-[var(--bg-tertiary)] transition-colors rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={col.isVisible}
                        className="h-3 w-3 pointer-events-none"
                      />
                      <span className="text-xs text-[var(--text-secondary)]">
                        {col.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

