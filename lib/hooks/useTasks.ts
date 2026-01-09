import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task, TaskStatus, TaskType, mapLegacyStatus } from '@/types/task';
import { useMemo } from 'react';

/**
 * Phase 15: useTasks Hook
 * 
 * Real-time hook for fetching tasks.
 * Supports filtering by task group, status, and task type.
 */

interface UseTasksOptions {
  projectId: string;
  taskGroupId?: string;
  taskType?: TaskType;
  status?: TaskStatus;
  includeCompleted?: boolean;
}

interface UseTasksResult {
  tasks: Task[];
  loading: boolean;
  error: Error | undefined;
  tasksByStatus: Record<TaskStatus, Task[]>;
}

/**
 * Normalize task data from Firestore
 */
function normalizeTask(id: string, data: Record<string, unknown>): Task {
  const task = { id, ...data } as Task;

  // Default taskType if not set
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

  // Migrate single assignee to assignees array
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

export function useTasks(options: UseTasksOptions): UseTasksResult {
  const { projectId, taskGroupId, taskType, status, includeCompleted = true } = options;

  // Build query constraints
  const constraints = useMemo(() => {
    const c: Parameters<typeof query>[1][] = [];

    if (taskGroupId) {
      c.push(where('taskGroupId', '==', taskGroupId));
    }

    if (taskType) {
      c.push(where('taskType', '==', taskType));
    }

    if (status) {
      c.push(where('status', '==', status));
    } else if (!includeCompleted) {
      c.push(where('status', 'in', ['todo', 'in_progress']));
    }

    c.push(orderBy('position', 'asc'));

    return c;
  }, [taskGroupId, taskType, status, includeCompleted]);

  const [snapshot, loading, error] = useCollection(
    query(collection(db, 'projects', projectId, 'tasks'), ...constraints)
  );

  const tasks: Task[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.docs.map(doc =>
      normalizeTask(doc.id, doc.data() as Record<string, unknown>)
    );
  }, [snapshot]);

  // Group tasks by status for Kanban view
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    }

    return grouped;
  }, [tasks]);

  return {
    tasks,
    loading,
    error,
    tasksByStatus,
  };
}

/**
 * Hook for fetching tasks for a specific BOM item
 */
interface UseItemTasksOptions {
  projectId: string;
  itemId: string;
}

export function useItemTasks(options: UseItemTasksOptions) {
  const { projectId, itemId } = options;

  // Get cell-level tasks for this item
  const [snapshot, loading, error] = useCollection(
    query(
      collection(db, 'projects', projectId, 'tasks'),
      where('itemId', '==', itemId),
      orderBy('createdAt', 'desc')
    )
  );

  const tasks: Task[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.docs.map(doc =>
      normalizeTask(doc.id, doc.data() as Record<string, unknown>)
    );
  }, [snapshot]);

  return {
    tasks,
    loading,
    error,
  };
}

/**
 * Hook for fetching tasks linked to a PACE gate
 */
interface UseGateTasksOptions {
  projectId: string;
  gateId: string;
}

export function useGateTasks(options: UseGateTasksOptions) {
  const { projectId, gateId } = options;

  const [snapshot, loading, error] = useCollection(
    query(
      collection(db, 'projects', projectId, 'tasks'),
      where('linkedGate.gateId', '==', gateId),
      orderBy('position', 'asc')
    )
  );

  const tasks: Task[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.docs.map(doc =>
      normalizeTask(doc.id, doc.data() as Record<string, unknown>)
    );
  }, [snapshot]);

  return {
    tasks,
    loading,
    error,
    count: tasks.length,
  };
}

/**
 * Hook for fetching overdue tasks
 */
interface UseOverdueTasksOptions {
  projectId: string;
}

export function useOverdueTasks(options: UseOverdueTasksOptions) {
  const { projectId } = options;

  const [snapshot, loading, error] = useCollection(
    query(
      collection(db, 'projects', projectId, 'tasks'),
      where('status', 'in', ['todo', 'in_progress']),
      where('dueDate', '<', Timestamp.now()),
      orderBy('dueDate', 'asc')
    )
  );

  const tasks: Task[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.docs.map(doc =>
      normalizeTask(doc.id, doc.data() as Record<string, unknown>)
    );
  }, [snapshot]);

  return {
    tasks,
    loading,
    error,
    count: tasks.length,
  };
}
