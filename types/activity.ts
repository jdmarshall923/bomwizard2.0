import { Timestamp } from 'firebase/firestore';

/**
 * Phase 14: Activity & Notifications Types
 * 
 * Supports activity feed and user notifications.
 */

// ============================================
// ACTIVITY TYPES
// ============================================

/**
 * Activity event types
 */
export type ActivityType = 
  | 'mention'           // User was @mentioned in a comment
  | 'assignment'        // Task was assigned to user
  | 'reply'             // Someone replied to user's comment
  | 'resolution'        // Comment thread was resolved
  | 'change'            // Watched field changed
  | 'gate_reminder'     // Project gate deadline approaching
  | 'task_due'          // Task is due soon or overdue
  | 'task_completed'    // Assigned task was completed
  | 'version_created'   // New BOM version created
  | 'import_completed'  // BOM import completed
  | 'system';           // System notification

/**
 * Activity - An event in the activity feed
 * Stored in: activity/{activityId}
 */
export interface Activity {
  id: string;
  
  // Event type
  type: ActivityType;
  
  // Context
  projectId: string;
  projectName?: string;
  itemId?: string;
  itemCode?: string;
  field?: string;
  fieldDisplayName?: string;
  threadId?: string;
  taskId?: string;
  versionId?: string;
  
  // Content
  title: string;
  description: string;
  metadata?: Record<string, any>;
  
  // Actor (who triggered)
  actorId: string;
  actorName?: string;
  actorAvatar?: string;
  
  // Targets (who should see)
  targetUserIds: string[];
  
  // Read status per user
  readBy: string[];
  dismissedBy: string[];
  
  // Timestamps
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

/**
 * Email notification frequency
 */
export type EmailFrequency = 'instant' | 'daily' | 'weekly' | 'none';

/**
 * Change notification scope
 */
export type ChangeNotificationScope = 'watched' | 'assigned' | 'all' | 'none';

/**
 * User Notification Preferences
 * Stored in: users/{userId}/preferences/notifications
 */
export interface NotificationPreferences {
  // What to notify
  mentions: boolean;
  assignments: boolean;
  replies: boolean;
  taskUpdates: boolean;
  changes: ChangeNotificationScope;
  gateReminders: boolean;
  versionCreated: boolean;
  
  // In-app notifications
  inAppEnabled: boolean;
  
  // Email notifications
  emailEnabled: boolean;
  emailFrequency: EmailFrequency;
  emailAddress?: string;
  
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string;  // "22:00"
  quietHoursEnd?: string;    // "08:00"
  quietHoursTimezone?: string;
  
  // Updated
  updatedAt: Timestamp;
}

// ============================================
// NOTIFICATION SUMMARY
// ============================================

/**
 * User's notification summary (for badge count, etc.)
 */
export interface NotificationSummary {
  userId: string;
  
  // Counts
  totalUnread: number;
  unreadByType: Record<ActivityType, number>;
  
  // Recent
  mostRecentAt?: Timestamp;
  
  // Overdue tasks
  overdueTasks: number;
  
  // Upcoming gates
  upcomingGates: number;
}

// ============================================
// ACTIVITY INPUT TYPES
// ============================================

/**
 * Input for creating an activity
 */
export interface CreateActivityInput {
  type: ActivityType;
  projectId: string;
  projectName?: string;
  itemId?: string;
  itemCode?: string;
  field?: string;
  fieldDisplayName?: string;
  threadId?: string;
  taskId?: string;
  versionId?: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  targetUserIds: string[];
  expiresAt?: Timestamp;
}

/**
 * Filters for querying activities
 */
export interface ActivityFilters {
  userId: string;           // Get activities for this user
  projectId?: string;       // Filter by project
  types?: ActivityType[];   // Filter by type(s)
  unreadOnly?: boolean;     // Only unread
  fromDate?: Timestamp;
  toDate?: Timestamp;
  limit?: number;
}

// ============================================
// DEFAULT PREFERENCES
// ============================================

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  mentions: true,
  assignments: true,
  replies: true,
  taskUpdates: true,
  changes: 'watched',
  gateReminders: true,
  versionCreated: false,
  inAppEnabled: true,
  emailEnabled: false,
  emailFrequency: 'daily',
  quietHoursEnabled: false,
  updatedAt: null as unknown as Timestamp,
};
