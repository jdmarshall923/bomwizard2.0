import { 
  Timestamp, 
  writeBatch, 
  collection, 
  doc, 
  serverTimestamp, 
  getDocs, 
  query, 
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// ============================================================================
// SLItems Import Service
// ============================================================================

export interface SLItem {
  id: string;
  code: string;              // Item code (B-code)
  description: string;
  drawingNumber?: string;
  revision?: string;
  buyer?: string;
  commCode?: string;         // Commodity code
  country?: string;          // Country of origin
  pmtCode?: 'P' | 'M';       // P=Purchased, M=Manufactured
  reasonCode?: string;       // PRD, OBS, NPI, SLM, DIS
  unitWeight?: number;
  weightUnits?: string;
  
  // Computed fields
  isManufactured: boolean;
  isPlaceholder: boolean;
  
  // Metadata
  importId?: string;
  importedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SLItemsImportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  updatedCount: number;
  errors: { row: number; message: string; data?: any }[];
  importId: string;
}

/**
 * Column mappings for SLItems.csv
 */
export const SLITEMS_COLUMN_MAPPINGS: Record<string, string> = {
  'Item': 'code',
  'Description': 'description',
  'DrawingNbr': 'drawingNumber',
  'Revision': 'revision',
  'Buyer': 'buyer',
  'CommCode': 'commCode',
  'Country': 'country',
  'PMTCode': 'pmtCode',
  'ReasonCode': 'reasonCode',
  'UnitWeight': 'unitWeight',
  'WeightUnits': 'weightUnits',
};

/**
 * Auto-detect mappings for SLItems files
 */
export function autoDetectSLItemsMappings(headers: string[]): Record<string, { targetField: string; transform: string | null }> {
  const mappings: Record<string, { targetField: string; transform: string | null }> = {};
  
  headers.forEach(header => {
    const normalizedHeader = header.trim();
    
    // Direct match
    if (SLITEMS_COLUMN_MAPPINGS[normalizedHeader]) {
      const targetField = SLITEMS_COLUMN_MAPPINGS[normalizedHeader];
      mappings[normalizedHeader] = {
        targetField,
        transform: targetField === 'unitWeight' ? 'parseFloat' : null,
      };
    }
  });
  
  return mappings;
}

/**
 * Import SLItems from CSV data
 * This imports into the 'slItems' collection - separate from BOM items
 * SLItems is a reference copy of the Infor item master database
 */
export async function importSLItems(
  data: any[],
  userId: string,
  filename: string
): Promise<SLItemsImportResult> {
  const errors: { row: number; message: string; data?: any }[] = [];
  let successCount = 0;
  let updatedCount = 0;
  const importId = `slitems-import-${Date.now()}`;

  // Debug: Log incoming data
  console.log('importSLItems called with', data.length, 'rows');
  if (data.length > 0) {
    console.log('First row keys:', Object.keys(data[0]));
    console.log('First row data:', data[0]);
  }

  try {
    // Get existing SLItems for update detection (from slItems collection)
    const existingItems = await getSLItems();
    const existingMap = new Map(existingItems.map(item => [item.code.toUpperCase(), item]));
    
    const newItems: Omit<SLItem, 'id'>[] = [];
    const updateItems: { id: string; data: Partial<SLItem> }[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        const code = (row.Item || row.code || '').toString().trim().toUpperCase();
        if (!code) continue;

        const description = row.Description || row.description || '';
        const pmtCode = (row.PMTCode || row.pmtCode || 'P').toUpperCase();
        const isManufactured = pmtCode === 'M';
        const isPlaceholder = code.startsWith('BNEW') || code.startsWith('UNKNOWN');

        // Build item data - exclude undefined values (Firestore doesn't accept them)
        const itemData: Omit<SLItem, 'id'> = {
          code,
          description,
          pmtCode: pmtCode as 'P' | 'M',
          isManufactured,
          isPlaceholder,
          importId,
          importedAt: Timestamp.now(),
        };
        
        // Only add optional fields if they have values
        const drawingNumber = row.DrawingNbr || row.drawingNumber;
        if (drawingNumber) itemData.drawingNumber = drawingNumber;
        const revision = row.Revision || row.revision;
        if (revision) itemData.revision = revision;
        const buyer = row.Buyer || row.buyer;
        if (buyer) itemData.buyer = buyer;
        const commCode = row.CommCode || row.commCode;
        if (commCode) itemData.commCode = commCode;
        const country = row.Country || row.country;
        if (country) itemData.country = country;
        const reasonCode = row.ReasonCode || row.reasonCode;
        if (reasonCode) itemData.reasonCode = reasonCode;
        const unitWeight = parseFloat(row.UnitWeight || row.unitWeight);
        if (unitWeight && !isNaN(unitWeight)) itemData.unitWeight = unitWeight;
        const weightUnits = row.WeightUnits || row.weightUnits;
        if (weightUnits) itemData.weightUnits = weightUnits;

        const existing = existingMap.get(code);
        if (existing) {
          updateItems.push({ id: existing.id, data: itemData });
          updatedCount++;
        } else {
          newItems.push(itemData);
          successCount++;
        }
      } catch (error: any) {
        errors.push({
          row: i + 1,
          message: error.message || 'Failed to process row',
          data: row,
        });
      }
    }

    // Write new and updated items
    await writeSLItems(newItems, updateItems);

    return {
      success: errors.length === 0,
      successCount,
      updatedCount,
      errorCount: errors.length,
      errors,
      importId,
    };
  } catch (error: any) {
    console.error('SLItems import error:', error);
    // Re-throw to let the calling code handle the error with full details
    throw new Error(`Import failed: ${error.message || 'Unknown error'}`);
  }
}

