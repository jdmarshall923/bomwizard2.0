'use client';

import { Task, TaskStatus, TASK_STATUS_LABELS } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Calendar, AlertTriangle, ChevronRight } from 'lucide-react';
import { updateTaskStatus } from '@/lib/tasks/taskService';
import { useAuth } from '@/lib/hooks/useAuth';

interface TaskListViewProps {
  tasks: Task[];
  projectId: string;
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
  onTaskUpdated?: () => void;
  showStatusGroups?: boolean;
}

export function TaskListView({
  tasks,
  projectId,
  onTaskClick,
  onAddTask,
  onTaskUpdated,
  showStatusGroups = false,
}: TaskListViewProps) {
  const { user } = useAuth();

  const handleStatusChange = async (task: Task, completed: boolean) => {
    const newStatus: TaskStatus = completed ? 'done' : 'todo';
    try {
      await updateTaskStatus(
        projectId,
        task.id,
        newStatus,
        user?.uid,
        user?.displayName || undefined
      );
      onTaskUpdated?.();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const formatDueDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return null;
    const date = timestamp.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      const days = Math.ceil((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return { text: `${days}d overdue`, isOverdue: true };
    }
    
    return { 
      text: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      isOverdue: false
    };
  };

  // Group tasks by status if requested
  const taskGroups = showStatusGroups
    ? (['todo', 'in_progress', 'done'] as TaskStatus[]).map(status => ({
        status,
        label: TASK_STATUS_LABELS[status],
        tasks: tasks.filter(t => t.status === status),
      }))
    : [{ status: 'all' as const, label: 'All Tasks', tasks }];

  const TaskItem = ({ task }: { task: Task }) => {
    const dueInfo = formatDueDate(task.dueDate);

    return (
      <div
        className={cn(
          'group flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-tertiary)]/50 cursor-pointer transition-colors border-b border-[var(--border-subtle)] last:border-b-0',
          task.status === 'done' && 'opacity-60'
        )}
        onClick={() => onTaskClick?.(task)}
      >
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.status === 'done'}
            onCheckedChange={(checked) => handleStatusChange(task, !!checked)}
            className="data-[state=checked]:bg-[var(--accent-green)] data-[state=checked]:border-[var(--accent-green)]"
          />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              'font-medium text-sm',
              task.status === 'done' && 'line-through text-[var(--text-tertiary)]'
            )}
          >
            {task.title}
          </span>
          
          {/* Subtask count */}
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="ml-2 text-xs text-[var(--text-tertiary)]">
              ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
            </span>
          )}
        </div>

        {/* Due date */}
        {dueInfo && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs',
              dueInfo.isOverdue
                ? 'text-[var(--accent-red)]'
                : 'text-[var(--text-tertiary)]'
            )}
          >
            {dueInfo.isOverdue ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Calendar className="h-3 w-3" />
            )}
            {dueInfo.text}
          </span>
        )}

        {/* Assignees count */}
        {task.assignees && task.assignees.length > 0 && (
          <span className="text-xs text-[var(--text-tertiary)]">
            {task.assignees.length} assignee{task.assignees.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-[var(--text-tertiary)] mb-4">No tasks yet</div>
          <Button onClick={onAddTask}>
            <Plus className="h-4 w-4 mr-2" />
            Add first task
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 overflow-hidden">
      {taskGroups.map((group) => (
        <div key={group.status}>
          {showStatusGroups && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                {group.label}
              </span>
              <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
                {group.tasks.length}
              </span>
            </div>
          )}
          
          {group.tasks.length === 0 && showStatusGroups ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
              No {group.label.toLowerCase()} tasks
            </div>
          ) : (
            group.tasks.map((task) => <TaskItem key={task.id} task={task} />)
          )}
        </div>
      ))}

      {/* Add task button */}
      <Button
        variant="ghost"
        className="w-full justify-start text-[var(--text-tertiary)] hover:text-[var(--text-primary)] py-3 px-4"
        onClick={onAddTask}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add task
      </Button>
    </div>
  );
}
