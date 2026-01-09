'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, LayoutGrid, List, Table2, Lock } from 'lucide-react';
import { TaskGroupTemplate, TaskGroupView } from '@/types/task';
import { getTemplates, deleteTemplate } from '@/lib/tasks/taskTemplateService';
import { SYSTEM_TEMPLATES } from '@/lib/tasks/defaultTemplates';
import { TemplateEditor } from '@/components/tasks/TemplateEditor';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const viewIcons: Record<TaskGroupView, React.ComponentType<{ className?: string }>> = {
  kanban: LayoutGrid,
  table: Table2,
  list: List,
};

export default function TaskTemplatesPage() {
  const [templates, setTemplates] = useState<TaskGroupTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskGroupTemplate | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TaskGroupTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // For now, use a placeholder organization ID
  // In production, this would come from the user's organization
  const organizationId = 'default';

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await getTemplates(organizationId);
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      // Fall back to system templates only
      setTemplates(SYSTEM_TEMPLATES);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: TaskGroupTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDeleteClick = (template: TaskGroupTemplate) => {
    setTemplateToDelete(template);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    setDeleting(true);
    try {
      await deleteTemplate(organizationId, templateToDelete.id);
      await loadTemplates();
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
    setDeleting(false);
  };

  const systemTemplates = templates.filter(t => t.isSystem);
  const userTemplates = templates.filter(t => !t.isSystem);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Task Templates</h1>
          <p className="text-[var(--text-secondary)]">
            Manage task group templates for your organization
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue-light)] hover:from-[var(--accent-blue-hover)] hover:to-[var(--accent-blue)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-secondary)]">Loading templates...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* User Templates */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Your Templates</h2>
            {userTemplates.length === 0 ? (
              <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-[var(--text-tertiary)] mb-4">
                    No custom templates yet
                  </div>
                  <Button onClick={handleCreate} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userTemplates.map((template) => {
                  const ViewIcon = viewIcons[template.defaultView];
                  return (
                    <Card
                      key={template.id}
                      className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)]/70 transition-all group"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{template.icon}</span>
                            <div>
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              {template.description && (
                                <CardDescription className="text-xs line-clamp-1">
                                  {template.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[var(--accent-red)]"
                              onClick={() => handleDeleteClick(template)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                          <div className="flex items-center gap-1">
                            <ViewIcon className="h-4 w-4" />
                            <span className="capitalize">{template.defaultView}</span>
                          </div>
                          <span>
                            {template.customFields.length} custom field{template.customFields.length !== 1 ? 's' : ''}
                          </span>
                          {template.defaultTasks && template.defaultTasks.length > 0 && (
                            <span>
                              {template.defaultTasks.length} default task{template.defaultTasks.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* System Templates */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--text-tertiary)]" />
              System Templates
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {systemTemplates.map((template) => {
                const ViewIcon = viewIcons[template.defaultView];
                return (
                  <Card
                    key={template.id}
                    className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{template.icon}</span>
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            {template.description && (
                              <CardDescription className="text-xs line-clamp-1">
                                {template.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="px-2 py-0.5 rounded text-xs bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
                          Built-in
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                        <div className="flex items-center gap-1">
                          <ViewIcon className="h-4 w-4" />
                          <span className="capitalize">{template.defaultView}</span>
                        </div>
                        <span>
                          {template.customFields.length} custom field{template.customFields.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Template Editor */}
      <TemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        organizationId={organizationId}
        onSaved={loadTemplates}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
