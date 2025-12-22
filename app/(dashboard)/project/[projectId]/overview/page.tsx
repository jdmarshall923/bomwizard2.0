'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GatesTimeline } from '@/components/projects/GatesTimeline';
import { GateCard } from '@/components/projects/GateCard';
import { MetricsDashboard } from '@/components/projects/MetricsDashboard';
import { 
  Project, 
  ProjectGate, 
  ProjectGates, 
  ProjectMetrics, 
  GateKey, 
  GATE_METADATA,
} from '@/types';
import {
  updateProjectGate,
  refreshProjectMetrics,
  initializeProjectGates,
  calculateProjectMetrics,
  fetchBomItemsForMetrics,
} from '@/lib/bom/projectMetricsService';
import { deleteDocument } from '@/lib/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { RefreshCw, Target, LayoutGrid, List, MoreVertical, Trash2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ViewMode = 'timeline' | 'grid';

export default function ProjectOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [gates, setGates] = useState<ProjectGates | null>(null);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGate, setSelectedGate] = useState<GateKey | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch project data
  const fetchData = useCallback(async () => {
    if (!projectId) return;

    try {
      // Fetch project
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (!projectSnap.exists()) {
        toast.error('Project not found');
        return;
      }

      const projectData = { id: projectSnap.id, ...projectSnap.data() } as Project;
      setProject(projectData);

      // Get or initialize gates
      let projectGates = projectData.gates;
      if (!projectGates) {
        projectGates = await initializeProjectGates(projectId);
      }
      setGates(projectGates);

      // Calculate metrics
      const items = await fetchBomItemsForMetrics(projectId);
      const calculatedMetrics = calculateProjectMetrics(items, projectGates);
      setMetrics(calculatedMetrics);

    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle gate update
  const handleGateUpdate = async (gateKey: GateKey, updates: Partial<ProjectGate>) => {
    if (!gates) return;

    try {
      // Optimistic update
      const updatedGates = {
        ...gates,
        [gateKey]: { ...gates[gateKey], ...updates },
      };
      setGates(updatedGates);

      // Persist to Firestore
      await updateProjectGate(projectId, gateKey, updates);
      
      // Recalculate metrics if needed
      if (metrics) {
        const items = await fetchBomItemsForMetrics(projectId);
        const newMetrics = calculateProjectMetrics(items, updatedGates);
        setMetrics(newMetrics);
      }

      toast.success(`${GATE_METADATA.find(m => m.key === gateKey)?.name} updated`);
    } catch (error) {
      console.error('Error updating gate:', error);
      toast.error('Failed to update gate');
      // Revert optimistic update
      fetchData();
    }
  };

  // Refresh metrics
  const handleRefreshMetrics = async () => {
    if (!projectId || !gates) return;

    setRefreshing(true);
    try {
      const newMetrics = await refreshProjectMetrics(projectId);
      setMetrics(newMetrics);
      toast.success('Metrics refreshed');
    } catch (error) {
      console.error('Error refreshing metrics:', error);
      toast.error('Failed to refresh metrics');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle gate click from timeline
  const handleGateClick = (gateKey: GateKey) => {
    setSelectedGate(selectedGate === gateKey ? null : gateKey);
    setViewMode('grid'); // Switch to grid view to show details
  };

  // Handle project deletion
  const handleDeleteConfirm = async () => {
    if (!project) return;

    setDeleting(true);
    try {
      await deleteDocument('projects', project.id);
      toast.success('Project deleted', {
        description: `"${project.name}" has been permanently deleted.`,
      });
      router.push('/projects');
    } catch (error: unknown) {
      console.error('Error deleting project:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to delete project', {
        description: message,
      });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!project || !gates || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)]">Failed to load project data</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold tracking-tight">{project.name}</h1>
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                project.status === 'active'
                  ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-[var(--accent-green)]/30'
                  : project.status === 'archived'
                  ? 'bg-[var(--text-tertiary)]/20 text-[var(--text-tertiary)] border border-[var(--text-tertiary)]/30'
                  : 'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] border border-[var(--accent-orange)]/30'
              )}
            >
              {project.status}
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-lg">
            {project.code} • PACE gates and project metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshMetrics}
            disabled={refreshing}
            className="border-[var(--border-subtle)]"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
            Refresh Metrics
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="border-[var(--border-subtle)]">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
              <DropdownMenuItem 
                onClick={() => router.push(`/project/${projectId}/settings`)}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />
              <DropdownMenuItem 
                onClick={() => setDeleteDialogOpen(true)}
                className="cursor-pointer text-[var(--accent-red)] focus:text-[var(--accent-red)]"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Gates Timeline Card */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--accent-blue)]/20 to-[var(--accent-blue-light)]/20">
                <Target className="h-5 w-5 text-[var(--accent-blue)]" />
              </div>
              <div>
                <CardTitle className="text-xl">PACE Gates</CardTitle>
                <CardDescription>Track project milestones through the development lifecycle</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('timeline')}
                className={cn(
                  'h-8 px-3',
                  viewMode === 'timeline' && 'bg-[var(--bg-primary)] shadow-sm'
                )}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-8 px-3',
                  viewMode === 'grid' && 'bg-[var(--bg-primary)] shadow-sm'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Timeline View */}
          <div className={cn(viewMode === 'timeline' ? 'block' : 'hidden')}>
            <GatesTimeline 
              gates={gates} 
              onGateClick={handleGateClick}
            />
          </div>

          {/* Grid View */}
          <div className={cn(viewMode === 'grid' ? 'block' : 'hidden')}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {GATE_METADATA.map((meta) => (
                <GateCard
                  key={meta.key}
                  gate={gates[meta.key]}
                  meta={meta}
                  onUpdate={(updates) => handleGateUpdate(meta.key, updates)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Dashboard */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Project Metrics</h2>
          <span className="text-sm text-[var(--text-tertiary)]">
            Based on working BOM data
          </span>
        </div>
        <MetricsDashboard metrics={metrics} />
      </div>

      {/* Selected Gate Detail (if any) */}
      {selectedGate && viewMode === 'timeline' && (
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>
              {GATE_METADATA.find(m => m.key === selectedGate)?.fullName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GateCard
              gate={gates[selectedGate]}
              meta={GATE_METADATA.find(m => m.key === selectedGate)!}
              onUpdate={(updates) => handleGateUpdate(selectedGate, updates)}
            />
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--text-primary)]">Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-secondary)]">
              Are you sure you want to delete &ldquo;{project?.name}&rdquo;? This action cannot be undone and will permanently delete the project and all associated data including BOM items, versions, quotes, and manufacturing logs.
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
              {deleting ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


