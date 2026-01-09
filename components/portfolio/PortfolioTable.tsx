'use client';

import { useRouter } from 'next/navigation';
import { Project } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckSquare, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GateProgressBar } from '@/components/projects/GatesTimeline';
import { RiskDot } from '@/components/projects/RiskIndicator';

interface PortfolioTableProps {
  projects: Project[];
  taskCounts?: Record<string, number>;
  overdueCounts?: Record<string, number>;
}

export function PortfolioTable({ projects, taskCounts = {}, overdueCounts = {} }: PortfolioTableProps) {
  const router = useRouter();

  const getCurrentGate = (project: Project): string => {
    if (!project.gates) return 'Not Started';
    
    const gateOrder = ['dtc', 'massProduction', 'dtl', 'sprint', 'dtx', 'da', 'dti', 'briefed'];
    
    for (const gateId of gateOrder) {
      const gate = project.gates[gateId as keyof typeof project.gates];
      if (gate && gate.status !== 'not_started') {
        return gateId.toUpperCase().replace(/([A-Z])/g, ' $1').trim();
      }
    }
    
    return 'Not Started';
  };

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)]/50">
            <TableHead className="w-[250px]">Project</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Current Gate</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-center">Tasks</TableHead>
            <TableHead className="text-center">Risk</TableHead>
            <TableHead className="text-center">Confidence</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center text-[var(--text-tertiary)]">
                No projects found
              </TableCell>
            </TableRow>
          ) : (
            projects.map((project) => (
              <TableRow
                key={project.id}
                onClick={() => router.push(`/project/${project.id}`)}
                className="cursor-pointer hover:bg-[var(--bg-secondary)]/50"
              >
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell className="font-mono text-sm text-[var(--text-secondary)]">
                  {project.code}
                </TableCell>
                <TableCell>{getCurrentGate(project)}</TableCell>
                <TableCell className="w-48">
                  {project.gates && <GateProgressBar gates={project.gates} />}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-3">
                    {overdueCounts[project.id] > 0 && (
                      <span className="flex items-center gap-1 text-[var(--accent-red)]">
                        <AlertTriangle className="h-4 w-4" />
                        {overdueCounts[project.id]}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
                      <CheckSquare className="h-4 w-4" />
                      {taskCounts[project.id] || 0}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {project.metrics && (
                    <div className="flex items-center justify-center gap-1.5">
                      <RiskDot riskLevel={project.metrics.riskLevel} />
                      <span className="text-xs capitalize text-[var(--text-tertiary)]">
                        {project.metrics.riskLevel}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {project.metrics && (
                    <span
                      className={cn(
                        'text-sm font-medium',
                        project.metrics.bomConfidence >= 80
                          ? 'text-[var(--accent-green)]'
                          : project.metrics.bomConfidence >= 50
                          ? 'text-[var(--accent-orange)]'
                          : 'text-[var(--accent-red)]'
                      )}
                    >
                      {Math.round(project.metrics.bomConfidence)}%
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'text-xs px-2 py-1 rounded-full font-medium border',
                      project.status === 'active'
                        ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)] border-[var(--accent-green)]/30'
                        : project.status === 'archived'
                        ? 'bg-[var(--text-tertiary)]/20 text-[var(--text-tertiary)] border-[var(--text-tertiary)]/30'
                        : 'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] border-[var(--accent-orange)]/30'
                    )}
                  >
                    {project.status}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
