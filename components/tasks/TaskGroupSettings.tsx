'use client';

import { useState } from 'react';
import { TaskGroup, TaskGroupView, CustomFieldSchema, CustomFieldType } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  LayoutGrid, 
  List, 
  Table2, 
  Plus, 
  Trash2, 
  GripVertical,
  Settings,
  Palette
} from 'lucide-react';
import { TASK_GROUP_ICONS, TASK_GROUP_COLORS } from '@/lib/tasks/defaultTemplates';
import { updateTaskGroup } from '@/lib/tasks/taskGroupService';

interface TaskGroupSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: TaskGroup;
  projectId: string;
  onUpdated?: () => void;
}

const fieldTypes: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
  { value: 'person', label: 'Person' },
];

export function TaskGroupSettings({
  open,
  onOpenChange,
  group,
  projectId,
  onUpdated,
}: TaskGroupSettingsProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [icon, setIcon] = useState(group.icon || '📋');
  const [color, setColor] = useState(group.color || '');
  const [defaultView, setDefaultView] = useState<TaskGroupView>(group.defaultView);
  const [customFields, setCustomFields] = useState<CustomFieldSchema[]>(group.customFields);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTaskGroup(projectId, group.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color: color || undefined,
        defaultView,
        customFields,
      });
      onUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update task group:', error);
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    const newField: CustomFieldSchema = {
      id: crypto.randomUUID(),
      name: 'New Field',
      type: 'text',
      position: customFields.length,
      showInKanban: true,
      showInTable: true,
    };
    setCustomFields([...customFields, newField]);
  };

  const updateCustomField = (fieldId: string, updates: Partial<CustomFieldSchema>) => {
    setCustomFields(fields =>
      fields.map(f => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const removeCustomField = (fieldId: string) => {
    setCustomFields(fields =>
      fields.filter(f => f.id !== fieldId).map((f, i) => ({ ...f, position: i }))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Task Group Settings
          </DialogTitle>
          <DialogDescription>
            Configure the task group appearance and custom fields.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="fields">Custom Fields</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
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
                  className="bg-[var(--bg-tertiary)]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-[var(--bg-tertiary)] resize-none"
                rows={2}
              />
            </div>

            {/* Color */}
            <div>
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Accent Color
              </Label>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setColor('')}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center',
                    !color ? 'border-[var(--accent-blue)]' : 'border-[var(--border-subtle)]'
                  )}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-200 to-gray-400" />
                </button>
                {TASK_GROUP_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2',
                      color === c.value ? 'border-[var(--accent-blue)]' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Default View */}
            <div>
              <Label>Default View</Label>
              <div className="flex gap-2 mt-2">
                {[
                  { value: 'kanban' as const, label: 'Kanban', icon: LayoutGrid },
                  { value: 'table' as const, label: 'Table', icon: Table2 },
                  { value: 'list' as const, label: 'List', icon: List },
                ].map((option) => {
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
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                Add custom fields to track additional information on tasks.
              </p>
              <Button onClick={addCustomField} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Field
              </Button>
            </div>

            {customFields.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-tertiary)]">
                No custom fields. Click "Add Field" to create one.
              </div>
            ) : (
              <div className="space-y-3">
                {customFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50"
                  >
                    <GripVertical className="h-4 w-4 text-[var(--text-tertiary)] cursor-grab" />
                    
                    <Input
                      value={field.name}
                      onChange={(e) => updateCustomField(field.id, { name: e.target.value })}
                      className="flex-1 bg-[var(--bg-secondary)]"
                      placeholder="Field name"
                    />
                    
                    <Select
                      value={field.type}
                      onValueChange={(value: CustomFieldType) =>
                        updateCustomField(field.id, { type: value })
                      }
                    >
                      <SelectTrigger className="w-32 bg-[var(--bg-secondary)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap flex items-center gap-1">
                        <Switch
                          checked={field.showInKanban}
                          onCheckedChange={(checked: boolean) =>
                            updateCustomField(field.id, { showInKanban: checked })
                          }
                        />
                        <span>Kanban</span>
                      </Label>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomField(field.id)}
                      className="h-8 w-8 text-[var(--text-tertiary)] hover:text-[var(--accent-red)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
