import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TaskGroup, TaskGroupWithCounts, TaskStatusCounts } from '@/types/task';
import { useMemo } from 'react';
import { useTasks } from './useTasks';

/**
 * Phase 15: useTaskGroups Hook
 * 
 * Real-time hook for fetching task groups.
 */

interface UseTaskGroupsOptions {
  projectId: string;
}

interface UseTaskGroupsResult {
  taskGroups: TaskGroup[];
  loading: boolean;
  error: Error | undefined;
}

export function useTaskGroups(options: UseTaskGroupsOptions): UseTaskGroupsResult {
  const { projectId } = options;

  const [snapshot, loading, error] = useCollection(
    query(
      collection(db, 'projects', projectId, 'taskGroups'),
      orderBy('position', 'asc')
    )
  );

  const taskGroups: TaskGroup[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TaskGroup[];
  }, [snapshot]);

  return {
    taskGroups,
    loading,
    error,
  };
}

/**
 * Hook for fetching a single task group
 */
interface UseTaskGroupOptions {
  projectId: string;
  groupId: string;
}

export function useTaskGroup(options: UseTaskGroupOptions) {
  const { projectId, groupId } = options;

  const [snapshot, loading, error] = useDocument(
    doc(db, 'projects', projectId, 'taskGroups', groupId)
  );

  const taskGroup: TaskGroup | null = useMemo(() => {
    if (!snapshot?.exists()) return null;
    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as TaskGroup;
  }, [snapshot]);

  return {
    taskGroup,
    loading,
    error,
  };
}

/**
 * Hook for fetching a task group with task counts
 */
export function useTaskGroupWithCounts(options: UseTaskGroupOptions): {
  taskGroup: TaskGroupWithCounts | null;
  loading: boolean;
  error: Error | undefined;
} {
  const { projectId, groupId } = options;

  // Get the task group
  const { taskGroup, loading: groupLoading, error: groupError } = useTaskGroup(options);

  // Get tasks for this group
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks({
    projectId,
    taskGroupId: groupId,
  });

  // Calculate task counts
  const taskGroupWithCounts: TaskGroupWithCounts | null = useMemo(() => {
    if (!taskGroup) return null;

    const taskCounts: TaskStatusCounts = {
      todo: 0,
      in_progress: 0,
      done: 0,
      total: 0,
    };

    for (const task of tasks) {
      taskCounts[task.status]++;
      taskCounts.total++;
    }

    return { ...taskGroup, taskCounts };
  }, [taskGroup, tasks]);

  return {
    taskGroup: taskGroupWithCounts,
    loading: groupLoading || tasksLoading,
    error: groupError || tasksError,
  };
}

/**
 * Hook for fetching all task groups with their task counts
 */
export function useTaskGroupsWithCounts(options: UseTaskGroupsOptions): {
  taskGroups: TaskGroupWithCounts[];
  loading: boolean;
  error: Error | undefined;
} {
  const { projectId } = options;

  // Get all task groups
  const { taskGroups, loading: groupsLoading, error: groupsError } = useTaskGroups(options);

  // Get all tasks for the project
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks({
    projectId,
  });

  // Calculate task counts per group
  const taskGroupsWithCounts: TaskGroupWithCounts[] = useMemo(() => {
    // Create a map of task counts by group ID
    const countsByGroup = new Map<string, TaskStatusCounts>();

    for (const task of tasks) {
      if (!task.taskGroupId) continue;

      if (!countsByGroup.has(task.taskGroupId)) {
        countsByGroup.set(task.taskGroupId, {
          todo: 0,
          in_progress: 0,
          done: 0,
          total: 0,
        });
      }

      const counts = countsByGroup.get(task.taskGroupId)!;
      counts[task.status]++;
      counts.total++;
    }

    // Add counts to each group
    return taskGroups.map(group => ({
      ...group,
      taskCounts: countsByGroup.get(group.id) || {
        todo: 0,
        in_progress: 0,
        done: 0,
        total: 0,
      },
    }));
  }, [taskGroups, tasks]);

  return {
    taskGroups: taskGroupsWithCounts,
    loading: groupsLoading || tasksLoading,
    error: groupsError || tasksError,
  };
}
