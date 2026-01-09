import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  CommentThread,
  CellComment,
  ThreadStatus,
  CreateThreadInput,
  AddCommentInput,
  ThreadFilters,
  CommentMention,
} from '@/types/comments';
import { COLUMN_DEFINITIONS } from '@/types/settings';

/**
 * Phase 14: Comment Service
 * 
 * Manages cell-level comments with:
 * - Thread creation and management
 * - Comment CRUD operations
 * - @mention tracking
 * - Thread resolution
 */

// ============================================
// THREAD OPERATIONS
// ============================================

/**
 * Create a new comment thread with initial comment
 */
export async function createThread(
  input: CreateThreadInput,
  userId: string,
  userName?: string
): Promise<{ threadId: string; commentId: string }> {
  const { projectId, content, mentions = [], ...threadData } = input;
  const batch = writeBatch(db);
  
  // Get field display name
  const fieldDisplayName = threadData.fieldDisplayName 
    || COLUMN_DEFINITIONS[threadData.field]?.displayName 
    || threadData.field;
  
  // Create thread
  const threadsRef = collection(db, 'projects', projectId, 'commentThreads');
  const threadRef = doc(threadsRef);
  
  const thread: Omit<CommentThread, 'id'> = {
    projectId,
    ...threadData,
    fieldDisplayName,
    status: 'open',
    commentCount: 1,
    participantIds: [userId, ...mentions.map(m => m.userId)],
    createdAt: Timestamp.now(),
    createdBy: userId,
    createdByName: userName,
    lastCommentAt: Timestamp.now(),
    lastCommentBy: userId,
    lastCommentByName: userName,
  };
  
  batch.set(threadRef, thread);
  
  // Create initial comment
  const commentsRef = collection(db, 'projects', projectId, 'comments');
  const commentRef = doc(commentsRef);
  
  const comment: Omit<CellComment, 'id'> = {
    projectId,
    threadId: threadRef.id,
    itemId: threadData.itemId,
    itemCode: threadData.itemCode,
    field: threadData.field,
    content,
    mentions,
    createdBy: userId,
    createdByName: userName,
    createdAt: Timestamp.now(),
  };
  
  batch.set(commentRef, comment);
  
  await batch.commit();
  
  return { threadId: threadRef.id, commentId: commentRef.id };
}

/**
 * Add a comment to an existing thread
 */
export async function addComment(
  input: AddCommentInput,
  userId: string,
  userName?: string
): Promise<string> {
  const { projectId, threadId, content, mentions = [], ...commentData } = input;
  const batch = writeBatch(db);
  
  // Create comment
  const commentsRef = collection(db, 'projects', projectId, 'comments');
  const commentRef = doc(commentsRef);
  
  const comment: Omit<CellComment, 'id'> = {
    projectId,
    threadId,
    ...commentData,
    content,
    mentions,
    createdBy: userId,
    createdByName: userName,
    createdAt: Timestamp.now(),
  };
  
  batch.set(commentRef, comment);
  
  // Update thread
  const threadRef = doc(db, 'projects', projectId, 'commentThreads', threadId);
  batch.update(threadRef, {
    commentCount: increment(1),
    lastCommentAt: Timestamp.now(),
    lastCommentBy: userId,
    lastCommentByName: userName,
    participantIds: arrayUnion(userId, ...mentions.map(m => m.userId)),
  });
  
  await batch.commit();
  
  return commentRef.id;
}

/**
 * Get a thread by ID
 */
