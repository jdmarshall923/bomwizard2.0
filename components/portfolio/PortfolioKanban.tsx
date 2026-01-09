'use client';

import { useMemo } from 'react';
import { Project } from '@/types';
import { ProjectCard } from './ProjectCard';
import { cn } from '@/lib/utils';

// PACE Gate definitions
const PACE_GATES = [
  { id: 'briefed', name: 'Briefed', color: 'var(--text-tertiary)' },
  { id: 'dti', name: 'DTi', color: 'var(--accent-blue)' },
  { id: 'da', name: 'DA', color: 'var(--accent-blue)' },
  { id: 'dtx', name: 'DTx', color: 'var(--accent-purple)' },
  { id: 'sprint', name: 'Sprint', color: 'var(--accent-green)' },
  { id: 'dtl', name: 'DTL', color: 'var(--accent-orange)' },
  { id: 'massProduction', name: 'Mass Production', color: 'var(--accent-red)' },
  { id: 'dtc', name: 'DTC', color: 'var(--accent-pink)' },
] as const;

interface PortfolioKanbanProps {
  projects: Project[];
  taskCounts?: Record<string, number>;
  overdueCounts?: Record<string, number>;
}

export function PortfolioKanban({ projects, taskCounts = {}, overdueCounts = {} }: PortfolioKanbanProps) {
  // Group projects by their current PACE gate
  const projectsByGate = useMemo(() => {
    const grouped: Record<string, Project[]> = {};
    
    // Initialize all gates with empty arrays
    PACE_GATES.forEach(gate => {
      grouped[gate.id] = [];
    });
    grouped['no-gate'] = []; // For projects without gates

    for (const project of projects) {
      // Find the current gate (last completed gate)
      let currentGate = 'no-gate';
      
      if (project.gates) {
        // Find the last gate that's not in 'not_started' status
        for (const gate of PACE_GATES) {
          const projectGate = project.gates[gate.id as keyof typeof project.gates];
          if (projectGate && projectGate.status !== 'not_started') {
            currentGate = gate.id;
          }
        }
      }

      if (!grouped[currentGate]) {
        grouped[currentGate] = [];
      }
      grouped[currentGate].push(project);
    }

    return grouped;
  }, [projects]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {PACE_GATES.map((gate) => {
        const gateProjects = projectsByGate[gate.id] || [];
        
        return (
          <div
            key={gate.id}
            className="flex-shrink-0 w-80 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: gate.color }}
                />
                <h3 className="font-semibold text-sm">{gate.name}</h3>
              </div>
              <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
                {gateProjects.length}
              </span>
            </div>

            {/* Column Content */}
            <div className="p-3 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {gateProjects.length === 0 ? (
                <div className="text-center py-8 text-sm text-[var(--text-tertiary)]">
                  No projects
                </div>
              ) : (
                gateProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    taskCount={taskCounts[project.id]}
                    overdueTaskCount={overdueCounts[project.id]}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* No Gate Column */}
      {projectsByGate['no-gate']?.length > 0 && (
        <div className="flex-shrink-0 w-80 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 border-dashed">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--text-tertiary)]" />
              <h3 className="font-semibold text-sm text-[var(--text-tertiary)]">No Gate</h3>
            </div>
            <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
              {projectsByGate['no-gate'].length}
            </span>
          </div>
          <div className="p-3 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            {projectsByGate['no-gate'].map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={taskCounts[project.id]}
                overdueTaskCount={overdueCounts[project.id]}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
