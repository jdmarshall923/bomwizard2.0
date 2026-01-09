'use client';

import { useState, useMemo } from 'react';
import { useProjects } from '@/lib/hooks/useProjects';
import { useMyTasks } from '@/lib/hooks/useMyTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckSquare, Plus, Search, Filter, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { MyTasksList } from '@/components/tasks/MyTasksList';
import { Task } from '@/types/task';

export default function MyTasksPage() {
  const { projects } = useProjects();
  const { groupedTasks, loading, error, taskCount, overdueCount } = useMyTasks({
    includeCompleted: true,
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  // Create project name lookup
  const projectNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const project of projects) {
      names[project.id] = project.name;
    }
    return names;
  }, [projects]);

  // Filter tasks
  const filteredGroupedTasks = useMemo(() => {
    const filterTasks = (tasks: Task[]) => {
      return tasks.filter(task => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (!task.title.toLowerCase().includes(query) &&
              !task.description?.toLowerCase().includes(query)) {
            return false;
          }
        }
        
        // Project filter
        if (projectFilter !== 'all' && task.projectId !== projectFilter) {
          return false;
        }
        
        return true;
      });
    };

    const result = {
      overdue: filterTasks(groupedTasks.overdue),
      today: filterTasks(groupedTasks.today),
      thisWeek: filterTasks(groupedTasks.thisWeek),
      later: filterTasks(groupedTasks.later),
      noDueDate: filterTasks(groupedTasks.noDueDate),
      completed: statusFilter === 'all' ? filterTasks(groupedTasks.completed) : [],
    };

    return result;
  }, [groupedTasks, searchQuery, projectFilter, statusFilter]);

  // Count filtered tasks
  const filteredTaskCount = useMemo(() => {
    return (
      filteredGroupedTasks.overdue.length +
      filteredGroupedTasks.today.length +
      filteredGroupedTasks.thisWeek.length +
      filteredGroupedTasks.later.length +
      filteredGroupedTasks.noDueDate.length
    );
  }, [filteredGroupedTasks]);

  const handleTaskClick = (task: Task) => {
    // TODO: Open task detail modal
    console.log('Task clicked:', task);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Tasks assigned to you across all projects
          </p>
        </div>
        <Button className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue-light)] hover:from-[var(--accent-blue-hover)] hover:to-[var(--accent-blue)] shadow-lg shadow-[var(--accent-blue)]/20">
          <Plus className="mr-2 h-4 w-4" />
          Quick Add Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-lg bg-[var(--accent-red)]/10">
              <AlertTriangle className="h-5 w-5 text-[var(--accent-red)]" />
            </div>
            <div>
              <div className="text-2xl font-bold">{groupedTasks.overdue.length}</div>
              <div className="text-sm text-[var(--text-secondary)]">Overdue</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-lg bg-[var(--accent-orange)]/10">
              <Calendar className="h-5 w-5 text-[var(--accent-orange)]" />
            </div>
            <div>
              <div className="text-2xl font-bold">{groupedTasks.today.length}</div>
              <div className="text-sm text-[var(--text-secondary)]">Due Today</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-lg bg-[var(--accent-blue)]/10">
              <CheckSquare className="h-5 w-5 text-[var(--accent-blue)]" />
            </div>
            <div>
              <div className="text-2xl font-bold">{taskCount}</div>
              <div className="text-sm text-[var(--text-secondary)]">Total Active</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]"
          />
        </div>

        {/* Project Filter */}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48 bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]">
            <SelectValue placeholder="Active" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All (inc. done)</SelectItem>
          </SelectContent>
        </Select>

        {/* Results count */}
        <span className="text-sm text-[var(--text-secondary)]">
          {filteredTaskCount} task{filteredTaskCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-secondary)]">Loading tasks...</div>
        </div>
      ) : error ? (
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-[var(--accent-red)]/10 mb-4">
              <AlertTriangle className="h-8 w-8 text-[var(--accent-red)]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load tasks</h3>
            <p className="text-[var(--text-secondary)] text-center max-w-sm">
              {error.message}
            </p>
          </CardContent>
        </Card>
      ) : (
        <MyTasksList
          groupedTasks={filteredGroupedTasks}
          projectNames={projectNames}
          onTaskClick={handleTaskClick}
        />
      )}
    </div>
  );
}
