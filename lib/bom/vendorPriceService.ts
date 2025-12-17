import { VendorContractPrice, BomItem } from '@/types';
import { 
  Timestamp, 
  writeBatch, 
  collection, 
  doc, 
  serverTimestamp, 
  getDocs, 
  query, 
  where,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ColumnMappings } from '@/lib/import/columnMapper';

export interface VendorPriceImportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: { row: number; message: string; data?: any }[];
  importId: string;
}

/**
 * Column mappings for VendorContractPrices.csv
 */
export const VENDOR_PRICE_COLUMN_MAPPINGS: Record<string, string> = {
  'VendorCode': 'vendorCode',
  'VendorName': 'vendorName',
  'Currency': 'currency',
  'BCode': 'itemCode',
  'DrawingNumber': 'drawingNumber',
  'Description': 'description',
  'UnitPrice': 'unitPrice',
  'MOQ': 'moq',
  'LeadTimeDays': 'leadTimeDays',
  'Status': 'status',
  'EffectiveDate': 'effectiveDate',
  'ExpiryDate': 'expiryDate',
  'ShipFromCountry': 'shipFromCountry',
  'LandingPct': 'landingPct',
  'WeightKg': 'weightKg',
};

/**
 * Auto-detect mappings for vendor price files
 */
export function autoDetectVendorPriceMappings(headers: string[]): ColumnMappings {
  const mappings: ColumnMappings = {};
  
  headers.forEach(header => {
    const normalizedHeader = header.trim();
    
    // Direct match
    if (VENDOR_PRICE_COLUMN_MAPPINGS[normalizedHeader]) {
      mappings[normalizedHeader] = {
        targetField: VENDOR_PRICE_COLUMN_MAPPINGS[normalizedHeader],
        transform: null,
      };
      return;
    }
    
    // Case-insensitive match
    const lowerHeader = normalizedHeader.toLowerCase();
    for (const [key, value] of Object.entries(VENDOR_PRICE_COLUMN_MAPPINGS)) {
      if (key.toLowerCase() === lowerHeader) {
        mappings[normalizedHeader] = {
          targetField: value,
          transform: null,
        };
        return;
      }
    }
    
    // Fuzzy matches
    if (lowerHeader.includes('vendor') && lowerHeader.includes('code')) {
      mappings[normalizedHeader] = { targetField: 'vendorCode', transform: null };
    } else if (lowerHeader.includes('vendor') && lowerHeader.includes('name')) {
      mappings[normalizedHeader] = { targetField: 'vendorName', transform: null };
    } else if (lowerHeader.includes('unit') && lowerHeader.includes('price')) {
      mappings[normalizedHeader] = { targetField: 'unitPrice', transform: 'parseFloat' };
    } else if (lowerHeader === 'moq' || lowerHeader.includes('minimum')) {
      mappings[normalizedHeader] = { targetField: 'moq', transform: 'parseInt' };
    } else if (lowerHeader.includes('lead') && lowerHeader.includes('time')) {
      mappings[normalizedHeader] = { targetField: 'leadTimeDays', transform: 'parseInt' };
    } else if (lowerHeader.includes('landing')) {
      mappings[normalizedHeader] = { targetField: 'landingPct', transform: 'parseFloat' };
    } else if (lowerHeader.includes('bcode') || (lowerHeader.includes('item') && lowerHeader.includes('code'))) {
      mappings[normalizedHeader] = { targetField: 'itemCode', transform: null };
    }
  });
  
  return mappings;
}

/**
 * Parse date string from Infor format (DD.MM.YYYY) to Timestamp
 */
function parseInforDate(dateStr: string): Timestamp | undefined {
  if (!dateStr) return undefined;
  
  // Try DD.MM.YYYY format
  const dotMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return Timestamp.fromDate(date);
  }
  
  // Try ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return Timestamp.fromDate(isoDate);
  }
  
  return undefined;
}

/**
 * Import vendor contract prices from CSV data
 * Stores in global vendorContractPrices collection
 * Works directly with CSV column names from VendorContractPrices.csv
 */
