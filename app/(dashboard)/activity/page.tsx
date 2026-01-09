'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, 
  CheckCheck,
  Filter,
  RefreshCw,
  Settings,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Activity, ActivityType, ACTIVITY_TYPE_LABELS } from '@/types/activity';
import { 
  getUserActivities, 
  markAsRead, 
  markAllAsRead,
  getNotificationSummary,
} from '@/lib/services/activityService';
import { useAuth } from '@/lib/hooks/useAuth';
import { ActivityCard } from '@/components/activity/ActivityCard';

/**
 * Phase 14: Activity Feed Page
 * 
 * Full activity feed with filtering.
 * Route: /activity
 */

type FilterType = 'all' | 'unread' | ActivityType;

export default function ActivityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Load activities
  const loadActivities = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const loaded = await getUserActivities({
        userId: user.uid,
        types: filter !== 'all' && filter !== 'unread' ? [filter] : undefined,
        unreadOnly: filter === 'unread',
        limit: 50,
      });
      setActivities(loaded);
      
      // Get unread count
      const summary = await getNotificationSummary(user.uid);
      setUnreadCount(summary.totalUnread);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, filter]);
  
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);
  
  const handleMarkAsRead = async (activityId: string) => {
    if (!user) return;
    
    try {
      await markAsRead(activityId, user.uid);
      setActivities(prev => 
        prev.map(a => a.id === activityId 
          ? { ...a, readBy: [...a.readBy, user.uid] } 
          : a
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      await markAllAsRead(user.uid);
      setActivities(prev => 
        prev.map(a => ({ ...a, readBy: [...a.readBy, user.uid] }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };
  
  const handleActivityClick = (activity: Activity) => {
    handleMarkAsRead(activity.id);
    
    if (activity.itemId && activity.projectId) {
      router.push(`/project/${activity.projectId}/bom?item=${activity.itemId}`);
    } else if (activity.projectId) {
      router.push(`/project/${activity.projectId}`);
    }
  };
  
  // Group activities by date
  const groupedActivities = groupByDate(activities);
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-[var(--text-primary)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Activity</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {unreadCount > 0 
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up!'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/settings/notifications')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--text-tertiary)]" />
          <span className="text-sm text-[var(--text-secondary)]">Filter:</span>
        </div>
        
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activity</SelectItem>
            <SelectItem value="unread">Unread Only</SelectItem>
            <SelectItem value="mention">Mentions</SelectItem>
            <SelectItem value="assignment">Assignments</SelectItem>
            <SelectItem value="reply">Replies</SelectItem>
            <SelectItem value="change">Changes</SelectItem>
            <SelectItem value="gate_reminder">Gate Reminders</SelectItem>
            <SelectItem value="task_due">Tasks</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={loadActivities}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>
      
      {/* Activity list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-16 w-16 text-[var(--text-tertiary)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            No Activity
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {filter === 'unread' 
              ? 'You have no unread notifications.'
              : 'No activity to show.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedActivities).map(([dateLabel, dateActivities]) => (
            <div key={dateLabel}>
              <h2 className="text-sm font-medium text-[var(--text-tertiary)] mb-4 uppercase tracking-wide">
                {dateLabel}
              </h2>
              <div className="space-y-3">
                {dateActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    isRead={activity.readBy.includes(user?.uid || '')}
                    onClick={() => handleActivityClick(activity)}
                    onMarkAsRead={() => handleMarkAsRead(activity.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function groupByDate(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  for (const activity of activities) {
    const date = activity.createdAt?.toDate?.() || new Date();
    let label: string;
    
    if (date >= today) {
      label = 'Today';
    } else if (date >= yesterday) {
      label = 'Yesterday';
    } else if (date >= thisWeek) {
      label = 'This Week';
    } else {
      label = 'Earlier';
    }
    
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(activity);
  }
  
  return groups;
}
