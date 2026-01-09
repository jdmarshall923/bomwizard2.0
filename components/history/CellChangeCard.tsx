'use client';

import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Edit3, 
  Upload, 
  RefreshCw, 
  Zap, 
  RotateCcw,
  User,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ChangeRecord, ChangeType } from '@/types/changes';
import { COLUMN_DEFINITIONS } from '@/types/settings';

/**
 * Phase 14: Cell Change Card
 * 
 * Displays a single change record in a compact card format.
 * Shows field, old/new values, who made the change, and when.
 */

interface CellChangeCardProps {
  change: ChangeRecord;
  showItemInfo?: boolean;  // Show item code/description (for project-wide views)
  compact?: boolean;
}

export function CellChangeCard({
  change,
  showItemInfo = false,
  compact = false,
}: CellChangeCardProps) {
  const columnDef = COLUMN_DEFINITIONS[change.field];
  const fieldName = change.fieldDisplayName || columnDef?.displayName || change.field;
  
  // Format values
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    
    if (columnDef?.dataType === 'currency') {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      return `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    if (columnDef?.dataType === 'number') {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      return num.toLocaleString('en-GB', { 
        minimumFractionDigits: columnDef.decimals ?? 0,
        maximumFractionDigits: columnDef.decimals ?? 0,
      });
    }
    
    return String(value);
  };
  
  // Get change type styling
  const getChangeTypeStyle = (type: ChangeType) => {
    switch (type) {
      case 'manual':
        return 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/30';
      case 'import':
        return 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border-[var(--accent-purple)]/30';
      case 'sync':
        return 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/30';
      case 'override':
        return 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-[var(--accent-orange)]/30';
      case 'revert':
        return 'bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)] border-[var(--text-tertiary)]/30';
      default:
        return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
    }
  };
  
  // Get change type icon
  const getChangeTypeIcon = (type: ChangeType) => {
    switch (type) {
      case 'manual':
        return <Edit3 className="h-3 w-3" />;
      case 'import':
        return <Upload className="h-3 w-3" />;
      case 'sync':
        return <RefreshCw className="h-3 w-3" />;
      case 'calculated':
        return <Zap className="h-3 w-3" />;
      case 'override':
        return <Edit3 className="h-3 w-3" />;
      case 'revert':
        return <RotateCcw className="h-3 w-3" />;
      default:
        return <Edit3 className="h-3 w-3" />;
    }
  };
  
  // Format timestamp
  const changeDate = change.changedAt?.toDate?.() || new Date();
  const relativeTime = formatDistanceToNow(changeDate, { addSuffix: true });
  const fullDate = format(changeDate, 'MMM d, yyyy \'at\' HH:mm');
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm py-1">
        <Badge variant="outline" className={cn('text-xs gap-1', getChangeTypeStyle(change.changeType))}>
          {getChangeTypeIcon(change.changeType)}
        </Badge>
        <span className="font-medium">{fieldName}</span>
        <span className="text-[var(--text-tertiary)]">
          {formatValue(change.oldValue)} → {formatValue(change.newValue)}
        </span>
        <span className="text-[var(--text-tertiary)] text-xs ml-auto">
          {relativeTime}
        </span>
      </div>
    );
  }
  
  return (
    <div className="border border-[var(--border-subtle)] rounded-lg p-3 space-y-2 hover:bg-[var(--bg-tertiary)]/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Change type badge */}
          <Badge variant="outline" className={cn('text-xs gap-1', getChangeTypeStyle(change.changeType))}>
            {getChangeTypeIcon(change.changeType)}
            {getChangeTypeLabel(change.changeType)}
          </Badge>
          
          {/* Field name */}
          <span className="font-medium text-[var(--text-primary)]">
            {fieldName}
          </span>
        </div>
        
        {/* Timestamp */}
        <span 
          className="text-xs text-[var(--text-tertiary)] cursor-help"
          title={fullDate}
        >
          {relativeTime}
        </span>
      </div>
      
      {/* Item info (if showing) */}
      {showItemInfo && (
        <div className="text-sm text-[var(--text-secondary)]">
          <span className="font-mono">{change.itemCode}</span>
          {change.itemDescription && (
            <span className="text-[var(--text-tertiary)]"> — {change.itemDescription}</span>
          )}
        </div>
      )}
      
      {/* Value change */}
      <div className="flex items-center gap-2 p-2 bg-[var(--bg-tertiary)] rounded">
        <span className="font-mono text-sm text-[var(--text-secondary)]">
          {formatValue(change.oldValue)}
        </span>
        <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
        <span className="font-mono text-sm font-medium text-[var(--text-primary)]">
          {formatValue(change.newValue)}
        </span>
      </div>
      
      {/* Footer: User and reason */}
      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
        {/* User */}
        {change.changedByName && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{change.changedByName}</span>
          </div>
        )}
        
        {/* Source */}
        {change.source && (
          <div className="flex items-center gap-1">
            <Upload className="h-3 w-3" />
            <span>{change.source}</span>
          </div>
        )}
        
        {/* Reason */}
        {change.reason && (
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <MessageSquare className="h-3 w-3" />
            <span className="italic">&ldquo;{change.reason}&rdquo;</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for change type labels
function getChangeTypeLabel(type: ChangeType): string {
  const labels: Record<ChangeType, string> = {
    manual: 'Manual',
    import: 'Import',
    sync: 'Sync',
    calculated: 'Calc',
    override: 'Override',
    bulk: 'Bulk',
    revert: 'Revert',
  };
  return labels[type] || type;
}
