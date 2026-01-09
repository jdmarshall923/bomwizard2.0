import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Activity,
  ActivityType,
  CreateActivityInput,
  ActivityFilters,
  NotificationPreferences,
  NotificationSummary,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/types/activity';

/**
 * Phase 14: Activity Service
 * 
 * Manages activity feed and notifications.
 */

// ============================================
// ACTIVITY CRUD
// ============================================

/**
 * Create a new activity
 */
export async function createActivity(
  input: CreateActivityInput,
  actorId: string,
  actorName?: string,
  actorAvatar?: string
): Promise<string> {
  const activity: Omit<Activity, 'id'> = {
    ...input,
    actorId,
    actorName,
    actorAvatar,
    readBy: [],
    dismissedBy: [],
    createdAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, 'activity'), activity);
  
  return docRef.id;
}

/**
 * Create multiple activities (e.g., for mentions)
 */
export async function createActivities(
  inputs: CreateActivityInput[],
  actorId: string,
  actorName?: string,
  actorAvatar?: string
): Promise<string[]> {
  const batch = writeBatch(db);
  const ids: string[] = [];
  
  for (const input of inputs) {
    const docRef = doc(collection(db, 'activity'));
    ids.push(docRef.id);
    
    const activity: Omit<Activity, 'id'> = {
      ...input,
      actorId,
      actorName,
      actorAvatar,
      readBy: [],
      dismissedBy: [],
      createdAt: Timestamp.now(),
    };
    
    batch.set(docRef, activity);
  }
  
  await batch.commit();
  
  return ids;
}

/**
 * Get an activity by ID
 */
export async function getActivity(activityId: string): Promise<Activity | null> {
  const docRef = doc(db, 'activity', activityId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  
  return { id: snapshot.id, ...snapshot.data() } as Activity;
}

// ============================================
// ACTIVITY QUERIES
// ============================================

/**
 * Get activities for a user
 */
export async function getUserActivities(
  filters: ActivityFilters
): Promise<Activity[]> {
  let q = query(
    collection(db, 'activity'),
    where('targetUserIds', 'array-contains', filters.userId),
    orderBy('createdAt', 'desc')
  );
  
  if (filters.projectId) {
    q = query(q, where('projectId', '==', filters.projectId));
  }
  
  if (filters.types?.length) {
    q = query(q, where('type', 'in', filters.types));
  }
  
  if (filters.limit) {
    q = query(q, limit(filters.limit));
  }
  
  const snapshot = await getDocs(q);
  let activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Activity[];
  
  // Filter unread if requested (done client-side because readBy is an array)
  if (filters.unreadOnly) {
    activities = activities.filter(a => !a.readBy.includes(filters.userId));
  }
  
  return activities;
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const activities = await getUserActivities({
    userId,
    unreadOnly: true,
    limit: 100,
  });
  
  return activities.length;
}

/**
 * Get notification summary for a user
 */
export async function getNotificationSummary(userId: string): Promise<NotificationSummary> {
  const activities = await getUserActivities({
    userId,
    unreadOnly: true,
    limit: 100,
  });
  
  const unreadByType: Record<ActivityType, number> = {
    mention: 0,
    assignment: 0,
    reply: 0,
    resolution: 0,
    change: 0,
    gate_reminder: 0,
    task_due: 0,
    task_completed: 0,
    version_created: 0,
    import_completed: 0,
    system: 0,
  };
  
  for (const activity of activities) {
    unreadByType[activity.type]++;
  }
  
  const mostRecent = activities[0];
  
  return {
    userId,
    totalUnread: activities.length,
    unreadByType,
    mostRecentAt: mostRecent?.createdAt,
    overdueTasks: 0, // TODO: Integrate with task service
    upcomingGates: 0, // TODO: Integrate with project service
  };
}

// ============================================
// MARK AS READ/DISMISSED
// ============================================

/**
 * Mark an activity as read
 */
export async function markAsRead(
  activityId: string,
  userId: string
): Promise<void> {
  const docRef = doc(db, 'activity', activityId);
  await updateDoc(docRef, {
    readBy: arrayUnion(userId),
  });
}

/**
 * Mark multiple activities as read
 */
export async function markMultipleAsRead(
  activityIds: string[],
  userId: string
): Promise<void> {
  const batch = writeBatch(db);
  
  for (const id of activityIds) {
    const docRef = doc(db, 'activity', id);
    batch.update(docRef, {
      readBy: arrayUnion(userId),
    });
  }
  
  await batch.commit();
}

/**
 * Mark all user's activities as read
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const activities = await getUserActivities({
    userId,
    unreadOnly: true,
    limit: 100,
  });
  
  await markMultipleAsRead(activities.map(a => a.id), userId);
}

/**
 * Dismiss an activity
 */
export async function dismissActivity(
  activityId: string,
  userId: string
): Promise<void> {
  const docRef = doc(db, 'activity', activityId);
  await updateDoc(docRef, {
    dismissedBy: arrayUnion(userId),
  });
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const docRef = doc(db, 'users', userId, 'preferences', 'notifications');
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
  
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...snapshot.data() } as NotificationPreferences;
}

