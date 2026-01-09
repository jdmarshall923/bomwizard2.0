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
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  TaskGroupTemplate,
  CreateTemplateInput,
  CustomFieldSchema,
} from '@/types/task';
import {
  SYSTEM_TEMPLATES,
  getSystemTemplate,
  isSystemTemplate,
} from './defaultTemplates';

/**
 * Phase 15: Task Template Service
 * 
 * Manages user-created task group templates.
 * Templates are stored organization-wide and can be used across all projects.
 */

// ============================================
// COLLECTION PATHS
// ============================================

const getTemplatesCollection = (organizationId: string) =>
  collection(db, 'organizations', organizationId, 'taskTemplates');

const getTemplateRef = (organizationId: string, templateId: string) =>
  doc(db, 'organizations', organizationId, 'taskTemplates', templateId);

// ============================================
// TEMPLATE CRUD
// ============================================

/**
 * Create a new template
 */
export async function createTemplate(
  input: CreateTemplateInput,
  userId: string
): Promise<string> {
  const { organizationId, ...templateData } = input;

  // Build template object, excluding undefined values (Firestore doesn't accept undefined)
  const template: Record<string, unknown> = {
    organizationId,
    name: templateData.name,
    icon: templateData.icon || '📋',
    defaultView: templateData.defaultView || 'kanban',
    kanbanGroupBy: templateData.kanbanGroupBy || 'status',
    customFields: templateData.customFields || [],
    defaultTasks: templateData.defaultTasks || [],
    isSystem: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: userId,
  };

  // Only add optional fields if they have values
  if (templateData.description) {
    template.description = templateData.description;
  }
  if (templateData.color) {
    template.color = templateData.color;
  }

  const docRef = await addDoc(getTemplatesCollection(organizationId), template);
  return docRef.id;
}

/**
 * Get a template by ID
 * Checks both system templates and user-created templates
 */
export async function getTemplate(
  organizationId: string,
  templateId: string
): Promise<TaskGroupTemplate | null> {
  // Check system templates first
  if (isSystemTemplate(templateId)) {
    return getSystemTemplate(templateId) || null;
  }

  // Check user-created templates
  const docRef = getTemplateRef(organizationId, templateId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() } as TaskGroupTemplate;
}

/**
 * Update a template
 * Only works for user-created templates (not system templates)
 */
export async function updateTemplate(
  organizationId: string,
  templateId: string,
  updates: Partial<Omit<TaskGroupTemplate, 'id' | 'organizationId' | 'isSystem' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  if (isSystemTemplate(templateId)) {
    throw new Error('Cannot update system templates');
  }

  const templateRef = getTemplateRef(organizationId, templateId);

  // Filter out undefined values (Firestore doesn't accept undefined)
  const cleanedUpdates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanedUpdates[key] = value;
    }
  });

  await updateDoc(templateRef, cleanedUpdates);
}

/**
 * Delete a template
 * Only works for user-created templates (not system templates)
 */
export async function deleteTemplate(
  organizationId: string,
  templateId: string
): Promise<void> {
  if (isSystemTemplate(templateId)) {
    throw new Error('Cannot delete system templates');
  }

  await deleteDoc(getTemplateRef(organizationId, templateId));
}

// ============================================
// TEMPLATE QUERIES
// ============================================

/**
 * Get all templates for an organization
 * Includes both system templates and user-created templates
 */
export async function getTemplates(organizationId: string): Promise<TaskGroupTemplate[]> {
  // Get user-created templates
  const q = query(
    getTemplatesCollection(organizationId),
    orderBy('name', 'asc')
  );

  const snapshot = await getDocs(q);
  const userTemplates = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as TaskGroupTemplate[];

  // Combine with system templates
  return [...SYSTEM_TEMPLATES, ...userTemplates];
}

/**
 * Get only system templates
 */
export function getOnlySystemTemplates(): TaskGroupTemplate[] {
  return SYSTEM_TEMPLATES;
}

/**
 * Get only user-created templates
 */
