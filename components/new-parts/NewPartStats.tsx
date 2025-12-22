'use client';

import { NewPartStats } from '@/types/newPart';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Rocket,
  TrendingUp,
} from 'lucide-react';

interface NewPartStatsProps {
  stats: NewPartStats;
  isLoading?: boolean;
}

export function NewPartStatsCards({ stats, isLoading }: NewPartStatsProps) {
  const statCards = [
    {
      title: 'Total Parts',
      value: stats.total,
      icon: Package,
      gradient: 'from-[var(--accent-blue)] to-[var(--accent-blue-light)]',
      description: 'New parts being tracked',
    },
    {
      title: 'In Progress',
      value: stats.byStatus.design + stats.byStatus.engineering + stats.byStatus.procurement,
      icon: Clock,
      gradient: 'from-purple-500 to-purple-400',
      description: 'Currently in workflow',
    },
    {
      title: 'Completed',
      value: stats.byStatus.complete,
      icon: CheckCircle2,
      gradient: 'from-[var(--accent-green)] to-emerald-400',
      description: 'Parts with final B-code',
    },
    {
      title: 'This Week',
      value: stats.completedThisWeek,
      icon: TrendingUp,
      gradient: 'from-cyan-500 to-cyan-400',
      description: 'Completed this week',
    },
    {
      title: 'Critical',
      value: stats.byPriority.critical,
      icon: AlertTriangle,
      gradient: 'from-[var(--accent-red)] to-rose-400',
      description: 'Need immediate attention',
    },
    {
      title: 'Awaiting Start',
      value: stats.byStatus.added + stats.byStatus.pending,
      icon: Rocket,
      gradient: 'from-[var(--accent-orange)] to-amber-400',
      description: 'Ready to begin',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((_, idx) => (
          <Card
            key={idx}
            className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm"
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                <div className="h-8 w-12 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                <div className="h-3 w-24 bg-[var(--bg-tertiary)] rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className="relative overflow-hidden border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm hover:bg-[var(--bg-secondary)]/70 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div
              className={cn(
                'absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-10 blur-2xl',
                stat.gradient
              )}
            />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                  <p className="text-xs text-[var(--text-tertiary)]">{stat.description}</p>
                </div>
                <div
                  className={cn(
                    'p-2 rounded-lg bg-gradient-to-br opacity-20',
                    stat.gradient
                  )}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface NewPartProgressProps {
  stats: NewPartStats;
}

export function NewPartProgress({ stats }: NewPartProgressProps) {
  const stages = [
    { name: 'Added', count: stats.byStatus.added, color: 'var(--accent-blue)' },
    { name: 'Design', count: stats.byStatus.design, color: '#a855f7' },
    { name: 'Engineering', count: stats.byStatus.engineering, color: '#22d3ee' },
    { name: 'Procurement', count: stats.byStatus.procurement, color: 'var(--accent-orange)' },
    { name: 'Complete', count: stats.byStatus.complete, color: 'var(--accent-green)' },
  ];

  const total = stages.reduce((sum, stage) => sum + stage.count, 0);

  if (total === 0) return null;

  return (
    <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Pipeline Overview</h3>
          <span className="text-xs text-[var(--text-tertiary)]">{total} total parts</span>
        </div>

        {/* Stacked Bar */}
        <div className="h-4 rounded-full overflow-hidden bg-[var(--bg-tertiary)] flex">
          {stages.map((stage) => {
            const percentage = (stage.count / total) * 100;
            if (percentage === 0) return null;
            return (
              <div
                key={stage.name}
                className="h-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: stage.color,
                }}
                title={`${stage.name}: ${stage.count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3">
          {stages.map((stage) => (
            <div key={stage.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {stage.name}: <span className="font-medium">{stage.count}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}



