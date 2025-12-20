'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '@/lib/context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { toast } from '@/components/ui/sonner';
import { PoundSterling, Package, Clock, FileCheck, TrendingUp, Activity, Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteDocument } from '@/lib/firebase/firestore';

export default function ProjectDashboardPage() {
  const { project, loading } = useProject();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--text-secondary)]">Project not found</div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Cost',
      value: '£0.00',
      description: 'Total BOM cost',
      icon: PoundSterling,
      gradient: 'from-[var(--accent-blue)] to-[var(--accent-blue-light)]',
      change: '+0%',
      trend: 'neutral',
    },
    {
      title: 'Items',
      value: '0',
      description: 'Total items in BOM',
      icon: Package,
      gradient: 'from-[var(--accent-green)] to-emerald-600',
      change: '+0',
      trend: 'neutral',
    },
    {
      title: 'Versions',
      value: '0',
      description: 'Version snapshots',
      icon: Clock,
      gradient: 'from-[var(--accent-orange)] to-[var(--accent-orange-hover)]',
      change: '0 active',
      trend: 'neutral',
    },
    {
      title: 'Pending Quotes',
      value: '0',
      description: 'Awaiting approval',
      icon: FileCheck,
      gradient: 'from-[var(--accent-red)] to-rose-600',
      change: '0 pending',
      trend: 'neutral',
    },
  ];

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">{project.name}</h1>
        <div className="flex items-center gap-4">
          <p className="text-[var(--text-secondary)] text-lg">{project.code}</p>
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
        {project.description && (
          <p className="text-[var(--text-secondary)] mt-2 max-w-2xl">{project.description}</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="relative overflow-hidden border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm hover:bg-[var(--bg-secondary)]/70 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent-blue)]/10 hover:-translate-y-1"
            >
              <div className={cn('absolute top-0 right-0 w-32 h-32 bg-gradient-to-br', stat.gradient, 'opacity-10 blur-2xl')} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
                  {stat.title}
                </CardTitle>
                <div className={cn('p-2 rounded-lg bg-gradient-to-br', stat.gradient, 'opacity-20')}>
                  <Icon className={cn('h-5 w-5 text-white')} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-tertiary)]">{stat.description}</span>
                </div>
                {stat.change && (
                  <div className="flex items-center gap-1 text-xs pt-1">
                    <TrendingUp className="h-3 w-3 text-[var(--text-tertiary)]" />
                    <span className="text-[var(--text-tertiary)]">{stat.change}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Project Overview - Takes 2 columns */}
        <Card className="lg:col-span-2 border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--accent-blue)]" />
              <CardTitle>Project Overview</CardTitle>
            </div>
            <CardDescription>Project details and recent activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                <span className="text-sm text-[var(--text-secondary)]">Status</span>
                <span className="text-sm font-medium capitalize">{project.status}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                <span className="text-sm text-[var(--text-secondary)]">Created</span>
                <span className="text-sm font-medium">
                  {project.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--text-secondary)]">Last Updated</span>
                <span className="text-sm font-medium">
                  {project.updatedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <button className="group w-full text-left px-4 py-3 rounded-lg bg-[var(--bg-tertiary)]/50 hover:bg-gradient-to-r hover:from-[var(--accent-blue)]/10 hover:to-[var(--accent-blue-light)]/10 border border-transparent hover:border-[var(--accent-blue)]/20 transition-all text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] transition-colors" />
              <span>Import BOM Data</span>
            </button>
            <button className="group w-full text-left px-4 py-3 rounded-lg bg-[var(--bg-tertiary)]/50 hover:bg-gradient-to-r hover:from-[var(--accent-blue)]/10 hover:to-[var(--accent-blue-light)]/10 border border-transparent hover:border-[var(--accent-blue)]/20 transition-all text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] transition-colors" />
              <span>Create Version</span>
            </button>
            <button className="group w-full text-left px-4 py-3 rounded-lg bg-[var(--bg-tertiary)]/50 hover:bg-gradient-to-r hover:from-[var(--accent-blue)]/10 hover:to-[var(--accent-blue-light)]/10 border border-transparent hover:border-[var(--accent-blue)]/20 transition-all text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] transition-colors" />
              <span>View Cost Analysis</span>
            </button>
            <button 
              onClick={handleDeleteClick}
              className="group w-full text-left px-4 py-3 rounded-lg bg-[var(--bg-tertiary)]/50 hover:bg-gradient-to-r hover:from-[var(--accent-red)]/10 hover:to-[var(--accent-red)]/20 border border-transparent hover:border-[var(--accent-red)]/20 transition-all text-sm font-medium flex items-center gap-2 mt-2"
            >
              <Trash2 className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-red)] transition-colors" />
              <span className="text-[var(--accent-red)]">Delete Project</span>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--text-primary)]">Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-secondary)]">
              Are you sure you want to delete "{project?.name}"? This action cannot be undone and will permanently delete the project and all associated data including BOM items, versions, quotes, and manufacturing logs.
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

