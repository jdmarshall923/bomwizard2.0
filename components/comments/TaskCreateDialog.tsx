'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ClipboardList, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { TaskPriority, MentionableUser } from '@/types/comments';
import { createTask } from '@/lib/services/taskService';
import { useAuth } from '@/lib/hooks/useAuth';

/**
 * Phase 14: Task Create Dialog
 * 
 * Dialog for creating a task from a comment thread.
 */

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Context
  projectId: string;
  itemId: string;
  itemCode: string;
  itemDescription?: string;
  field: string;
  fieldDisplayName: string;
  threadId?: string;
  commentId?: string;
  
  // Pre-fill from comment
  suggestedTitle?: string;
  suggestedDescription?: string;
  
  // Available assignees
  assignees?: MentionableUser[];
  
  // Callbacks
  onTaskCreated?: (taskId: string) => void;
}

export function TaskCreateDialog({
  open,
  onOpenChange,
  projectId,
  itemId,
  itemCode,
  itemDescription,
  field,
  fieldDisplayName,
  threadId,
  commentId,
  suggestedTitle = '',
  suggestedDescription = '',
  assignees = [],
  onTaskCreated,
}: TaskCreateDialogProps) {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState(suggestedTitle);
  const [description, setDescription] = useState(suggestedDescription);
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  
  // Get selected assignee details
  const selectedAssignee = assignees.find(a => a.id === assigneeId);
  
  const handleCreate = async () => {
    if (!user || !assigneeId || !title.trim()) return;
    
    setIsCreating(true);
    try {
      const taskId = await createTask(
        {
          projectId,
          itemId,
          itemCode,
          itemDescription,
          field,
          fieldDisplayName,
          threadId,
          commentId,
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId,
          assigneeName: selectedAssignee?.name,
          assigneeEmail: selectedAssignee?.email,
          priority,
          dueDate: dueDate ? Timestamp.fromDate(dueDate) : undefined,
        },
        user.uid,
        user.displayName || undefined
      );
      
      onTaskCreated?.(taskId);
      onOpenChange(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setPriority('normal');
      setDueDate(undefined);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Create Task
          </DialogTitle>
          <DialogDescription>
            Create a task for <span className="font-mono">{itemCode}</span> - {fieldDisplayName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={3}
            />
          </div>
          
          {/* Assignee */}
          <div className="space-y-2">
            <Label>Assign to *</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    <div className="flex items-center gap-2">
                      {assignee.avatar ? (
                        <img
                          src={assignee.avatar}
                          alt={assignee.name}
                          className="h-5 w-5 rounded-full"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-[var(--accent-blue)] flex items-center justify-center text-white text-xs">
                          {assignee.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{assignee.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Due date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-[var(--text-tertiary)]'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !title.trim() || !assigneeId}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4 mr-2" />
                Create Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
