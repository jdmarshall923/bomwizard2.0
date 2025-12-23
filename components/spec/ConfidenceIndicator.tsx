'use client';

import { cn } from '@/lib/utils';
import { 
  getConfidenceLevel, 
  getConfidenceColor,
  CONFIDENCE_THRESHOLDS 
} from '@/types/spec';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2,
  HelpCircle 
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfidenceIndicatorProps {
  score: number;
  usageCount?: number;
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function ConfidenceIndicator({ 
  score, 
  usageCount,
  showLabel = true,
  size = 'default',
  className 
}: ConfidenceIndicatorProps) {
  const level = getConfidenceLevel(score);
  
  const config = {
    none: {
      Icon: HelpCircle,
      label: 'No Data',
      description: 'No mapping found for this option',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    low: {
      Icon: AlertCircle,
      label: 'Low Confidence',
      description: 'Few uses - verify selections carefully',
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    medium: {
      Icon: AlertTriangle,
      label: 'Medium Confidence',
      description: 'Some usage history - review suggested groups',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
    },
    good: {
      Icon: CheckCircle,
      label: 'Good Confidence',
      description: 'Well-established mapping - likely correct',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    high: {
      Icon: CheckCircle2,
      label: 'High Confidence',
      description: 'Highly reliable - used many times consistently',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
    },
  };
  
  const { Icon, label, description, color, bgColor } = config[level];
  
  const sizeConfig = {
    sm: { icon: 14, text: 'text-xs', badge: 'px-1.5 py-0.5' },
    default: { icon: 16, text: 'text-sm', badge: 'px-2 py-1' },
    lg: { icon: 20, text: 'text-base', badge: 'px-3 py-1.5' },
  };
  
  const { icon: iconSize, text: textSize, badge: badgeSize } = sizeConfig[size];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md',
              badgeSize,
              bgColor,
              className
            )}
          >
            <Icon size={iconSize} className={color} />
            {showLabel && (
              <span className={cn(textSize, color, 'font-medium')}>
                {score > 0 ? `${score}%` : label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
            {usageCount !== undefined && usageCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Used {usageCount} time{usageCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ConfidenceBarProps {
  score: number;
  className?: string;
}

export function ConfidenceBar({ score, className }: ConfidenceBarProps) {
  const level = getConfidenceLevel(score);
  
  const colorConfig = {
    none: 'bg-muted',
    low: 'bg-red-500',
    medium: 'bg-amber-500',
    good: 'bg-blue-500',
    high: 'bg-emerald-500',
  };
  
  return (
    <div className={cn('w-full h-2 rounded-full bg-muted overflow-hidden', className)}>
      <div 
        className={cn('h-full transition-all duration-300', colorConfig[level])}
        style={{ width: `${Math.max(score, 5)}%` }}
      />
    </div>
  );
}

