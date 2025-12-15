'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeltaIndicatorProps {
  value: number;
  percentage: number;
  label?: string;
}

export function DeltaIndicator({ value, percentage, label }: DeltaIndicatorProps) {
  const isPositive = value >= 0;
  const isNegative = value < 0;

  return (
    <div className="flex items-center gap-2">
      {isPositive && <ArrowUp className="h-4 w-4 text-[var(--accent-red)]" />}
      {isNegative && <ArrowDown className="h-4 w-4 text-[var(--accent-green)]" />}
      <span
        className={cn(
          'text-sm font-medium',
          isPositive && 'text-[var(--accent-red)]',
          isNegative && 'text-[var(--accent-green)]'
        )}
      >
        {isPositive ? '+' : ''}£{Math.abs(value).toFixed(2)} ({isPositive ? '+' : ''}
        {percentage.toFixed(1)}%)
      </span>
      {label && <span className="text-xs text-[var(--text-secondary)]">{label}</span>}
    </div>
  );
}

