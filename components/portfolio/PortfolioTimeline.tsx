'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import { CheckSquare, AlertTriangle } from 'lucide-react';

// PACE Gate definitions with order
const PACE_GATES = [
  { id: 'briefed', name: 'Briefed', shortName: 'B' },
  { id: 'dti', name: 'DTi', shortName: 'DTi' },
  { id: 'da', name: 'DA', shortName: 'DA' },
  { id: 'dtx', name: 'DTx', shortName: 'DTx' },
  { id: 'sprint', name: 'Sprint', shortName: 'S' },
  { id: 'dtl', name: 'DTL', shortName: 'DTL' },
  { id: 'massProduction', name: 'Mass Production', shortName: 'MP' },
  { id: 'dtc', name: 'DTC', shortName: 'DTC' },
] as const;

interface PortfolioTimelineProps {
  projects: Project[];
  taskCounts?: Record<string, number>;
  overdueCounts?: Record<string, number>;
}

export function PortfolioTimeline({ projects, taskCounts = {}, overdueCounts = {} }: PortfolioTimelineProps) {
  const router = useRouter();

  const getGateProgress = (project: Project, gateId: string): 'completed' | 'current' | 'upcoming' => {
    if (!project.gates) return 'upcoming';
    
    const gate = project.gates[gateId as keyof typeof project.gates];
    if (!gate) return 'upcoming';

    switch (gate.status) {
      case 'passed':
        return 'completed';
      case 'in_progress':
        return 'current';
      default:
        return 'upcoming';
    }
  };

  return (
    <div className="space-y-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center bg-[var(--bg-secondary)]/50 border-b border-[var(--border-subtle)]">
        <div className="w-64 px-4 py-3 border-r border-[var(--border-subtle)] font-semibold text-sm">
          Project
        </div>
        <div className="flex-1 flex">
          {PACE_GATES.map((gate) => (
            <div
              key={gate.id}
              className="flex-1 px-2 py-3 text-center text-xs font-medium text-[var(--text-secondary)] border-r border-[var(--border-subtle)] last:border-r-0"
            >
              <span className="hidden md:inline">{gate.name}</span>
              <span className="md:hidden">{gate.shortName}</span>
            </div>
          ))}
        </div>
        <div className="w-24 px-4 py-3 text-center text-xs font-medium text-[var(--text-secondary)]">
          Tasks
        </div>
      </div>

      {/* Project Rows */}
      {projects.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-tertiary)]">
          No projects found
        </div>
      ) : (
        projects.map((project) => (
          <div
            key={project.id}
            onClick={() => router.push(`/project/${project.id}`)}
            className="flex items-center hover:bg-[var(--bg-tertiary)]/30 cursor-pointer transition-colors"
          >
            {/* Project Name */}
            <div className="w-64 px-4 py-3 border-r border-[var(--border-subtle)]">
              <div className="font-medium text-sm truncate">{project.name}</div>
              <div className="text-xs text-[var(--text-tertiary)] font-mono">{project.code}</div>
            </div>

            {/* Gates Progress */}
            <div className="flex-1 flex items-center">
              {PACE_GATES.map((gate, index) => {
                const progress = getGateProgress(project, gate.id);
                
                return (
                  <div
                    key={gate.id}
                    className="flex-1 flex items-center justify-center py-3 border-r border-[var(--border-subtle)] last:border-r-0"
                  >
                    {/* Line before */}
                    {index > 0 && (
                      <div
                        className={cn(
                          'h-0.5 flex-1',
                          progress === 'completed' || progress === 'current'
                            ? 'bg-[var(--accent-green)]'
                            : 'bg-[var(--border-subtle)]'
                        )}
                      />
                    )}
                    
                    {/* Gate Marker */}
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full flex-shrink-0 border-2 transition-all',
                        progress === 'completed'
                          ? 'bg-[var(--accent-green)] border-[var(--accent-green)]'
                          : progress === 'current'
                          ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/30'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)]'
                      )}
                    />
                    
                    {/* Line after */}
                    {index < PACE_GATES.length - 1 && (
                      <div
                        className={cn(
                          'h-0.5 flex-1',
                          getGateProgress(project, PACE_GATES[index + 1].id) !== 'upcoming'
                            ? 'bg-[var(--accent-green)]'
                            : 'bg-[var(--border-subtle)]'
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Task Count */}
            <div className="w-24 px-4 py-3 flex items-center justify-center gap-2">
              {overdueCounts[project.id] > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-[var(--accent-red)]">
                  <AlertTriangle className="h-3 w-3" />
                  {overdueCounts[project.id]}
                </span>
              )}
              <span className="flex items-center gap-0.5 text-xs text-[var(--text-tertiary)]">
                <CheckSquare className="h-3 w-3" />
                {taskCounts[project.id] || 0}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
