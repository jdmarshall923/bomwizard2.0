'use client';

import { useState } from 'react';
import { TaskGroupTemplate, TaskGroupView, CreateTaskGroupInput } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { LayoutGrid, List, Table2, Check } from 'lucide-react';
import { SYSTEM_TEMPLATES, TASK_GROUP_ICONS, applyTemplate } from '@/lib/tasks/defaultTemplates';
import { createTaskGroup } from '@/lib/tasks/taskGroupService';
import { useAuth } from '@/lib/hooks/useAuth';

interface CreateTaskGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated?: (groupId: string) => void;
}

const viewOptions: { value: TaskGroupView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'list', label: 'List', icon: List },
];

export function CreateTaskGroupDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: CreateTaskGroupDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<TaskGroupTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📋');
  const [defaultView, setDefaultView] = useState<TaskGroupView>('kanban');
  const [creating, setCreating] = useState(false);

  const handleTemplateSelect = (template: TaskGroupTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setDescription(template.description || '');
    setIcon(template.icon || '📋');
    setDefaultView(template.defaultView);
    setStep('details');
  };

  const handleBlankStart = () => {
    setSelectedTemplate(null);
    setName('');
    setDescription('');
    setIcon('📋');
    setDefaultView('kanban');
    setStep('details');
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;

    setCreating(true);
    try {
      const input: CreateTaskGroupInput = {
        projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        defaultView,
        kanbanGroupBy: 'status',
        customFields: selectedTemplate ? applyTemplate(selectedTemplate).customFields : [],
        templateId: selectedTemplate?.id,
      };

      const groupId = await createTaskGroup(input, user.uid);
      onCreated?.(groupId);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create task group:', error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setStep('template');
    setSelectedTemplate(null);
    setName('');
    setDescription('');
    setIcon('📋');
    setDefaultView('kanban');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        {step === 'template' ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Task Group</DialogTitle>
              <DialogDescription>
                Start with a template or create a blank task group.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              {/* Blank option */}
              <button
                onClick={handleBlankStart}
                className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-blue)] hover:bg-[var(--bg-tertiary)]/50 transition-colors text-center"
              >
                <div className="text-3xl">➕</div>
                <div className="font-medium">Blank</div>
                <div className="text-xs text-[var(--text-tertiary)]">
                  Start from scratch
                </div>
              </button>

              {/* Template options */}
              {SYSTEM_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent-blue)] hover:bg-[var(--bg-tertiary)]/50 transition-colors text-center"
                >
                  <div className="text-3xl">{template.icon}</div>
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)] line-clamp-2">
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Task Group Details</DialogTitle>
              <DialogDescription>
                {selectedTemplate
                  ? `Creating from "${selectedTemplate.name}" template`
                  : 'Configure your new task group'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Icon and Name */}
              <div className="flex items-start gap-4">
                <div>
                  <Label className="text-xs text-[var(--text-tertiary)]">Icon</Label>
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger className="w-16 h-12 text-xl bg-[var(--bg-tertiary)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="grid grid-cols-4 w-48">
                      {TASK_GROUP_ICONS.map((emoji) => (
                        <SelectItem key={emoji} value={emoji} className="text-xl text-center">
                          {emoji}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Task Group Name"
                    className="bg-[var(--bg-tertiary)]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this task group"
                  className="bg-[var(--bg-tertiary)] resize-none"
                  rows={2}
                />
              </div>

              {/* Default View */}
              <div>
                <Label>Default View</Label>
                <div className="flex gap-2 mt-2">
                  {viewOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = defaultView === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => setDefaultView(option.value)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                          isSelected
                            ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                            : 'border-[var(--border-subtle)] hover:border-[var(--accent-blue)] hover:bg-[var(--bg-tertiary)]'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{option.label}</span>
                        {isSelected && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Template info */}
              {selectedTemplate && selectedTemplate.customFields.length > 0 && (
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-sm">
                  <div className="font-medium mb-1">Includes custom fields:</div>
                  <div className="text-[var(--text-secondary)]">
                    {selectedTemplate.customFields.map(f => f.name).join(', ')}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('template')}
                disabled={creating}
              >
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
              >
                {creating ? 'Creating...' : 'Create Task Group'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
