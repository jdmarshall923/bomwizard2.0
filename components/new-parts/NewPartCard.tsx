'use client';

import { NewPart } from '@/types/newPart';
import { getPriorityInfo, getStatusInfo } from '@/lib/bom/newPartService';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ArrowRight,
  Clock,
  GripVertical,
  Package,
  User,
} from 'lucide-react';

interface NewPartCardProps {
  part: NewPart;
  onClick?: () => void;
  onMoveNext?: () => void;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function NewPartCard({
  part,
  onClick,
  onMoveNext,
  isDragging,
  dragHandleProps,
}: NewPartCardProps) {
  const priorityInfo = getPriorityInfo(part.priority);
  const statusInfo = getStatusInfo(part.status);

  const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-lg border bg-[var(--bg-secondary)]/80 backdrop-blur-sm p-3 cursor-pointer transition-all duration-200',
        'hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-default)] hover:shadow-lg',
        isDragging && 'opacity-50 rotate-2 scale-105 shadow-xl',
        statusInfo.borderColor
      )}
    >
      {/* Drag Handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical className="h-4 w-4 text-[var(--text-tertiary)]" />
        </div>
      )}

      <div className={cn('space-y-2', dragHandleProps && 'ml-4')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-[var(--accent-blue)]">
                {part.placeholderCode}
              </span>
              {part.priority === 'critical' && (
                <AlertCircle className="h-4 w-4 text-[var(--accent-red)] animate-pulse" />
              )}
            </div>
            <p className="text-sm text-[var(--text-primary)] line-clamp-2 mt-0.5">
              {part.description || 'No description'}
            </p>
          </div>
        </div>

        {/* Group Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-xs">
            <Package className="h-3 w-3 text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">{part.groupCode}</span>
          </div>
          <div
            className={cn(
              'px-2 py-0.5 rounded-md text-xs font-medium',
              priorityInfo.bgColor,
              priorityInfo.color
            )}
          >
            {priorityInfo.label}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDate(part.requestedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{part.requestedBy || 'Unknown'}</span>
          </div>
        </div>

        {/* Quantity */}
        <div className="text-xs text-[var(--text-secondary)]">
          Qty: <span className="font-medium text-[var(--text-primary)]">{part.quantity}</span>
        </div>

        {/* Final B-Code if complete */}
        {part.finalItemCode && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30">
            <span className="text-xs text-[var(--text-secondary)]">Final Code:</span>
            <span className="font-mono text-sm font-semibold text-[var(--accent-green)]">
              {part.finalItemCode}
            </span>
          </div>
        )}

        {/* Quick Action - Move to Next Stage */}
        {onMoveNext && part.status !== 'complete' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveNext();
            }}
            className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--accent-blue)]/20 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors border border-transparent hover:border-[var(--accent-blue)]/30"
          >
            <span>Move to Next</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

