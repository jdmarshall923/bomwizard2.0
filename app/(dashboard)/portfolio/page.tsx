'use client';

import { useState } from 'react';
import { useProjects } from '@/lib/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FolderKanban, Filter, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  ViewSwitcher,
  PortfolioView,
  PortfolioKanban,
  PortfolioTable,
  PortfolioTimeline,
} from '@/components/portfolio';

export default function PortfolioPage() {
  const { projects, loading } = useProjects();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<PortfolioView>('kanban');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter projects by search query
  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.code?.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    );
  });

  // TODO: Get actual task counts from Firestore when tasks are implemented
  const taskCounts: Record<string, number> = {};
  const overdueCounts: Record<string, number> = {};

  const renderView = () => {
    switch (currentView) {
      case 'kanban':
        return (
          <PortfolioKanban
            projects={filteredProjects}
            taskCounts={taskCounts}
            overdueCounts={overdueCounts}
          />
        );
      case 'table':
        return (
          <PortfolioTable
            projects={filteredProjects}
            taskCounts={taskCounts}
            overdueCounts={overdueCounts}
          />
        );
      case 'timeline':
        return (
          <PortfolioTimeline
            projects={filteredProjects}
            taskCounts={taskCounts}
            overdueCounts={overdueCounts}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Overview of all projects by PACE gate status
          </p>
        </div>
        <Button
          onClick={() => router.push('/projects/new')}
          className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue-light)] hover:from-[var(--accent-blue-hover)] hover:to-[var(--accent-blue)] shadow-lg shadow-[var(--accent-blue)]/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]"
            />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span>
            <strong className="text-[var(--text-primary)]">{filteredProjects.length}</strong> projects
          </span>
          <span className="text-[var(--border-subtle)]">|</span>
          <span>
            <strong className="text-[var(--accent-green)]">
              {filteredProjects.filter(p => p.status === 'active').length}
            </strong>{' '}
            active
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-secondary)]">Loading projects...</div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-[var(--bg-tertiary)] mb-4">
              <FolderKanban className="h-8 w-8 text-[var(--text-tertiary)]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-[var(--text-secondary)] mb-6 text-center max-w-sm">
              {searchQuery
                ? 'Try adjusting your search query to find projects.'
                : 'Get started by creating your first BOM project.'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => router.push('/projects/new')}
                className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue-light)] hover:from-[var(--accent-blue-hover)] hover:to-[var(--accent-blue)]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your first project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        renderView()
      )}
    </div>
  );
}
