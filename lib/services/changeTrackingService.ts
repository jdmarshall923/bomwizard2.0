import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  ChangeRecord,
  ChangeBatch,
  ChangeType,
  CreateChangeRecordInput,
  ChangeRecordFilters,
  ItemHistory,
  FieldHistory,
  ChangeSummary,
} from '@/types/changes';
import { COLUMN_DEFINITIONS } from '@/types/settings';

/**
 * Phase 14: Change Tracking Service
 * 
 * Logs cell-level changes to Firestore for history tracking.
 * Provides granular "who changed what, when, and why" tracking.
 */

// ============================================
// CREATE CHANGE RECORDS
// ============================================

/**
 * Log a single cell change
 */
export async function logCellChange(
  input: CreateChangeRecordInput,
  userId: string,
  userName?: string
): Promise<string> {
  const { projectId, ...changeData } = input;
  
  // Get display name for field
  const fieldDisplayName = changeData.fieldDisplayName 
    || COLUMN_DEFINITIONS[changeData.field]?.displayName 
    || changeData.field;
  
  const record: Omit<ChangeRecord, 'id'> = {
    ...changeData,
    projectId,
    fieldDisplayName,
    changedBy: userId,
    changedByName: userName,
    changedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(
    collection(db, 'projects', projectId, 'changeRecords'),
    record
  );
  
  return docRef.id;
}

/**
 * Log multiple cell changes as a batch
 * Returns the batch ID for grouping
 */
export async function logBatchChanges(
  projectId: string,
  changes: Omit<CreateChangeRecordInput, 'projectId'>[],
  batchDescription: string,
  userId: string,
  userName?: string
): Promise<string> {
  if (changes.length === 0) return '';
  
  const batchId = `batch-${Date.now()}`;
  const batch = writeBatch(db);
  const changesRef = collection(db, 'projects', projectId, 'changeRecords');
  const batchesRef = collection(db, 'projects', projectId, 'changeBatches');
  
  // Determine unique fields changed
  const uniqueFields = new Set(changes.map(c => c.field));
  const uniqueItems = new Set(changes.map(c => c.itemId));
  
  // Create change records
  for (const change of changes) {
    const fieldDisplayName = change.fieldDisplayName 
      || COLUMN_DEFINITIONS[change.field]?.displayName 
      || change.field;
    
    const record: Omit<ChangeRecord, 'id'> = {
      ...change,
      projectId,
      fieldDisplayName,
      changedBy: userId,
      changedByName: userName,
      changedAt: Timestamp.now(),
      batchId,
      batchDescription,
    };
    
    const newDocRef = doc(changesRef);
    batch.set(newDocRef, record);
  }
  
  // Create batch record
  const batchRecord: Omit<ChangeBatch, 'id'> = {
    projectId,
    description: batchDescription,
    changeType: changes[0].changeType,
    itemCount: uniqueItems.size,
    fieldCount: uniqueFields.size,
    totalChanges: changes.length,
    createdBy: userId,
    createdByName: userName,
    createdAt: Timestamp.now(),
  };
  
  const batchDocRef = doc(batchesRef, batchId);
  batch.set(batchDocRef, batchRecord);
  
  await batch.commit();
  
  return batchId;
}

// ============================================
// QUERY CHANGE RECORDS
// ============================================

/**
 * Get change history for a specific item
 */
export async function getItemHistory(
  projectId: string,
  itemId: string,
  options?: {
    limit?: number;
    startAfterDoc?: DocumentSnapshot;
  }
): Promise<{ changes: ChangeRecord[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, 'projects', projectId, 'changeRecords'),
    where('itemId', '==', itemId),
    orderBy('changedAt', 'desc'),
    limit(options?.limit || 50)
  );
  
  if (options?.startAfterDoc) {
    q = query(q, startAfter(options.startAfterDoc));
  }
  
  const snapshot = await getDocs(q);
  const changes = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ChangeRecord[];
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  
  return { changes, lastDoc };
}

/**
 * Get change history for a specific field on an item
 */
export async function getFieldHistory(
  projectId: string,
  itemId: string,
  field: string,
  maxChanges: number = 20
): Promise<FieldHistory> {
  const q = query(
    collection(db, 'projects', projectId, 'changeRecords'),
    where('itemId', '==', itemId),
    where('field', '==', field),
    orderBy('changedAt', 'desc'),
    limit(maxChanges)
  );
  
  const snapshot = await getDocs(q);
  const changes = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ChangeRecord[];
  
  // Get display name
  const fieldDisplayName = COLUMN_DEFINITIONS[field]?.displayName || field;
  
  // Get current value (most recent change's newValue)
  const currentValue = changes.length > 0 ? changes[0].newValue : null;
  
  return {
    itemId,
    itemCode: changes[0]?.itemCode || '',
    field,
    fieldDisplayName,
    currentValue,
    changes,
    totalChanges: changes.length,
  };
}

/**
 * Get recent changes for a project
 */
export async function getProjectRecentChanges(
  projectId: string,
  options?: {
    limit?: number;
    changeType?: ChangeType;
    changedBy?: string;
    fromDate?: Timestamp;
    toDate?: Timestamp;
    startAfterDoc?: DocumentSnapshot;
  }
): Promise<{ changes: ChangeRecord[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, 'projects', projectId, 'changeRecords'),
    orderBy('changedAt', 'desc'),
    limit(options?.limit || 50)
  );
  
  if (options?.changeType) {
    q = query(q, where('changeType', '==', options.changeType));
  }
  
  if (options?.changedBy) {
    q = query(q, where('changedBy', '==', options.changedBy));
  }
  
  if (options?.startAfterDoc) {
    q = query(q, startAfter(options.startAfterDoc));
  }
  
  const snapshot = await getDocs(q);
  const changes = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ChangeRecord[];
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  
  return { changes, lastDoc };
}

