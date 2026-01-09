import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, collectionGroup, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task, TaskStatus, mapLegacyStatus, isTaskDueToday, isTaskDueThisWeek } from '@/types/task';
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useProjects } from './useProjects';

/**
 * Phase 15: useMyTasks Hook
 * 
 * Cross-project hook for fetching tasks assigned to the current user.
 * Used for the "My Tasks" view.
 */

interface UseMyTasksOptions {
  includeCompleted?: boolean;
  limitPerProject?: number;
}

interface GroupedTasks {
  overdue: Task[];
  today: Task[];
  thisWeek: Task[];
  later: Task[];
  completed: Task[];
  noDueDate: Task[];
}

interface UseMyTasksResult {
  tasks: Task[];
  groupedTasks: GroupedTasks;
  loading: boolean;
  error: Error | undefined;
  taskCount: number;
  overdueCount: number;
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

export function useMyTasks(options: UseMyTasksOptions = {}): UseMyTasksResult {
  const { includeCompleted = false } = options;
  const { user } = useAuth();
  const { projects } = useProjects();

  // We need to query each project's tasks separately
  // In a production app, you might want to use a cloud function for this
  // For now, we'll fetch from all projects the user has access to

  // Get tasks from all projects
  const projectIds = useMemo(() => projects.map(p => p.id), [projects]);

  // Query all tasks across projects (using collection group query)
  // Note: This requires a Firestore index on the 'tasks' collection group
  const [snapshot, loading, error] = useCollection(
    user
      ? query(
          collectionGroup(db, 'tasks'),
          orderBy('dueDate', 'asc')
        )
      : null
  );

  // Filter and normalize tasks
  const tasks: Task[] = useMemo(() => {
    if (!snapshot || !user) return [];

    return snapshot.docs
      .map(doc => normalizeTask(doc.id, doc.data() as Record<string, unknown>))
      .filter(task => {
        // Check if user is assigned
        const isAssigned =
          task.assignees?.some(a => a.userId === user.uid) ||
          task.assigneeId === user.uid;

        if (!isAssigned) return false;

        // Filter by project access
        if (!projectIds.includes(task.projectId)) return false;

        // Filter completed tasks
        if (!includeCompleted && task.status === 'done') return false;

        return true;
      })
      .sort((a, b) => {
        // Sort by due date, then by creation date
        if (a.dueDate && b.dueDate) {
          return a.dueDate.toMillis() - b.dueDate.toMillis();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });
  }, [snapshot, user, projectIds, includeCompleted]);

  // Group tasks by time period
  const groupedTasks = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const groups: GroupedTasks = {
      overdue: [],
      today: [],
      thisWeek: [],
      later: [],
      completed: [],
      noDueDate: [],
    };

    for (const task of tasks) {
      if (task.status === 'done') {
        groups.completed.push(task);
        continue;
      }

      if (!task.dueDate) {
        groups.noDueDate.push(task);
        continue;
      }

      const dueDate = task.dueDate.toDate();
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < now) {
        groups.overdue.push(task);
      } else if (isTaskDueToday(task)) {
        groups.today.push(task);
      } else if (isTaskDueThisWeek(task)) {
        groups.thisWeek.push(task);
      } else {
        groups.later.push(task);
      }
    }

    return groups;
  }, [tasks]);

  return {
    tasks,
    groupedTasks,
    loading,
    error,
    taskCount: tasks.length,
    overdueCount: groupedTasks.overdue.length,
  };
}

/**
 * Hook for task summary counts (for sidebar badges)
 */
export function useMyTaskCounts() {
  const { groupedTasks, loading, error } = useMyTasks({ includeCompleted: false });

  return {
    total: groupedTasks.overdue.length + 
           groupedTasks.today.length + 
           groupedTasks.thisWeek.length + 
           groupedTasks.later.length +
           groupedTasks.noDueDate.length,
    overdue: groupedTasks.overdue.length,
    today: groupedTasks.today.length,
    thisWeek: groupedTasks.thisWeek.length,
    loading,
    error,
  };
}
