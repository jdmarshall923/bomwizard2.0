'use client';

import { useState } from 'react';
import { Task, TaskStatus, TaskPriority, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, CustomFieldSchema } from '@/types/task';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  AlertTriangle, 
  ChevronDown,
  Plus,
  ArrowUpDown 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateTask, updateTaskStatus } from '@/lib/tasks/taskService';
import { useAuth } from '@/lib/hooks/useAuth';

interface TaskTableViewProps {
  tasks: Task[];
  projectId: string;
  customFields?: CustomFieldSchema[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
  onTaskUpdated?: () => void;
}

export function TaskTableView({
  tasks,
  projectId,
  customFields = [],
  onTaskClick,
  onAddTask,
  onTaskUpdated,
}: TaskTableViewProps) {
  const { user } = useAuth();
  const [sortField, setSortField] = useState<string>('position');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
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

  const handlePriorityChange = async (task: Task, newPriority: TaskPriority) => {
    try {
      await updateTask(projectId, task.id, { priority: newPriority });
      onTaskUpdated?.();
    } catch (error) {
      console.error('Failed to update task priority:', error);
    }
  };

  const formatDueDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate();
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const isOverdue = (task: Task) => {
    return task.dueDate && task.status !== 'done' && task.dueDate.toMillis() < Date.now();
  };

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        comparison = (priorityOrder[a.priority || 'normal'] || 2) - (priorityOrder[b.priority || 'normal'] || 2);
        break;
      case 'dueDate':
        comparison = (a.dueDate?.toMillis() || Infinity) - (b.dueDate?.toMillis() || Infinity);
        break;
      default:
        comparison = a.position - b.position;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-[var(--bg-tertiary)]/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <ArrowUpDown className={cn('h-3 w-3', sortDirection === 'desc' && 'rotate-180')} />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)]/50">
            <TableHead className="w-10" />
            <SortableHeader field="title">Task</SortableHeader>
            <SortableHeader field="status">Status</SortableHeader>
            <SortableHeader field="priority">Priority</SortableHeader>
            <SortableHeader field="dueDate">Due Date</SortableHeader>
            <TableHead>Assignees</TableHead>
            {customFields.filter(f => f.showInTable).map(field => (
              <TableHead key={field.id}>{field.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6 + customFields.filter(f => f.showInTable).length} className="h-32 text-center">
                <div className="text-[var(--text-tertiary)]">
                  No tasks yet. Click the button below to add one.
                </div>
              </TableCell>
            </TableRow>
          ) : (
            sortedTasks.map((task) => (
              <TableRow
                key={task.id}
                className="cursor-pointer hover:bg-[var(--bg-secondary)]/50"
                onClick={() => onTaskClick?.(task)}
              >
                {/* Checkbox */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={task.status === 'done'}
                    onCheckedChange={(checked) =>
                      handleStatusChange(task, checked ? 'done' : 'todo')
                    }
                    className="data-[state=checked]:bg-[var(--accent-green)] data-[state=checked]:border-[var(--accent-green)]"
                  />
                </TableCell>

                {/* Title */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className={cn(task.status === 'done' && 'line-through text-[var(--text-tertiary)]')}>
                      {task.title}
                    </span>
                    {task.taskType === 'cell' && (
                      <Badge variant="outline" className="text-xs">Cell</Badge>
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={task.status}
                    onValueChange={(value: TaskStatus) => handleStatusChange(task, value)}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['todo', 'in_progress', 'done'] as TaskStatus[]).map(status => (
                        <SelectItem key={status} value={status}>
                          {TASK_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* Priority */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={task.priority || 'normal'}
                    onValueChange={(value: TaskPriority) => handlePriorityChange(task, value)}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['low', 'normal', 'high', 'urgent'] as TaskPriority[]).map(priority => (
                        <SelectItem key={priority} value={priority}>
                          {TASK_PRIORITY_LABELS[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* Due Date */}
                <TableCell>
                  <span
                    className={cn(
                      'flex items-center gap-1 text-sm',
                      isOverdue(task) && 'text-[var(--accent-red)]'
                    )}
                  >
                    {isOverdue(task) && <AlertTriangle className="h-3 w-3" />}
                    {formatDueDate(task.dueDate)}
                  </span>
                </TableCell>

                {/* Assignees */}
                <TableCell>
                  {task.assignees && task.assignees.length > 0 ? (
                    <div className="flex -space-x-1.5">
                      {task.assignees.slice(0, 3).map((assignee, i) => (
                        <Avatar
                          key={assignee.userId || assignee.externalId || i}
                          className="h-6 w-6 border border-[var(--bg-secondary)]"
                        >
                          <AvatarImage src={assignee.avatarUrl} />
                          <AvatarFallback className="text-xs bg-[var(--accent-blue)] text-white">
                            {assignee.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {task.assignees.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs">
                          +{task.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[var(--text-tertiary)]">—</span>
                  )}
                </TableCell>

                {/* Custom Fields */}
                {customFields.filter(f => f.showInTable).map(field => {
                  const value = task.customFieldValues?.[field.id];
                  const displayValue = value !== undefined && value !== null 
                    ? String(value) 
                    : '—';
                  return (
                    <TableCell key={field.id}>
                      {displayValue}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}

          {/* Add task row */}
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={6 + customFields.filter(f => f.showInTable).length}>
              <Button
                variant="ghost"
                className="w-full justify-start text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={onAddTask}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add task
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
