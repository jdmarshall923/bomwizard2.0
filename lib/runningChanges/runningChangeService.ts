import { 
  RunningChange, 
  RunningChangeImportResult, 
  RunningChangeStats 
} from '@/types/runningChange';
import { 
  Timestamp, 
  writeBatch, 
  collection, 
  doc, 
  serverTimestamp, 
  getDocs, 
  query, 
  where,
  updateDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Column mappings for Running Changes CSV
 * Maps CSV header names to RunningChange fields
 */
export const RUNNING_CHANGE_COLUMN_MAPPINGS: Record<string, string> = {
  'Who': 'owner',
  'Project is affects': 'projectsAffected',
  'CN Number': 'cnNumber',
  'CN Description': 'cnDescription',
  'Assignee': 'assignee',
  'Estimated GO LIVE date': 'estimatedGoLiveDate',
  'Affected Line': 'affectedLine',
  'B-codes changing': 'bCodesChanging',
  'Old B-codes': 'oldBCodes',
  'New- B-codes': 'newBCodes',
  'Current status description': 'statusDescription',
  'Change Type': 'changeType',
  'NPI/CMS': 'npiOrCms',
  'Project Code': 'projectCode',
  'Team': 'team',
};

/**
 * Parse date string from UK format (DD/MM/YYYY) to Timestamp
 */
function parseUKDate(dateStr: string): Timestamp | null {
  if (!dateStr) return null;
  
  // Try DD/MM/YYYY format
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return Timestamp.fromDate(date);
    }
  }
  
  // Try DD.MM.YYYY format
  const dotMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return Timestamp.fromDate(date);
    }
  }
  
  // Try DD-MM-YYYY format
  const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return Timestamp.fromDate(date);
    }
  }
  
  // Try ISO format as fallback
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return Timestamp.fromDate(isoDate);
  }
  
  return null;
}

/**
 * Parse comma-separated B-codes into array
 * Handles various formats: "B123456", "B123456, B789012", "B123456,B789012"
 */
function parseBCodes(value: string): string[] {
  if (!value) return [];
  
  return value
    .split(',')
    .map(code => code.trim().toUpperCase())
    .filter(code => code.length > 0);
}

/**
 * Get value from row using various possible column names
 */
function getRowValue(row: Record<string, unknown>, ...possibleKeys: string[]): string {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null) {
      return String(row[key]).trim();
    }
  }
  return '';
}

/**
 * Import running changes from CSV data
 * Stores in global runningChanges collection
 */