/**
 * Get changes for a specific batch
 */
export async function getBatchChanges(
  projectId: string,
  batchId: string
): Promise<ChangeRecord[]> {
  const q = query(
    collection(db, 'projects', projectId, 'changeRecords'),
    where('batchId', '==', batchId),
    orderBy('changedAt', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ChangeRecord[];
}

// ============================================
// CHANGE SUMMARY
// ============================================

/**
 * Get a summary of changes in a time period
 * Note: This is a simplified version; for production,
 * consider using aggregation queries or Cloud Functions
 */
export async function getChangeSummary(
  projectId: string,
  fromDate: Timestamp,
  toDate: Timestamp,
  maxRecords: number = 1000
): Promise<ChangeSummary> {
  const q = query(
    collection(db, 'projects', projectId, 'changeRecords'),
    where('changedAt', '>=', fromDate),
    where('changedAt', '<=', toDate),
    orderBy('changedAt', 'desc'),
    limit(maxRecords)
  );
  
  const snapshot = await getDocs(q);
  const changes = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ChangeRecord[];
  
  // Aggregate by type
  const byType: Record<ChangeType, number> = {
    manual: 0,
    import: 0,
    sync: 0,
    calculated: 0,
    override: 0,
    bulk: 0,
    revert: 0,
  };
  
  // Aggregate by field
  const byField: Record<string, { field: string; fieldDisplayName: string; count: number }> = {};
  
  // Aggregate by user
  const byUser: Record<string, { userId: string; userName: string; count: number }> = {};
  
  // Track unique items
  const uniqueItems = new Set<string>();
  
  for (const change of changes) {
    // By type
    byType[change.changeType] = (byType[change.changeType] || 0) + 1;
    
    // By field
    if (!byField[change.field]) {
      byField[change.field] = {
        field: change.field,
        fieldDisplayName: change.fieldDisplayName || change.field,
        count: 0,
      };
    }
    byField[change.field].count++;
    
    // By user
    if (!byUser[change.changedBy]) {
      byUser[change.changedBy] = {
        userId: change.changedBy,
        userName: change.changedByName || 'Unknown',
        count: 0,
      };
    }
    byUser[change.changedBy].count++;
    
    // Unique items
    uniqueItems.add(change.itemId);
  }
  
  return {
    projectId,
    fromDate,
    toDate,
    totalChanges: changes.length,
    itemsAffected: uniqueItems.size,
    byChangeType: Object.entries(byType)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type: type as ChangeType, count }))
      .sort((a, b) => b.count - a.count),
    byField: Object.values(byField)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    byUser: Object.values(byUser)
      .sort((a, b) => b.count - a.count),
  };
}

// ============================================
// HELPER: CREATE CHANGE FROM BOM UPDATE
// ============================================

/**
 * Helper to create a change record input from a BOM item update
 */
export function createChangeInput(
  projectId: string,
  itemId: string,
  itemCode: string,
  itemDescription: string,
  field: string,
  oldValue: any,
  newValue: any,
  changeType: ChangeType,
  options?: {
    source?: string;
    reason?: string;
    batchId?: string;
  }
): CreateChangeRecordInput {
  return {
    projectId,
    itemId,
    itemCode,
    itemDescription,
    field,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
    changeType,
    source: options?.source,
    reason: options?.reason,
    batchId: options?.batchId,
  };
}

/**
 * Compare two values and determine if they've changed
 */
export function hasValueChanged(
  oldValue: any,
  newValue: any
): boolean {
  // Handle null/undefined
  if (oldValue === null || oldValue === undefined) {
    return newValue !== null && newValue !== undefined;
  }
  if (newValue === null || newValue === undefined) {
    return true;
  }
  
  // Handle numbers (with precision)
  if (typeof oldValue === 'number' && typeof newValue === 'number') {
    return Math.abs(oldValue - newValue) > 0.0001;
  }
  
  // Direct comparison
  return oldValue !== newValue;
}

/**
 * Get changes between two BOM item states
 */
export function diffBomItems(
  projectId: string,
  oldItem: Record<string, any>,
  newItem: Record<string, any>,
  trackedFields: string[]
): CreateChangeRecordInput[] {
  const changes: CreateChangeRecordInput[] = [];
  
  for (const field of trackedFields) {
    if (hasValueChanged(oldItem[field], newItem[field])) {
      changes.push(createChangeInput(
        projectId,
        oldItem.id || newItem.id,
        oldItem.itemCode || newItem.itemCode,
        oldItem.itemDescription || newItem.itemDescription,
        field,
        oldItem[field],
        newItem[field],
        'manual'
      ));
    }
  }
  
  return changes;
}

// ============================================
// TRACKED FIELDS
// ============================================

/**
 * Fields that should be tracked for change history
 */
export const TRACKED_FIELDS = [
  'quantity',
  'materialCost',
  'landingCost',
  'labourCost',
  'costSource',
  'vendorCode',
  'vendorName',
  'weightKg',
  'drawingNumber',
  'revision',
  'partCategory',
  'purchasedOrManufactured',
  'pdmWorkflowState',
  'bikeCategory',
  'bikeType',
  'functionalCategory',
  'crcn',
  'targetSwitchStatus',
  'notes',
];
