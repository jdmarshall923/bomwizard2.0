import { 
  collection, 
  writeBatch, 
  doc, 
  Timestamp,
  addDoc,
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BomItem, BomGroup, BomItemType, ItemSource } from '@/types';
import { NewPart } from '@/types/newPart';

/**
 * Batch item for adding to BOM
 */
export interface BatchItem {
  tempId: string;          // Temporary ID for list management
  code: string;
  description: string;
  quantity: number;
  level: number;
  groupCode: string;      // Target group for this item
  isPlaceholder: boolean;
  isNewPartCategory: boolean;  // Flag for "New Part" (partCategory: 'new_part')
  isNewPart: boolean;      // Flag for "Track" (design/procurement tracking)
}

/**
 * New group details for inline creation
 */
export interface NewGroupDetails {
  code: string;
  description: string;
  category: string;
}

/**
 * Result of batch add operation
 */
export interface BatchAddResult {
  success: boolean;
  groupCreated?: BomGroup;
  itemsCreated: number;
  errors: Array<{ code: string; error: string }>;
  newPartsCount: number;
}

/**
 * Generate the next placeholder code (Bxxx001 format)
 */
export function generatePlaceholderCode(existingCodes: string[], batchCodes: string[]): string {
  const allCodes = [...existingCodes, ...batchCodes];
  // Match Bxxx followed by digits (e.g., Bxxx001, Bxxx002)
  const bxxxCodes = allCodes
    .filter(code => /^Bxxx\d+$/i.test(code))
    .map(code => parseInt(code.replace(/^Bxxx/i, ''), 10))
    .filter(num => !isNaN(num));

  const maxNum = bxxxCodes.length > 0 ? Math.max(...bxxxCodes) : 0;
  return `Bxxx${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Generate the next custom group code (GRP-CUSTOM-Axx)
 */
export function generateGroupCode(existingGroups: BomGroup[]): string {
  const customGroups = existingGroups
    .filter(g => g.groupCode.startsWith('GRP-CUSTOM-'))
    .map(g => parseInt(g.groupCode.replace('GRP-CUSTOM-A', ''), 10))
    .filter(n => !isNaN(n));

  const maxNum = customGroups.length > 0 ? Math.max(...customGroups) : 0;
  return `GRP-CUSTOM-A${String(maxNum + 1).padStart(2, '0')}`;
}

/**
 * Validate batch items
 */
export function validateBatchItems(
  items: BatchItem[], 
  existingItems: BomItem[]
): { valid: boolean; errors: Array<{ code: string; error: string }> } {
  const errors: Array<{ code: string; error: string }> = [];
  const existingCodes = new Set(existingItems.map(i => i.itemCode.toUpperCase()));
  const batchCodes = new Set<string>();

  for (const item of items) {
    // Check for empty code
    if (!item.code.trim()) {
      errors.push({ code: item.code || item.tempId, error: 'Item code is required' });
      continue;
    }

    // Check for empty description
    if (!item.description.trim()) {
      errors.push({ code: item.code, error: 'Description is required' });
    }

    // Check for invalid quantity
    if (item.quantity <= 0) {
      errors.push({ code: item.code, error: 'Quantity must be greater than 0' });
    }

    const upperCode = item.code.toUpperCase();

    // Check for duplicate in existing BOM
    if (existingCodes.has(upperCode)) {
      errors.push({ code: item.code, error: 'Item already exists in BOM' });
    }

    // Check for duplicate in batch
    if (batchCodes.has(upperCode)) {
      errors.push({ code: item.code, error: 'Duplicate item in batch' });
    }

    batchCodes.add(upperCode);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create a new group
 */
export async function createGroup(
  projectId: string,
  groupDetails: NewGroupDetails
): Promise<BomGroup> {
  const groupsRef = collection(db, `projects/${projectId}/templateGroups`);
  
  const newGroup: Omit<BomGroup, 'id'> = {
    groupCode: groupDetails.code.toUpperCase(),
    description: groupDetails.description,
    groupType: 'assembly',
    category: groupDetails.category,
    isStandard: false,
    itemCount: 0,
    maxLevel: 0,
    importedAt: Timestamp.now(),
  };

  const docRef = await addDoc(groupsRef, {
    ...newGroup,
    createdAt: serverTimestamp(),
  });

  // Also create a group selection entry (selected by default)
  const selectionsRef = collection(db, `projects/${projectId}/groupSelections`);
  await addDoc(selectionsRef, {
    projectId,
    groupCode: groupDetails.code.toUpperCase(),
    isSelected: true,
    selectedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...newGroup,
  };
}

/**
 * Batch add items to BOM
 * Now supports per-item group selection
 */
export async function batchAddItems(
  projectId: string,
  items: BatchItem[],
  existingItems: BomItem[],
  newGroups: Map<string, NewGroupDetails> // Map of groupCode -> NewGroupDetails for groups to create
): Promise<BatchAddResult> {
  let groupCreated: BomGroup | undefined;
  const createdGroups: BomGroup[] = [];

  try {
    // Validate items
    const validation = validateBatchItems(items, existingItems);
    if (!validation.valid) {
      return {
        success: false,
        itemsCreated: 0,
        errors: validation.errors,
        newPartsCount: 0,
      };
    }

    // Create new groups if needed
    for (const [groupCode, groupDetails] of newGroups.entries()) {
      if (!groupDetails.code.trim()) {
        return {
          success: false,
          itemsCreated: 0,
          errors: [{ code: 'GROUP', error: `Group code is required for ${groupCode}` }],
          newPartsCount: 0,
        };
      }
      if (!groupDetails.description.trim()) {
        return {
          success: false,
          itemsCreated: 0,
          errors: [{ code: 'GROUP', error: `Group description is required for ${groupCode}` }],
          newPartsCount: 0,
        };
      }

      const created = await createGroup(projectId, groupDetails);
      createdGroups.push(created);
      if (!groupCreated) {
        groupCreated = created; // Return first created group for backward compatibility
      }
    }

    // Group items by their target groupCode
    const itemsByGroup = new Map<string, BatchItem[]>();
    for (const item of items) {
      if (!itemsByGroup.has(item.groupCode)) {
        itemsByGroup.set(item.groupCode, []);
      }
      itemsByGroup.get(item.groupCode)!.push(item);
    }

    // Create batch write
    const batch = writeBatch(db);
    const bomItemsRef = collection(db, `projects/${projectId}/bomItems`);
    let newPartsCount = 0;

    // Process items by group
    for (const [groupCode, groupItems] of itemsByGroup.entries()) {
      // Calculate starting sequence for this group
      const existingGroupItems = existingItems.filter(i => i.groupCode === groupCode);
      let sequence = existingGroupItems.length > 0 
        ? Math.max(...existingGroupItems.map(i => i.sequence)) + 1 
        : 1;

      // Check if this is a new group
      const isNewGroup = newGroups.has(groupCode);

      for (const item of groupItems) {
        const docRef = doc(bomItemsRef);
        
        // Determine item type
        const itemType: BomItemType = item.code.startsWith('G') ? 'manufactured' : 'material';
        const source: ItemSource = item.code.startsWith('G') ? 'manufactured' : 'purchased';

        // Track new parts count
        if (item.isNewPart) {
          newPartsCount++;
        }

        // Build bomItem object, excluding undefined values
        const bomItemBase: Omit<BomItem, 'id'> = {
          // Hierarchy
          level: item.level,
          groupCode: groupCode,
          sequence: sequence++,
          
          // Item identification
          itemCode: item.code.toUpperCase(),
          itemDescription: item.description,
          itemType,
          source,
          isPlaceholder: item.isPlaceholder,
          
          // Quantities
          quantity: item.quantity,
          unitOfMeasure: 'EA',
          
          // Legacy fields
          assemblyCode: groupCode,
          itemId: '',
          partCategory: item.isNewPartCategory ? 'new_part' : 'existing_part',
          
          // Costs (placeholder)
          materialCost: 0,
          landingCost: 0,
          labourCost: 0,
          extendedCost: 0,
          costSource: 'placeholder',
          
          // Tracking
          isFromTemplate: false,
          isAddedItem: true,
          isCustomGroup: isNewGroup,
          hasCostChange: false,
          hasQuantityChange: false,
          
          // New Part tracking (Phase 3.7)
          isNewPart: item.isNewPart,
          
          // Metadata
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Add optional fields only if they have values (Firestore doesn't accept undefined)
        if (item.isNewPart) {
          bomItemBase.newPartStatus = 'pending';
          bomItemBase.newPartAddedAt = Timestamp.now();
        }

        batch.set(docRef, bomItemBase);
      }
    }

    // Commit batch
    await batch.commit();

    // Create NewPart documents for items with isNewPart: true
    // This is a client-side fallback in case Cloud Functions aren't deployed
    const newPartsRef = collection(db, `projects/${projectId}/newParts`);
    const bomItemsRefForUpdate = collection(db, `projects/${projectId}/bomItems`);
    
    for (const [groupCode, groupItems] of itemsByGroup.entries()) {
      for (const item of groupItems) {
        if (item.isNewPart) {
          try {
            // Find the BomItem that was just created (we need its ID)
            // Since we used batch.set(docRef, ...), we can get the docRef.id
            // But batch operations don't return IDs, so we need to query
            const { getDocs, query, where } = await import('firebase/firestore');
            const bomQuery = query(
              bomItemsRefForUpdate,
              where('itemCode', '==', item.code.toUpperCase()),
              where('groupCode', '==', groupCode)
            );
            const bomSnapshot = await getDocs(bomQuery);
            
            if (!bomSnapshot.empty) {
              const bomDoc = bomSnapshot.docs[0];
              const bomItemId = bomDoc.id;
              const now = Timestamp.now();

              // Create NewPart document
              const newPartData: Omit<NewPart, 'id'> = {
                projectId,
                bomItemId,
                placeholderCode: item.code.toUpperCase(),
                description: item.description,
                groupCode: groupCode,
                quantity: item.quantity,
                status: 'added',
                priority: 'medium',
                requestedBy: 'system',
                requestedAt: now,
                designStatus: 'not_started',
                engineeringStatus: 'not_started',
                procurementStatus: 'not_started',
                createdAt: now,
                updatedAt: now,
              };

              const newPartDocRef = await addDoc(newPartsRef, newPartData);

              // Update BomItem with newPartTrackerId
              await updateDoc(doc(bomItemsRefForUpdate, bomItemId), {
                newPartTrackerId: newPartDocRef.id,
                newPartStatus: 'added',
                updatedAt: now,
              });
            }
          } catch (err) {
            console.error(`Failed to create NewPart for ${item.code}:`, err);
            // Continue with other items even if one fails
          }
        }
      }
    }

    return {
      success: true,
      groupCreated,
      itemsCreated: items.length,
      errors: [],
      newPartsCount,
    };
  } catch (error) {
    console.error('Batch add error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add items';
    return {
      success: false,
      groupCreated,
      itemsCreated: 0,
      errors: [{ code: 'SYSTEM', error: errorMessage }],
      newPartsCount: 0,
    };
  }
}

/**
 * Check for duplicate items in batch
 */
export function checkDuplicates(
  items: BatchItem[],
  existingItems: BomItem[]
): { code: string; existsInBom: boolean; existsInBatch: boolean }[] {
  const duplicates: { code: string; existsInBom: boolean; existsInBatch: boolean }[] = [];
  const existingCodes = new Set(existingItems.map(i => i.itemCode.toUpperCase()));
  const batchCodes = new Map<string, number>();

  for (const item of items) {
    const upperCode = item.code.toUpperCase();
    const count = batchCodes.get(upperCode) || 0;
    batchCodes.set(upperCode, count + 1);

    const existsInBom = existingCodes.has(upperCode);
    const existsInBatch = count > 0;

    if (existsInBom || existsInBatch) {
      duplicates.push({ code: item.code, existsInBom, existsInBatch });
    }
  }

  return duplicates;
}
