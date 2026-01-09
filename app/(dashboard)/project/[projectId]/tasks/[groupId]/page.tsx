'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTaskGroupWithCounts, useTaskGroup } from '@/lib/hooks/useTaskGroups';
import { useTasks } from '@/lib/hooks/useTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Settings, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import {
  TaskViewSwitcher,
  TaskKanbanView,
  TaskTableView,
  TaskListView,
  TaskDetailModal,
  TaskQuickAdd,
  TaskGroupSettings,
} from '@/components/tasks';
import { Task, TaskStatus, TaskGroupView } from '@/types/task';
import { updateTaskGroup } from '@/lib/tasks/taskGroupService';

export default function TaskGroupPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params?.projectId as string;
  const groupId = params?.groupId as string;
  
  const { taskGroup, loading: groupLoading } = useTaskGroupWithCounts({ projectId, groupId });
  const { tasks, tasksByStatus, loading: tasksLoading } = useTasks({ projectId, taskGroupId: groupId });
  
  const [currentView, setCurrentView] = useState<TaskGroupView>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddStatus, setQuickAddStatus] = useState<TaskStatus>('todo');
  const [showSettings, setShowSettings] = useState(false);

  // Set view from task group default
  useEffect(() => {
    if (taskGroup) {
      setCurrentView(taskGroup.defaultView);
    }
  }, [taskGroup]);

  // Handle action param (e.g., ?action=add)
  useEffect(() => {
    if (searchParams?.get('action') === 'add') {
      setShowQuickAdd(true);
      // Clear the param
      router.replace(`/project/${projectId}/tasks/${groupId}`);
    }
  }, [searchParams, projectId, groupId, router]);

  const handleViewChange = async (view: TaskGroupView) => {
    setCurrentView(view);
    // Optionally persist the view preference
    if (taskGroup) {
      try {
        await updateTaskGroup(projectId, groupId, { defaultView: view });
      } catch (error) {
        console.error('Failed to update view preference:', error);
      }
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleAddTask = (status?: TaskStatus) => {
    setQuickAddStatus(status || 'todo');
    setShowQuickAdd(true);
  };

  const handleTaskCreated = () => {
    setShowQuickAdd(false);
  };

  // Filter tasks by search
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query)
    );
  });

  const filteredTasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
  };

  const loading = groupLoading || tasksLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!taskGroup) {
    return (
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-[var(--text-tertiary)] mb-4">Task group not found</div>
          <Link href={`/project/${projectId}/tasks`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Task Groups
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/project/${projectId}/tasks`}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Tasks
          </Link>
          <span className="text-[var(--text-tertiary)]">/</span>
          <span className="flex items-center gap-2">
            <span className="text-xl">{taskGroup.icon}</span>
            <span className="font-medium">{taskGroup.name}</span>
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <TaskViewSwitcher currentView={currentView} onViewChange={handleViewChange} />
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-3 text-sm text-[var(--text-secondary)] mr-4">
              <span>
                <strong className="text-[var(--text-tertiary)]">{taskGroup.taskCounts.todo}</strong> to do
              </span>
              <span>
                <strong className="text-[var(--accent-blue)]">{taskGroup.taskCounts.in_progress}</strong> in progress
              </span>
              <span>
                <strong className="text-[var(--accent-green)]">{taskGroup.taskCounts.done}</strong> done
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={() => handleAddTask()}
              className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue-light)] hover:from-[var(--accent-blue-hover)] hover:to-[var(--accent-blue)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Add */}
      {showQuickAdd && (
        <TaskQuickAdd
          projectId={projectId}
          taskGroupId={groupId}
          defaultStatus={quickAddStatus}
          onCreated={handleTaskCreated}
          onCancel={() => setShowQuickAdd(false)}
        />
      )}

      {/* Task Views */}
      {currentView === 'kanban' && (
        <TaskKanbanView
          tasks={filteredTasks}
          tasksByStatus={filteredTasksByStatus}
          projectId={projectId}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
        />
      )}
      {currentView === 'table' && (
        <TaskTableView
          tasks={filteredTasks}
          projectId={projectId}
          customFields={taskGroup.customFields}
          onTaskClick={handleTaskClick}
          onAddTask={() => handleAddTask()}
        />
      )}
      {currentView === 'list' && (
        <TaskListView
          tasks={filteredTasks}
          projectId={projectId}
          onTaskClick={handleTaskClick}
          onAddTask={() => handleAddTask()}
          showStatusGroups
        />
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        projectId={projectId}
      />

      {/* Settings */}
      <TaskGroupSettings
        open={showSettings}
        onOpenChange={setShowSettings}
        group={taskGroup}
        projectId={projectId}
      />
    </div>
  );
}
