'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Check, 
  CheckCheck,
  Settings,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Activity } from '@/types/activity';
import { 
  getUserActivities, 
  getUnreadCount, 
  markAsRead,
  markAllAsRead,
} from '@/lib/services/activityService';
import { useAuth } from '@/lib/hooks/useAuth';
import { ActivityCard } from './ActivityCard';

/**
 * Phase 14: Notification Bell Component
 * 
 * Bell icon with unread count badge.
 * Opens a dropdown with recent notifications.
 */

interface NotificationBellProps {
  projectId?: string;  // Filter to specific project
}

export function NotificationBell({ projectId }: NotificationBellProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load unread count on mount
  useEffect(() => {
    if (!user) return;
    
    loadUnreadCount();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);
  
  // Load activities when dropdown opens
  useEffect(() => {
    if (open && user) {
      loadActivities();
    }
  }, [open, user]);
  
  const loadUnreadCount = async () => {
    if (!user) return;
    
    try {
      const count = await getUnreadCount(user.uid);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };
  
  const loadActivities = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const loaded = await getUserActivities({
        userId: user.uid,
        projectId,
        limit: 10,
      });
      setActivities(loaded);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
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
  
  const handleViewAll = () => {
    setOpen(false);
    router.push('/activity');
  };
  
  const handleActivityClick = (activity: Activity) => {
    // Mark as read
    handleMarkAsRead(activity.id);
    
    // Navigate to relevant location
    if (activity.itemId && activity.projectId) {
      router.push(`/project/${activity.projectId}/bom?item=${activity.itemId}`);
    } else if (activity.projectId) {
      router.push(`/project/${activity.projectId}`);
    }
    
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className={cn(
                'absolute -top-1 -right-1 h-5 min-w-[20px] px-1',
                'bg-[var(--accent-red)] text-white text-xs',
                'flex items-center justify-center'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="font-medium">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs h-7"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        {/* Activities list */}
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-10 w-10 text-[var(--text-tertiary)] mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">
                No notifications
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isRead={activity.readBy.includes(user?.uid || '')}
                  compact
                  onClick={() => handleActivityClick(activity)}
                  onMarkAsRead={() => handleMarkAsRead(activity.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-2 border-t border-[var(--border-subtle)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            View all activity
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              router.push('/settings/notifications');
            }}
            className="text-xs"
          >
            <Settings className="h-3.5 w-3.5 mr-1" />
            Settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
