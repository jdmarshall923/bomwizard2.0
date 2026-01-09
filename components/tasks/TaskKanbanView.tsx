'use client';

import { useState, useCallback } from 'react';
import { Task, TaskStatus, TASK_STATUS_LABELS } from '@/types/task';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateTaskStatus, batchUpdateTaskPositions } from '@/lib/tasks/taskService';
import { useAuth } from '@/lib/hooks/useAuth';

interface TaskKanbanViewProps {
  tasks: Task[];
  tasksByStatus: Record<TaskStatus, Task[]>;
  projectId: string;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status?: TaskStatus) => void;
  onTasksReordered?: () => void;
}

const statusColumns: { status: TaskStatus; color: string }[] = [
  { status: 'todo', color: 'var(--text-tertiary)' },
  { status: 'in_progress', color: 'var(--accent-blue)' },
  { status: 'done', color: 'var(--accent-green)' },
];

export function TaskKanbanView({
  tasks,
  tasksByStatus,
  projectId,
  onTaskClick,
  onAddTask,
  onTasksReordered,
}: TaskKanbanViewProps) {
  const { user } = useAuth();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(status);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedTask || !user) return;

    // If status changed
    if (draggedTask.status !== targetStatus) {
      try {
        await updateTaskStatus(
          projectId,
          draggedTask.id,
          targetStatus,
          user.uid,
          user.displayName || undefined
        );
        onTasksReordered?.();
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    }

    setDraggedTask(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {statusColumns.map(({ status, color }) => {
        const columnTasks = tasksByStatus[status] || [];
        const isDropTarget = dropTarget === status;

        return (
          <div
            key={status}
            className={cn(
              'flex-shrink-0 w-80 rounded-lg border transition-all',
              isDropTarget
                ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5'
                : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30'
            )}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <h3 className="font-semibold text-sm">{TASK_STATUS_LABELS[status]}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAddTask?.(status)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Column Content */}
            <div className="p-3 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div
                  className={cn(
                    'text-center py-8 text-sm text-[var(--text-tertiary)] border-2 border-dashed rounded-lg',
                    isDropTarget ? 'border-[var(--accent-blue)]' : 'border-transparent'
                  )}
                >
                  {isDropTarget ? 'Drop here' : 'No tasks'}
                </div>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                  >
                    <TaskCard
                      task={task}
                      onClick={() => onTaskClick?.(task)}
                      isDragging={draggedTask?.id === task.id}
                    />
                  </div>
                ))
              )}

              {/* Add task button at bottom */}
              <Button
                variant="ghost"
                className="w-full justify-start text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={() => onAddTask?.(status)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add task
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
