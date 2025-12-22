'use client';

import { useState } from 'react';
import { useProjects } from '@/lib/hooks/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Plus, FolderKanban, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { deleteDocument } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/hooks/useAuth';
import { GateProgressBar } from '@/components/projects/GatesTimeline';
import { RiskDot } from '@/components/projects/RiskIndicator';
import { MetricsSummary } from '@/components/projects/MetricsDashboard';

export default function ProjectsPage() {
  const { projects, loading } = useProjects();
  const router = useRouter();
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, project: { id: string; name: string }) => {
    e.stopPropagation(); // Prevent card click
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete || !user) return;

    setDeleting(true);
    try {
      await deleteDocument('projects', projectToDelete.id);
      // Real-time updates from useCollection will automatically refresh the list
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project: ' + (error.message || 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Projects</h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Manage your BOM projects and versions
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-secondary)]">Loading projects...</div>
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-[var(--bg-tertiary)] mb-4">
              <FolderKanban className="h-8 w-8 text-[var(--text-tertiary)]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-[var(--text-secondary)] mb-6 text-center max-w-sm">
              Get started by creating your first BOM project. You can import data, track versions, and analyze costs.
            </p>
            <Button
              onClick={() => router.push('/projects/new')}
              className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue-light)] hover:from-[var(--accent-blue-hover)] hover:to-[var(--accent-blue)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create your first project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group cursor-pointer border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm hover:bg-[var(--bg-secondary)]/70 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--accent-blue)]/10 hover:-translate-y-1 overflow-hidden relative"
              onClick={() => router.push(`/project/${project.id}`)}
            >
              {/* Gradient background effect */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[var(--accent-blue)]/10 to-[var(--accent-orange)]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
              
              <CardHeader className="relative">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--accent-blue)]/20 to-[var(--accent-blue-light)]/20 group-hover:from-[var(--accent-blue)]/30 group-hover:to-[var(--accent-blue-light)]/30 transition-all">
                    <FolderKanban className="h-5 w-5 text-[var(--accent-blue)]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteClick(e, { id: project.id, name: project.name })}
                      className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--accent-red)] transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ArrowRight className="h-5 w-5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold mb-1 group-hover:text-[var(--accent-blue)] transition-colors">
                  {project.name}
                </CardTitle>
                <CardDescription className="text-sm font-mono">{project.code}</CardDescription>
              </CardHeader>
              
              <CardContent className="relative space-y-4">
                {project.description && (
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                    {project.description}
                  </p>
                )}
                
                {/* Gate Progress and Metrics */}
                {project.gates && (
                  <div className="space-y-2 py-2 border-t border-[var(--border-subtle)]">
                    <GateProgressBar gates={project.gates} />
                    {project.metrics && (
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <RiskDot riskLevel={project.metrics.riskLevel} />
                          <span className="text-[var(--text-tertiary)] capitalize">{project.metrics.riskLevel}</span>
                        </div>
                        <span className="text-[var(--text-tertiary)]">|</span>
                        <span className={cn(
                          'font-medium',
                          project.metrics.bomConfidence >= 80 ? 'text-[var(--accent-green)]' :
                          project.metrics.bomConfidence >= 50 ? 'text-[var(--accent-orange)]' :
                          'text-[var(--accent-red)]'
                        )}>
                          {Math.round(project.metrics.bomConfidence)}% confidence
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {project.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-xs px-3 py-1 rounded-full font-medium border',
                      project.status === 'active'
                        ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)] border-[var(--accent-green)]/30'
                        : project.status === 'archived'
                        ? 'bg-[var(--text-tertiary)]/20 text-[var(--text-tertiary)] border-[var(--text-tertiary)]/30'
                        : 'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] border-[var(--accent-orange)]/30'
                    )}
                  >
                    {project.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--text-primary)]">Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-secondary)]">
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone and will permanently delete the project and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleting}
              className="border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