async function writeSLItems(
  newItems: Omit<SLItem, 'id'>[],
  updateItems: { id: string; data: Partial<SLItem> }[]
): Promise<void> {
  const BATCH_SIZE = 500;
  // Use separate 'slItems' collection - this is Infor reference data, not BOM items
  const itemsRef = collection(db, 'slItems');

  // Write new items
  for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchItems = newItems.slice(i, i + BATCH_SIZE);

    batchItems.forEach((item) => {
      const itemRef = doc(itemsRef);
      batch.set(itemRef, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }

  // Update existing items
  for (let i = 0; i < updateItems.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchUpdates = updateItems.slice(i, i + BATCH_SIZE);

    batchUpdates.forEach(({ id, data }) => {
      const itemRef = doc(itemsRef, id);
      batch.update(itemRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }
}

/**
 * Get all SLItems (Infor reference data)
 */
export async function getSLItems(): Promise<SLItem[]> {
  // Use separate 'slItems' collection
  const itemsRef = collection(db, 'slItems');
  // Don't use orderBy to avoid index requirement - sort in memory
  const snapshot = await getDocs(itemsRef);
  
  const items = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as SLItem[];
  
  // Sort in memory
  return items.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
}

/**
 * Look up an item in SLItems by code
 * Returns null if not found (useful for identifying items not in Infor)
 */
export async function findSLItemByCode(code: string): Promise<SLItem | null> {
  const itemsRef = collection(db, 'slItems');
  const q = query(itemsRef, where('code', '==', code.toUpperCase()));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as SLItem;
}

// ============================================================================
// SLVendors Import Service
// ============================================================================

export interface SLVendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  notes?: string;
  
  // Metadata
  importId?: string;
  importedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SLVendorsImportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  updatedCount: number;
  errors: { row: number; message: string; data?: any }[];
  importId: string;
}

/**
 * Column mappings for SLVendors.csv
 */
export const SLVENDORS_COLUMN_MAPPINGS: Record<string, string> = {
  'VendorCode': 'vendorCode',
  'VendorName': 'vendorName',
  'Notes': 'notes',
};

/**
 * Auto-detect mappings for SLVendors files
 */
export function autoDetectSLVendorsMappings(headers: string[]): Record<string, { targetField: string; transform: string | null }> {
  const mappings: Record<string, { targetField: string; transform: string | null }> = {};
  
  headers.forEach(header => {
    const normalizedHeader = header.trim();
    
    if (SLVENDORS_COLUMN_MAPPINGS[normalizedHeader]) {
      mappings[normalizedHeader] = {
        targetField: SLVENDORS_COLUMN_MAPPINGS[normalizedHeader],
        transform: null,
      };
    }
  });
  
  return mappings;
}

/**
 * Import SLVendors from CSV data
 * This imports into the 'slVendors' collection - separate from any other vendor data
 * SLVendors is a reference copy of the Infor vendor master database
 */
export async function importSLVendors(
  data: any[],
  userId: string,
  filename: string
): Promise<SLVendorsImportResult> {
  const errors: { row: number; message: string; data?: any }[] = [];
  let successCount = 0;
  let updatedCount = 0;
  const importId = `slvendors-import-${Date.now()}`;

  // Debug: Log incoming data
  console.log('importSLVendors called with', data.length, 'rows');
  if (data.length > 0) {
    console.log('First row keys:', Object.keys(data[0]));
    console.log('First row data:', data[0]);
  }

  try {
    // Get existing vendors for update detection
    const existingVendors = await getSLVendors();
    const existingMap = new Map(existingVendors.map(v => [v.vendorCode.toUpperCase(), v]));
    
    const newVendors: Omit<SLVendor, 'id'>[] = [];
    const updateVendors: { id: string; data: Partial<SLVendor> }[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        const vendorCode = (row.VendorCode || row.vendorCode || '').toString().trim().toUpperCase();
        if (!vendorCode) continue;
        
        // Skip header/placeholder rows
        if (vendorCode.startsWith('VXXXXX')) continue;

        // Build vendor data - exclude undefined values (Firestore doesn't accept them)
        const vendorData: Omit<SLVendor, 'id'> = {
          vendorCode,
          vendorName: row.VendorName || row.vendorName || '',
          importId,
          importedAt: Timestamp.now(),
        };
        
        // Only add optional fields if they have values
        const notes = row.Notes || row.notes;
        if (notes) vendorData.notes = notes;

        const existing = existingMap.get(vendorCode);
        if (existing) {
          updateVendors.push({ id: existing.id, data: vendorData });
          updatedCount++;
        } else {
          newVendors.push(vendorData);
          successCount++;
        }
      } catch (error: any) {
        errors.push({
          row: i + 1,
          message: error.message || 'Failed to process row',
          data: row,
        });
      }
    }

    // Write new and updated vendors
    await writeSLVendors(newVendors, updateVendors);

    return {
      success: errors.length === 0,
      successCount,
      updatedCount,
      errorCount: errors.length,
      errors,
      importId,
    };
  } catch (error: any) {
    console.error('SLVendors import error:', error);
    throw new Error(`Import failed: ${error.message || 'Unknown error'}`);
  }
}

async function writeSLVendors(
  newVendors: Omit<SLVendor, 'id'>[],
  updateVendors: { id: string; data: Partial<SLVendor> }[]
): Promise<void> {
  const BATCH_SIZE = 500;
  // Use separate 'slVendors' collection - this is Infor reference data
  const vendorsRef = collection(db, 'slVendors');

  // Write new vendors
  for (let i = 0; i < newVendors.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchVendors = newVendors.slice(i, i + BATCH_SIZE);

    batchVendors.forEach((vendor) => {
      const vendorRef = doc(vendorsRef);
      batch.set(vendorRef, {
        ...vendor,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }

  // Update existing vendors
  for (let i = 0; i < updateVendors.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchUpdates = updateVendors.slice(i, i + BATCH_SIZE);

    batchUpdates.forEach(({ id, data }) => {
      const vendorRef = doc(vendorsRef, id);
      batch.update(vendorRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }
}

/**
 * Get all SLVendors (Infor reference data)
 */
export async function getSLVendors(): Promise<SLVendor[]> {
  // Use separate 'slVendors' collection
  const vendorsRef = collection(db, 'slVendors');
  // Don't use orderBy to avoid index requirement - sort in memory
  const snapshot = await getDocs(vendorsRef);
  
  const vendors = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as SLVendor[];
  
  // Sort in memory
  return vendors.sort((a, b) => (a.vendorCode || '').localeCompare(b.vendorCode || ''));
}

/**
 * Look up a vendor in SLVendors by code
 */
export async function findSLVendorByCode(code: string): Promise<SLVendor | null> {
  const vendorsRef = collection(db, 'slVendors');
  const q = query(vendorsRef, where('vendorCode', '==', code.toUpperCase()));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as SLVendor;
}

// ============================================================================
// Clear Data Functions
// ============================================================================

/**
 * Clear all SLItems data
 */
export async function clearSLItems(): Promise<{ success: boolean; deletedCount: number }> {
  const BATCH_SIZE = 500;
  const itemsRef = collection(db, 'slItems');
  const snapshot = await getDocs(itemsRef);
  
  let deletedCount = 0;
  
  // Delete in batches
  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchDocs = snapshot.docs.slice(i, i + BATCH_SIZE);
    
    batchDocs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    
    await batch.commit();
    deletedCount += batchDocs.length;
  }
  
  return { success: true, deletedCount };
}

/**
 * Clear all SLVendors data
 */
export async function clearSLVendors(): Promise<{ success: boolean; deletedCount: number }> {
  const BATCH_SIZE = 500;
  const vendorsRef = collection(db, 'slVendors');
  const snapshot = await getDocs(vendorsRef);
  
  let deletedCount = 0;
  
  // Delete in batches
  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchDocs = snapshot.docs.slice(i, i + BATCH_SIZE);
    
    batchDocs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    
    await batch.commit();
    deletedCount += batchDocs.length;
  }
  
  return { success: true, deletedCount };
}

