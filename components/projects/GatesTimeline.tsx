'use client';

import { cn } from '@/lib/utils';
import { ProjectGates, GateStatus, GATE_METADATA, GateKey } from '@/types';
import { 
  CheckCircle2, 
  Circle, 
  PlayCircle, 
  XCircle, 
  SkipForward 
} from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GatesTimelineProps {
  gates: ProjectGates;
  onGateClick?: (gateKey: GateKey) => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<GateStatus, { icon: typeof CheckCircle2; color: string; bgColor: string; borderColor: string }> = {
  not_started: { 
    icon: Circle, 
    color: 'text-[var(--text-tertiary)]', 
    bgColor: 'bg-[var(--bg-tertiary)]',
    borderColor: 'border-[var(--border-subtle)]'
  },
  in_progress: { 
    icon: PlayCircle, 
    color: 'text-[var(--accent-blue)]', 
    bgColor: 'bg-[var(--accent-blue)]',
    borderColor: 'border-[var(--accent-blue)]'
  },
  passed: { 
    icon: CheckCircle2, 
    color: 'text-[var(--accent-green)]', 
    bgColor: 'bg-[var(--accent-green)]',
    borderColor: 'border-[var(--accent-green)]'
  },
  failed: { 
    icon: XCircle, 
    color: 'text-[var(--accent-red)]', 
    bgColor: 'bg-[var(--accent-red)]',
    borderColor: 'border-[var(--accent-red)]'
  },
  skipped: { 
    icon: SkipForward, 
    color: 'text-[var(--accent-orange)]', 
    bgColor: 'bg-[var(--accent-orange)]',
    borderColor: 'border-[var(--accent-orange)]'
  },
};

export function GatesTimeline({ gates, onGateClick, compact = false }: GatesTimelineProps) {
  const gateKeys = GATE_METADATA.map(m => m.key);

  // Calculate progress percentage
  const passedCount = gateKeys.filter(key => gates[key].status === 'passed').length;
  const progressPercent = (passedCount / gateKeys.length) * 100;

  // Find current gate (first in_progress or first not_started after passed gates)
  const currentGateIndex = gateKeys.findIndex(key => gates[key].status === 'in_progress');
  const nextGateIndex = currentGateIndex === -1 
    ? gateKeys.findIndex(key => gates[key].status === 'not_started')
    : currentGateIndex;

  return (
    <TooltipProvider>
      <div className={cn('w-full', compact ? 'py-2' : 'py-4')}>
        {/* Progress bar background */}
        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-[var(--border-subtle)]" />
          
          {/* Progress fill */}
          <div 
            className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-blue)] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Gate nodes */}
          <div className="relative flex justify-between">
            {GATE_METADATA.map((meta, index) => {
              const gate = gates[meta.key];
              const config = STATUS_CONFIG[gate.status];
              const StatusIcon = config.icon;
              const targetDate = gate.date?.toDate?.();
              const isClickable = !!onGateClick;
              const isCurrent = index === nextGateIndex && gate.status !== 'passed';

              return (
                <Tooltip key={meta.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onGateClick?.(meta.key)}
                      disabled={!isClickable}
                      className={cn(
                        'relative flex flex-col items-center group',
                        isClickable && 'cursor-pointer',
                        !isClickable && 'cursor-default'
                      )}
                    >
                      {/* Node */}
                      <div className={cn(
                        'relative z-10 flex items-center justify-center rounded-full border-2 transition-all duration-300',
                        compact ? 'w-6 h-6' : 'w-10 h-10',
                        config.borderColor,
                        gate.status === 'passed' || gate.status === 'in_progress' 
                          ? config.bgColor 
                          : 'bg-[var(--bg-primary)]',
                        isCurrent && 'ring-4 ring-[var(--accent-blue)]/30 animate-pulse',
                        isClickable && 'hover:scale-110'
                      )}>
                        <StatusIcon className={cn(
                          compact ? 'h-3 w-3' : 'h-5 w-5',
                          gate.status === 'passed' || gate.status === 'in_progress'
                            ? 'text-white'
                            : config.color
                        )} />
                      </div>

                      {/* Labels (hidden in compact mode) */}
                      {!compact && (
                        <div className="mt-2 text-center">
                          <p className={cn(
                            'text-xs font-medium',
                            isCurrent ? 'text-[var(--accent-blue)]' : 'text-[var(--text-primary)]'
                          )}>
                            {meta.name}
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">
                            {targetDate ? format(targetDate, 'MMM d') : '—'}
                          </p>
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                  >
                    <div className="text-center">
                      <p className="font-semibold">{meta.fullName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{meta.description}</p>
                      {targetDate && (
                        <p className="text-xs text-[var(--accent-blue)] mt-1">
                          Target: {format(targetDate, 'MMM d, yyyy')}
                        </p>
                      )}
                      {gate.completedAt && (
                        <p className="text-xs text-[var(--accent-green)] mt-1">
                          Completed: {format(gate.completedAt.toDate(), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Legend (only in full mode) */}
        {!compact && (
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-[var(--text-tertiary)]">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-[var(--accent-green)]" />
              <span>Passed</span>
            </div>
            <div className="flex items-center gap-1">
              <PlayCircle className="h-3 w-3 text-[var(--accent-blue)]" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="h-3 w-3 text-[var(--text-tertiary)]" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-[var(--accent-red)]" />
              <span>Failed</span>
            </div>
            <div className="flex items-center gap-1">
              <SkipForward className="h-3 w-3 text-[var(--accent-orange)]" />
              <span>Skipped</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Compact version for project cards
export function GateProgressBar({ gates }: { gates: ProjectGates }) {
  const gateKeys = GATE_METADATA.map(m => m.key);
  const passedCount = gateKeys.filter(key => gates[key].status === 'passed').length;
  const inProgressKey = gateKeys.find(key => gates[key].status === 'in_progress');
  const currentGateMeta = inProgressKey 
    ? GATE_METADATA.find(m => m.key === inProgressKey)
    : GATE_METADATA.find(m => gates[m.key].status === 'not_started');

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {gateKeys.map((key) => {
            const gate = gates[key];
            return (
              <div
                key={key}
                className={cn(
                  'w-3 h-3 rounded-full',
                  gate.status === 'passed' && 'bg-[var(--accent-green)]',
                  gate.status === 'in_progress' && 'bg-[var(--accent-blue)] animate-pulse',
                  gate.status === 'not_started' && 'bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]',
                  gate.status === 'failed' && 'bg-[var(--accent-red)]',
                  gate.status === 'skipped' && 'bg-[var(--accent-orange)]'
                )}
              />
            );
          })}
        </div>
        <span className="text-xs text-[var(--text-secondary)]">
          {currentGateMeta?.name || 'Complete'} ({Math.round((passedCount / gateKeys.length) * 100)}%)
        </span>
      </div>
    </div>
  );
}

