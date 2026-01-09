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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  TaskGroup,
  TaskGroupWithCounts,
  CreateTaskGroupInput,
  UpdateTaskGroupInput,
  TaskGroupFilters,
  TaskStatusCounts,
  CustomFieldSchema,
} from '@/types/task';
import { getTaskStatusCounts } from './taskService';

/**
 * Phase 15: Task Group Service
 * 
 * Manages task groups - like Notion databases within a project.
 * Each project can have multiple task groups with different views and custom fields.
 */

// ============================================
// COLLECTION PATHS
// ============================================

const getTaskGroupsCollection = (projectId: string) =>
  collection(db, 'projects', projectId, 'taskGroups');

const getTaskGroupRef = (projectId: string, groupId: string) =>
  doc(db, 'projects', projectId, 'taskGroups', groupId);

// ============================================
// TASK GROUP CRUD
// ============================================

/**
 * Create a new task group
 */
export async function createTaskGroup(
  input: CreateTaskGroupInput,
  userId: string
): Promise<string> {
  const { projectId, ...groupData } = input;

  // Get next position for ordering
  const position = await getNextGroupPosition(projectId);

  // Build group object, excluding undefined values (Firestore doesn't accept undefined)
  const group: Record<string, unknown> = {
    projectId,
    name: groupData.name,
    icon: groupData.icon || '📋',
    defaultView: groupData.defaultView || 'kanban',
    kanbanGroupBy: groupData.kanbanGroupBy || 'status',
    customFields: groupData.customFields || [],
    position,
    taskCount: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: userId,
  };

  // Only add optional fields if they have values
  if (groupData.description) {
    group.description = groupData.description;
  }
  if (groupData.color) {
    group.color = groupData.color;
  }
  if (groupData.templateId) {
    group.templateId = groupData.templateId;
  }

  const docRef = await addDoc(getTaskGroupsCollection(projectId), group);
  return docRef.id;
}

/**
 * Get a task group by ID
 */
export async function getTaskGroup(
  projectId: string,
  groupId: string
): Promise<TaskGroup | null> {
  const docRef = getTaskGroupRef(projectId, groupId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() } as TaskGroup;
}

/**
 * Get a task group with task counts
 */
export async function getTaskGroupWithCounts(
  projectId: string,
  groupId: string
): Promise<TaskGroupWithCounts | null> {
  const group = await getTaskGroup(projectId, groupId);
  if (!group) return null;

  const taskCounts = await getTaskStatusCounts(projectId, groupId);

  return { ...group, taskCounts };
}

/**
 * Update a task group
 */
export async function updateTaskGroup(
  projectId: string,
  groupId: string,
  updates: UpdateTaskGroupInput
): Promise<void> {
  const groupRef = getTaskGroupRef(projectId, groupId);

  // Filter out undefined values - Firestore doesn't accept them
  const cleanedUpdates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanedUpdates[key] = value;
    }
  });

  await updateDoc(groupRef, cleanedUpdates);
}

/**
 * Delete a task group
 * Note: This does NOT delete the tasks in the group.
 * Tasks can be migrated to another group or deleted separately.
 */
export async function deleteTaskGroup(
  projectId: string,
  groupId: string
): Promise<void> {
  await deleteDoc(getTaskGroupRef(projectId, groupId));
}

/**
 * Update task group position (for reordering)
 */
