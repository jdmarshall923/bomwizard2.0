import { TemplateBomItem, BomItem, BomGroup, BomItemType, ItemSource } from '@/types';
import { Timestamp, writeBatch, collection, doc, serverTimestamp, updateDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db, waitForAuth } from '@/lib/firebase/config';
import { transformData, ColumnMappings } from '@/lib/import/columnMapper';
import { createDocument } from '@/lib/firebase/firestore';

/**
 * Remove undefined values from an object (Firestore doesn't accept undefined)
 */
function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Determine the item type based on item code patterns
 */
function determineItemType(itemCode: string): BomItemType {
  if (itemCode.startsWith('GRP-')) return 'group';
  if (itemCode.startsWith('CHECK-')) return 'check';
  if (itemCode.startsWith('SUB-')) return 'substitute';
  if (itemCode.startsWith('G')) return 'manufactured';
  return 'material';
}

/**
 * Determine the item source based on item code or explicit source
 */
function determineItemSource(itemCode: string, explicitSource?: string): ItemSource {
  if (explicitSource) {
    return explicitSource.toLowerCase().includes('manufactured') ? 'manufactured' : 'purchased';
  }
  // G-codes are manufactured, B-codes are purchased
  if (itemCode.startsWith('G')) return 'manufactured';
  return 'purchased';
}

/**
 * Extract category from group code (e.g., GRP-SEAT-A01 -> "Seating")
 */
function extractGroupCategory(groupCode: string): string | undefined {
  const categoryMap: Record<string, string> = {
    'FRAME': 'Frame',
    'SEAT': 'Seating',
    'SADDLE': 'Seating',
    'HBAR': 'Handlebars',
    'HANDLEBAR': 'Handlebars',
    'CRANK': 'Drivetrain',
    'PEDAL': 'Drivetrain',
    'CHAIN': 'Drivetrain',
    'GEAR': 'Drivetrain',
    'WHEEL': 'Wheels',
    'TIRE': 'Wheels',
    'BRAKE': 'Brakes',
    'FORK': 'Suspension',
    'SHOCK': 'Suspension',
  };

  const match = groupCode.match(/^GRP-([A-Z]+)/);
  if (match) {
    const key = match[1];
    return categoryMap[key] || 'Other';
  }
  return 'Other';
}

export interface TemplateImportOptions {
  createMissingItems?: boolean;
  allowIncomplete?: boolean;
}

export interface TemplateImportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: TemplateImportError[];
  importId: string;
}

export interface TemplateImportError {
  row: number;
  message: string;
  data?: any;
}

/**
 * Import data into the Template BOM collection
 * This creates read-only template items that serve as the baseline
 * Also extracts and creates BOM Groups from GRP-xxx items
 */
