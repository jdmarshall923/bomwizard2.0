import { Timestamp } from 'firebase/firestore';

/**
 * Phase 14: Cell Comments & Tasks Types
 * 
 * Supports cell-level comments with @mentions,
 * threaded discussions, and task assignments.
 */

// ============================================
// COMMENT TYPES
// ============================================

/**
 * Status of a comment thread
 */
export type ThreadStatus = 'open' | 'resolved';

/**
 * Comment Thread - Groups comments on a specific cell
 * Stored in: projects/{projectId}/commentThreads/{threadId}
 */
export interface CommentThread {
  id: string;
  projectId: string;
  
  // Location
  itemId: string;
  itemCode: string;
  itemDescription?: string;
  field: string;
  fieldDisplayName?: string;
  
  // Thread status
  status: ThreadStatus;
  
  // Stats
  commentCount: number;
  participantIds: string[];
  
  // Timestamps
  createdAt: Timestamp;
  createdBy: string;
  createdByName?: string;
  lastCommentAt: Timestamp;
  lastCommentBy: string;
  lastCommentByName?: string;
  
  // Resolution (if resolved)
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  resolvedByName?: string;
}

/**
 * Cell Comment - Individual comment in a thread
 * Stored in: projects/{projectId}/comments/{commentId}
 */
export interface CellComment {
  id: string;
  projectId: string;
  threadId: string;
  
  // Location (denormalized for queries)
  itemId: string;
  itemCode: string;
  field: string;
  
  // Parent (for replies)
  parentCommentId?: string;
  
  // Content
  content: string;
  contentHtml?: string;           // For rich text/markdown rendering
  
  // Mentions
  mentions: CommentMention[];
  
  // Status
  isEdited?: boolean;
  editedAt?: Timestamp;
  isDeleted?: boolean;
  deletedAt?: Timestamp;
  
  // Author
  createdBy: string;
  createdByName?: string;
  createdByAvatar?: string;
  createdAt: Timestamp;
}

/**
 * Mention in a comment
 */
export interface CommentMention {
  userId: string;
  userName: string;
  userEmail?: string;
  startIndex: number;             // Position in content string
  endIndex: number;
}

// ============================================
// TASK TYPES
// ============================================

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Task priority
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Cell Task - Action item created from a comment
 * Stored in: projects/{projectId}/tasks/{taskId}
 */
export interface CellTask {
  id: string;
  projectId: string;
  
  // Location
  itemId: string;
  itemCode: string;
  itemDescription?: string;
  field: string;
  fieldDisplayName?: string;
  
  // Source
  threadId?: string;
  commentId?: string;
  
  // Task details
  title: string;
  description?: string;
  
  // Assignment
  assigneeId: string;
  assigneeName?: string;
  assigneeEmail?: string;
  assignedBy: string;
  assignedByName?: string;
  assignedAt: Timestamp;
  
  // Status
  status: TaskStatus;
  priority: TaskPriority;
  
  // Due date
  dueDate?: Timestamp;
  isOverdue?: boolean;
  
  // Completion
  completedAt?: Timestamp;
  completedBy?: string;
  completedByName?: string;
  completionNote?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// USER TYPES (for mentions)
// ============================================

/**
 * User info for mention autocomplete
 */
export interface MentionableUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input for creating a new comment thread
 */
export interface CreateThreadInput {
  projectId: string;
  itemId: string;
  itemCode: string;
  itemDescription?: string;
  field: string;
  fieldDisplayName?: string;
  content: string;
  mentions?: CommentMention[];
}

/**
 * Input for adding a comment to a thread
 */
export interface AddCommentInput {
  projectId: string;
  threadId: string;
  itemId: string;
  itemCode: string;
  field: string;
  parentCommentId?: string;
  content: string;
  mentions?: CommentMention[];
}

/**
 * Input for creating a task
 */
export interface CreateTaskInput {
  projectId: string;
  itemId: string;
  itemCode: string;
  itemDescription?: string;
  field: string;
  fieldDisplayName?: string;
  threadId?: string;
  commentId?: string;
  title: string;
  description?: string;
  assigneeId: string;
  assigneeName?: string;
  assigneeEmail?: string;
  priority?: TaskPriority;
  dueDate?: Timestamp;
}

// ============================================
// QUERY TYPES
// ============================================

/**
 * Filters for querying threads
 */
export interface ThreadFilters {
  projectId: string;
  itemId?: string;
  field?: string;
  status?: ThreadStatus;
  participantId?: string;
  limit?: number;
}

/**
 * Filters for querying tasks
 */
export interface TaskFilters {
  projectId: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  isOverdue?: boolean;
  itemId?: string;
  limit?: number;
}
