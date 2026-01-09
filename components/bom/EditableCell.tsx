'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ColumnDefinition } from '@/types/settings';
import { CellMetadata } from '@/types/bom';

/**
 * Phase 14: Editable Cell Component
 * 
 * Provides inline cell editing with:
 * - Click to edit
 * - Keyboard navigation (Tab, Enter, Escape)
 * - Override/comment indicators
 * - Different cell types (text, number, currency, select)
 */

interface EditableCellProps {
  // Cell configuration
  column: ColumnDefinition;
  value: string | number | boolean | null | undefined;
  
  // Override/comment info
  cellMetadata?: CellMetadata;
  
  // Callbacks
  onSave: (newValue: string | number | boolean | null) => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onStartEdit?: () => void;
  onEndEdit?: () => void;
  
  // State
  isEditing?: boolean;
  isSelected?: boolean;
  disabled?: boolean;
  
  // For select fields
  selectOptions?: { value: string; label: string }[];
  
  // Row styling (for group rows)
  isGroupRow?: boolean;
}

export function EditableCell({
  column,
  value,
  cellMetadata,
  onSave,
  onNavigate,
  onStartEdit,
  onEndEdit,
  isEditing = false,
  isSelected = false,
  disabled = false,
  selectOptions,
  isGroupRow = false,
}: EditableCellProps) {
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Initialize edit value when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditValue(formatValueForEdit(value, column.dataType));
      // Focus input after a short delay to ensure it's rendered
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing, value, column.dataType]);
  
  // Format value for display
  const displayValue = formatValueForDisplay(value, column);
  
  // Check if cell is overridden
  const isOverridden = cellMetadata?.source === 'manual' && cellMetadata?.originalValue !== undefined;
  
  // Check if cell has comments
  const hasComments = cellMetadata?.hasComments && (cellMetadata?.commentCount ?? 0) > 0;
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        saveAndExit();
        onNavigate?.('down');
        break;
      case 'Tab':
        e.preventDefault();
        saveAndExit();
        onNavigate?.(e.shiftKey ? 'left' : 'right');
        break;
      case 'Escape':
        e.preventDefault();
        cancelEdit();
        break;
      case 'ArrowUp':
        if (column.dataType === 'number' || column.dataType === 'currency') {
          // Allow arrow keys to increment/decrement numbers
          return;
        }
        e.preventDefault();
        saveAndExit();
        onNavigate?.('up');
        break;
      case 'ArrowDown':
        if (column.dataType === 'number' || column.dataType === 'currency') {
          return;
        }
        e.preventDefault();
        saveAndExit();
        onNavigate?.('down');
        break;
    }
  }, [editValue, column.dataType, onNavigate]);
  
  // Save and exit edit mode
  const saveAndExit = useCallback(() => {
    const parsedValue = parseValueFromEdit(editValue, column.dataType);
    if (parsedValue !== value) {
      onSave(parsedValue);
    }
    onEndEdit?.();
  }, [editValue, column.dataType, value, onSave, onEndEdit]);
  
  // Cancel edit
  const cancelEdit = useCallback(() => {
    setEditValue(formatValueForEdit(value, column.dataType));
    onEndEdit?.();
  }, [value, column.dataType, onEndEdit]);
  
  // Handle click to start editing
  const handleClick = useCallback(() => {
    if (!disabled && column.editable && !isEditing) {
      onStartEdit?.();
    }
  }, [disabled, column.editable, isEditing, onStartEdit]);
  
  // Handle blur
  const handleBlur = useCallback(() => {
    if (isEditing) {
      saveAndExit();
    }
  }, [isEditing, saveAndExit]);
  
  // Render editing mode
  if (isEditing && column.editable) {
    // Select field
    if (column.dataType === 'select' && selectOptions) {
      return (
        <Select
          value={editValue}
          onValueChange={(val) => {
            setEditValue(val);
            onSave(val);
            onEndEdit?.();
          }}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    // Text/Number input
    return (
      <Input
        ref={inputRef}
        type={column.dataType === 'number' || column.dataType === 'currency' ? 'number' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        step={column.dataType === 'currency' ? '0.01' : column.dataType === 'number' ? '1' : undefined}
        className={cn(
          'h-8 w-full px-2 py-1 text-sm',
          column.align === 'right' && 'text-right',
          column.align === 'center' && 'text-center'
        )}
      />
    );
  }
  
  // Render display mode
  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative h-full w-full px-2 py-1.5 text-sm cursor-default transition-colors',
        // Alignment
        column.align === 'right' && 'text-right',
        column.align === 'center' && 'text-center',
        // Editable styling
        column.editable && !disabled && 'cursor-text hover:bg-[var(--bg-tertiary)]',
        // Selected state
        isSelected && 'ring-2 ring-inset ring-[var(--accent-blue)]',
        // Calculated field styling
        column.calculated && 'text-[var(--text-tertiary)] italic',
        // Group row styling
        isGroupRow && 'font-semibold',
        // Disabled styling
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      title={column.editable ? 'Click to edit' : undefined}
    >
      {/* Override indicator */}
      {isOverridden && column.showOverrideIndicator && (
        <span
          className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent-orange)]"
          title={`Overridden from ${cellMetadata?.originalValue}`}
        />
      )}
      
      {/* Comment indicator */}
      {hasComments && column.showCommentIndicator && (
        <span
          className="absolute top-1 left-1 text-xs"
          title={`${cellMetadata?.commentCount} comment${cellMetadata?.commentCount !== 1 ? 's' : ''}`}
        >
          💬
        </span>
      )}
      
      {/* Value */}
      <span className={cn(
        hasComments && column.showCommentIndicator && 'pl-4'
      )}>
        {displayValue}
      </span>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format value for display based on column type
 */
function formatValueForDisplay(
  value: string | number | boolean | null | undefined,
  column: ColumnDefinition
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  
  switch (column.dataType) {
    case 'currency':
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(numValue)) return '—';
      const formatted = numValue.toLocaleString('en-GB', {
        minimumFractionDigits: column.decimals ?? 2,
        maximumFractionDigits: column.decimals ?? 2,
      });
      return `${column.prefix ?? ''}${formatted}${column.suffix ?? ''}`;
      
    case 'number':
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return '—';
      const numFormatted = num.toLocaleString('en-GB', {
        minimumFractionDigits: column.decimals ?? 0,
        maximumFractionDigits: column.decimals ?? 0,
      });
      return `${column.prefix ?? ''}${numFormatted}${column.suffix ?? ''}`;
      
    case 'percentage':
      const pct = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(pct)) return '—';
      return `${pct.toFixed(column.decimals ?? 1)}%`;
      
    case 'boolean':
      return value ? 'Yes' : 'No';
      
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('en-GB');
      }
      return String(value);
      
    default:
      return String(value);
  }
}

