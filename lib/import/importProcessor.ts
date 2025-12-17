import { BomItem } from '@/types';
import { Timestamp, writeBatch, collection, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { transformData, ColumnMappings } from './columnMapper';
import { getDocument, createDocument } from '@/lib/firebase/firestore';
import { Item } from '@/types';
import { createVersion, generateTriggerDetails } from '@/lib/bom/versionService';

export interface ImportOptions {
  createVersion?: boolean;
  replaceExisting?: boolean;
  createMissingItems?: boolean;
  allowIncomplete?: boolean; // Allow rows with missing required fields
}

export interface ImportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  versionId?: string;
}

export interface ImportError {
  row: number;
  message: string;
  data?: any;
}

/**
 * Process and import BOM data
 */
export async function processImport(
  projectId: string,
  data: any[],
  mappings: ColumnMappings,
  options: ImportOptions = {},
  userId: string
): Promise<ImportResult> {
  const {
    createVersion = true,
    replaceExisting = false,
    createMissingItems = true,
    allowIncomplete = true, // Default to allowing incomplete rows
  } = options;

  const errors: ImportError[] = [];
  let successCount = 0;

  try {
    // Transform data using mappings
    const transformedData = transformData(data, mappings);

    // Validate and prepare BOM items
    const bomItems: BomItem[] = [];
    
    // Track parent assemblies at each level for hierarchy building
    // parentStack[0] = null (root), parentStack[1] = current level 1 parent, etc.
    const parentStack: string[] = ['ROOT'];
    
    for (let i = 0; i < transformedData.length; i++) {
      const row = transformedData[i];
      
      try {
        // Check for missing required fields
        const missingFields: string[] = [];
        if (!row.itemCode) missingFields.push('itemCode');
        if (!row.itemDescription) missingFields.push('itemDescription');
        if (!row.quantity) missingFields.push('quantity');
        if (!row.level) missingFields.push('level');

        if (missingFields.length > 0) {
          if (!allowIncomplete) {
            errors.push({
              row: i + 1,
              message: `Missing required fields: ${missingFields.join(', ')}`,
              data: row,
            });
            continue;
          }
          // Log warning but continue with defaults
          console.warn(`Row ${i + 1}: Missing fields ${missingFields.join(', ')}, using defaults`);
        }

        // Use defaults for missing required fields
        const itemCode = row.itemCode || `UNKNOWN-${i + 1}`;
        const itemDescription = row.itemDescription || '(No description)';
        const quantity = row.quantity || 1;
        const level = row.level || 1;
        
        // Determine assembly code based on hierarchy
        let assemblyCode: string;
        
        if (row.assemblyCode) {
          // Use explicitly provided assembly code
          assemblyCode = row.assemblyCode;
        } else {
          // Auto-calculate based on level
          if (level === 1) {
            // Level 1 items ARE the assembly - they belong to ROOT or themselves
            assemblyCode = itemCode; // The item is its own assembly
            parentStack[1] = itemCode; // Track this as the current level 1 parent
          } else {
            // Level 2+ items belong to the parent at level-1
            // Update the parent stack for this level
            parentStack[level] = itemCode;
            
            // Find the parent (look at level - 1)
            const parentLevel = level - 1;
            assemblyCode = parentStack[parentLevel] || parentStack[1] || 'UNASSIGNED';
          }
        }

        // Get or create item
        let itemId: string;
        const existingItem = await findItemByCode(itemCode);
        
        if (existingItem) {
          itemId = existingItem.id;
        } else if (createMissingItems) {
          // Create new item in global items collection
          const itemData: any = {
            code: itemCode,
            description: itemDescription,
            isManufactured: false,
            isPlaceholder: itemCode.startsWith('B') && /^B\d+$/.test(itemCode) || itemCode.startsWith('UNKNOWN'),
          };
          itemId = await createDocument<Item>('items', itemData);
        } else {
          errors.push({
            row: i + 1,
            message: `Item ${itemCode} not found and createMissingItems is false`,
            data: row,
          });
          continue;
        }

        // Calculate extended cost
        const materialCost = row.materialCost || 0;
        const landingCost = row.landingCost || 0;
        const labourCost = row.labourCost || 0;
        const extendedCost = quantity * (materialCost + landingCost + labourCost);

        // Determine part category
        const partCategory = row.partCategory === 'new' || row.partCategory === 'New' 
          ? 'new_part' 
          : 'existing_part';

        // Create BOM item
        const bomItem: any = {
          assemblyId: '', // Will be set when we have assembly
          assemblyCode,
          itemId,
          itemCode,
          itemDescription,
          level: row.level || 1,
          quantity,
          sequence: i + 1,
          partCategory,
          materialCost,
          landingCost,
          labourCost,
          extendedCost,
          costSource: 'estimate',
          isIncomplete: missingFields.length > 0, // Flag incomplete records
        };

        // Remove undefined values
        Object.keys(bomItem).forEach((key) => {
          if (bomItem[key] === undefined) {
            delete bomItem[key];
          }
        });

        bomItems.push(bomItem as BomItem);
        successCount++;
      } catch (error: any) {
        errors.push({
          row: i + 1,
          message: error.message || 'Failed to process row',
          data: row,
        });
      }
    }

    // Batch write to Firestore (max 500 per batch)
    if (bomItems.length > 0) {
      await batchWriteBomItems(projectId, bomItems, replaceExisting);
    }

    // Create version snapshot if requested
    let versionId: string | undefined;
    if (createVersion && bomItems.length > 0) {
      // This would call the Cloud Function, but for now we'll create it directly
      versionId = await createVersionSnapshot(projectId, bomItems, userId);
    }

    return {
      success: errors.length === 0,
      successCount,
      errorCount: errors.length,
      errors,
      versionId,
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
          message: error.message || 'Import failed',
        },
      ],
    };
  }
}

