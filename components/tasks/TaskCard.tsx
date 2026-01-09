'use client';

import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  AlertTriangle, 
  Link as LinkIcon,
  CheckSquare,
  MessageSquare
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging = false }: TaskCardProps) {
  const isOverdue = task.dueDate && task.status !== 'done' && task.dueDate.toMillis() < Date.now();

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

  const priorityColors: Record<TaskPriority, string> = {
    urgent: 'bg-[var(--accent-red)]',
    high: 'bg-[var(--accent-orange)]',
    normal: 'bg-[var(--accent-blue)]',
    low: 'bg-[var(--text-tertiary)]',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group p-3 rounded-lg border bg-[var(--bg-secondary)] cursor-pointer transition-all',
        isDragging
          ? 'border-[var(--accent-blue)] shadow-lg rotate-2 scale-105'
          : 'border-[var(--border-subtle)] hover:border-[var(--accent-blue)]/50 hover:shadow-md',
        task.status === 'done' && 'opacity-60'
      )}
    >
      {/* Priority indicator */}
      {task.priority && task.priority !== 'normal' && (
        <div className={cn('w-full h-0.5 rounded-full mb-2', priorityColors[task.priority])} />
      )}

      {/* Title */}
      <h4
        className={cn(
          'font-medium text-sm mb-2 line-clamp-2',
          task.status === 'done' && 'line-through text-[var(--text-tertiary)]'
        )}
      >
        {task.title}
      </h4>

      {/* Labels / Tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {task.taskType === 'cell' && (
          <Badge variant="outline" className="text-xs bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border-[var(--accent-purple)]/30">
            Cell
          </Badge>
        )}
        {task.linkedGate && (
          <Badge variant="outline" className="text-xs bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/30">
            {task.linkedGate.gateName}
          </Badge>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
        <div className="flex items-center gap-3">
          {/* Due date */}
          {task.dueDate && (
            <span
              className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-[var(--accent-red)]'
              )}
            >
              {isOverdue ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Calendar className="h-3 w-3" />
              )}
              {formatDueDate(task.dueDate)}
            </span>
          )}

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
            </span>
          )}

          {/* Linked items */}
          {task.linkedItems && task.linkedItems.length > 0 && (
            <span className="flex items-center gap-1">
              <LinkIcon className="h-3 w-3" />
              {task.linkedItems.length}
            </span>
          )}
        </div>

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 2).map((assignee, i) => (
              <Avatar
                key={assignee.userId || assignee.externalId || i}
                className="h-5 w-5 border border-[var(--bg-secondary)]"
              >
                <AvatarImage src={assignee.avatarUrl} />
                <AvatarFallback className="text-[10px] bg-[var(--accent-blue)] text-white">
                  {assignee.name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.assignees.length > 2 && (
              <div className="h-5 w-5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--bg-secondary)] flex items-center justify-center text-[10px]">
                +{task.assignees.length - 2}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
