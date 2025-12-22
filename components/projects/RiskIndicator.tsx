'use client';

import { cn } from '@/lib/utils';
import { ProjectMetrics } from '@/types';
import { AlertTriangle, Shield, ShieldAlert, ShieldX } from 'lucide-react';

interface RiskIndicatorProps {
  riskLevel: ProjectMetrics['riskLevel'];
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RISK_CONFIG = {
  low: {
    icon: Shield,
    color: 'text-[var(--accent-green)]',
    bgColor: 'bg-[var(--accent-green)]/20',
    borderColor: 'border-[var(--accent-green)]/30',
    label: 'Low Risk',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-[var(--accent-orange)]',
    bgColor: 'bg-[var(--accent-orange)]/20',
    borderColor: 'border-[var(--accent-orange)]/30',
    label: 'Medium Risk',
  },
  high: {
    icon: ShieldAlert,
    color: 'text-[var(--accent-red)]',
    bgColor: 'bg-[var(--accent-red)]/20',
    borderColor: 'border-[var(--accent-red)]/30',
    label: 'High Risk',
  },
  critical: {
    icon: ShieldX,
    color: 'text-[var(--accent-red)]',
    bgColor: 'bg-[var(--accent-red)]/30',
    borderColor: 'border-[var(--accent-red)]/50',
    label: 'Critical Risk',
  },
};

const SIZE_CONFIG = {
  sm: { icon: 'h-3 w-3', padding: 'px-1.5 py-0.5', text: 'text-[10px]' },
  md: { icon: 'h-4 w-4', padding: 'px-2 py-1', text: 'text-xs' },
  lg: { icon: 'h-5 w-5', padding: 'px-3 py-1.5', text: 'text-sm' },
};

export function RiskIndicator({ riskLevel, showLabel = true, size = 'md' }: RiskIndicatorProps) {
  const config = RISK_CONFIG[riskLevel];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <div className={cn(
      'inline-flex items-center gap-1 rounded-full border',
      config.bgColor,
      config.borderColor,
      sizeConfig.padding
    )}>
      <Icon className={cn(sizeConfig.icon, config.color)} />
      {showLabel && (
        <span className={cn(sizeConfig.text, config.color, 'font-medium')}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// Simple colored dot version
export function RiskDot({ riskLevel }: { riskLevel: ProjectMetrics['riskLevel'] }) {
  const colorMap = {
    low: 'bg-[var(--accent-green)]',
    medium: 'bg-[var(--accent-orange)]',
    high: 'bg-[var(--accent-red)]',
    critical: 'bg-[var(--accent-red)] animate-pulse',
  };

  return (
    <span className={cn('inline-block w-2 h-2 rounded-full', colorMap[riskLevel])} />
  );
}