export async function importToTemplateBom(
  projectId: string,
  data: any[],
  mappings: ColumnMappings,
  options: TemplateImportOptions,
  userId: string,
  filename: string
): Promise<TemplateImportResult> {
  const {
    createMissingItems = true,
    allowIncomplete = true,
  } = options;

  const errors: TemplateImportError[] = [];
  let successCount = 0;

  // Generate import ID
  const importId = `import-${Date.now()}`;

  try {
    // Ensure auth is ready before making Firestore operations
    const user = await waitForAuth();
    if (!user) {
      throw new Error('Authentication required to import BOM');
    }
    // Transform data using mappings
    const transformedData = transformData(data, mappings);

    // Prepare template BOM items
    const templateItems: Omit<TemplateBomItem, 'id'>[] = [];
    
    // Track groups and their items
    const groupsMap = new Map<string, {
      description: string;
      itemCount: number;
      maxLevel: number;
      category?: string;
    }>();
    
    // Track parent items at each level for hierarchy building
    const parentStack: { code: string; level: number }[] = [];
    let currentGroupCode = 'UNASSIGNED';
    
    for (let i = 0; i < transformedData.length; i++) {
      const row = transformedData[i];
      
      try {
        // Skip empty rows
        if (!row.itemCode && !row.itemDescription) {
          continue;
        }

        // Check for "Group Item:" prefix in raw data (Infor format)
        const rawRow = data[i];
        const isGroupHeaderRow = rawRow && Object.values(rawRow).some(
          (v: any) => typeof v === 'string' && v.startsWith('Group Item:')
        );
        
        if (isGroupHeaderRow) {
          // This is a group header row, extract group code
          const groupHeader = Object.values(rawRow).find(
            (v: any) => typeof v === 'string' && v.startsWith('Group Item:')
          ) as string;
          const groupCode = groupHeader.replace('Group Item:', '').trim().split(',')[0];
          currentGroupCode = groupCode;
          
          // Initialize group in map
          if (!groupsMap.has(groupCode)) {
            groupsMap.set(groupCode, {
              description: '',
              itemCount: 0,
              maxLevel: 0,
              category: extractGroupCategory(groupCode),
            });
          }
          continue; // Skip header row, don't create item
        }

        // Use defaults for missing required fields
        const itemCode = row.itemCode || `UNKNOWN-${i + 1}`;
        const itemDescription = row.itemDescription || '(No description)';
        const quantity = parseFloat(row.quantity) || 1;
        const level = parseInt(row.level) || 0;
        const unitOfMeasure = row.unitOfMeasure || row.um || 'EA';
        
        // Detect if this is a GRP-xxx item (level 0 group)
        if (itemCode.startsWith('GRP-')) {
          currentGroupCode = itemCode;
          
          // Create or update group info
          const existingGroup = groupsMap.get(itemCode);
          groupsMap.set(itemCode, {
            description: itemDescription,
            itemCount: existingGroup?.itemCount || 0,
            maxLevel: Math.max(existingGroup?.maxLevel || 0, level),
            category: extractGroupCategory(itemCode),
          });
        }
        
        // Update parent stack for hierarchy tracking
        while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
          parentStack.pop();
        }
        const parentItemCode = parentStack.length > 0 ? parentStack[parentStack.length - 1].code : undefined;
        parentStack.push({ code: itemCode, level });

        // Update group item count and max level
        if (currentGroupCode && groupsMap.has(currentGroupCode)) {
          const group = groupsMap.get(currentGroupCode)!;
          group.itemCount++;
          group.maxLevel = Math.max(group.maxLevel, level);
        }

        // Determine item type and source
        const itemType = determineItemType(itemCode);
        const source = determineItemSource(itemCode, row.source);

        // Note: We no longer create items in a global collection.
        // BOM items just store the itemCode - they can be compared against
        // SLItems (Infor master data) to identify items not in the system.
        // This separation allows us to see which BOM items need to be added to Infor.

        // Get original costs from import (usually 0 in Infor BOM structure files)
        const originalMaterialCost = parseFloat(row.materialCost) || 0;
        const originalLandingCost = parseFloat(row.landingCost) || 0;
        const originalLabourCost = parseFloat(row.labourCost) || 0;
        const originalExtendedCost = quantity * (originalMaterialCost + originalLandingCost + originalLabourCost);

        // Determine part category
        const partCategory = row.partCategory === 'new' || row.partCategory === 'New' 
          ? 'new_part' 
          : 'existing_part';

        // Create template BOM item with full hierarchy support
        // Note: We use null instead of undefined for optional fields (Firestore doesn't accept undefined)
        const templateItem: Omit<TemplateBomItem, 'id'> = {
          // Hierarchy structure
          level,
          groupCode: currentGroupCode,
          parentItemCode: parentItemCode || undefined,
          sequence: i + 1,
          
          // Item identification
          itemCode,
          itemDescription,
          itemType,
          source,
          
          // Quantities
          quantity,
          unitOfMeasure,
          per: row.per?.toLowerCase() === 'lot' ? 'lot' : 'unit',
          
          // Reference data
          altGroup: parseInt(row.altGroup) || undefined,
          altGroupRank: parseInt(row.altGroupRank) || undefined,
          revision: row.revision || undefined,
          stocked: row.stocked === 'True' || row.stocked === true,
          
          // Legacy fields for backward compatibility
          assemblyId: '',
          assemblyCode: currentGroupCode,
          itemId: '', // No longer linked to global items collection
          partCategory,
          
          // Original costs
          originalMaterialCost,
          originalLandingCost,
          originalLabourCost,
          originalExtendedCost,
          
          // Import metadata
          importId,
          importedAt: Timestamp.now(),
          sourceSystem: 'infor',
          sourceFilename: filename,
          rawRowData: row,
        };

        templateItems.push(templateItem);
        successCount++;
      } catch (error: any) {
        errors.push({
          row: i + 1,
          message: error.message || 'Failed to process row',
          data: row,
        });
      }
    }

    // Clear existing template BOM if any, then write new items
    if (templateItems.length > 0) {
      await writeTemplateBomItems(projectId, templateItems);
    }

    // Create BOM Groups from extracted groups
    const groups: Omit<BomGroup, 'id'>[] = [];
    groupsMap.forEach((groupData, groupCode) => {
      groups.push({
        groupCode,
        description: groupData.description,
        groupType: 'assembly',
        category: groupData.category,
        isStandard: false, // Default, can be updated later
        itemCount: groupData.itemCount,
        maxLevel: groupData.maxLevel,
        importId,
        importedAt: Timestamp.now(),
      });
    });

    if (groups.length > 0) {
      await writeBomGroups(projectId, groups);
    }

    // Update project with template BOM info
    await updateProjectTemplateInfo(projectId, importId, templateItems.length, groups.length);

    return {
      success: errors.length === 0,
      successCount,
      errorCount: errors.length,
      errors,
      importId,
    };
  } catch (error: any) {
    return {
      success: false,
      successCount,
      errorCount: errors.length + 1,
      errors: [
        ...errors,
        {
          row: 0,
          message: error.message || 'Template import failed',
        },
      ],
      importId,
    };
  }
}

