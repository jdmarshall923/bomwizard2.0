'use client';

import { useRouter } from 'next/navigation';
import { TaskGroupWithCounts, TaskGroupView } from '@/types/task';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LayoutGrid, 
  List, 
  Table2, 
  MoreHorizontal, 
  Settings, 
  Trash2,
  ArrowRight,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskGroupCardProps {
  group: TaskGroupWithCounts;
  projectId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreateTask?: () => void;
}

const viewIcons: Record<TaskGroupView, React.ComponentType<{ className?: string }>> = {
  kanban: LayoutGrid,
  table: Table2,
  list: List,
};

export function TaskGroupCard({ 
  group, 
  projectId, 
  onEdit, 
  onDelete,
  onCreateTask,
}: TaskGroupCardProps) {
  const router = useRouter();
  const ViewIcon = viewIcons[group.defaultView];

  const handleClick = () => {
    router.push(`/project/${projectId}/tasks/${group.id}`);
  };

  return (
    <Card
      className="group cursor-pointer border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm hover:bg-[var(--bg-secondary)]/70 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden relative"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{group.icon || '📋'}</span>
            <div>
              <CardTitle className="text-lg font-semibold group-hover:text-[var(--accent-blue)] transition-colors">
                {group.name}
              </CardTitle>
              {group.description && (
                <CardDescription className="text-sm line-clamp-1">
                  {group.description}
                </CardDescription>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={onEdit}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-[var(--accent-red)]">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Task Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {group.taskCounts.todo} to do
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--accent-blue)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {group.taskCounts.in_progress} in progress
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {group.taskCounts.done} done
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mb-4">
          <div className="h-full flex">
            <div 
              className="bg-[var(--accent-green)] transition-all"
              style={{ width: `${group.taskCounts.total > 0 ? (group.taskCounts.done / group.taskCounts.total) * 100 : 0}%` }}
            />
            <div 
              className="bg-[var(--accent-blue)] transition-all"
              style={{ width: `${group.taskCounts.total > 0 ? (group.taskCounts.in_progress / group.taskCounts.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <ViewIcon className="h-4 w-4" />
            <span className="capitalize">{group.defaultView} view</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onCreateTask?.();
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Task
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
