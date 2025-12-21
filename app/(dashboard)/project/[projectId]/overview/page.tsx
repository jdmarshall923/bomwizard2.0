'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  createDefaultGates 
} from '@/types';
import {
  getProjectGates,
  updateProjectGate,
  refreshProjectMetrics,
  initializeProjectGates,
  calculateProjectMetrics,
  fetchBomItemsForMetrics,
} from '@/lib/bom/projectMetricsService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { RefreshCw, Target, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ViewMode = 'timeline' | 'grid';

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [gates, setGates] = useState<ProjectGates | null>(null);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGate, setSelectedGate] = useState<GateKey | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

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
          <h1 className="text-4xl font-bold tracking-tight">Project Overview</h1>
          <p className="text-[var(--text-secondary)] text-lg">
            PACE gates and project metrics for {project.name}
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
    </div>
  );
}

