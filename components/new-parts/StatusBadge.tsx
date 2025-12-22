'use client';

import { cn } from '@/lib/utils';
import { NewPart } from '@/types/newPart';
import { getSprintOrderStatus, getProductionOrderStatus } from '@/lib/bom/newPartService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, XCircle, Package } from 'lucide-react';

interface OrderStatusBadgeProps {
  part: NewPart;
  type: 'sprint' | 'production';
  className?: string;
}

export function OrderStatusBadge({ part, type, className }: OrderStatusBadgeProps) {
  const status = type === 'sprint' 
    ? getSprintOrderStatus(part)
    : getProductionOrderStatus(part);

  const getIcon = () => {
    switch (status.status) {
      case 'received':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'ordered':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'late':
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getBgColor = () => {
    switch (status.status) {
      case 'received':
        return 'bg-[var(--accent-green)]/20';
      case 'ordered':
        return 'bg-[var(--accent-green)]/10';
      case 'late':
        return 'bg-[var(--accent-red)]/10';
      default:
        return 'bg-[var(--bg-tertiary)]';
    }
  };

  // Build tooltip content
  const getTooltipContent = () => {
    const label = type === 'sprint' ? 'Sprint Order' : 'Production Order';
    const qty = type === 'sprint' ? part.sprintQuantity : part.massProductionQuantity;
    const targetDate = type === 'sprint' ? part.sprintTargetDate : part.productionTargetDate;
    const poNumber = type === 'sprint' ? part.sprintPoNumber : part.productionPoNumber;
    const poDate = type === 'sprint' ? part.sprintPoDate : part.productionPoDate;
    const receivedQty = type === 'sprint' ? part.sprintReceivedQty : part.productionReceivedQty;
    const isLate = type === 'sprint' ? part.sprintPoLate : part.productionPoLate;

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
      if (!timestamp) return 'Not set';
      return timestamp.toDate().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    };

    return (
      <div className="space-y-2 min-w-[200px]">
        <div className="font-semibold border-b border-[var(--border-subtle)] pb-1">
          {label}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-[var(--text-tertiary)]">Qty:</span>
          <span>{qty || '—'}</span>
          
          <span className="text-[var(--text-tertiary)]">Target:</span>
          <span>{formatDate(targetDate)}</span>
          
          <span className="text-[var(--text-tertiary)]">PO:</span>
          <span className="font-mono">{poNumber || '—'}</span>
          
          <span className="text-[var(--text-tertiary)]">PO Date:</span>
          <span>{formatDate(poDate)}</span>
          
          <span className="text-[var(--text-tertiary)]">Status:</span>
          <span className={cn(
            isLate ? 'text-[var(--accent-red)]' : 
            receivedQty ? 'text-[var(--accent-green)]' :
            poNumber ? 'text-[var(--accent-green)]' :
            'text-[var(--text-secondary)]'
          )}>
            {isLate ? 'Late' : receivedQty ? 'Received' : poNumber ? 'On Track' : 'No PO'}
          </span>
          
          {receivedQty !== undefined && (
            <>
              <span className="text-[var(--text-tertiary)]">Received:</span>
              <span>{receivedQty}/{qty || '?'}</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors',
            getBgColor(),
            status.color,
            className
          )}>
            {getIcon()}
            <span>{status.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] p-3"
        >
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  added: { label: 'Added', color: 'text-[var(--accent-blue)]', bg: 'bg-[var(--accent-blue)]/10' },
  pending: { label: 'Pending', color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--bg-tertiary)]' },
  design: { label: 'Design', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  engineering: { label: 'Engineering', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  procurement: { label: 'Procurement', color: 'text-[var(--accent-orange)]', bg: 'bg-[var(--accent-orange)]/10' },
  complete: { label: 'Complete', color: 'text-[var(--accent-green)]', bg: 'bg-[var(--accent-green)]/10' },
  on_hold: { label: 'On Hold', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  cancelled: { label: 'Cancelled', color: 'text-[var(--accent-red)]', bg: 'bg-[var(--accent-red)]/10' },
};

export function WorkflowStatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      config.bg,
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
}

export function DrawingStatusBadge({ state }: { state?: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    not_started: { label: 'Not Started', color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--bg-tertiary)]' },
    in_progress: { label: 'In Progress', color: 'text-[var(--accent-blue)]', bg: 'bg-[var(--accent-blue)]/10' },
    in_review: { label: 'In Review', color: 'text-[var(--accent-orange)]', bg: 'bg-[var(--accent-orange)]/10' },
    released: { label: 'Released', color: 'text-[var(--accent-green)]', bg: 'bg-[var(--accent-green)]/10' },
  };

  const c = config[state || 'not_started'] || config.not_started;
  
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      c.bg,
      c.color,
    )}>
      {c.label}
    </span>
  );
}

