'use client';

import { useState } from 'react';
import { useItemTasks } from '@/lib/hooks/useTasks';
import { Task, TaskStatus, TaskAssignee } from '@/types/task';
import { TaskListItem } from './TaskListItem';
import { TaskQuickAdd } from './TaskQuickAdd';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createCellTask } from '@/lib/tasks/taskService';
import { useAuth } from '@/lib/hooks/useAuth';

interface ItemTasksTabProps {
  projectId: string;
  itemId: string;
  itemCode: string;
  itemDescription?: string;
  onTaskClick?: (task: Task) => void;
}

/**
 * Component to display and manage tasks linked to a BOM item.
 * Used in NewPartDetailDrawer and similar item detail views.
 */
export function ItemTasksTab({
  projectId,
  itemId,
  itemCode,
  itemDescription,
  onTaskClick,
}: ItemTasksTabProps) {
  const { user } = useAuth();
  const { tasks, loading, error } = useItemTasks({ projectId, itemId });
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const handleTaskCreated = (taskId: string) => {
    setShowQuickAdd(false);
  };

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  if (loading) {
    return (
      <div className="py-8 text-center text-[var(--text-tertiary)]">
        Loading tasks...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-[var(--accent-red)]">
        Failed to load tasks
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Tasks</span>
          {activeTasks.length > 0 && (
            <span className="text-xs bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] px-2 py-0.5 rounded-full">
              {activeTasks.length} active
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowQuickAdd(true)}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Task
        </Button>
      </div>

      {/* Quick Add */}
      {showQuickAdd && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-3">
          <TaskQuickAdd
            projectId={projectId}
            defaultStatus="todo"
            onCreated={handleTaskCreated}
            onCancel={() => setShowQuickAdd(false)}
            placeholder={`Task for ${itemCode}...`}
          />
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-[var(--text-tertiary)] mb-2" />
          <p className="text-sm text-[var(--text-tertiary)]">
            No tasks linked to this item yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Active Tasks */}
          {activeTasks.length > 0 && (
            <div className="space-y-1">
              {activeTasks.map(task => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  compact
                  onTaskClick={() => onTaskClick?.(task)}
                />
              ))}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="pt-2">
              <div className="text-xs text-[var(--text-tertiary)] mb-1">
                Completed ({completedTasks.length})
              </div>
              <div className="space-y-1 opacity-60">
                {completedTasks.slice(0, 3).map(task => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    compact
                    onTaskClick={() => onTaskClick?.(task)}
                  />
                ))}
                {completedTasks.length > 3 && (
                  <div className="text-xs text-[var(--text-tertiary)] pl-6">
                    +{completedTasks.length - 3} more completed
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
