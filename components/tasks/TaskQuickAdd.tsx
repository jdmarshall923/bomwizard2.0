'use client';

import { useState, useRef, useEffect } from 'react';
import { TaskStatus, TaskPriority, CreateTaskInput } from '@/types/task';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { 
  Calendar as CalendarIcon, 
  Flag, 
  X,
  ChevronDown 
} from 'lucide-react';
import { createTask, createProjectTask } from '@/lib/tasks/taskService';
import { useAuth } from '@/lib/hooks/useAuth';
import { Timestamp } from 'firebase/firestore';

interface TaskQuickAddProps {
  projectId: string;
  taskGroupId?: string;
  defaultStatus?: TaskStatus;
  onCreated?: (taskId: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}

const priorities: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'var(--text-tertiary)' },
  { value: 'normal', label: 'Normal', color: 'var(--accent-blue)' },
  { value: 'high', label: 'High', color: 'var(--accent-orange)' },
  { value: 'urgent', label: 'Urgent', color: 'var(--accent-red)' },
];

export function TaskQuickAdd({
  projectId,
  taskGroupId,
  defaultStatus = 'todo',
  onCreated,
  onCancel,
  autoFocus = true,
  placeholder = 'Task title...',
}: TaskQuickAddProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [creating, setCreating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleCreate = async () => {
    if (!title.trim() || !user) return;

    setCreating(true);
    try {
      const taskId = await createProjectTask(
        projectId,
        taskGroupId || 'default',
        title.trim(),
        user.uid,
        user.displayName || 'Unknown',
        {
          status: defaultStatus,
          priority: priority !== 'normal' ? priority : undefined,
          dueDate: dueDate ? Timestamp.fromDate(dueDate) : undefined,
        }
      );
      
      setTitle('');
      setPriority('normal');
      setDueDate(undefined);
      setShowOptions(false);
      onCreated?.(taskId);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      onCancel?.();
    }
  };

  const selectedPriority = priorities.find(p => p.value === priority)!;

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 space-y-3">
      {/* Title input */}
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        className="border-0 p-0 h-auto text-sm focus-visible:ring-0 bg-transparent"
        disabled={creating}
      />

      {/* Options row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Priority */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
              >
                <Flag
                  className="h-3 w-3 mr-1"
                  style={{ color: selectedPriority.color }}
                />
                {selectedPriority.label}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1" align="start">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[var(--bg-tertiary)]',
                    priority === p.value && 'bg-[var(--bg-tertiary)]'
                  )}
                >
                  <Flag className="h-3 w-3" style={{ color: p.color }} />
                  {p.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Due Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 px-2 text-xs',
                  dueDate && 'text-[var(--accent-blue)]'
                )}
              >
                <CalendarIcon className="h-3 w-3 mr-1" />
                {dueDate ? dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!title.trim() || creating}
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
          >
            {creating ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>
    </div>
  );
}
