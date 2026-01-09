'use client';

import { useRouter } from 'next/navigation';
import { FolderKanban, Calendar, ArrowRight, CheckSquare, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Project } from '@/types';
import { GateProgressBar } from '@/components/projects/GatesTimeline';
import { RiskDot } from '@/components/projects/RiskIndicator';

interface ProjectCardProps {
  project: Project;
  taskCount?: number;
  overdueTaskCount?: number;
  compact?: boolean;
}

export function ProjectCard({ project, taskCount = 0, overdueTaskCount = 0, compact = false }: ProjectCardProps) {
  const router = useRouter();

  if (compact) {
    return (
      <div
        onClick={() => router.push(`/project/${project.id}`)}
        className="group cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-3 hover:bg-[var(--bg-secondary)]/70 transition-all duration-200 hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-gradient-to-br from-[var(--accent-blue)]/20 to-[var(--accent-blue-light)]/20">
            <FolderKanban className="h-4 w-4 text-[var(--accent-blue)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate group-hover:text-[var(--accent-blue)] transition-colors">
              {project.name}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] font-mono">{project.code}</div>
          </div>
          <div className="flex items-center gap-2">
            {overdueTaskCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-[var(--accent-red)]">
                <AlertTriangle className="h-3 w-3" />
                {overdueTaskCount}
              </div>
            )}
            {taskCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                <CheckSquare className="h-3 w-3" />
                {taskCount}
              </div>
            )}
            <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] group-hover:translate-x-1 transition-all" />
          </div>
        </div>
        {project.gates && (
          <div className="mt-2">
            <GateProgressBar gates={project.gates} />
          </div>
        )}
      </div>
    );
  }

  return (
    <Card
      onClick={() => router.push(`/project/${project.id}`)}
      className="group cursor-pointer border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm hover:bg-[var(--bg-secondary)]/70 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--accent-blue)]/10 hover:-translate-y-1 overflow-hidden relative"
    >
      {/* Gradient background effect */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[var(--accent-blue)]/10 to-[var(--accent-orange)]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
      
      <CardHeader className="relative pb-2">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--accent-blue)]/20 to-[var(--accent-blue-light)]/20 group-hover:from-[var(--accent-blue)]/30 group-hover:to-[var(--accent-blue-light)]/30 transition-all">
            <FolderKanban className="h-5 w-5 text-[var(--accent-blue)]" />
          </div>
          <div className="flex items-center gap-3">
            {overdueTaskCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-xs font-medium">
                <AlertTriangle className="h-3 w-3" />
                {overdueTaskCount} overdue
              </div>
            )}
            {taskCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                <CheckSquare className="h-4 w-4" />
                {taskCount}
              </div>
            )}
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
  );
}
