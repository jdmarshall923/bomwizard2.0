'use client';

import { cn } from '@/lib/utils';
import { Ship, Plane, CheckCircle2, AlertTriangle, Clock, Circle } from 'lucide-react';

interface GanttLegendProps {
  className?: string;
  compact?: boolean;
}

export function GanttLegend({ className, compact = false }: GanttLegendProps) {
  const items = [
    { 
      label: 'Not Ordered', 
      icon: Circle, 
      color: 'text-[var(--text-tertiary)]',
      bgColor: 'bg-[var(--bg-tertiary)]'
    },
    { 
      label: 'Ordered', 
      icon: Clock, 
      color: 'text-[var(--accent-blue)]',
      bgColor: 'bg-[var(--accent-blue)]'
    },
    { 
      label: 'In Transit', 
      icon: Ship, 
      color: 'text-[var(--accent-orange)]',
      bgColor: 'bg-[var(--accent-orange)]'
    },
    { 
      label: 'Received', 
      icon: CheckCircle2, 
      color: 'text-[var(--accent-green)]',
      bgColor: 'bg-[var(--accent-green)]'
    },
    { 
      label: 'Late', 
      icon: AlertTriangle, 
      color: 'text-[var(--accent-red)]',
      bgColor: 'bg-[var(--accent-red)]'
    },
  ];

  const freightItems = [
    { label: 'Sea Freight', icon: Ship, color: 'text-[var(--accent-blue)]' },
    { label: 'Air Freight', icon: Plane, color: 'text-[var(--accent-orange)]' },
  ];

  if (compact) {
    return (
      <div className={cn('flex flex-wrap items-center gap-3 text-xs', className)}>
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={cn('w-3 h-3 rounded', item.bgColor)} />
            <span className="text-[var(--text-tertiary)]">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      'p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50',
      className
    )}>
      <h4 className="text-sm font-medium mb-3">Legend</h4>
      
      <div className="space-y-4">
        {/* Status indicators */}
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Order Status</p>
          <div className="flex flex-wrap gap-3">
            {items.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-1.5">
                  <Icon className={cn('h-4 w-4', item.color)} />
                  <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Freight types */}
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Freight Type</p>
          <div className="flex gap-4">
            {freightItems.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-1.5">
                  <Icon className={cn('h-4 w-4', item.color)} />
                  <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline bar explanation */}
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Timeline Bar</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className="w-8 h-2 bg-[var(--accent-blue)] rounded-l" />
              <div className="w-12 h-2 bg-[var(--accent-orange)]" />
              <div className="w-4 h-2 bg-[var(--accent-green)] rounded-r" />
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">
              Order → Transit → Received
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