/**
 * Format value for editing (raw value)
 */
function formatValueForEdit(
  value: string | number | boolean | null | undefined,
  dataType: ColumnDefinition['dataType']
): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  switch (dataType) {
    case 'currency':
    case 'number':
    case 'percentage':
      return String(value);
      
    case 'boolean':
      return value ? 'true' : 'false';
      
    default:
      return String(value);
  }
}

/**
 * Parse value from edit input back to proper type
 */
function parseValueFromEdit(
  editValue: string,
  dataType: ColumnDefinition['dataType']
): string | number | boolean | null {
  if (editValue === '' || editValue === null || editValue === undefined) {
    return null;
  }
  
  switch (dataType) {
    case 'currency':
    case 'number':
    case 'percentage':
      const num = parseFloat(editValue);
      return isNaN(num) ? null : num;
      
    case 'boolean':
      return editValue.toLowerCase() === 'true';
      
    default:
      return editValue;
  }
}

// ============================================
// SELECT OPTIONS FOR COMMON FIELDS
// ============================================

export const COST_SOURCE_OPTIONS = [
  { value: 'placeholder', label: 'Placeholder' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'quote', label: 'Quote' },
  { value: 'contract', label: 'Contract' },
];

export const PM_OPTIONS = [
  { value: 'P', label: 'Purchased' },
  { value: 'M', label: 'Manufactured' },
];
