'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface InlineEditCellProps {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  type?: 'text' | 'number' | 'date';
  suffix?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineEditCell({
  value,
  placeholder,
  onSave,
  type = 'text',
  suffix,
  className,
  disabled = false,
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const handleSave = useCallback(() => {
    const trimmedValue = editValue.trim();
    if (trimmedValue !== value) {
      onSave(trimmedValue);
    }
    setIsEditing(false);
  }, [editValue, value, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      // Allow tab to save and move to next field
      handleSave();
    }
  };

  // Handle paste for bulk data
  const handlePaste = (e: React.ClipboardEvent) => {
    e.stopPropagation();
    const pastedText = e.clipboardData.getData('text');
    
    // For numbers, clean the pasted value
    if (type === 'number') {
      const cleanedValue = pastedText.replace(/[^\d.-]/g, '');
      setEditValue(cleanedValue);
      e.preventDefault();
    } else if (type === 'date') {
      // Try to parse various date formats
      const parsedDate = parseDate(pastedText);
      if (parsedDate) {
        setEditValue(parsedDate);
        e.preventDefault();
      }
    }
    // For text, let default paste behavior happen
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (disabled) {
    return (
      <span className={cn('text-[var(--text-tertiary)]', className)}>
        {value || placeholder}
      </span>
    );
  }

  if (isEditing) {
    if (type === 'date') {
      return (
        <input
          ref={inputRef}
          type="date"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={cn(
            'px-1 py-0.5 rounded border border-[var(--accent-blue)] bg-[var(--bg-primary)] outline-none text-xs',
            className
          )}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn(
          'px-2 py-1 rounded border border-[var(--accent-blue)] bg-[var(--bg-primary)] outline-none',
          className
        )}
      />
    );
  }

  // Display value formatting
  const displayValue = (() => {
    if (!value) return null;
    
    if (type === 'date') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        }
      } catch {
        return value;
      }
    }
    
    return `${value}${suffix || ''}`;
  })();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setEditValue(value);
        setIsEditing(true);
      }}
      className={cn(
        'px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] text-left min-w-[40px] transition-colors',
        !value && 'text-[var(--text-tertiary)] italic',
        type === 'date' && 'flex items-center gap-1',
        className
      )}
    >
      {displayValue || placeholder}
      {type === 'date' && !value && <Calendar className="h-3 w-3 opacity-50" />}
    </button>
  );
}

// Helper to parse various date formats
function parseDate(input: string): string | null {
  const trimmed = input.trim();
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try MM/DD/YYYY
  const mmddyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try natural language dates
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}