/**
 * Find item by code in global items collection
 */
async function findItemByCode(code: string): Promise<Item | null> {
  const { where, getDocs, query } = await import('firebase/firestore');
  const itemsRef = collection(db, 'items');
  const q = query(itemsRef, where('code', '==', code.toUpperCase()));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Item;
}

/**
 * Batch write BOM items to Firestore
 */
async function batchWriteBomItems(
  projectId: string,
  items: BomItem[],
  replaceExisting: boolean
): Promise<void> {
  const BATCH_SIZE = 500;
  const bomItemsRef = collection(db, `projects/${projectId}/bomItems`);

  // If replacing, delete existing items first
  if (replaceExisting) {
    const { getDocs, deleteDoc } = await import('firebase/firestore');
    const existingSnapshot = await getDocs(bomItemsRef);
    const deleteBatch = writeBatch(db);
    let deleteCount = 0;

    existingSnapshot.docs.forEach((doc) => {
      if (deleteCount < 500) {
        deleteBatch.delete(doc.ref);
        deleteCount++;
      }
    });

    if (deleteCount > 0) {
      await deleteBatch.commit();
    }
  }

  // Write items in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchItems = items.slice(i, i + BATCH_SIZE);

    batchItems.forEach((item) => {
      const itemRef = doc(bomItemsRef);
      batch.set(itemRef, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }
}

/**
 * Create a version snapshot after import using the new version service
 */
async function createVersionSnapshot(
  projectId: string,
  items: BomItem[],
  userId: string,
  fileName?: string
): Promise<string | undefined> {
  const result = await createVersion(projectId, {
    trigger: 'import',
    triggerDetails: generateTriggerDetails('import', {
      itemCount: items.length,
      fileName,
    }),
    versionName: fileName ? `Import: ${fileName}` : 'CSV Import',
    description: `Imported ${items.length} items from CSV`,
    userId,
  });

  if (!result.success) {
    console.error('Failed to create version after import:', result.error);
    return undefined;
  }

  return result.versionId;
}

/**
 * Validate BOM data before import
 */
export async function validateBomData(
  data: any[],
  mappings: ColumnMappings
): Promise<{
  valid: boolean;
  errors: ImportError[];
  warnings: ImportError[];
}> {
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];

  data.forEach((row, index) => {
    // Check required fields
    if (!row[mappings.itemCode?.source]) {
      errors.push({
        row: index + 1,
        message: 'Missing item code',
        data: row,
      });
    }

    if (!row[mappings.itemDescription?.source]) {
      errors.push({
        row: index + 1,
        message: 'Missing item description',
        data: row,
      });
    }

    if (!row[mappings.quantity?.source]) {
      errors.push({
        row: index + 1,
        message: 'Missing quantity',
        data: row,
      });
    }

    if (!row[mappings.level?.source]) {
      warnings.push({
        row: index + 1,
        message: 'Missing level - will default to 1',
        data: row,
      });
    }

    // Check for duplicate item codes (warning only, not error)
    const itemCode = row[mappings.itemCode?.source];
    if (itemCode) {
      const duplicates = data.filter(
        (r, i) =>
          i !== index &&
          r[mappings.itemCode?.source] === itemCode
      );
      if (duplicates.length > 0) {
        warnings.push({
          row: index + 1,
          message: `Item ${itemCode} appears multiple times in import`,
          data: row,
        });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

