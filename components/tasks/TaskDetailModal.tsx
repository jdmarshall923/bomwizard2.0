'use client';

import { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, TaskAssignee, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  X, 
  Calendar, 
  User, 
  Link as LinkIcon, 
  CheckSquare, 
  Trash2,
  Plus,
  Flag,
  Target
} from 'lucide-react';
import { SubtaskList } from './SubtaskList';
import { updateTask, deleteTask, addSubtask } from '@/lib/tasks/taskService';
import { useAuth } from '@/lib/hooks/useAuth';
import { Timestamp } from 'firebase/firestore';

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  projectId: string;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  projectId,
  onUpdated,
  onDeleted,
}: TaskDetailModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority || 'normal');
      setDueDate(task.dueDate ? task.dueDate.toDate().toISOString().split('T')[0] : '');
    }
  }, [task]);

  const handleSave = async () => {
    if (!task || !user) return;

    setSaving(true);
    try {
      await updateTask(
        projectId,
        task.id,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        },
        user.uid,
        user.displayName || undefined
      );
      onUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm('Are you sure you want to delete this task?')) return;

    setDeleting(true);
    try {
      await deleteTask(projectId, task.id);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <DialogHeader className="flex-row items-start justify-between space-y-0">
          <div className="flex-1">
            {/* Status checkbox and title */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={status === 'done'}
                onCheckedChange={(checked) => setStatus(checked ? 'done' : 'todo')}
                className="mt-1 data-[state=checked]:bg-[var(--accent-green)] data-[state=checked]:border-[var(--accent-green)]"
              />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold border-0 p-0 h-auto bg-transparent focus-visible:ring-0"
                placeholder="Task title"
              />
            </div>

            {/* Task type badge */}
            <div className="mt-2 ml-8 flex items-center gap-2">
              {task.taskType === 'cell' && (
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]">
                  Cell Task
                </span>
              )}
              {task.linkedGate && (
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]">
                  <Target className="h-3 w-3 inline mr-1" />
                  {task.linkedGate.gateName}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Description */}
          <div>
            <Label className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="mt-2 bg-[var(--bg-tertiary)] border-[var(--border-subtle)] resize-none min-h-[100px]"
            />
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <Label className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                Status
              </Label>
              <Select value={status} onValueChange={(value: TaskStatus) => setStatus(value)}>
                <SelectTrigger className="mt-2 bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider flex items-center gap-1">
                <Flag className="h-3 w-3" />
                Priority
              </Label>
              <Select value={priority} onValueChange={(value: TaskPriority) => setPriority(value)}>
                <SelectTrigger className="mt-2 bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['low', 'normal', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div>
              <Label className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-2 bg-[var(--bg-tertiary)] border-[var(--border-subtle)]"
              />
            </div>

            {/* Assignees */}
            <div>
              <Label className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider flex items-center gap-1">
                <User className="h-3 w-3" />
                Assignees
              </Label>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">
                {task.assignees && task.assignees.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {task.assignees.map((a, i) => (
                      <span
                        key={a.userId || a.externalId || i}
                        className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-xs"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[var(--text-tertiary)]">No assignees</span>
                )}
              </div>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <Label className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              Subtasks
            </Label>
            <div className="mt-2">
              <SubtaskList
                subtasks={task.subtasks || []}
                projectId={projectId}
                taskId={task.id}
                onUpdated={onUpdated}
              />
            </div>
          </div>

          {/* Linked Items */}
          {task.linkedItems && task.linkedItems.length > 0 && (
            <div>
              <Label className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                Linked Items
              </Label>
              <div className="mt-2 space-y-1">
                {task.linkedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm"
                  >
                    <span className="font-mono text-xs text-[var(--accent-blue)]">
                      {item.itemCode}
                    </span>
                    <span className="text-[var(--text-secondary)] truncate">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cell Task Info */}
          {task.taskType === 'cell' && task.itemId && (
            <div className="p-3 rounded-lg bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20">
              <div className="text-xs font-semibold text-[var(--accent-purple)] mb-1">
                Cell Task
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                <span className="font-mono">{task.itemCode}</span>
                {task.field && (
                  <span className="ml-2">
                    → {task.fieldDisplayName || task.field}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)]">
            <div>
              Created {task.createdAt?.toDate?.().toLocaleDateString() || 'Unknown'}
              {task.createdByName && ` by ${task.createdByName}`}
            </div>
            {task.completedAt && (
              <div className="text-[var(--accent-green)]">
                Completed {task.completedAt.toDate().toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="text-[var(--accent-red)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving || deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!title.trim() || saving || deleting}
                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