/**
 * Write template BOM items to Firestore
 */
async function writeTemplateBomItems(
  projectId: string,
  items: Omit<TemplateBomItem, 'id'>[]
): Promise<void> {
  const BATCH_SIZE = 500;
  const templateBomRef = collection(db, `projects/${projectId}/templateBom`);

  // Delete existing template items first
  const existingSnapshot = await getDocs(templateBomRef);
  if (!existingSnapshot.empty) {
    const deleteBatches: any[] = [];
    let currentBatch = writeBatch(db);
    let deleteCount = 0;

    existingSnapshot.docs.forEach((docSnap) => {
      currentBatch.delete(docSnap.ref);
      deleteCount++;
      
      if (deleteCount % 500 === 0) {
        deleteBatches.push(currentBatch);
        currentBatch = writeBatch(db);
      }
    });

    if (deleteCount % 500 !== 0) {
      deleteBatches.push(currentBatch);
    }

    await Promise.all(deleteBatches.map(batch => batch.commit()));
  }

  // Write new items in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchItems = items.slice(i, i + BATCH_SIZE);

    batchItems.forEach((item) => {
      const itemRef = doc(templateBomRef);
      // Remove undefined values before writing to Firestore
      batch.set(itemRef, removeUndefined({
        ...item,
        createdAt: serverTimestamp(),
      }));
    });

    await batch.commit();
  }
}

/**
 * Write BOM Groups to Firestore
 */
