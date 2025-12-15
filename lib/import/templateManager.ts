import { ImportTemplate } from '@/types';
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocument,
} from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

/**
 * Get all import templates for a user
 */
export async function getTemplates(userId?: string): Promise<ImportTemplate[]> {
  const constraints: any[] = [];
  
  if (userId) {
    const { where } = await import('firebase/firestore');
    constraints.push(where('createdBy', '==', userId));
  }

  return await getDocuments<ImportTemplate>('importTemplates', ...constraints);
}

/**
 * Get a template by ID
 */
export async function getTemplate(templateId: string): Promise<ImportTemplate | null> {
  return await getDocument<ImportTemplate>('importTemplates', templateId);
}

/**
 * Get the default template for a source type
 */
export async function getDefaultTemplate(
  sourceType: ImportTemplate['sourceType']
): Promise<ImportTemplate | null> {
  const { where, limit } = await import('firebase/firestore');
  const templates = await getDocuments<ImportTemplate>(
    'importTemplates',
    where('sourceType', '==', sourceType),
    where('isDefault', '==', true),
    limit(1)
  );
  
  return templates.length > 0 ? templates[0] : null;
}

/**
 * Create a new import template
 */
export async function createTemplate(
  template: Omit<ImportTemplate, 'id' | 'createdAt'>
): Promise<string> {
  // If this is set as default, unset other defaults of the same source type
  if (template.isDefault) {
    await unsetOtherDefaults(template.sourceType, template.createdBy);
  }

  return await createDocument<ImportTemplate>('importTemplates', {
    ...template,
    createdAt: Timestamp.now(),
  } as Omit<ImportTemplate, 'id'>);
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<ImportTemplate>
): Promise<void> {
  // If setting as default, unset other defaults
  if (updates.isDefault === true) {
    const template = await getTemplate(templateId);
    if (template) {
      await unsetOtherDefaults(template.sourceType, template.createdBy);
    }
  }

  await updateDocument('importTemplates', templateId, updates);
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  await deleteDocument('importTemplates', templateId);
}

/**
 * Unset default flag for other templates of the same source type
 */
async function unsetOtherDefaults(
  sourceType: ImportTemplate['sourceType'],
  userId: string
): Promise<void> {
  const { where } = await import('firebase/firestore');
  const templates = await getDocuments<ImportTemplate>(
    'importTemplates',
    where('sourceType', '==', sourceType),
    where('isDefault', '==', true),
    where('createdBy', '==', userId)
  );

  // Unset default for all matching templates
  const updatePromises = templates.map((template) =>
    updateDocument('importTemplates', template.id, { isDefault: false })
  );

  await Promise.all(updatePromises);
}

/**
 * Create a default template for Infor BOM format
 */
export async function createDefaultInforTemplate(userId: string): Promise<string> {
  return await createTemplate({
    name: 'Default Infor BOM Template',
    description: 'Standard template for importing BOM data from Infor',
    sourceType: 'infor_bom',
    columnMappings: {
      sourceColumns: ['Item Code', 'Description', 'Qty', 'Assembly', 'Unit Cost', 'Category'],
      mappings: {
        itemCode: { source: 'Item Code', transform: 'uppercase' },
        itemDescription: { source: 'Description', transform: null },
        quantity: { source: 'Qty', transform: 'parseFloat' },
        assemblyCode: { source: 'Assembly', transform: 'uppercase' },
        materialCost: { source: 'Unit Cost', transform: 'parseFloat' },
        partCategory: { source: 'Category', transform: null },
      },
      skipRows: 1,
      delimiter: ',',
    },
    isDefault: true,
    createdBy: userId,
  });
}

