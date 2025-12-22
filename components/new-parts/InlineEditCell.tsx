'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface InlineEditCellProps {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  type?: 'text' | 'number';
  suffix?: string;
  className?: string;
}

export function InlineEditCell({
  value,
  placeholder,
  onSave,
  type = 'text',
  suffix,
  className,
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className={cn(
          'px-2 py-1 rounded border border-[var(--accent-blue)] bg-[var(--bg-primary)] outline-none',
          className
        )}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setEditValue(value);
        setIsEditing(true);
      }}
      className={cn(
        'px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] text-left min-w-[60px] transition-colors',
        !value && 'text-[var(--text-tertiary)] italic',
        className
      )}
    >
      {value ? `${value}${suffix || ''}` : placeholder}
    </button>
  );
}