export async function getThread(
  projectId: string,
  threadId: string
): Promise<CommentThread | null> {
  const docRef = doc(db, 'projects', projectId, 'commentThreads', threadId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  
  return { id: snapshot.id, ...snapshot.data() } as CommentThread;
}

/**
 * Get threads for a cell
 */
export async function getThreadsForCell(
  projectId: string,
  itemId: string,
  field: string
): Promise<CommentThread[]> {
  const q = query(
    collection(db, 'projects', projectId, 'commentThreads'),
    where('itemId', '==', itemId),
    where('field', '==', field),
    orderBy('lastCommentAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommentThread[];
}

/**
 * Get threads for an item (all fields)
 */
export async function getThreadsForItem(
  projectId: string,
  itemId: string,
  includeResolved: boolean = false
): Promise<CommentThread[]> {
  let q = query(
    collection(db, 'projects', projectId, 'commentThreads'),
    where('itemId', '==', itemId),
    orderBy('lastCommentAt', 'desc')
  );
  
  if (!includeResolved) {
    q = query(q, where('status', '==', 'open'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommentThread[];
}

/**
 * Resolve a thread
 */
export async function resolveThread(
  projectId: string,
  threadId: string,
  userId: string,
  userName?: string
): Promise<void> {
  const threadRef = doc(db, 'projects', projectId, 'commentThreads', threadId);
  await updateDoc(threadRef, {
    status: 'resolved',
    resolvedAt: Timestamp.now(),
    resolvedBy: userId,
    resolvedByName: userName,
  });
}

/**
 * Reopen a thread
 */
export async function reopenThread(
  projectId: string,
  threadId: string
): Promise<void> {
  const threadRef = doc(db, 'projects', projectId, 'commentThreads', threadId);
  await updateDoc(threadRef, {
    status: 'open',
    resolvedAt: null,
    resolvedBy: null,
    resolvedByName: null,
  });
}

// ============================================
// COMMENT OPERATIONS
// ============================================

/**
 * Get comments for a thread
 */
export async function getComments(
  projectId: string,
  threadId: string
): Promise<CellComment[]> {
  const q = query(
    collection(db, 'projects', projectId, 'comments'),
    where('threadId', '==', threadId),
    where('isDeleted', '!=', true),
    orderBy('isDeleted'),
    orderBy('createdAt', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CellComment[];
}

/**
 * Edit a comment
 */
export async function editComment(
  projectId: string,
  commentId: string,
  newContent: string,
  newMentions: CommentMention[] = []
): Promise<void> {
  const commentRef = doc(db, 'projects', projectId, 'comments', commentId);
  await updateDoc(commentRef, {
    content: newContent,
    mentions: newMentions,
    isEdited: true,
    editedAt: Timestamp.now(),
  });
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(
  projectId: string,
  commentId: string,
  threadId: string
): Promise<void> {
  const batch = writeBatch(db);
  
  // Soft delete comment
  const commentRef = doc(db, 'projects', projectId, 'comments', commentId);
  batch.update(commentRef, {
    isDeleted: true,
    deletedAt: Timestamp.now(),
  });
  
  // Decrement thread count
  const threadRef = doc(db, 'projects', projectId, 'commentThreads', threadId);
  batch.update(threadRef, {
    commentCount: increment(-1),
  });
  
  await batch.commit();
}

// ============================================
// QUERY OPERATIONS
// ============================================

/**
 * Get threads with filters
 */
export async function getThreads(
  filters: ThreadFilters
): Promise<CommentThread[]> {
  let q = query(
    collection(db, 'projects', filters.projectId, 'commentThreads'),
    orderBy('lastCommentAt', 'desc')
  );
  
  if (filters.itemId) {
    q = query(q, where('itemId', '==', filters.itemId));
  }
  
  if (filters.field) {
    q = query(q, where('field', '==', filters.field));
  }
  
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  if (filters.participantId) {
    q = query(q, where('participantIds', 'array-contains', filters.participantId));
  }
  
  if (filters.limit) {
    q = query(q, limit(filters.limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommentThread[];
}

/**
 * Get open threads for a project (for notification badge, etc.)
 */
export async function getOpenThreadCount(
  projectId: string
): Promise<number> {
  const q = query(
    collection(db, 'projects', projectId, 'commentThreads'),
    where('status', '==', 'open')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Check if a cell has comments
 */
export async function cellHasComments(
  projectId: string,
  itemId: string,
  field: string
): Promise<{ hasComments: boolean; openCount: number; totalCount: number }> {
  const threads = await getThreadsForCell(projectId, itemId, field);
  
  const openCount = threads.filter(t => t.status === 'open').length;
  
  return {
    hasComments: threads.length > 0,
    openCount,
    totalCount: threads.length,
  };
}
