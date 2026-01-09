'use client';

import { useState } from 'react';
import { Subtask } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toggleSubtask, addSubtask, removeSubtask } from '@/lib/tasks/taskService';
import { useAuth } from '@/lib/hooks/useAuth';

interface SubtaskListProps {
  subtasks: Subtask[];
  projectId: string;
  taskId: string;
  onUpdated?: () => void;
  readOnly?: boolean;
}

export function SubtaskList({
  subtasks,
  projectId,
  taskId,
  onUpdated,
  readOnly = false,
}: SubtaskListProps) {
  const { user } = useAuth();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const handleToggle = async (subtaskId: string) => {
    try {
      await toggleSubtask(projectId, taskId, subtaskId, user?.uid);
      onUpdated?.();
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    }
  };

  const handleAdd = async () => {
    if (!newSubtaskTitle.trim()) return;

    setAdding(true);
    try {
      await addSubtask(projectId, taskId, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      onUpdated?.();
    } catch (error) {
      console.error('Failed to add subtask:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (subtaskId: string) => {
    try {
      await removeSubtask(projectId, taskId, subtaskId);
      onUpdated?.();
    } catch (error) {
      console.error('Failed to remove subtask:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;

  return (
    <div className="space-y-2">
      {/* Progress */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent-green)] transition-all"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span>
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        {subtasks
          .sort((a, b) => a.position - b.position)
          .map((subtask) => (
            <div
              key={subtask.id}
              className={cn(
                'group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)]/50',
                subtask.completed && 'opacity-60'
              )}
            >
              {!readOnly && (
                <GripVertical className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 cursor-grab" />
              )}
              
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={() => handleToggle(subtask.id)}
                disabled={readOnly}
                className="data-[state=checked]:bg-[var(--accent-green)] data-[state=checked]:border-[var(--accent-green)]"
              />
              
              <span
                className={cn(
                  'flex-1 text-sm',
                  subtask.completed && 'line-through text-[var(--text-tertiary)]'
                )}
              >
                {subtask.title}
              </span>

              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemove(subtask.id)}
                >
                  <Trash2 className="h-3 w-3 text-[var(--text-tertiary)] hover:text-[var(--accent-red)]" />
                </Button>
              )}
            </div>
          ))}
      </div>

      {/* Add subtask */}
      {!readOnly && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a subtask..."
            className="flex-1 h-8 text-sm bg-[var(--bg-tertiary)] border-[var(--border-subtle)]"
            disabled={adding}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            disabled={!newSubtaskTitle.trim() || adding}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