/**
 * Save user's notification preferences
 */
export async function saveNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'preferences', 'notifications');
  await updateDoc(docRef, {
    ...preferences,
    updatedAt: Timestamp.now(),
  });
}

// ============================================
// ACTIVITY HELPERS
// ============================================

/**
 * Create activity for a mention
 */
export async function createMentionActivity(
  projectId: string,
  projectName: string,
  itemId: string,
  itemCode: string,
  field: string,
  fieldDisplayName: string,
  threadId: string,
  mentionedUserId: string,
  actorId: string,
  actorName: string,
  commentPreview: string
): Promise<string> {
  return createActivity(
    {
      type: 'mention',
      projectId,
      projectName,
      itemId,
      itemCode,
      field,
      fieldDisplayName,
      threadId,
      title: `${actorName} mentioned you`,
      description: commentPreview.length > 100 
        ? commentPreview.slice(0, 100) + '...' 
        : commentPreview,
      targetUserIds: [mentionedUserId],
    },
    actorId,
    actorName
  );
}

/**
 * Create activity for a task assignment
 */
export async function createAssignmentActivity(
  projectId: string,
  projectName: string,
  itemId: string,
  itemCode: string,
  field: string,
  fieldDisplayName: string,
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  actorId: string,
  actorName: string
): Promise<string> {
  return createActivity(
    {
      type: 'assignment',
      projectId,
      projectName,
      itemId,
      itemCode,
      field,
      fieldDisplayName,
      taskId,
      title: `${actorName} assigned you a task`,
      description: taskTitle,
      targetUserIds: [assigneeId],
    },
    actorId,
    actorName
  );
}

/**
 * Create activity for a reply
 */
export async function createReplyActivity(
  projectId: string,
  projectName: string,
  itemId: string,
  itemCode: string,
  field: string,
  fieldDisplayName: string,
  threadId: string,
  originalAuthorId: string,
  actorId: string,
  actorName: string,
  replyPreview: string
): Promise<string> {
  // Don't notify if replying to self
  if (originalAuthorId === actorId) {
    return '';
  }
  
  return createActivity(
    {
      type: 'reply',
      projectId,
      projectName,
      itemId,
      itemCode,
      field,
      fieldDisplayName,
      threadId,
      title: `${actorName} replied to your comment`,
      description: replyPreview.length > 100 
        ? replyPreview.slice(0, 100) + '...' 
        : replyPreview,
      targetUserIds: [originalAuthorId],
    },
    actorId,
    actorName
  );
}

// ============================================
// ACTIVITY TYPE LABELS
// ============================================

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  mention: 'Mentions',
  assignment: 'Assignments',
  reply: 'Replies',
  resolution: 'Resolutions',
  change: 'Changes',
  gate_reminder: 'Gate Reminders',
  task_due: 'Task Due',
  task_completed: 'Task Completed',
  version_created: 'Versions',
  import_completed: 'Imports',
  system: 'System',
};

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  mention: 'AtSign',
  assignment: 'ClipboardList',
  reply: 'MessageSquare',
  resolution: 'CheckCircle',
  change: 'Edit3',
  gate_reminder: 'AlertCircle',
  task_due: 'Clock',
  task_completed: 'CheckSquare',
  version_created: 'GitBranch',
  import_completed: 'Upload',
  system: 'Settings',
};