export async function getUserTemplates(organizationId: string): Promise<TaskGroupTemplate[]> {
  const q = query(
    getTemplatesCollection(organizationId),
    orderBy('name', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as TaskGroupTemplate[];
}

// ============================================
// TEMPLATE CUSTOM FIELD OPERATIONS
// ============================================

/**
 * Add a custom field to a template
 */
export async function addTemplateCustomField(
  organizationId: string,
  templateId: string,
  field: Omit<CustomFieldSchema, 'id' | 'position'>
): Promise<string> {
  if (isSystemTemplate(templateId)) {
    throw new Error('Cannot modify system templates');
  }

  const template = await getTemplate(organizationId, templateId);
  if (!template) throw new Error('Template not found');

  const fieldId = crypto.randomUUID();
  const newField: CustomFieldSchema = {
    ...field,
    id: fieldId,
    position: template.customFields.length,
  };

  await updateDoc(getTemplateRef(organizationId, templateId), {
    customFields: [...template.customFields, newField],
    updatedAt: Timestamp.now(),
  });

  return fieldId;
}

/**
 * Update a custom field in a template
 */
export async function updateTemplateCustomField(
  organizationId: string,
  templateId: string,
  fieldId: string,
  updates: Partial<Omit<CustomFieldSchema, 'id'>>
): Promise<void> {
  if (isSystemTemplate(templateId)) {
    throw new Error('Cannot modify system templates');
  }

  const template = await getTemplate(organizationId, templateId);
  if (!template) throw new Error('Template not found');

  const updatedFields = template.customFields.map(field => {
    if (field.id === fieldId) {
      return { ...field, ...updates };
    }
    return field;
  });

  await updateDoc(getTemplateRef(organizationId, templateId), {
    customFields: updatedFields,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Remove a custom field from a template
 */
export async function removeTemplateCustomField(
  organizationId: string,
  templateId: string,
  fieldId: string
): Promise<void> {
  if (isSystemTemplate(templateId)) {
    throw new Error('Cannot modify system templates');
  }

  const template = await getTemplate(organizationId, templateId);
  if (!template) throw new Error('Template not found');

  const updatedFields = template.customFields
    .filter(field => field.id !== fieldId)
    .map((field, index) => ({ ...field, position: index }));

  await updateDoc(getTemplateRef(organizationId, templateId), {
    customFields: updatedFields,
    updatedAt: Timestamp.now(),
  });
}

// ============================================
// TEMPLATE DEFAULT TASKS OPERATIONS
// ============================================

/**
 * Add a default task to a template
 */
export async function addTemplateDefaultTask(
  organizationId: string,
  templateId: string,
  task: { title: string; description?: string; subtasks?: { title: string }[] }
): Promise<void> {
  if (isSystemTemplate(templateId)) {
    throw new Error('Cannot modify system templates');
  }

  const template = await getTemplate(organizationId, templateId);
  if (!template) throw new Error('Template not found');

  const defaultTasks = template.defaultTasks || [];

  await updateDoc(getTemplateRef(organizationId, templateId), {
    defaultTasks: [...defaultTasks, task],
    updatedAt: Timestamp.now(),
  });
}

/**
 * Remove a default task from a template
 */
export async function removeTemplateDefaultTask(
  organizationId: string,
  templateId: string,
  taskIndex: number
): Promise<void> {
  if (isSystemTemplate(templateId)) {
    throw new Error('Cannot modify system templates');
  }

  const template = await getTemplate(organizationId, templateId);
  if (!template) throw new Error('Template not found');

  const defaultTasks = (template.defaultTasks || []).filter(
    (_, index) => index !== taskIndex
  );

  await updateDoc(getTemplateRef(organizationId, templateId), {
    defaultTasks,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update default tasks in a template
 */
export async function updateTemplateDefaultTasks(
  organizationId: string,
  templateId: string,
  defaultTasks: Array<{ title: string; description?: string; subtasks?: { title: string }[] }>
): Promise<void> {
  if (isSystemTemplate(templateId)) {
    throw new Error('Cannot modify system templates');
  }

  await updateDoc(getTemplateRef(organizationId, templateId), {
    defaultTasks,
    updatedAt: Timestamp.now(),
  });
}

// ============================================
// TEMPLATE DUPLICATION
// ============================================

/**
 * Duplicate a template
 * Can duplicate both system and user templates
 */
export async function duplicateTemplate(
  organizationId: string,
  templateId: string,
  newName: string,
  userId: string
): Promise<string> {
  const template = await getTemplate(organizationId, templateId);
  if (!template) throw new Error('Template not found');

  return createTemplate(
    {
      organizationId,
      name: newName,
      description: template.description,
      icon: template.icon,
      color: template.color,
      defaultView: template.defaultView,
      kanbanGroupBy: template.kanbanGroupBy,
      customFields: template.customFields.map(field => ({
        ...field,
        id: crypto.randomUUID(),
      })),
      defaultTasks: template.defaultTasks,
    },
    userId
  );
}

/**
 * Create a template from an existing task group
 */
export async function createTemplateFromTaskGroup(
  organizationId: string,
  taskGroup: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    defaultView: 'kanban' | 'table' | 'list';
    kanbanGroupBy: string;
    customFields: CustomFieldSchema[];
  },
  templateName: string,
  userId: string
): Promise<string> {
  return createTemplate(
    {
      organizationId,
      name: templateName,
      description: taskGroup.description,
      icon: taskGroup.icon,
      color: taskGroup.color,
      defaultView: taskGroup.defaultView,
      kanbanGroupBy: taskGroup.kanbanGroupBy,
      customFields: taskGroup.customFields.map(field => ({
        ...field,
        id: crypto.randomUUID(),
      })),
    },
    userId
  );
}
