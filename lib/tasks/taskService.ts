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
  collectionGroup,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  TaskFilters,
  TaskStatusCounts,
  TaskAssignee,
  DEFAULT_TASK_STATUS,
  DEFAULT_TASK_PRIORITY,
  mapLegacyStatus,
} from '@/types/task';

/**
 * Phase 15: Unified Task Service
 * 
 * Manages both project-level tasks (from task groups) and cell-level tasks (Phase 14).
 * Replaces the old lib/services/taskService.ts
 */

// ============================================
// COLLECTION PATHS
// ============================================

const getTasksCollection = (projectId: string) =>
  collection(db, 'projects', projectId, 'tasks');

const getTaskRef = (projectId: string, taskId: string) =>
  doc(db, 'projects', projectId, 'tasks', taskId);

/**
 * Helper to remove undefined values from an object (Firestore doesn't accept undefined)
 */
function removeUndefinedValues<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      result[key] = value;
    }
  });
  return result as T;
}

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

  // Get next position for ordering
  const position = await getNextTaskPosition(projectId, taskData.taskGroupId);

  // Build task object with only defined values
  const task: Record<string, unknown> = {
    projectId,
    taskType: taskData.taskType,
    title: taskData.title,
    status: taskData.status || DEFAULT_TASK_STATUS,
    priority: taskData.priority || DEFAULT_TASK_PRIORITY,
    assignees: taskData.assignees || [],
    linkedItems: taskData.linkedItems || [],
    position,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: userId,
  };

  // Add optional fields only if defined
  if (taskData.taskGroupId) task.taskGroupId = taskData.taskGroupId;
  if (taskData.itemId) task.itemId = taskData.itemId;
  if (taskData.itemCode) task.itemCode = taskData.itemCode;
  if (taskData.itemDescription) task.itemDescription = taskData.itemDescription;
  if (taskData.field) task.field = taskData.field;
  if (taskData.fieldDisplayName) task.fieldDisplayName = taskData.fieldDisplayName;
  if (taskData.threadId) task.threadId = taskData.threadId;
  if (taskData.commentId) task.commentId = taskData.commentId;
  if (taskData.description) task.description = taskData.description;
  if (taskData.dueDate) task.dueDate = taskData.dueDate;
  if (taskData.linkedGate) task.linkedGate = taskData.linkedGate;
  if (taskData.subtasks && taskData.subtasks.length > 0) task.subtasks = taskData.subtasks;
  if (taskData.customFieldValues) task.customFieldValues = taskData.customFieldValues;
  if (userName) task.createdByName = userName;

  const docRef = await addDoc(getTasksCollection(projectId), task);
  return docRef.id;
}

/**
 * Get a task by ID
 */
export async function getTask(
  projectId: string,
  taskId: string
): Promise<Task | null> {
  const docRef = getTaskRef(projectId, taskId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return normalizeTask({ id: snapshot.id, ...snapshot.data() });
}

/**
 * Update a task
 */
export async function updateTask(
  projectId: string,
  taskId: string,
  updates: UpdateTaskInput,
  userId?: string,
  userName?: string
): Promise<void> {
  const taskRef = getTaskRef(projectId, taskId);

  // Filter out undefined values (Firestore doesn't accept undefined, but null is OK)
  const data: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  // Copy over only defined values from updates
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      data[key] = value;
    }
  });

  // Handle status change to done
  if (updates.status === 'done') {
    const task = await getTask(projectId, taskId);
    if (task && task.status !== 'done') {
      data.completedAt = Timestamp.now();
      if (userId) data.completedBy = userId;
      if (userName) data.completedByName = userName;
      if (updates.completionNote) {
        data.completionNote = updates.completionNote;
      }
    }
  }

  // Clear completion data if status changed away from done
  if (updates.status && updates.status !== 'done') {
    data.completedAt = null;
    data.completedBy = null;
    data.completedByName = null;
    data.completionNote = null;
  }

  await updateDoc(taskRef, data);
}

/**
 * Delete a task
 */
