'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Package, 
  Layers, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Truck,
  Wrench,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CostSummary } from '@/lib/bom/costAnalysisService';
import { cn } from '@/lib/utils';

interface CostSummaryCardsProps {
  currentCost: CostSummary | null;
  overallChange: number | null;
  overallChangePercent: number | null;
  placeholderRisk: number;
  newPartRisk: number;
  priceConfidence: number;
  isLoading?: boolean;
}

function formatCurrency(value: number, compact: boolean = false): string {
  if (compact) {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(1)}K`;
    }
  }
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  badge,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  badge?: string;
}) {
  const variantStyles = {
    default: 'from-[var(--bg-tertiary)] to-[var(--bg-secondary)]',
    success: 'from-emerald-900/40 to-emerald-950/20',
    warning: 'from-amber-900/40 to-amber-950/20',
    danger: 'from-red-900/40 to-red-950/20',
    primary: 'from-blue-900/40 to-blue-950/20',
  };
  
  const iconStyles = {
    default: 'text-[var(--text-secondary)]',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    primary: 'text-blue-400',
  };

  return (
    <Card className={cn(
      'relative overflow-hidden border-[var(--border-subtle)] bg-gradient-to-br',
      variantStyles[variant]
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                {title}
              </p>
              {badge && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
            {subtitle && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={cn(
                'flex items-center gap-1 mt-2 text-xs font-medium',
                trend === 'up' && 'text-red-400',
                trend === 'down' && 'text-emerald-400',
                trend === 'neutral' && 'text-[var(--text-secondary)]'
              )}>
                {trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={cn(
            'p-2.5 rounded-xl bg-[var(--bg-primary)]/50',
            iconStyles[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CostBreakdownCard({
  materialCost,
  landingCost,
  labourCost,
  totalCost,
}: {
  materialCost: number;
  landingCost: number;
  labourCost: number;
  totalCost: number;
}) {
  const segments = [
    { label: 'Material', value: materialCost, color: 'bg-blue-500', icon: Package },
    { label: 'Landing', value: landingCost, color: 'bg-orange-500', icon: Truck },
    { label: 'Labour', value: labourCost, color: 'bg-emerald-500', icon: Wrench },
  ];

  return (
    <Card className="border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Cost Breakdown
          </p>
          <CircleDollarSign className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
        
        {/* Stacked Bar */}
        <div className="h-3 rounded-full overflow-hidden flex mb-4 bg-[var(--bg-primary)]">
          {segments.map((segment, idx) => {
            const width = totalCost > 0 ? (segment.value / totalCost) * 100 : 0;
            return (
              <div
                key={segment.label}
                className={cn(segment.color, 'transition-all duration-500')}
                style={{ width: `${width}%` }}
              />
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-3 gap-2">
          {segments.map((segment) => {
            const Icon = segment.icon;
            const percent = totalCost > 0 ? (segment.value / totalCost) * 100 : 0;
            return (
              <div key={segment.label} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <div className={cn('w-2 h-2 rounded-full', segment.color)} />
                  <span className="text-[10px] text-[var(--text-secondary)]">{segment.label}</span>
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatCurrency(segment.value, true)}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {percent.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskIndicator({
  placeholderRisk,
  newPartRisk,
  priceConfidence,
}: {
  placeholderRisk: number;
  newPartRisk: number;
  priceConfidence: number;
}) {
  // Determine overall risk level
  const overallRisk = Math.max(placeholderRisk, 100 - priceConfidence);
  const riskLevel = overallRisk < 20 ? 'low' : overallRisk < 50 ? 'medium' : 'high';
  
  const riskColors = {
    low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  };

  return (
    <Card className="border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Price Confidence
          </p>
          <ShieldCheck className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
        
        {/* Confidence Score */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            riskColors[riskLevel].bg,
            'border',
            riskColors[riskLevel].border
          )}>
            <span className={cn('text-lg font-bold', riskColors[riskLevel].text)}>
              {Math.round(priceConfidence)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {riskLevel === 'low' && 'High Confidence'}
              {riskLevel === 'medium' && 'Moderate Confidence'}
              {riskLevel === 'high' && 'Low Confidence'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {priceConfidence.toFixed(1)}% priced from contracts/quotes
            </p>
          </div>
        </div>
        
        {/* Risk Factors */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span className="text-[var(--text-secondary)]">Placeholder Risk</span>
            </div>
            <span className={cn(
              'font-medium',
              placeholderRisk > 30 ? 'text-red-400' : placeholderRisk > 10 ? 'text-amber-400' : 'text-emerald-400'
            )}>
              {placeholderRisk.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-blue-400" />
              <span className="text-[var(--text-secondary)]">New Parts</span>
            </div>
            <span className={cn(
              'font-medium',
              newPartRisk > 30 ? 'text-amber-400' : 'text-[var(--text-primary)]'
            )}>
              {newPartRisk.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CostSummaryCards({
  currentCost,
  overallChange,
  overallChangePercent,
  placeholderRisk,
  newPartRisk,
  priceConfidence,
  isLoading = false,
}: CostSummaryCardsProps) {
  if (isLoading || !currentCost) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-[var(--border-subtle)] animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-[var(--bg-tertiary)] rounded w-20 mb-2" />
              <div className="h-8 bg-[var(--bg-tertiary)] rounded w-32 mb-1" />
              <div className="h-3 bg-[var(--bg-tertiary)] rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const trend = overallChange !== null 
    ? overallChange > 0 ? 'up' : overallChange < 0 ? 'down' : 'neutral'
    : undefined;
  
  const trendValue = overallChangePercent !== null
    ? `${overallChange! >= 0 ? '+' : ''}${formatCurrency(overallChange!, true)} (${overallChangePercent.toFixed(1)}%)`
    : undefined;

  return (
    <div className="space-y-4">
      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cost"
          value={formatCurrency(currentCost.totalCost)}
          subtitle={`${currentCost.itemCount} items across ${currentCost.assemblyCount} assemblies`}
          icon={DollarSign}
          trend={trend}
          trendValue={trendValue}
          variant="primary"
          badge="Current"
        />
        
        <StatCard
          title="Items"
          value={currentCost.itemCount.toLocaleString()}
          subtitle={`${currentCost.assemblyCount} assemblies`}
          icon={Package}
          variant="default"
        />
        
        <CostBreakdownCard
          materialCost={currentCost.materialCost}
          landingCost={currentCost.landingCost}
          labourCost={currentCost.labourCost}
          totalCost={currentCost.totalCost}
        />
        
        <RiskIndicator
          placeholderRisk={placeholderRisk}
          newPartRisk={newPartRisk}
          priceConfidence={priceConfidence}
        />
      </div>
      
      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Contract Priced"
          value={formatCurrency(currentCost.costBySource.contract, true)}
          subtitle={`${currentCost.costBySource.contract > 0 ? Math.round((currentCost.costBySource.contract / currentCost.totalCost) * 100) : 0}% of total`}
          icon={CheckCircle2}
          variant="success"
        />
        
        <StatCard
          title="Quoted"
          value={formatCurrency(currentCost.costBySource.quote, true)}
          subtitle={`${currentCost.costBySource.quote > 0 ? Math.round((currentCost.costBySource.quote / currentCost.totalCost) * 100) : 0}% of total`}
          icon={CheckCircle2}
          variant="success"
        />
        
        <StatCard
          title="Estimated"
          value={formatCurrency(currentCost.costBySource.estimate, true)}
          subtitle={`${currentCost.costBySource.estimate > 0 ? Math.round((currentCost.costBySource.estimate / currentCost.totalCost) * 100) : 0}% of total`}
          icon={AlertTriangle}
          variant="warning"
        />
        
        <StatCard
          title="Placeholder"
          value={formatCurrency(currentCost.costBySource.placeholder, true)}
          subtitle={`${currentCost.placeholderCount} items`}
          icon={AlertTriangle}
          variant={currentCost.costBySource.placeholder > 0 ? 'danger' : 'default'}
        />
      </div>
    </div>
  );
}



