import { TemplateBomItem, BomItem, VendorContractPrice } from '@/types';
import { Timestamp, writeBatch, collection, doc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { createVersion, shouldAutoCreateVersion, generateTriggerDetails } from './versionService';

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

export interface TransferResult {
  success: boolean;
  transferred: number;
  skipped: number;
  errors: string[];
  versionCreated?: boolean;
  versionId?: string;
  versionNumber?: number;
}

/**
 * Find duplicate items that already exist in the working BOM
 */
export async function findDuplicateItems(
  projectId: string,
  templateItemIds: string[],
  templateItems: TemplateBomItem[]
): Promise<Set<string>> {
  const duplicates = new Set<string>();
  
  // Get all working BOM items
  const bomItemsRef = collection(db, `projects/${projectId}/bomItems`);
  const snapshot = await getDocs(bomItemsRef);
  
  const existingItemCodes = new Set<string>();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.itemCode) {
      existingItemCodes.add(data.itemCode);
    }
  });
  
  // Check which template items already exist
  templateItems.forEach(item => {
    if (templateItemIds.includes(item.id) && existingItemCodes.has(item.itemCode)) {
      duplicates.add(item.id);
    }
  });
  
  return duplicates;
}

/**
 * Get vendor contract price for an item code
 */
async function getVendorPriceForItem(itemCode: string): Promise<VendorContractPrice | null> {
  try {
    const pricesRef = collection(db, 'vendorContractPrices');
    const q = query(
      pricesRef,
      where('itemCode', '==', itemCode),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    // Return the first active price
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as VendorContractPrice;
  } catch (error) {
    console.error('Error fetching vendor price:', error);
    return null;
  }
}

/**
 * Transfer selected template items to working BOM
 */
export async function transferItemsToWorkingBom(
  projectId: string,
  templateItems: TemplateBomItem[],
  selectedIds: string[],
  applyPricing: boolean = true,
  userId?: string,
  userName?: string
): Promise<TransferResult> {
  const result: TransferResult = {
    success: true,
    transferred: 0,
    skipped: 0,
    errors: [],
    versionCreated: false,
  };

  try {
    // Filter to only selected items
    const itemsToTransfer = templateItems.filter(item => selectedIds.includes(item.id));
    
    if (itemsToTransfer.length === 0) {
      return result;
    }

    // Check for duplicates
    const duplicates = await findDuplicateItems(projectId, selectedIds, templateItems);
    
    // Filter out duplicates
    const newItems = itemsToTransfer.filter(item => !duplicates.has(item.id));
    result.skipped = duplicates.size;

    if (newItems.length === 0) {
      return result;
    }

    // Prepare batch write
    const BATCH_SIZE = 500;
    const bomItemsRef = collection(db, `projects/${projectId}/bomItems`);

    // Convert template items to working BOM items
    const workingItems: Omit<BomItem, 'id'>[] = [];
    
    for (const template of newItems) {
      // Get vendor price if enabled
      let vendorPrice: VendorContractPrice | null = null;
      if (applyPricing && !template.itemCode.startsWith('GRP-')) {
        vendorPrice = await getVendorPriceForItem(template.itemCode);
      }

      const materialCost = vendorPrice?.unitPrice || template.originalMaterialCost || 0;
      const landingPct = vendorPrice?.landingPct || 0;
      const landingCost = materialCost * (landingPct / 100);
      const labourCost = template.originalLabourCost || 0;
      const extendedCost = template.quantity * (materialCost + landingCost + labourCost);

      const workingItem: Omit<BomItem, 'id'> = {
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
        
        // Costs
        materialCost,
        landingCost,
        labourCost,
        extendedCost,
        
        // Cost tracking
        costSource: vendorPrice ? 'contract' : (materialCost > 0 ? 'estimate' : 'placeholder'),
        
        // Vendor contract price details
        vendorContractPriceId: vendorPrice?.id,
        vendorCode: vendorPrice?.vendorCode,
        vendorName: vendorPrice?.vendorName,
        currency: vendorPrice?.currency,
        moq: vendorPrice?.moq,
        leadTimeDays: vendorPrice?.leadTimeDays,
        landingPct: vendorPrice?.landingPct,
        contractStatus: vendorPrice?.status,
        effectiveDate: vendorPrice?.effectiveDate,
        expiryDate: vendorPrice?.expiryDate,
        
        // Template reference
        templateItemId: template.id,
        isFromTemplate: true,
        isAddedItem: true, // These are being added from template selection
        isCustomGroup: false,
        
        // Change tracking
        hasCostChange: false,
        hasQuantityChange: false,
        originalMaterialCost: template.originalMaterialCost,
        originalLandingCost: template.originalLandingCost,
        originalLabourCost: template.originalLabourCost,
        originalQuantity: template.quantity,
      };

      workingItems.push(workingItem);
    }

    // Write in batches
    for (let i = 0; i < workingItems.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchItems = workingItems.slice(i, i + BATCH_SIZE);

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
      result.transferred += batchItems.length;
    }

    // Auto-create version if threshold is met (10+ items transferred)
    if (userId && shouldAutoCreateVersion(result.transferred)) {
      const versionResult = await createVersion(projectId, {
        trigger: 'transfer',
        triggerDetails: generateTriggerDetails('transfer', {
          itemCount: result.transferred,
        }),
        versionName: `Transfer: ${result.transferred} items`,
        description: `Transferred ${result.transferred} items from template BOM${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''}`,
        userId,
        userName,
      });

      if (versionResult.success) {
        result.versionCreated = true;
        result.versionId = versionResult.versionId;
        result.versionNumber = versionResult.versionNumber;
      }
    }

    return result;
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message || 'Failed to transfer items');
    return result;
  }
}

/**
 * Get count of items that would be duplicates
 */
export async function getDuplicateCount(
  projectId: string,
  templateItems: TemplateBomItem[],
  selectedIds: string[]
): Promise<number> {
  const duplicates = await findDuplicateItems(projectId, selectedIds, templateItems);
  return duplicates.size;
}