export async function importVendorContractPrices(
  data: any[],
  mappings: ColumnMappings | null, // mappings parameter kept for compatibility but not used
  userId: string,
  filename: string
): Promise<VendorPriceImportResult> {
  const errors: { row: number; message: string; data?: any }[] = [];
  let successCount = 0;
  const importId = `vcp-import-${Date.now()}`;

  // Debug: Log incoming data
  console.log('importVendorContractPrices called with', data.length, 'rows');
  if (data.length > 0) {
    console.log('First row keys:', Object.keys(data[0]));
    console.log('First row data:', data[0]);
  }

  try {
    // Prepare price documents - work directly with CSV column names
    const prices: Omit<VendorContractPrice, 'id'>[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Get values using original CSV column names
        const vendorCode = (row.VendorCode || row.vendorCode || '').toString().trim();
        const itemCode = (row.BCode || row.itemCode || '').toString().trim().toUpperCase();
        
        // Skip empty rows or header placeholder rows
        if (!itemCode || !vendorCode || vendorCode.startsWith('VXXXXX')) {
          continue;
        }

        // Parse numeric values
        const unitPrice = parseFloat(row.UnitPrice || row.unitPrice) || 0;
        const moq = parseInt(row.MOQ || row.moq) || 1;
        const leadTimeDays = parseInt(row.LeadTimeDays || row.leadTimeDays) || 0;
        const landingPct = parseFloat(row.LandingPct || row.landingPct) || 0;
        const weightKg = parseFloat(row.WeightKg || row.weightKg) || undefined;

        // Parse status
        let status: 'active' | 'expired' | 'pending' = 'active';
        const statusValue = row.Status || row.status || '';
        if (statusValue) {
          const statusLower = statusValue.toLowerCase();
          if (statusLower === 'expired') status = 'expired';
          else if (statusLower === 'pending') status = 'pending';
        }

        // Parse dates
        const effectiveDate = parseInforDate(row.EffectiveDate || row.effectiveDate);
        const expiryDate = parseInforDate(row.ExpiryDate || row.expiryDate);

        // Check if expired based on date
        if (expiryDate && expiryDate.toDate() < new Date()) {
          status = 'expired';
        }

        // Build price object - exclude undefined values (Firestore doesn't accept them)
        const price: Omit<VendorContractPrice, 'id'> = {
          vendorCode,
          vendorName: row.VendorName || row.vendorName || '',
          itemCode,
          unitPrice,
          currency: row.Currency || row.currency || 'GBP',
          moq,
          leadTimeDays,
          status,
          importId,
          importedAt: Timestamp.now(),
        };
        
        // Only add optional fields if they have values
        if (landingPct > 0) price.landingPct = landingPct;
        if (weightKg) price.weightKg = weightKg;
        if (effectiveDate) price.effectiveDate = effectiveDate;
        if (expiryDate) price.expiryDate = expiryDate;
        const shipFrom = row.ShipFromCountry || row.shipFromCountry;
        if (shipFrom) price.shipFromCountry = shipFrom;
        const drawing = row.DrawingNumber || row.drawingNumber;
        if (drawing) price.drawingNumber = drawing;
        const desc = row.Description || row.description;
        if (desc) price.description = desc;

        prices.push(price);
        successCount++;
      } catch (error: any) {
        errors.push({
          row: i + 1,
          message: error.message || 'Failed to process row',
          data: row,
        });
      }
    }

    // Write prices in batches
    if (prices.length > 0) {
      await writeVendorContractPrices(prices);
    }

    return {
      success: errors.length === 0,
      successCount,
      errorCount: errors.length,
      errors,
      importId,
    };
  } catch (error: any) {
    console.error('VendorContractPrices import error:', error);
    throw new Error(`Import failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Write vendor contract prices to Firestore
 * Uses upsert logic - updates existing prices for same vendor+item combo
 */
async function writeVendorContractPrices(
  prices: Omit<VendorContractPrice, 'id'>[]
): Promise<void> {
  const BATCH_SIZE = 500;
  const pricesRef = collection(db, 'vendorContractPrices');

  // Get existing prices to check for duplicates
  const existingSnapshot = await getDocs(pricesRef);
  const existingMap = new Map<string, string>();
  existingSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const key = `${data.vendorCode}-${data.itemCode}`;
    existingMap.set(key, doc.id);
  });

  // Separate into updates and creates
  const updates: { id: string; data: Omit<VendorContractPrice, 'id'> }[] = [];
  const creates: Omit<VendorContractPrice, 'id'>[] = [];

  prices.forEach(price => {
    const key = `${price.vendorCode}-${price.itemCode}`;
    const existingId = existingMap.get(key);
    
    if (existingId) {
      updates.push({ id: existingId, data: price });
    } else {
      creates.push(price);
    }
  });

  // Perform updates
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchUpdates = updates.slice(i, i + BATCH_SIZE);

    batchUpdates.forEach(({ id, data }) => {
      const docRef = doc(pricesRef, id);
      batch.update(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }

  // Perform creates
  for (let i = 0; i < creates.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchCreates = creates.slice(i, i + BATCH_SIZE);

    batchCreates.forEach((price) => {
      const priceRef = doc(pricesRef);
      batch.set(priceRef, {
        ...price,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }
}

/**
 * Get all vendor contract prices
 */
export async function getVendorContractPrices(): Promise<VendorContractPrice[]> {
  const pricesRef = collection(db, 'vendorContractPrices');
  // Don't use orderBy to avoid index requirement - sort in memory
  const snapshot = await getDocs(pricesRef);
  
  const prices = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as VendorContractPrice[];
  
  // Sort in memory
  return prices.sort((a, b) => (a.itemCode || '').localeCompare(b.itemCode || ''));
}

/**
 * Get vendor contract prices for a specific item code
 */
export async function getVendorPricesForItem(itemCode: string): Promise<VendorContractPrice[]> {
  const pricesRef = collection(db, 'vendorContractPrices');
  const q = query(
    pricesRef, 
    where('itemCode', '==', itemCode.toUpperCase()),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as VendorContractPrice[];
}

/**
 * Match a BOM item to the best available vendor contract price
 */
export async function findBestPriceForItem(itemCode: string): Promise<VendorContractPrice | null> {
  const prices = await getVendorPricesForItem(itemCode);
  
  if (prices.length === 0) return null;
  
  // Sort by: active status, lowest price, longest validity
  const sortedPrices = prices.sort((a, b) => {
    // Prefer active over other statuses
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    
    // Then by lowest price
    return a.unitPrice - b.unitPrice;
  });
  
  return sortedPrices[0];
}

/**
 * Apply vendor prices to working BOM items
 * Matches items by itemCode and updates costs
 */
export async function applyVendorPricesToBom(
  projectId: string
): Promise<{ updated: number; notFound: number; errors: string[] }> {
  const bomItemsRef = collection(db, `projects/${projectId}/bomItems`);
  const snapshot = await getDocs(bomItemsRef);
  
  let updated = 0;
  let notFound = 0;
  const errors: string[] = [];
  
  const BATCH_SIZE = 500;
  let batch = writeBatch(db);
  let batchCount = 0;
  
  for (const docSnap of snapshot.docs) {
    const item = docSnap.data() as BomItem;
    
    // Skip non-purchased items
    if (item.source === 'manufactured' || item.itemType === 'group' || item.itemType === 'check') {
      continue;
    }
    
    try {
      const price = await findBestPriceForItem(item.itemCode);
      
      if (price) {
        // Calculate costs
        const materialCost = price.unitPrice;
        const landingCost = price.landingPct 
          ? materialCost * (price.landingPct / 100) 
          : 0;
        const extendedCost = item.quantity * (materialCost + landingCost + (item.labourCost || 0));
        
        // Check if cost changed
        const hasCostChange = materialCost !== item.originalMaterialCost ||
                             landingCost !== item.originalLandingCost;
        
        batch.update(docSnap.ref, {
          materialCost,
          landingCost,
          extendedCost,
          costSource: 'contract',
          vendorContractPriceId: price.id,
          vendorCode: price.vendorCode,
          vendorName: price.vendorName,
          currency: price.currency,
          moq: price.moq,
          leadTimeDays: price.leadTimeDays,
          landingPct: price.landingPct,
          contractStatus: price.status,
          effectiveDate: price.effectiveDate,
          expiryDate: price.expiryDate,
          hasCostChange,
          updatedAt: serverTimestamp(),
        });
        
        batchCount++;
        updated++;
        
        // Commit batch if it's full
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      } else {
        notFound++;
      }
    } catch (err: any) {
      errors.push(`${item.itemCode}: ${err.message}`);
    }
  }
  
  // Commit any remaining updates
  if (batchCount > 0) {
    await batch.commit();
  }
  
  return { updated, notFound, errors };
}

/**
 * Apply a specific vendor price to a single BOM item
 */
export async function applyVendorPriceToItem(
  projectId: string,
  itemId: string,
  vendorPriceId: string
): Promise<void> {
  // Get the vendor price
  const pricesRef = collection(db, 'vendorContractPrices');
  const priceDoc = await getDocs(query(pricesRef, where('__name__', '==', vendorPriceId)));
  
  if (priceDoc.empty) {
    throw new Error('Vendor price not found');
  }
  
  const price = {
    id: priceDoc.docs[0].id,
    ...priceDoc.docs[0].data(),
  } as VendorContractPrice;
  
  // Get the BOM item
  const itemRef = doc(db, `projects/${projectId}/bomItems`, itemId);
  
  // Calculate costs
  const materialCost = price.unitPrice;
  const landingCost = price.landingPct 
    ? materialCost * (price.landingPct / 100) 
    : 0;
  
  await updateDoc(itemRef, {
    materialCost,
    landingCost,
    costSource: 'contract',
    vendorContractPriceId: price.id,
    vendorCode: price.vendorCode,
    vendorName: price.vendorName,
    currency: price.currency,
    moq: price.moq,
    leadTimeDays: price.leadTimeDays,
    landingPct: price.landingPct,
    contractStatus: price.status,
    effectiveDate: price.effectiveDate,
    expiryDate: price.expiryDate,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Clear all vendor contract prices
 */
export async function clearVendorContractPrices(): Promise<{ success: boolean; deletedCount: number }> {
  const BATCH_SIZE = 500;
  const pricesRef = collection(db, 'vendorContractPrices');
  const snapshot = await getDocs(pricesRef);
  
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