export async function updateTaskGroupPosition(
  projectId: string,
  groupId: string,
  newPosition: number
): Promise<void> {
  await updateDoc(getTaskGroupRef(projectId, groupId), {
    position: newPosition,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Batch update task group positions
 */
export async function batchUpdateGroupPositions(
  projectId: string,
  updates: Array<{ groupId: string; position: number }>
): Promise<void> {
  const batch = writeBatch(db);

  for (const update of updates) {
    const groupRef = getTaskGroupRef(projectId, update.groupId);
    batch.update(groupRef, {
      position: update.position,
      updatedAt: Timestamp.now(),
    });
  }

  await batch.commit();
}

// ============================================
// TASK GROUP QUERIES
// ============================================

/**
 * Get all task groups for a project
 */
export async function getTaskGroups(
  filters: TaskGroupFilters
): Promise<TaskGroup[]> {
  const constraints: Parameters<typeof query>[1][] = [
    orderBy('position', 'asc'),
  ];

  if (filters.limit) {
    constraints.push(limit(filters.limit));
  }

  const q = query(getTaskGroupsCollection(filters.projectId), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as TaskGroup[];
}

/**
 * Get all task groups with task counts
 */
export async function getTaskGroupsWithCounts(
  projectId: string
): Promise<TaskGroupWithCounts[]> {
  const groups = await getTaskGroups({ projectId });

  const groupsWithCounts = await Promise.all(
    groups.map(async group => {
      const taskCounts = await getTaskStatusCounts(projectId, group.id);
      return { ...group, taskCounts };
    })
  );

  return groupsWithCounts;
}

// ============================================
// CUSTOM FIELD OPERATIONS
// ============================================

/**
 * Add a custom field to a task group
 */
export async function addCustomField(
  projectId: string,
  groupId: string,
  field: Omit<CustomFieldSchema, 'id' | 'position'>
): Promise<string> {
  const group = await getTaskGroup(projectId, groupId);
  if (!group) throw new Error('Task group not found');

  const fieldId = crypto.randomUUID();
  const newField: CustomFieldSchema = {
    ...field,
    id: fieldId,
    position: group.customFields.length,
  };

  await updateDoc(getTaskGroupRef(projectId, groupId), {
    customFields: [...group.customFields, newField],
    updatedAt: Timestamp.now(),
  });

  return fieldId;
}

/**
 * Update a custom field
 */
export async function updateCustomField(
  projectId: string,
  groupId: string,
  fieldId: string,
  updates: Partial<Omit<CustomFieldSchema, 'id'>>
): Promise<void> {
  const group = await getTaskGroup(projectId, groupId);
  if (!group) throw new Error('Task group not found');

  const updatedFields = group.customFields.map(field => {
    if (field.id === fieldId) {
      return { ...field, ...updates };
    }
    return field;
  });

  await updateDoc(getTaskGroupRef(projectId, groupId), {
    customFields: updatedFields,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Remove a custom field
 */
export async function removeCustomField(
  projectId: string,
  groupId: string,
  fieldId: string
): Promise<void> {
  const group = await getTaskGroup(projectId, groupId);
  if (!group) throw new Error('Task group not found');

  const updatedFields = group.customFields
    .filter(field => field.id !== fieldId)
    .map((field, index) => ({ ...field, position: index }));

  await updateDoc(getTaskGroupRef(projectId, groupId), {
    customFields: updatedFields,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Reorder custom fields
 */
export async function reorderCustomFields(
  projectId: string,
  groupId: string,
  fieldIds: string[]
): Promise<void> {
  const group = await getTaskGroup(projectId, groupId);
  if (!group) throw new Error('Task group not found');

  const fieldMap = new Map(group.customFields.map(f => [f.id, f]));
  const reorderedFields = fieldIds
    .map((id, index) => {
      const field = fieldMap.get(id);
      if (!field) return null;
      return { ...field, position: index };
    })
    .filter(Boolean) as CustomFieldSchema[];

  await updateDoc(getTaskGroupRef(projectId, groupId), {
    customFields: reorderedFields,
    updatedAt: Timestamp.now(),
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get next position for a new task group
 */
async function getNextGroupPosition(projectId: string): Promise<number> {
  const q = query(
    getTaskGroupsCollection(projectId),
    orderBy('position', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return 0;

  const lastGroup = snapshot.docs[0].data();
  return (lastGroup.position || 0) + 1;
}

/**
 * Create default task group for a project
 * Called when a project is first set up with task management
 */
export async function createDefaultTaskGroup(
  projectId: string,
  userId: string
): Promise<string> {
  return createTaskGroup(
    {
      projectId,
      name: 'General Tasks',
      description: 'Default task group for this project',
      icon: '📋',
      defaultView: 'kanban',
      kanbanGroupBy: 'status',
      customFields: [],
    },
    userId
  );
}

/**
 * Duplicate a task group (structure only, not tasks)
 */
export async function duplicateTaskGroup(
  projectId: string,
  groupId: string,
  newName: string,
  userId: string
): Promise<string> {
  const group = await getTaskGroup(projectId, groupId);
  if (!group) throw new Error('Task group not found');

  return createTaskGroup(
    {
      projectId,
      name: newName,
      description: group.description,
      icon: group.icon,
      color: group.color,
      defaultView: group.defaultView,
      kanbanGroupBy: group.kanbanGroupBy,
      customFields: group.customFields.map(field => ({
        ...field,
        id: crypto.randomUUID(),
      })),
    },
    userId
  );
}