export async function deleteTask(
  projectId: string,
  taskId: string
): Promise<void> {
  await deleteDoc(getTaskRef(projectId, taskId));
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
  await updateTask(projectId, taskId, { status, completionNote }, userId, userName);
}

/**
 * Update task position (for drag-and-drop reordering)
 */
export async function updateTaskPosition(
  projectId: string,
  taskId: string,
  newPosition: number,
  newStatus?: TaskStatus
): Promise<void> {
  const data: Record<string, unknown> = {
    position: newPosition,
    updatedAt: Timestamp.now(),
  };

  if (newStatus) {
    data.status = newStatus;
  }

  await updateDoc(getTaskRef(projectId, taskId), data);
}

/**
 * Batch update task positions
 */
export async function batchUpdateTaskPositions(
  projectId: string,
  updates: Array<{ taskId: string; position: number; status?: TaskStatus }>
): Promise<void> {
  const batch = writeBatch(db);

  for (const update of updates) {
    const taskRef = getTaskRef(projectId, update.taskId);
    const data: Record<string, unknown> = {
      position: update.position,
      updatedAt: Timestamp.now(),
    };
    if (update.status) {
      data.status = update.status;
    }
    batch.update(taskRef, data);
  }

  await batch.commit();
}

// ============================================
// TASK QUERIES
// ============================================

/**
 * Get tasks for a project with filters
 */
export async function getTasks(filters: TaskFilters): Promise<Task[]> {
  if (!filters.projectId) {
    throw new Error('projectId is required');
  }

  const constraints: Parameters<typeof query>[1][] = [];

  // Filter by task group
  if (filters.taskGroupId) {
    constraints.push(where('taskGroupId', '==', filters.taskGroupId));
  }

  // Filter by task type
  if (filters.taskType) {
    constraints.push(where('taskType', '==', filters.taskType));
  }

  // Filter by status
  if (filters.status) {
    constraints.push(where('status', '==', filters.status));
  }

  // Filter by priority
  if (filters.priority) {
    constraints.push(where('priority', '==', filters.priority));
  }

  // Filter by assignee
  if (filters.assigneeUserId) {
    constraints.push(where('assignees', 'array-contains', { userId: filters.assigneeUserId }));
  }

  // Order by position
  constraints.push(orderBy('position', 'asc'));

  // Apply limit
  if (filters.limit) {
    constraints.push(limit(filters.limit));
  }

  const q = query(getTasksCollection(filters.projectId), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => normalizeTask({ id: doc.id, ...doc.data() }));
}

/**
 * Get tasks for a task group
 */
export async function getTaskGroupTasks(
  projectId: string,
  taskGroupId: string,
  statusFilter?: TaskStatus
): Promise<Task[]> {
  return getTasks({
    projectId,
    taskGroupId,
    status: statusFilter,
  });
}

/**
 * Get tasks assigned to a user across all their projects
 * Used for the "My Tasks" view
 */
export async function getMyTasks(
  userId: string,
  projectIds: string[],
  includeCompleted: boolean = false
): Promise<Task[]> {
  const allTasks: Task[] = [];

  for (const projectId of projectIds) {
    const constraints: Parameters<typeof query>[1][] = [
      orderBy('dueDate', 'asc'),
    ];

    const q = query(getTasksCollection(projectId), ...constraints);
    const snapshot = await getDocs(q);

    const projectTasks = snapshot.docs
      .map(doc => normalizeTask({ id: doc.id, ...doc.data() }))
      .filter(task => {
        // Filter by assignee
        const isAssigned =
          task.assignees?.some(a => a.userId === userId) ||
          task.assigneeId === userId; // Legacy field

        if (!isAssigned) return false;

        // Filter by completion status
        if (!includeCompleted && task.status === 'done') return false;

        return true;
      });

    allTasks.push(...projectTasks);
  }

  // Sort by due date, then by creation date
  return allTasks.sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return a.dueDate.toMillis() - b.dueDate.toMillis();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt.toMillis() - a.createdAt.toMillis();
  });
}

/**
 * Get tasks for a BOM item
 * Returns both cell-level tasks and project-level tasks linked to the item
 */
