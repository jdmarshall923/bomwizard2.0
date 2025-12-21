'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProjectMetrics } from '@/types';
import { RiskIndicator } from './RiskIndicator';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  CheckCircle2,
  Zap,
  Factory
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsDashboardProps {
  metrics: ProjectMetrics;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof TrendingUp;
  iconColor: string;
  iconBg: string;
  progress?: number;
  progressColor?: string;
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor, 
  iconBg,
  progress,
  progressColor = 'bg-[var(--accent-blue)]'
}: MetricCardProps) {
  return (
    <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-lg', iconBg)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
        {subtitle && (
          <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtitle}</p>
        )}
        {progress !== undefined && (
          <div className="mt-3">
            <Progress 
              value={progress} 
              className="h-1.5 bg-[var(--bg-tertiary)]"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricsDashboard({ metrics, className }: MetricsDashboardProps) {
  const totalParts = metrics.partsOnTrack + metrics.partsAtRisk;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Top row: Key metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* BOM Confidence */}
        <MetricCard
          title="BOM Confidence"
          value={`${Math.round(metrics.bomConfidence)}%`}
          subtitle="Parts with confirmed pricing"
          icon={TrendingUp}
          iconColor="text-[var(--accent-blue)]"
          iconBg="bg-[var(--accent-blue)]/20"
          progress={metrics.bomConfidence}
        />

        {/* Risk Level */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Risk Level
            </CardTitle>
            <div className="p-2 rounded-lg bg-[var(--accent-red)]/20">
              <AlertTriangle className="h-4 w-4 text-[var(--accent-red)]" />
            </div>
          </CardHeader>
          <CardContent>
            <RiskIndicator riskLevel={metrics.riskLevel} size="lg" />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Based on parts at risk vs total parts
            </p>
          </CardContent>
        </Card>

        {/* Sprint Readiness */}
        <MetricCard
          title="Sprint Readiness"
          value={`${Math.round(metrics.sprintReadiness)}%`}
          subtitle="Parts ready for sprint run"
          icon={Zap}
          iconColor="text-[var(--accent-orange)]"
          iconBg="bg-[var(--accent-orange)]/20"
          progress={metrics.sprintReadiness}
          progressColor="bg-[var(--accent-orange)]"
        />

        {/* Mass Production Readiness */}
        <MetricCard
          title="Mass Prod Readiness"
          value={`${Math.round(metrics.massProductionReadiness)}%`}
          subtitle="Parts ready for mass production"
          icon={Factory}
          iconColor="text-[var(--accent-green)]"
          iconBg="bg-[var(--accent-green)]/20"
          progress={metrics.massProductionReadiness}
          progressColor="bg-[var(--accent-green)]"
        />
      </div>

      {/* Second row: Parts breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Parts On Track */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Parts On Track
            </CardTitle>
            <div className="p-2 rounded-lg bg-[var(--accent-green)]/20">
              <CheckCircle2 className="h-4 w-4 text-[var(--accent-green)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[var(--accent-green)]">
                {metrics.partsOnTrack}
              </span>
              <span className="text-sm text-[var(--text-tertiary)]">
                / {totalParts} parts
              </span>
            </div>
            <div className="mt-3">
              <Progress 
                value={totalParts > 0 ? (metrics.partsOnTrack / totalParts) * 100 : 0} 
                className="h-2 bg-[var(--bg-tertiary)]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Parts At Risk */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Parts At Risk
            </CardTitle>
            <div className="p-2 rounded-lg bg-[var(--accent-red)]/20">
              <Package className="h-4 w-4 text-[var(--accent-red)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                'text-3xl font-bold',
                metrics.partsAtRisk > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--text-tertiary)]'
              )}>
                {metrics.partsAtRisk}
              </span>
              <span className="text-sm text-[var(--text-tertiary)]">
                parts need attention
              </span>
            </div>
            {metrics.partsAtRisk > 0 && (
              <p className="text-xs text-[var(--accent-red)] mt-2">
                These parts may not arrive on time for upcoming gates
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Compact version for sidebar or small spaces
export function MetricsSummary({ metrics }: { metrics: ProjectMetrics }) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <span className="text-[var(--text-tertiary)]">Confidence:</span>
        <span className={cn(
          'font-medium',
          metrics.bomConfidence >= 80 ? 'text-[var(--accent-green)]' :
          metrics.bomConfidence >= 50 ? 'text-[var(--accent-orange)]' :
          'text-[var(--accent-red)]'
        )}>
          {Math.round(metrics.bomConfidence)}%
        </span>
      </div>
      <RiskIndicator riskLevel={metrics.riskLevel} size="sm" />
    </div>
  );
}

