'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_PRIORITY_COLORS } from '@/types/task';
import { cn } from '@/lib/utils';
import { 
  Circle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronRight,
  MoreHorizontal,
  User,
  Calendar,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateTaskStatus } from '@/lib/tasks/taskService';
import { useAuth } from '@/lib/hooks/useAuth';

interface TaskListItemProps {
  task: Task;
  showProject?: boolean;
  projectName?: string;
  onStatusChange?: (newStatus: TaskStatus) => void;
  onTaskClick?: () => void;
  compact?: boolean;
}

export function TaskListItem({
  task,
  showProject = false,
  projectName,
  onStatusChange,
  onTaskClick,
  compact = false,
}: TaskListItemProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const isOverdue = task.dueDate && task.status !== 'done' && task.dueDate.toMillis() < Date.now();
  const isDueToday = task.dueDate && !isOverdue && (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueTime = task.dueDate!.toMillis();
    return dueTime >= today.getTime() && dueTime < tomorrow.getTime();
  })();

  const handleCheckboxChange = async (checked: boolean) => {
    const newStatus: TaskStatus = checked ? 'done' : 'todo';
    setIsUpdating(true);
    try {
      await updateTaskStatus(
        task.projectId,
        task.id,
        newStatus,
        user?.uid,
        user?.displayName || undefined
      );
      onStatusChange?.(newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClick = () => {
    if (onTaskClick) {
      onTaskClick();
    } else {
      // Navigate to task detail (could be a modal or page)
      router.push(`/project/${task.projectId}/tasks?taskId=${task.id}`);
    }
  };

  const formatDueDate = (timestamp: { toDate: () => Date }) => {
    const date = timestamp.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date < today) {
      const days = Math.ceil((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return `${days}d overdue`;
    } else if (date < tomorrow) {
      return 'Today';
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)]/50 cursor-pointer transition-colors group',
          task.status === 'done' && 'opacity-60'
        )}
        onClick={handleClick}
      >
        <Checkbox
          checked={task.status === 'done'}
          onCheckedChange={handleCheckboxChange}
          disabled={isUpdating}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-[var(--accent-green)] data-[state=checked]:border-[var(--accent-green)]"
        />
        <span
          className={cn(
            'flex-1 text-sm truncate',
            task.status === 'done' && 'line-through text-[var(--text-tertiary)]'
          )}
        >
          {task.title}
        </span>
        {task.dueDate && (
          <span
            className={cn(
              'text-xs',
              isOverdue
                ? 'text-[var(--accent-red)]'
                : isDueToday
                ? 'text-[var(--accent-orange)]'
                : 'text-[var(--text-tertiary)]'
            )}
          >
            {formatDueDate(task.dueDate)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 hover:bg-[var(--bg-secondary)]/50 cursor-pointer transition-all group',
        task.status === 'done' && 'opacity-60'
      )}
      onClick={handleClick}
    >
      {/* Checkbox */}
      <Checkbox
        checked={task.status === 'done'}
        onCheckedChange={handleCheckboxChange}
        disabled={isUpdating}
        onClick={(e) => e.stopPropagation()}
        className="data-[state=checked]:bg-[var(--accent-green)] data-[state=checked]:border-[var(--accent-green)]"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium truncate',
              task.status === 'done' && 'line-through text-[var(--text-tertiary)]'
            )}
          >
            {task.title}
          </span>
          {task.priority && task.priority !== 'normal' && (
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                task.priority === 'urgent' && 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]',
                task.priority === 'high' && 'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]',
                task.priority === 'low' && 'bg-[var(--text-tertiary)]/20 text-[var(--text-tertiary)]'
              )}
            >
              {task.priority}
            </span>
          )}
          {task.taskType === 'cell' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]">
              Cell
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]">
          {showProject && projectName && (
            <span className="flex items-center gap-1">
              <LinkIcon className="h-3 w-3" />
              {projectName}
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-[var(--accent-red)]',
                isDueToday && 'text-[var(--accent-orange)]'
              )}
            >
              {isOverdue && <AlertTriangle className="h-3 w-3" />}
              <Calendar className="h-3 w-3" />
              {formatDueDate(task.dueDate)}
            </span>
          )}
          {task.linkedItems && task.linkedItems.length > 0 && (
            <span className="flex items-center gap-1">
              <LinkIcon className="h-3 w-3" />
              {task.linkedItems.length} item{task.linkedItems.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Assignees */}
      {task.assignees && task.assignees.length > 0 && (
        <div className="flex -space-x-2">
          {task.assignees.slice(0, 3).map((assignee, i) => (
            <Avatar key={assignee.userId || assignee.externalId || i} className="h-6 w-6 border-2 border-[var(--bg-primary)]">
              <AvatarImage src={assignee.avatarUrl} />
              <AvatarFallback className="text-xs bg-[var(--accent-blue)] text-white">
                {assignee.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          ))}
          {task.assignees.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--bg-primary)] flex items-center justify-center text-xs text-[var(--text-tertiary)]">
              +{task.assignees.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
