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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  CellTask,
  TaskStatus,
  TaskPriority,
  CreateTaskInput,
  TaskFilters,
} from '@/types/comments';
import { COLUMN_DEFINITIONS } from '@/types/settings';

/**
 * Phase 14: Task Service
 * 
 * Manages task assignments created from cell comments.
 */

// ============================================
// TASK CRUD
// ============================================

/**
 * Create a new task
 */
export async function createTask(
  input: CreateTaskInput,
  userId: string,
  userName?: string
): Promise<string> {
  const { projectId, ...taskData } = input;
  
  // Get field display name
  const fieldDisplayName = taskData.fieldDisplayName 
    || COLUMN_DEFINITIONS[taskData.field]?.displayName 
    || taskData.field;
  
  const task: Omit<CellTask, 'id'> = {
    projectId,
    ...taskData,
    fieldDisplayName,
    assignedBy: userId,
    assignedByName: userName,
    assignedAt: Timestamp.now(),
    status: 'pending',
    priority: taskData.priority || 'normal',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // Check if task is overdue
  if (task.dueDate && task.dueDate.toMillis() < Date.now()) {
    task.isOverdue = true;
  }
  
  const docRef = await addDoc(
    collection(db, 'projects', projectId, 'tasks'),
    task
  );
  
  return docRef.id;
}

/**
 * Get a task by ID
 */
export async function getTask(
  projectId: string,
  taskId: string
): Promise<CellTask | null> {
  const docRef = doc(db, 'projects', projectId, 'tasks', taskId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  
  return { id: snapshot.id, ...snapshot.data() } as CellTask;
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  projectId: string,
  taskId: string,
  status: TaskStatus,
  userId?: string,
  userName?: string,
  completionNote?: string
): Promise<void> {
  const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
  
  const updates: Partial<CellTask> = {
    status,
    updatedAt: Timestamp.now(),
  };
  
  if (status === 'completed') {
    updates.completedAt = Timestamp.now();
    updates.completedBy = userId;
    updates.completedByName = userName;
    updates.completionNote = completionNote;
  }
  
  await updateDoc(taskRef, updates);
}

/**
 * Update task details
 */
export async function updateTask(
  projectId: string,
  taskId: string,
  updates: Partial<Pick<CellTask, 'title' | 'description' | 'priority' | 'dueDate' | 'assigneeId' | 'assigneeName' | 'assigneeEmail'>>
): Promise<void> {
  const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
  
  const data = {
    ...updates,
    updatedAt: Timestamp.now(),
  };
  
  // Check if task becomes overdue
  if (updates.dueDate && updates.dueDate.toMillis() < Date.now()) {
    (data as any).isOverdue = true;
  }
  
  await updateDoc(taskRef, data);
}

// ============================================
// TASK QUERIES
// ============================================

/**
 * Get tasks with filters
 */
export async function getTasks(
  filters: TaskFilters
): Promise<CellTask[]> {
  let q = query(
    collection(db, 'projects', filters.projectId, 'tasks'),
    orderBy('createdAt', 'desc')
  );
  
  if (filters.assigneeId) {
    q = query(q, where('assigneeId', '==', filters.assigneeId));
  }
  
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  if (filters.priority) {
    q = query(q, where('priority', '==', filters.priority));
  }
  
  if (filters.itemId) {
    q = query(q, where('itemId', '==', filters.itemId));
  }
  
  if (filters.limit) {
    q = query(q, limit(filters.limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CellTask[];
}

/**
 * Get tasks assigned to a user
 */
export async function getUserTasks(
  projectId: string,
  userId: string,
  includeCompleted: boolean = false
): Promise<CellTask[]> {
  let q = query(
    collection(db, 'projects', projectId, 'tasks'),
    where('assigneeId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  if (!includeCompleted) {
    q = query(q, where('status', 'in', ['pending', 'in_progress']));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CellTask[];
}

/**
 * Get tasks for an item
 */
export async function getItemTasks(
  projectId: string,
  itemId: string
): Promise<CellTask[]> {
  const q = query(
    collection(db, 'projects', projectId, 'tasks'),
    where('itemId', '==', itemId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CellTask[];
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(
  projectId: string,
  assigneeId?: string
): Promise<CellTask[]> {
  let q = query(
    collection(db, 'projects', projectId, 'tasks'),
    where('status', 'in', ['pending', 'in_progress']),
    where('dueDate', '<', Timestamp.now()),
    orderBy('dueDate', 'asc')
  );
  
  if (assigneeId) {
    q = query(q, where('assigneeId', '==', assigneeId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CellTask[];
}

/**
 * Get task counts by status
 */
export async function getTaskCounts(
  projectId: string,
  assigneeId?: string
): Promise<Record<TaskStatus, number>> {
  let baseQuery = query(
    collection(db, 'projects', projectId, 'tasks')
  );
  
  if (assigneeId) {
    baseQuery = query(baseQuery, where('assigneeId', '==', assigneeId));
  }
  
  const snapshot = await getDocs(baseQuery);
  const tasks = snapshot.docs.map(doc => doc.data()) as CellTask[];
  
  const counts: Record<TaskStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  
  for (const task of tasks) {
    counts[task.status]++;
  }
  
  return counts;
}

// ============================================
// TASK PRIORITY HELPERS
// ============================================

/**
 * Get priority label
 */
export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  return labels[priority];
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    low: 'text-[var(--text-tertiary)]',
    normal: 'text-[var(--accent-blue)]',
    high: 'text-[var(--accent-orange)]',
    urgent: 'text-[var(--accent-red)]',
  };
  return colors[priority];
}

/**
 * Get status label
 */
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}
