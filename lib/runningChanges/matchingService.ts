import { RunningChange, AffectedBomItem } from '@/types/runningChange';
import { BomItem } from '@/types/bom';
import { 
  Timestamp, 
  doc, 
  updateDoc, 
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Find BOM items that are affected by running changes
 * Matches the item's itemCode against oldBCodes in running changes
 */
export function findAffectedItems(
  bomItems: BomItem[],
  runningChanges: RunningChange[],
  projectDtxDate?: Date | null
): AffectedBomItem[] {
  const affected: AffectedBomItem[] = [];
  const now = new Date();
  
  // Build a map of old B-codes to running changes for fast lookup
  const bCodeToChanges = new Map<string, RunningChange[]>();
  
  runningChanges.forEach(change => {
    if (!change.isActive) return; // Skip inactive changes
    
    change.oldBCodes?.forEach(oldBCode => {
      const normalized = oldBCode.toUpperCase().trim();
      if (!bCodeToChanges.has(normalized)) {
        bCodeToChanges.set(normalized, []);
      }
      bCodeToChanges.get(normalized)!.push(change);
    });
  });
  
  // Check each BOM item against the running changes
  bomItems.forEach(item => {
    const normalizedItemCode = item.itemCode?.toUpperCase()?.trim();
    if (!normalizedItemCode) return;
    
    const matchingChanges = bCodeToChanges.get(normalizedItemCode);
    if (!matchingChanges || matchingChanges.length === 0) return;
    
    // For each matching change, create an affected item entry
    matchingChanges.forEach(change => {
      const goLiveDate = change.estimatedGoLiveDate?.toDate?.();
      if (!goLiveDate) return;
      
      const isLive = goLiveDate <= now;
      const isAfterDtx = projectDtxDate ? goLiveDate > projectDtxDate : false;
      const daysUntilGoLive = Math.ceil((goLiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Find the index of this old B-code to get the corresponding new B-code
      const oldBCodeIndex = change.oldBCodes.findIndex(
        code => code.toUpperCase().trim() === normalizedItemCode
      );
      
      // Get corresponding new B-code (use same index, or first if not enough)
      const newBCode = change.newBCodes[oldBCodeIndex] || change.newBCodes[0] || '';
      
      affected.push({
        bomItemId: item.id,
        bomItemCode: item.itemCode,
        bomItemDescription: item.itemDescription,
        groupCode: item.groupCode,
        quantity: item.quantity,
        runningChangeId: change.id,
        cnNumber: change.cnNumber,
        cnDescription: change.cnDescription,
        oldBCode: normalizedItemCode,
        newBCode,
        goLiveDate,
        isLive,
        isAfterDtx,
        daysUntilGoLive,
        owner: change.owner,
        assignee: change.assignee,
        statusDescription: change.statusDescription,
      });
    });
  });
  
  // Sort by go-live date (soonest first, then already live)
  return affected.sort((a, b) => {
    // Live items first
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    // Then by days until go-live
    return a.daysUntilGoLive - b.daysUntilGoLive;
  });
}

/**
 * Check if a project has any affected BOM items
 * Returns just the count for quick checks
 */
export function countAffectedItems(
  bomItems: BomItem[],
  runningChanges: RunningChange[]
): number {
  // Build a set of old B-codes from active running changes
  const oldBCodesSet = new Set<string>();
  
  runningChanges.forEach(change => {
    if (!change.isActive) return;
    change.oldBCodes?.forEach(code => {
      oldBCodesSet.add(code.toUpperCase().trim());
    });
  });
  
  // Count matching BOM items
  let count = 0;
  bomItems.forEach(item => {
    const normalizedCode = item.itemCode?.toUpperCase()?.trim();
    if (normalizedCode && oldBCodesSet.has(normalizedCode)) {
      count++;
    }
  });
  
  return count;
}

/**
 * Replace a BOM item's B-code with the new one from a running change
 */
export async function replaceWithNewBCode(
  projectId: string,
  bomItemId: string,
  currentItemCode: string,
  newBCode: string,
  runningChangeId: string,
  cnNumber: string,
  userId: string,
  userName?: string
): Promise<void> {
  const itemRef = doc(db, `projects/${projectId}/bomItems`, bomItemId);
  
  // Update the BOM item with the new B-code
  await updateDoc(itemRef, {
    itemCode: newBCode.toUpperCase().trim(),
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    // Track that this was a running change replacement
    lastRunningChangeApplied: {
      runningChangeId,
      cnNumber,
      oldBCode: currentItemCode,
      newBCode: newBCode.toUpperCase().trim(),
      appliedAt: serverTimestamp(),
      appliedBy: userId,
    },
  });
  
  // Log the activity
  await logRunningChangeApplication(
    projectId,
    bomItemId,
    currentItemCode,
    newBCode,
    runningChangeId,
    cnNumber,
    userId,
    userName
  );
}

/**
 * Log the running change application as an activity
 */
async function logRunningChangeApplication(
  projectId: string,
  bomItemId: string,
  oldBCode: string,
  newBCode: string,
  runningChangeId: string,
  cnNumber: string,
  userId: string,
  userName?: string
): Promise<void> {
  try {
    const activitiesRef = collection(db, `projects/${projectId}/activities`);
    
    await addDoc(activitiesRef, {
      type: 'running_change_applied',
      projectId,
      itemId: bomItemId,
      description: `Applied running change ${cnNumber}: replaced ${oldBCode} with ${newBCode}`,
      details: {
        runningChangeId,
        cnNumber,
        oldBCode,
        newBCode,
      },
      userId,
      userName: userName || userId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Don't fail the main operation if activity logging fails
    console.error('Failed to log running change activity:', error);
  }
}

/**
 * Bulk replace multiple BOM items with their new B-codes
 */
export async function bulkReplaceWithNewBCodes(
  projectId: string,
  replacements: Array<{
    bomItemId: string;
    currentItemCode: string;
    newBCode: string;
    runningChangeId: string;
    cnNumber: string;
  }>,
  userId: string,
  userName?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const replacement of replacements) {
    try {
      await replaceWithNewBCode(
        projectId,
        replacement.bomItemId,
        replacement.currentItemCode,
        replacement.newBCode,
        replacement.runningChangeId,
        replacement.cnNumber,
        userId,
        userName
      );
      success++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${replacement.currentItemCode}: ${message}`);
    }
  }
  
  return { success, failed, errors };
}