async function writeBomGroups(
  projectId: string,
  groups: Omit<BomGroup, 'id'>[]
): Promise<void> {
  const groupsRef = collection(db, `projects/${projectId}/templateGroups`);

  // Delete existing groups first
  const existingSnapshot = await getDocs(groupsRef);
  if (!existingSnapshot.empty) {
    const batch = writeBatch(db);
    existingSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }

  // Write new groups
  const batch = writeBatch(db);
  groups.forEach((group) => {
    const groupRef = doc(groupsRef);
    batch.set(groupRef, {
      ...group,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/**
 * Get all BOM Groups for a project
 */
export async function getBomGroups(projectId: string): Promise<BomGroup[]> {
  // Ensure auth is ready before querying
  await waitForAuth();
  
  const groupsRef = collection(db, `projects/${projectId}/templateGroups`);
  
  try {
    // Try with composite ordering first (if index exists)
    const q = query(groupsRef, orderBy('category', 'asc'), orderBy('groupCode', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as BomGroup[];
  } catch (error: any) {
    // If index doesn't exist, fall back to simple query and sort client-side
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.warn('Composite index not found, falling back to client-side sorting');
      const snapshot = await getDocs(groupsRef);
      const groups = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as BomGroup[];
      
      // Sort client-side: first by category, then by groupCode
      return groups.sort((a, b) => {
        const categoryCompare = (a.category || 'Other').localeCompare(b.category || 'Other');
        if (categoryCompare !== 0) return categoryCompare;
        return a.groupCode.localeCompare(b.groupCode);
      });
    }
    // Re-throw if it's a different error
    throw error;
  }
}

/**
 * Update project document with template BOM info
 */
async function updateProjectTemplateInfo(
  projectId: string,
  importId: string,
  itemCount: number,
  groupCount: number = 0
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, {
    hasTemplateBom: true,
    templateBomImportId: importId,
    templateBomImportedAt: Timestamp.now(),
    templateBomItemCount: itemCount,
    templateBomGroupCount: groupCount,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get all template BOM items for a project
 */
export async function getTemplateBomItems(projectId: string): Promise<TemplateBomItem[]> {
  // Ensure auth is ready before querying
  await waitForAuth();
  
  const templateBomRef = collection(db, `projects/${projectId}/templateBom`);
  const q = query(templateBomRef, orderBy('assemblyCode', 'asc'), orderBy('level', 'asc'), orderBy('sequence', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as TemplateBomItem[];
}

export interface GroupSelection {
  groupCode: string;
  isSelected: boolean;
  splitPercentage?: number;
}

/**
 * Save group selections for a project
 */
export async function saveGroupSelections(
  projectId: string,
  selections: GroupSelection[],
  userId: string
): Promise<void> {
  const selectionsRef = collection(db, `projects/${projectId}/groupSelections`);
  
  // Delete existing selections
  const existingSnapshot = await getDocs(selectionsRef);
  if (!existingSnapshot.empty) {
    const batch = writeBatch(db);
    existingSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }

  // Write new selections
  const batch = writeBatch(db);
  selections.forEach((selection) => {
    const selectionRef = doc(selectionsRef);
    batch.set(selectionRef, {
      projectId,
      ...selection,
      selectedAt: serverTimestamp(),
      selectedBy: userId,
    });
  });
  await batch.commit();
}

/**
 * Get group selections for a project
 */
export async function getGroupSelections(projectId: string): Promise<GroupSelection[]> {
  // Ensure auth is ready before querying
  await waitForAuth();
  
  const selectionsRef = collection(db, `projects/${projectId}/groupSelections`);
  const snapshot = await getDocs(selectionsRef);
  
  return snapshot.docs.map(docSnap => ({
    groupCode: docSnap.data().groupCode,
    isSelected: docSnap.data().isSelected,
    splitPercentage: docSnap.data().splitPercentage,
  }));
}

/**
 * Create a working BOM from the template BOM
 * Only copies items from selected groups
 * @param selectedGroups - Array of group codes to include (if empty, includes all)
 */
export async function createWorkingBomFromTemplate(
  projectId: string,
  userId: string,
  selectedGroups?: string[]
): Promise<{ success: boolean; itemCount: number; error?: string }> {
  try {
    // Get template items
    const templateItems = await getTemplateBomItems(projectId);
    
    if (templateItems.length === 0) {
      return {
        success: false,
        itemCount: 0,
        error: 'No template BOM found. Import a BOM first.',
      };
    }

    // If no groups specified, check for saved group selections
    let groupsToInclude = selectedGroups;
    if (!groupsToInclude || groupsToInclude.length === 0) {
      const savedSelections = await getGroupSelections(projectId);
      const selectedFromSaved = savedSelections.filter(s => s.isSelected).map(s => s.groupCode);
      
      if (selectedFromSaved.length > 0) {
        groupsToInclude = selectedFromSaved;
      }
    }

    // Filter items by selected groups (if any specified)
    const filteredItems = groupsToInclude && groupsToInclude.length > 0
      ? templateItems.filter(item => groupsToInclude!.includes(item.groupCode))
      : templateItems;

    if (filteredItems.length === 0) {
      return {
        success: false,
        itemCount: 0,
        error: 'No items found for selected groups.',
      };
    }

    // Convert template items to working BOM items
    const workingItems: Omit<BomItem, 'id'>[] = filteredItems.map(template => ({
      // Hierarchy structure
      level: template.level,
      groupCode: template.groupCode,
      parentItemCode: template.parentItemCode,
      sequence: template.sequence,
      
      // Item identification
      itemCode: template.itemCode,
      itemDescription: template.itemDescription,
      itemType: template.itemType || 'material',
      source: template.source || 'purchased',
      isPlaceholder: template.itemCode.startsWith('BNEW') || template.itemCode.startsWith('UNKNOWN'),
      
      // Quantities
      quantity: template.quantity,
      unitOfMeasure: template.unitOfMeasure || 'EA',
      
      // Legacy fields for backward compatibility
      assemblyId: template.assemblyId,
      assemblyCode: template.assemblyCode || template.groupCode,
      itemId: template.itemId,
      partCategory: template.partCategory,
      
      // Copy original costs as current costs (editable)
      materialCost: template.originalMaterialCost,
      landingCost: template.originalLandingCost,
      labourCost: template.originalLabourCost,
      extendedCost: template.originalExtendedCost,
      
      // Cost tracking - starts as placeholder/estimate
      costSource: template.originalMaterialCost > 0 ? 'estimate' : 'placeholder',
      
      // Template reference
      templateItemId: template.id,
      
      // Change tracking flags - all false initially
      isFromTemplate: true,
      isAddedItem: false,
      isCustomGroup: false,
      hasCostChange: false,
      hasQuantityChange: false,
      isNewPart: false,
      
      // Store original values for comparison
      originalMaterialCost: template.originalMaterialCost,
      originalLandingCost: template.originalLandingCost,
      originalLabourCost: template.originalLabourCost,
      originalQuantity: template.quantity,
    }));

    // Write working BOM items
    await writeWorkingBomItems(projectId, workingItems);

    // Update project with working BOM info
    await updateProjectWorkingBomInfo(projectId, workingItems.length);

    return {
      success: true,
      itemCount: workingItems.length,
    };
  } catch (error: any) {
    return {
      success: false,
      itemCount: 0,
      error: error.message || 'Failed to create working BOM',
    };
  }
}

/**
 * Write working BOM items to Firestore
 */
async function writeWorkingBomItems(
  projectId: string,
  items: Omit<BomItem, 'id'>[]
): Promise<void> {
  const BATCH_SIZE = 500;
  const bomItemsRef = collection(db, `projects/${projectId}/bomItems`);

  // Delete existing working BOM items first
  const existingSnapshot = await getDocs(bomItemsRef);
  if (!existingSnapshot.empty) {
    const deleteBatches: any[] = [];
    let currentBatch = writeBatch(db);
    let deleteCount = 0;

    existingSnapshot.docs.forEach((docSnap) => {
      currentBatch.delete(docSnap.ref);
      deleteCount++;
      
      if (deleteCount % 500 === 0) {
        deleteBatches.push(currentBatch);
        currentBatch = writeBatch(db);
      }
    });

    if (deleteCount % 500 !== 0) {
      deleteBatches.push(currentBatch);
    }

    await Promise.all(deleteBatches.map(batch => batch.commit()));
  }

  // Write new items in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchItems = items.slice(i, i + BATCH_SIZE);

    batchItems.forEach((item) => {
      const itemRef = doc(bomItemsRef);
      // Remove undefined values before writing to Firestore
      batch.set(itemRef, removeUndefined({
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
    });

    await batch.commit();
  }
}

/**
 * Update project document with working BOM info
 */
async function updateProjectWorkingBomInfo(
  projectId: string,
  itemCount: number
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, {
    hasWorkingBom: true,
    workingBomCreatedAt: Timestamp.now(),
    workingBomItemCount: itemCount,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Save template to global templates collection
 */
export async function saveAsGlobalTemplate(
  projectId: string,
  name: string,
  description: string,
  userId: string
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    // Get template items
    const templateItems = await getTemplateBomItems(projectId);
    
    if (templateItems.length === 0) {
      return {
        success: false,
        error: 'No template BOM found to save.',
      };
    }

    // Calculate assembly count
    const assemblyCodes = new Set(templateItems.map(item => item.assemblyCode));

    // Create global template document
    const templateId = await createDocument('globalTemplates', {
      name,
      description,
      sourceProjectId: projectId,
      sourceSystem: templateItems[0]?.sourceSystem || 'manual',
      itemCount: templateItems.length,
      assemblyCount: assemblyCodes.size,
      createdBy: userId,
      updatedAt: Timestamp.now(),
      usageCount: 0,
    });

    // Copy template items to global template subcollection
    const BATCH_SIZE = 500;
    const globalTemplateItemsRef = collection(db, `globalTemplates/${templateId}/items`);

    for (let i = 0; i < templateItems.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchItems = templateItems.slice(i, i + BATCH_SIZE);

      batchItems.forEach((item) => {
        const itemRef = doc(globalTemplateItemsRef);
        // Remove the id field and copy the rest
        const { id, ...itemData } = item;
        // Remove undefined values before writing to Firestore
        batch.set(itemRef, removeUndefined({
          ...itemData,
          copiedAt: serverTimestamp(),
        }));
      });

      await batch.commit();
    }

    return {
      success: true,
      templateId,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to save global template',
    };
  }
}
