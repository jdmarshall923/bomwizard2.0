'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTaskGroupsWithCounts } from '@/lib/hooks/useTaskGroups';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Trash2 } from 'lucide-react';
import {
  TaskGroupCard,
  CreateTaskGroupDialog,
  TaskGroupSettings,
} from '@/components/tasks';
import { TaskGroupWithCounts, TaskGroup } from '@/types/task';
import { deleteTaskGroup } from '@/lib/tasks/taskGroupService';
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

export default function ProjectTasksPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  
  const { taskGroups, loading, error } = useTaskGroupsWithCounts({ projectId });
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsGroup, setSettingsGroup] = useState<TaskGroup | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<TaskGroupWithCounts | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleGroupCreated = (groupId: string) => {
    // Navigate to the new group
    router.push(`/project/${projectId}/tasks/${groupId}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteGroup) return;

    setDeleting(true);
    try {
      await deleteTaskGroup(projectId, deleteGroup.id);
      setDeleteGroup(null);
    } catch (error) {
      console.error('Failed to delete task group:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-[var(--text-secondary)]">
            Organize and track work with task groups
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue-light)] hover:from-[var(--accent-blue-hover)] hover:to-[var(--accent-blue)] shadow-lg shadow-[var(--accent-blue)]/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Task Group
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-secondary)]">Loading task groups...</div>
        </div>
      ) : error ? (
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-[var(--accent-red)] mb-4">Failed to load task groups</div>
            <p className="text-[var(--text-secondary)]">{error.message}</p>
          </CardContent>
        </Card>
      ) : taskGroups.length === 0 ? (
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-[var(--bg-tertiary)] mb-4">
              <FolderOpen className="h-8 w-8 text-[var(--text-tertiary)]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No task groups yet</h3>
            <p className="text-[var(--text-secondary)] mb-6 text-center max-w-sm">
              Create task groups to organize your work. Each group can have its own view (Kanban, Table, or List) and custom fields.
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue-light)] hover:from-[var(--accent-blue-hover)] hover:to-[var(--accent-blue)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create your first task group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {taskGroups.map((group) => (
            <TaskGroupCard
              key={group.id}
              group={group}
              projectId={projectId}
              onEdit={() => setSettingsGroup(group)}
              onDelete={() => setDeleteGroup(group)}
              onCreateTask={() => router.push(`/project/${projectId}/tasks/${group.id}?action=add`)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateTaskGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onCreated={handleGroupCreated}
      />

      {/* Settings Dialog */}
      {settingsGroup && (
        <TaskGroupSettings
          open={!!settingsGroup}
          onOpenChange={(open) => !open && setSettingsGroup(null)}
          group={settingsGroup}
          projectId={projectId}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGroup} onOpenChange={(open) => !open && setDeleteGroup(null)}>
        <AlertDialogContent className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteGroup?.name}"? 
              {deleteGroup && deleteGroup.taskCounts.total > 0 && (
                <span className="block mt-2 text-[var(--accent-orange)]">
                  This group has {deleteGroup.taskCounts.total} task{deleteGroup.taskCounts.total !== 1 ? 's' : ''}. 
                  Consider moving tasks to another group first.
                </span>
              )}
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
