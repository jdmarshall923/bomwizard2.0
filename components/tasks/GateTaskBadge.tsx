'use client';

import { useGateTasks } from '@/lib/hooks/useTasks';
import { CheckSquare, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GateTaskBadgeProps {
  projectId: string;
  gateId: string;
  onClick?: () => void;
  showIfEmpty?: boolean;
}

/**
 * Badge showing task count for a PACE gate.
 * Click to view/manage tasks.
 */
export function GateTaskBadge({
  projectId,
  gateId,
  onClick,
  showIfEmpty = false,
}: GateTaskBadgeProps) {
  const { tasks, loading, count } = useGateTasks({ projectId, gateId });

  if (loading) return null;
  
  if (count === 0 && !showIfEmpty) return null;

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const overdueTasks = tasks.filter(t => 
    t.dueDate && t.status !== 'done' && t.dueDate.toMillis() < Date.now()
  );

  const hasOverdue = overdueTasks.length > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors',
        hasOverdue
          ? 'bg-[var(--accent-red)]/10 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20'
          : activeTasks.length > 0
          ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/20'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]/80'
      )}
    >
      {hasOverdue ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <CheckSquare className="h-3 w-3" />
      )}
      <span>{activeTasks.length}</span>
      {activeTasks.length !== count && (
        <span className="text-[var(--text-tertiary)]">/{count}</span>
      )}
    </button>
  );
}

/**
 * Larger task summary card for gate details
 */
interface GateTaskSummaryProps {
  projectId: string;
  gateId: string;
  gateName: string;
}

export function GateTaskSummary({ projectId, gateId, gateName }: GateTaskSummaryProps) {
  const { tasks, loading } = useGateTasks({ projectId, gateId });

  if (loading) {
    return <div className="text-xs text-[var(--text-tertiary)]">Loading tasks...</div>;
  }

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  if (tasks.length === 0) {
    return (
      <div className="text-xs text-[var(--text-tertiary)]">
        No tasks linked to {gateName}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
        <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" />
        {todoCount} to do
      </span>
      <span className="flex items-center gap-1 text-[var(--accent-blue)]">
        <span className="w-2 h-2 rounded-full bg-[var(--accent-blue)]" />
        {inProgressCount} in progress
      </span>
      <span className="flex items-center gap-1 text-[var(--accent-green)]">
        <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
        {doneCount} done
      </span>
    </div>
  );
}