export async function getItemTasks(
  projectId: string,
  itemId: string
): Promise<Task[]> {
  // Get cell-level tasks for this item
  const cellTasksQuery = query(
    getTasksCollection(projectId),
    where('itemId', '==', itemId),
    orderBy('createdAt', 'desc')
  );

  // Get project-level tasks linked to this item
  // This requires checking the linkedItems array
  const allTasksQuery = query(
    getTasksCollection(projectId),
    orderBy('createdAt', 'desc')
  );

  const [cellSnapshot, allSnapshot] = await Promise.all([
    getDocs(cellTasksQuery),
    getDocs(allTasksQuery),
  ]);

  const cellTasks = cellSnapshot.docs.map(doc =>
    normalizeTask({ id: doc.id, ...doc.data() })
  );

  const linkedTasks = allSnapshot.docs
    .map(doc => normalizeTask({ id: doc.id, ...doc.data() }))
    .filter(
      task =>
        task.taskType === 'project' &&
        task.linkedItems?.some(item => item.id === itemId)
    );

  // Combine and deduplicate
  const taskMap = new Map<string, Task>();
  [...cellTasks, ...linkedTasks].forEach(task => taskMap.set(task.id, task));

  return Array.from(taskMap.values()).sort(
    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
  );
}

/**
 * Get tasks linked to a PACE gate
 */
