import {
  BomItem,
  BomVersion,
  VersionItem,
  VersionSummary,
  VersionTrigger,
} from '@/types';
import {
  Timestamp,
  writeBatch,
  collection,
  doc,
  serverTimestamp,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Remove undefined values from an object (Firestore doesn't accept undefined)
 */
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// ============================================
// VERSION CREATION
// ============================================

/**
 * Calculate version summary from BOM items
 */
function calculateVersionSummary(items: BomItem[]): VersionSummary {
  const summary: VersionSummary = {
    totalItems: 0,
    totalAssemblies: 0,
    totalMaterialCost: 0,
    totalLandingCost: 0,
    totalLabourCost: 0,
    totalExtendedCost: 0,
    newPartsCount: 0,
    placeholdersCount: 0,
    contractPricedCount: 0,
    quotePricedCount: 0,
    manualPricedCount: 0,
    costBySource: {
      contract: 0,
      quote: 0,
      estimate: 0,
      placeholder: 0,
    },
    costByAssembly: [],
  };

  // Track assemblies
  const assemblySet = new Set<string>();
  const assemblyTotals = new Map<string, { cost: number; count: number; description?: string }>();

  for (const item of items) {
    // Don't count GRP- items as regular items
    if (item.itemCode.startsWith('GRP-')) {
      assemblySet.add(item.itemCode);
      continue;
    }

    summary.totalItems++;
    summary.totalMaterialCost += item.materialCost || 0;
    summary.totalLandingCost += item.landingCost || 0;
    summary.totalLabourCost += item.labourCost || 0;
    summary.totalExtendedCost += item.extendedCost || 0;

    // Count by status
    if (item.isNewPart) summary.newPartsCount++;
    if (item.isPlaceholder) summary.placeholdersCount++;

    // Count by cost source
    switch (item.costSource) {
      case 'contract':
        summary.contractPricedCount++;
        summary.costBySource.contract += item.extendedCost || 0;
        break;
      case 'quote':
        summary.quotePricedCount++;
        summary.costBySource.quote += item.extendedCost || 0;
        break;
      case 'estimate':
        summary.manualPricedCount++;
        summary.costBySource.estimate += item.extendedCost || 0;
        break;
      case 'placeholder':
        summary.costBySource.placeholder += item.extendedCost || 0;
        break;
    }

    // Track assembly (group)
    if (item.groupCode) {
      assemblySet.add(item.groupCode);
      const current = assemblyTotals.get(item.groupCode) || { cost: 0, count: 0 };
      assemblyTotals.set(item.groupCode, {
        cost: current.cost + (item.extendedCost || 0),
        count: current.count + 1,
        description: current.description,
      });
    }
  }

  summary.totalAssemblies = assemblySet.size;

  // Convert assembly totals to array (filter out undefined values)
  summary.costByAssembly = Array.from(assemblyTotals.entries()).map(([groupCode, data]) => {
    const assembly: { groupCode: string; totalCost: number; itemCount: number; groupDescription?: string } = {
      groupCode,
      totalCost: data.cost,
      itemCount: data.count,
    };
    if (data.description) {
      assembly.groupDescription = data.description;
    }
    return assembly;
  });

  return summary;
}

/**
 * Convert a BomItem to a VersionItem for snapshot
 * Only includes defined values to avoid Firestore errors
 */
function bomItemToVersionItem(item: BomItem): Record<string, unknown> {
  const unitCost = (item.materialCost || 0) + (item.landingCost || 0) + (item.labourCost || 0);
  
  const versionItem: Record<string, unknown> = {
    id: item.id,
    itemCode: item.itemCode || '',
    itemDescription: item.itemDescription || '',
    groupCode: item.groupCode || '',
    itemType: item.itemType || 'material',
    source: item.source || 'purchased',
    level: item.level || 0,
    sequence: item.sequence || 0,
    quantity: item.quantity || 0,
    unitOfMeasure: item.unitOfMeasure || 'EA',
    materialCost: item.materialCost || 0,
    landingCost: item.landingCost || 0,
    labourCost: item.labourCost || 0,
    unitCost,
    extendedCost: item.extendedCost || 0,
    costSource: item.costSource || 'placeholder',
    isPlaceholder: item.isPlaceholder || false,
    isNewPart: item.isNewPart || false,
    isAddedItem: item.isAddedItem || false,
    isFromTemplate: item.isFromTemplate || false,
    bomItemId: item.id,
  };

  // Only add optional fields if they have values
  if (item.parentItemCode) versionItem.parentItemCode = item.parentItemCode;
  if (item.vendorCode) versionItem.vendorCode = item.vendorCode;
  if (item.vendorName) versionItem.vendorName = item.vendorName;
  if (item.vendorContractPriceId) versionItem.contractPriceId = item.vendorContractPriceId;
  if (item.landingPct !== undefined && item.landingPct !== null) versionItem.landingPct = item.landingPct;
  if (item.updatedAt) versionItem.lastModified = item.updatedAt;
  if (item.updatedBy) versionItem.lastModifiedBy = item.updatedBy;

  return versionItem;
}

/**
 * Get the next version number for a project
 */
async function getNextVersionNumber(projectId: string): Promise<number> {
  const versionsRef = collection(db, `projects/${projectId}/versions`);
  const q = query(versionsRef, orderBy('versionNumber', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return 1;
  }
  
  const lastVersion = snapshot.docs[0].data() as BomVersion;
  return lastVersion.versionNumber + 1;
}

/**
 * Get all working BOM items for a project
 */
async function getBomItems(projectId: string): Promise<BomItem[]> {
  const bomItemsRef = collection(db, `projects/${projectId}/bomItems`);
  const snapshot = await getDocs(bomItemsRef);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as BomItem[];
}

export interface CreateVersionOptions {
  versionName?: string;
  description?: string;
  trigger: VersionTrigger;
  triggerDetails?: string;
  userId: string;
  userName?: string;
  importId?: string;
}

export interface CreateVersionResult {
  success: boolean;
  versionId?: string;
  versionNumber?: number;
  error?: string;
}

/**
 * Create a new version snapshot of the current BOM state
 */
export async function createVersion(
  projectId: string,
  options: CreateVersionOptions
): Promise<CreateVersionResult> {
  try {
    // Get all current BOM items
    const items = await getBomItems(projectId);
    
    if (items.length === 0) {
      return {
        success: false,
        error: 'Cannot create version: No items in BOM',
      };
    }

    // Calculate summary
    const summary = calculateVersionSummary(items);
    
    // Get next version number
    const versionNumber = await getNextVersionNumber(projectId);
    
    // Get previous version ID
    const versionsRef = collection(db, `projects/${projectId}/versions`);
    const prevQuery = query(versionsRef, orderBy('versionNumber', 'desc'), limit(1));
    const prevSnapshot = await getDocs(prevQuery);
    const previousVersionId = prevSnapshot.empty ? undefined : prevSnapshot.docs[0].id;

    // Create version document
    const versionRef = doc(versionsRef);
    const versionId = versionRef.id;
    
    // Determine storage strategy based on item count
    // Using subcollection for 100+ items (default for large BOMs)
    const itemsStorage: 'subcollection' | 'inline' = items.length >= 100 ? 'subcollection' : 'inline';
    
    const version: Omit<BomVersion, 'id'> = {
      projectId,
      versionNumber,
      versionName: options.versionName,
      description: options.description,
      createdAt: Timestamp.now(),
      createdBy: options.userId,
      createdByName: options.userName,
      trigger: options.trigger,
      triggerDetails: options.triggerDetails,
      summary,
      itemsStorage,
      previousVersionId,
      importId: options.importId,
    };

    // Convert BOM items to version items
    const versionItems = items.map(bomItemToVersionItem);

    // Write version document and items
    const BATCH_SIZE = 450; // Leave room for the version doc itself

    if (itemsStorage === 'inline') {
      // Store items inline for small BOMs
      // Each item is already cleaned of undefined values by bomItemToVersionItem
      const batch = writeBatch(db);
      batch.set(versionRef, removeUndefined({
        ...version,
        inlineItems: versionItems.map(item => removeUndefined(item as Record<string, unknown>)),
      }));
      await batch.commit();
    } else {
      // Store items in subcollection for larger BOMs
      const versionItemsRef = collection(db, `projects/${projectId}/versions/${versionId}/items`);
      
      // First batch: write version document
      const firstBatch = writeBatch(db);
      firstBatch.set(versionRef, removeUndefined(version));
      await firstBatch.commit();
      
      // Subsequent batches: write items
      for (let i = 0; i < versionItems.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchItems = versionItems.slice(i, i + BATCH_SIZE);
        
        batchItems.forEach((item) => {
          const itemRef = doc(versionItemsRef, item.id);
          batch.set(itemRef, removeUndefined(item));
        });
        
        await batch.commit();
      }
    }

    return {
      success: true,
      versionId,
      versionNumber,
    };
  } catch (error: unknown) {
    console.error('Error creating version:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create version',
    };
  }
}

// ============================================
// VERSION RETRIEVAL
// ============================================

/**
 * Get all versions for a project, ordered by version number descending
 */
export async function getVersions(projectId: string): Promise<BomVersion[]> {
  const versionsRef = collection(db, `projects/${projectId}/versions`);
  const q = query(versionsRef, orderBy('versionNumber', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as BomVersion[];
}

/**
 * Get a single version by ID
 */
export async function getVersion(projectId: string, versionId: string): Promise<BomVersion | null> {
  const versionRef = doc(db, `projects/${projectId}/versions/${versionId}`);
  const snapshot = await getDoc(versionRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as BomVersion;
}

/**
 * Get items for a version
 */
export async function getVersionItems(projectId: string, versionId: string): Promise<VersionItem[]> {
  const version = await getVersion(projectId, versionId);
  
  if (!version) {
    throw new Error('Version not found');
  }
  
  // If items are stored inline, return them directly
  if (version.itemsStorage === 'inline' && version.inlineItems) {
    return version.inlineItems;
  }
  
  // Otherwise, fetch from subcollection
  const itemsRef = collection(db, `projects/${projectId}/versions/${versionId}/items`);
  const snapshot = await getDocs(itemsRef);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as VersionItem[];
}

// ============================================
// DATE-BASED QUERIES
// ============================================

/**
 * Get the version that was current at a specific date
 * Returns the most recent version created at or before the given date
 */
export async function getVersionAtDate(projectId: string, date: Date): Promise<BomVersion | null> {
  const versionsRef = collection(db, `projects/${projectId}/versions`);
  const targetTimestamp = Timestamp.fromDate(date);
  
  const q = query(
    versionsRef,
    where('createdAt', '<=', targetTimestamp),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as BomVersion;
}

/**
 * Get all versions created within a date range
 */
export async function getVersionsInRange(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<BomVersion[]> {
  const versionsRef = collection(db, `projects/${projectId}/versions`);
  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);
  
  const q = query(
    versionsRef,
    where('createdAt', '>=', startTimestamp),
    where('createdAt', '<=', endTimestamp),
    orderBy('createdAt', 'asc')
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as BomVersion[];
}

/**
 * Get the latest version for a project
 */
export async function getLatestVersion(projectId: string): Promise<BomVersion | null> {
  const versionsRef = collection(db, `projects/${projectId}/versions`);
  const q = query(versionsRef, orderBy('versionNumber', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as BomVersion;
}

/**
 * Get the earliest (first) version for a project
 */
export async function getEarliestVersion(projectId: string): Promise<BomVersion | null> {
  const versionsRef = collection(db, `projects/${projectId}/versions`);
  const q = query(versionsRef, orderBy('versionNumber', 'asc'), limit(1));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as BomVersion;
}

// ============================================
// VERSION MANAGEMENT
// ============================================

/**
 * Delete a version and its items
 */
export async function deleteVersion(projectId: string, versionId: string): Promise<boolean> {
  try {
    const version = await getVersion(projectId, versionId);
    
    if (!version) {
      return false;
    }
    
    // If items are in subcollection, delete them first
    if (version.itemsStorage === 'subcollection') {
      const itemsRef = collection(db, `projects/${projectId}/versions/${versionId}/items`);
      const itemsSnapshot = await getDocs(itemsRef);
      
      const BATCH_SIZE = 500;
      const itemDocs = itemsSnapshot.docs;
      
      for (let i = 0; i < itemDocs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchDocs = itemDocs.slice(i, i + BATCH_SIZE);
        
        batchDocs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
      }
    }
    
    // Delete the version document
    const versionRef = doc(db, `projects/${projectId}/versions/${versionId}`);
    await deleteDoc(versionRef);
    
    return true;
  } catch (error) {
    console.error('Error deleting version:', error);
    return false;
  }
}

/**
 * Update version name and description
 */
export async function updateVersionDetails(
  projectId: string,
  versionId: string,
  updates: { versionName?: string; description?: string }
): Promise<boolean> {
  try {
    const versionRef = doc(db, `projects/${projectId}/versions/${versionId}`);
    const batch = writeBatch(db);
    
    batch.update(versionRef, removeUndefined(updates));
    await batch.commit();
    
    return true;
  } catch (error) {
    console.error('Error updating version:', error);
    return false;
  }
}

// ============================================
// AUTO-VERSION THRESHOLD CHECK
// ============================================

/**
 * Check if an operation should trigger auto-version creation
 * Returns true if 10 or more items are affected
 */
export function shouldAutoCreateVersion(affectedItemCount: number): boolean {
  return affectedItemCount >= 10;
}

/**
 * Generate a trigger details string based on the operation
 */
export function generateTriggerDetails(
  trigger: VersionTrigger,
  details: {
    itemCount?: number;
    fileName?: string;
    operation?: string;
  }
): string {
  switch (trigger) {
    case 'import':
      return details.fileName 
        ? `Imported from ${details.fileName}` 
        : `Imported ${details.itemCount || 0} items`;
    case 'price_update':
      return `Applied prices to ${details.itemCount || 0} items`;
    case 'transfer':
      return `Transferred ${details.itemCount || 0} items from template`;
    case 'bulk_edit':
      return `Bulk edited ${details.itemCount || 0} items`;
    case 'manual':
      return details.operation || 'Manual snapshot';
    case 'scheduled':
      return 'Scheduled automatic snapshot';
    default:
      return '';
  }
}

