'use client';

import { TaskGroupView } from '@/types/task';
import { LayoutGrid, List, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskViewSwitcherProps {
  currentView: TaskGroupView;
  onViewChange: (view: TaskGroupView) => void;
}

const views: { id: TaskGroupView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'list', label: 'List', icon: List },
];

export function TaskViewSwitcher({ currentView, onViewChange }: TaskViewSwitcherProps) {
  return (
    <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-1">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;

        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-[var(--accent-blue)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