export async function getGateTasks(
  projectId: string,
  gateId: string
): Promise<Task[]> {
  const q = query(
    getTasksCollection(projectId),
    where('linkedGate.gateId', '==', gateId),
    orderBy('position', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => normalizeTask({ id: doc.id, ...doc.data() }));
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(
  projectId: string,
  assigneeUserId?: string
): Promise<Task[]> {
  const q = query(
    getTasksCollection(projectId),
    where('status', 'in', ['todo', 'in_progress']),
    where('dueDate', '<', Timestamp.now()),
    orderBy('dueDate', 'asc')
  );

  const snapshot = await getDocs(q);
  let tasks = snapshot.docs.map(doc => normalizeTask({ id: doc.id, ...doc.data() }));

  if (assigneeUserId) {
    tasks = tasks.filter(
      task =>
        task.assignees?.some(a => a.userId === assigneeUserId) ||
        task.assigneeId === assigneeUserId
    );
  }

  return tasks;
}

/**
 * Get task counts by status
 */
export async function getTaskStatusCounts(
  projectId: string,
  taskGroupId?: string
): Promise<TaskStatusCounts> {
  const constraints: Parameters<typeof query>[1][] = [];

  if (taskGroupId) {
    constraints.push(where('taskGroupId', '==', taskGroupId));
  }

  const q = query(getTasksCollection(projectId), ...constraints);
  const snapshot = await getDocs(q);

  const counts: TaskStatusCounts = {
    todo: 0,
    in_progress: 0,
    done: 0,
    total: 0,
  };

  for (const doc of snapshot.docs) {
    const task = normalizeTask({ id: doc.id, ...doc.data() });
    counts[task.status]++;
    counts.total++;
  }

  return counts;
}

// ============================================
// SUBTASK OPERATIONS
// ============================================

/**
 * Toggle subtask completion
 */
export async function toggleSubtask(
  projectId: string,
  taskId: string,
  subtaskId: string,
  userId?: string
): Promise<void> {
  const task = await getTask(projectId, taskId);
  if (!task || !task.subtasks) return;

  const updatedSubtasks = task.subtasks.map(st => {
    if (st.id === subtaskId) {
      return {
        ...st,
        completed: !st.completed,
        completedAt: !st.completed ? Timestamp.now() : undefined,
        completedBy: !st.completed ? userId : undefined,
      };
    }
    return st;
  });

  await updateDoc(getTaskRef(projectId, taskId), {
    subtasks: updatedSubtasks,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Add a subtask
 */
export async function addSubtask(
  projectId: string,
  taskId: string,
  title: string
): Promise<void> {
  const task = await getTask(projectId, taskId);
  if (!task) return;

  const subtasks = task.subtasks || [];
  const newSubtask = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    position: subtasks.length,
  };

  await updateDoc(getTaskRef(projectId, taskId), {
    subtasks: [...subtasks, newSubtask],
    updatedAt: Timestamp.now(),
  });
}

/**
 * Remove a subtask
 */
export async function removeSubtask(
  projectId: string,
  taskId: string,
  subtaskId: string
): Promise<void> {
  const task = await getTask(projectId, taskId);
  if (!task || !task.subtasks) return;

  const updatedSubtasks = task.subtasks
    .filter(st => st.id !== subtaskId)
    .map((st, index) => ({ ...st, position: index }));

  await updateDoc(getTaskRef(projectId, taskId), {
    subtasks: updatedSubtasks,
    updatedAt: Timestamp.now(),
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get next position for a new task
 */
async function getNextTaskPosition(
  projectId: string,
  taskGroupId?: string
): Promise<number> {
  const constraints: Parameters<typeof query>[1][] = [
    orderBy('position', 'desc'),
    limit(1),
  ];

  if (taskGroupId) {
    constraints.unshift(where('taskGroupId', '==', taskGroupId));
  }

  const q = query(getTasksCollection(projectId), ...constraints);
  const snapshot = await getDocs(q);

  if (snapshot.empty) return 0;

  const lastTask = snapshot.docs[0].data();
  return (lastTask.position || 0) + 1;
}

/**
 * Normalize task data
 * Handles legacy data from Phase 14 and ensures consistent structure
 */
function normalizeTask(data: Record<string, unknown>): Task {
  // Cast to Task, allowing unknown properties
  const task = data as unknown as Task;

  // Default taskType if not set (legacy tasks are cell tasks)
  if (!task.taskType) {
    task.taskType = task.itemId ? 'cell' : 'project';
  }

  // Normalize status from legacy values
  if (task.status && !['todo', 'in_progress', 'done'].includes(task.status)) {
    task.status = mapLegacyStatus(task.status as string);
  }

  // Ensure arrays exist
  if (!task.assignees) task.assignees = [];
  if (!task.linkedItems) task.linkedItems = [];

  // Migrate single assignee to assignees array (legacy support)
  if (task.assigneeId && task.assignees.length === 0) {
    task.assignees = [
      {
        type: 'user',
        userId: task.assigneeId,
        name: task.assigneeName || 'Unknown',
        email: task.assigneeEmail,
      },
    ];
  }

  return task;
}

/**
 * Create a cell-level task (from a comment)
 * Convenience wrapper for backward compatibility
 */
export async function createCellTask(
  projectId: string,
  itemId: string,
  itemCode: string,
  field: string,
  title: string,
  assignee: TaskAssignee,
  userId: string,
  userName: string,
  options?: {
    description?: string;
    dueDate?: Timestamp;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    fieldDisplayName?: string;
    threadId?: string;
    commentId?: string;
  }
): Promise<string> {
  return createTask(
    {
      projectId,
      taskType: 'cell',
      itemId,
      itemCode,
      field,
      fieldDisplayName: options?.fieldDisplayName,
      threadId: options?.threadId,
      commentId: options?.commentId,
      title,
      description: options?.description,
      priority: options?.priority,
      dueDate: options?.dueDate,
      assignees: [assignee],
    },
    userId,
    userName
  );
}

/**
 * Create a project-level task
 * Convenience wrapper for project tasks
 */
export async function createProjectTask(
  projectId: string,
  taskGroupId: string,
  title: string,
  userId: string,
  userName: string,
  options?: {
    description?: string;
    status?: TaskStatus;
    dueDate?: Timestamp;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    assignees?: TaskAssignee[];
    linkedGate?: Task['linkedGate'];
  }
): Promise<string> {
  return createTask(
    {
      projectId,
      taskType: 'project',
      taskGroupId,
      title,
      description: options?.description,
      status: options?.status,
      priority: options?.priority,
      dueDate: options?.dueDate,
      assignees: options?.assignees,
      linkedGate: options?.linkedGate,
    },
    userId,
    userName
  );
}
