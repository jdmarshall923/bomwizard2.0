'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AtSign,
  ClipboardList,
  MessageSquare,
  CheckCircle,
  Edit3,
  AlertCircle,
  Clock,
  CheckSquare,
  GitBranch,
  Upload,
  Settings,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { Activity, ActivityType } from '@/types/activity';

/**
 * Phase 14: Activity Card Component
 * 
 * Displays a single activity item.
 */

interface ActivityCardProps {
  activity: Activity;
  isRead?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onMarkAsRead?: () => void;
}

export function ActivityCard({
  activity,
  isRead = false,
  compact = false,
  onClick,
  onMarkAsRead,
}: ActivityCardProps) {
  const timestamp = activity.createdAt?.toDate?.() || new Date();
  const relativeTime = formatDistanceToNow(timestamp, { addSuffix: true });
  const fullTime = format(timestamp, 'MMM d, yyyy \'at\' HH:mm');
  
  const Icon = getActivityIcon(activity.type);
  const iconColor = getActivityIconColor(activity.type);
  
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 p-3 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer',
          !isRead && 'bg-[var(--accent-blue)]/5'
        )}
        onClick={onClick}
      >
        {/* Unread indicator */}
        {!isRead && (
          <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)] mt-2 shrink-0" />
        )}
        
        {/* Icon */}
        <div className={cn('p-1.5 rounded shrink-0', iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {activity.title}
          </p>
          <p className="text-xs text-[var(--text-secondary)] truncate">
            {activity.description}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {activity.projectName && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {activity.projectName}
              </Badge>
            )}
            <span 
              className="text-xs text-[var(--text-tertiary)]"
              title={fullTime}
            >
              {relativeTime}
            </span>
          </div>
        </div>
        
        {/* Mark as read */}
        {!isRead && onMarkAsRead && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }
  
  // Full card (for activity page)
  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 border border-[var(--border-subtle)] rounded-lg',
        'hover:bg-[var(--bg-tertiary)]/50 transition-colors',
        !isRead && 'border-l-4 border-l-[var(--accent-blue)]',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn('p-2 rounded-lg shrink-0', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {activity.title}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {activity.description}
            </p>
          </div>
          <span 
            className="text-xs text-[var(--text-tertiary)] whitespace-nowrap"
            title={fullTime}
          >
            {relativeTime}
          </span>
        </div>
        
        {/* Metadata */}
        <div className="flex items-center gap-2 mt-2">
          {activity.projectName && (
            <Badge variant="outline" className="text-xs">
              {activity.projectName}
            </Badge>
          )}
          {activity.itemCode && (
            <Badge variant="secondary" className="text-xs font-mono">
              {activity.itemCode}
            </Badge>
          )}
          {activity.fieldDisplayName && (
            <span className="text-xs text-[var(--text-tertiary)]">
              • {activity.fieldDisplayName}
            </span>
          )}
        </div>
        
        {/* Actor */}
        {activity.actorName && (
          <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-tertiary)]">
            {activity.actorAvatar ? (
              <img
                src={activity.actorAvatar}
                alt={activity.actorName}
                className="h-4 w-4 rounded-full"
              />
            ) : (
              <div className="h-4 w-4 rounded-full bg-[var(--accent-blue)] flex items-center justify-center text-white text-[10px]">
                {activity.actorName.charAt(0).toUpperCase()}
              </div>
            )}
            <span>{activity.actorName}</span>
          </div>
        )}
      </div>
      
      {/* Actions */}
      {!isRead && onMarkAsRead && (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead();
          }}
        >
          <Check className="h-4 w-4 mr-1" />
          Mark read
        </Button>
      )}
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function getActivityIcon(type: ActivityType) {
  const icons: Record<ActivityType, any> = {
    mention: AtSign,
    assignment: ClipboardList,
    reply: MessageSquare,
    resolution: CheckCircle,
    change: Edit3,
    gate_reminder: AlertCircle,
    task_due: Clock,
    task_completed: CheckSquare,
    version_created: GitBranch,
    import_completed: Upload,
    system: Settings,
  };
  return icons[type] || Settings;
}

function getActivityIconColor(type: ActivityType): string {
  const colors: Record<ActivityType, string> = {
    mention: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
    assignment: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
    reply: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
    resolution: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
    change: 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
    gate_reminder: 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]',
    task_due: 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
    task_completed: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
    version_created: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
    import_completed: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
    system: 'bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)]',
  };
  return colors[type] || 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]';
}