export async function importRunningChanges(
  data: Record<string, unknown>[],
  userId: string,
  filename: string
): Promise<RunningChangeImportResult> {
  const errors: string[] = [];
  let successCount = 0;
  const importId = `rc-import-${Date.now()}`;

  console.log('importRunningChanges called with', data.length, 'rows');
  if (data.length > 0) {
    console.log('First row keys:', Object.keys(data[0]));
    console.log('First row data:', data[0]);
  }

  try {
    const runningChanges: Omit<RunningChange, 'id'>[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as Record<string, unknown>;
      
      try {
        // Get CN Number - this is required
        const cnNumber = getRowValue(row, 'CN Number', 'cnNumber', 'CN_Number');
        
        if (!cnNumber) {
          // Skip rows without CN Number (likely empty rows)
          continue;
        }

        // Parse the date
        const goLiveDateStr = getRowValue(row, 'Estimated GO LIVE date', 'estimatedGoLiveDate', 'Estimated_GO_LIVE_date', 'GoLiveDate');
        const goLiveDate = parseUKDate(goLiveDateStr);
        
        if (!goLiveDate) {
          errors.push(`Row ${i + 2}: Invalid or missing go-live date "${goLiveDateStr}"`);
          continue;
        }

        // Parse B-codes
        const oldBCodes = parseBCodes(getRowValue(row, 'Old B-codes', 'oldBCodes', 'Old_B-codes', 'OldBCodes'));
        const newBCodes = parseBCodes(getRowValue(row, 'New- B-codes', 'newBCodes', 'New-_B-codes', 'NewBCodes', 'New B-codes'));

        if (oldBCodes.length === 0) {
          errors.push(`Row ${i + 2}: No old B-codes specified`);
          continue;
        }

        // Build running change object
        const change: Omit<RunningChange, 'id'> = {
          cnNumber,
          cnDescription: getRowValue(row, 'CN Description', 'cnDescription', 'CN_Description'),
          owner: getRowValue(row, 'Who', 'owner'),
          assignee: getRowValue(row, 'Assignee', 'assignee'),
          estimatedGoLiveDate: goLiveDate,
          affectedLine: getRowValue(row, 'Affected Line', 'affectedLine', 'Affected_Line'),
          oldBCodes,
          newBCodes,
          statusDescription: getRowValue(row, 'Current status description', 'statusDescription', 'Current_status_description'),
          changeType: getRowValue(row, 'Change Type', 'changeType', 'Change_Type') || 'Running',
          npiOrCms: getRowValue(row, 'NPI/CMS', 'npiOrCms', 'NPI_CMS') || 'CMS',
          projectCode: getRowValue(row, 'Project Code', 'projectCode', 'Project_Code') || undefined,
          team: getRowValue(row, 'Team', 'team') || undefined,
          projectsAffected: getRowValue(row, 'Project is affects', 'projectsAffected', 'Project_is_affects') || undefined,
          bCodesChanging: getRowValue(row, 'B-codes changing', 'bCodesChanging', 'B-codes_changing') || undefined,
          importedAt: Timestamp.now(),
          importedBy: userId,
          updatedAt: Timestamp.now(),
          isActive: true,
          sourceFilename: filename,
        };

        runningChanges.push(change);
        successCount++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to process row';
        errors.push(`Row ${i + 2}: ${message}`);
      }
    }

    // Write running changes in batches
    if (runningChanges.length > 0) {
      await writeRunningChanges(runningChanges);
    }

    return {
      success: errors.length === 0,
      successCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Running changes import error:', error);
    throw new Error(`Import failed: ${message}`);
  }
}

/**
 * Write running changes to Firestore
 * Uses upsert logic - updates existing changes with same CN Number
 */
async function writeRunningChanges(
  changes: Omit<RunningChange, 'id'>[]
): Promise<void> {
  const BATCH_SIZE = 500;
  const changesRef = collection(db, 'runningChanges');

  // Get existing changes to check for duplicates by CN Number
  const existingSnapshot = await getDocs(changesRef);
  const existingMap = new Map<string, string>();
  existingSnapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    existingMap.set(data.cnNumber, docSnap.id);
  });

  // Separate into updates and creates
  const updates: { id: string; data: Omit<RunningChange, 'id'> }[] = [];
  const creates: Omit<RunningChange, 'id'>[] = [];

  changes.forEach(change => {
    const existingId = existingMap.get(change.cnNumber);
    
    if (existingId) {
      updates.push({ id: existingId, data: change });
    } else {
      creates.push(change);
    }
  });

  // Perform updates
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchUpdates = updates.slice(i, i + BATCH_SIZE);

    batchUpdates.forEach(({ id, data }) => {
      const docRef = doc(changesRef, id);
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

    batchCreates.forEach((change) => {
      const changeRef = doc(changesRef);
      batch.set(changeRef, {
        ...change,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }

  console.log(`Wrote ${creates.length} new, ${updates.length} updated running changes`);
}

/**
 * Get all running changes
 */
export async function getRunningChanges(): Promise<RunningChange[]> {
  const changesRef = collection(db, 'runningChanges');
  const snapshot = await getDocs(changesRef);
  
  const changes = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as RunningChange[];
  
  // Sort by go-live date (upcoming first)
  return changes.sort((a, b) => {
    const dateA = a.estimatedGoLiveDate?.toDate?.() || new Date(0);
    const dateB = b.estimatedGoLiveDate?.toDate?.() || new Date(0);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Get active running changes only
 */
export async function getActiveRunningChanges(): Promise<RunningChange[]> {
  const changesRef = collection(db, 'runningChanges');
  const q = query(changesRef, where('isActive', '==', true));
  const snapshot = await getDocs(q);
  
  const changes = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as RunningChange[];
  
  return changes.sort((a, b) => {
    const dateA = a.estimatedGoLiveDate?.toDate?.() || new Date(0);
    const dateB = b.estimatedGoLiveDate?.toDate?.() || new Date(0);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Get a single running change by ID
 */
export async function getRunningChange(changeId: string): Promise<RunningChange | null> {
  const changeRef = doc(db, 'runningChanges', changeId);
  const snapshot = await getDoc(changeRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as RunningChange;
}

/**
 * Deactivate a running change (mark as complete/inactive)
 */
export async function deactivateRunningChange(changeId: string): Promise<void> {
  const changeRef = doc(db, 'runningChanges', changeId);
  await updateDoc(changeRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Reactivate a running change
 */
export async function reactivateRunningChange(changeId: string): Promise<void> {
  const changeRef = doc(db, 'runningChanges', changeId);
  await updateDoc(changeRef, {
    isActive: true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a running change
 */
export async function deleteRunningChange(changeId: string): Promise<void> {
  const changeRef = doc(db, 'runningChanges', changeId);
  await deleteDoc(changeRef);
}

/**
 * Clear all running changes
 */
export async function clearRunningChanges(): Promise<{ success: boolean; deletedCount: number }> {
  const BATCH_SIZE = 500;
  const changesRef = collection(db, 'runningChanges');
  const snapshot = await getDocs(changesRef);
  
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
 * Calculate statistics for running changes
 */
export function calculateRunningChangeStats(changes: RunningChange[]): RunningChangeStats {
  const now = new Date();
  
  const stats: RunningChangeStats = {
    total: changes.length,
    active: 0,
    upcoming: 0,
    live: 0,
    uniqueOldBCodes: 0,
    uniqueNewBCodes: 0,
  };
  
  const oldBCodesSet = new Set<string>();
  const newBCodesSet = new Set<string>();
  
  changes.forEach(change => {
    if (change.isActive) {
      stats.active++;
      
      const goLiveDate = change.estimatedGoLiveDate?.toDate?.();
      if (goLiveDate) {
        if (goLiveDate > now) {
          stats.upcoming++;
        } else {
          stats.live++;
        }
      }
    }
    
    // Collect unique B-codes
    change.oldBCodes?.forEach(code => oldBCodesSet.add(code));
    change.newBCodes?.forEach(code => newBCodesSet.add(code));
  });
  
  stats.uniqueOldBCodes = oldBCodesSet.size;
  stats.uniqueNewBCodes = newBCodesSet.size;
  
  return stats;
}
