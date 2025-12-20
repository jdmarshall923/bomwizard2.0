import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { NewPart, NewPartStats } from '@/types/newPart';
import { NewPartStatus, BomItem } from '@/types/bom';

/**
 * Get the collection reference for new parts in a project
 */
export function getNewPartsCollection(projectId: string) {
  return collection(db, 'projects', projectId, 'newParts');
}

/**
 * Subscribe to new parts for a project with real-time updates
 */
export function subscribeToNewParts(
  projectId: string,
  callback: (parts: NewPart[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const newPartsRef = getNewPartsCollection(projectId);
  const q = query(newPartsRef, orderBy('requestedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const parts: NewPart[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as NewPart[];
      callback(parts);
    },
    (error) => {
      console.error('Error subscribing to new parts:', error);
      onError?.(error);
    }
  );
}

/**
 * Get all new parts for a project
 */
export async function getNewParts(projectId: string): Promise<NewPart[]> {
  const newPartsRef = getNewPartsCollection(projectId);
  const q = query(newPartsRef, orderBy('requestedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NewPart[];
}

/**
 * Get new parts by status
 */
export async function getNewPartsByStatus(
  projectId: string,
  status: NewPartStatus
): Promise<NewPart[]> {
  const newPartsRef = getNewPartsCollection(projectId);
  const q = query(
    newPartsRef,
    where('status', '==', status),
    orderBy('requestedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NewPart[];
}

/**
 * Get a single new part by ID
 */
export async function getNewPart(
  projectId: string,
  newPartId: string
): Promise<NewPart | null> {
  const docRef = doc(db, 'projects', projectId, 'newParts', newPartId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as NewPart;
}

/**
 * Create a new part from a BOM item flagged as isNewPart
 */
export async function createNewPartFromBomItem(
  projectId: string,
  bomItem: BomItem,
  requestedBy: string,
  requestNotes?: string
): Promise<string> {
  const newPartsRef = getNewPartsCollection(projectId);
  const now = Timestamp.now();

  const newPart: Omit<NewPart, 'id'> = {
    projectId,
    bomItemId: bomItem.id,
    placeholderCode: bomItem.itemCode,
    description: bomItem.itemDescription,
    groupCode: bomItem.groupCode,
    quantity: bomItem.quantity,
    status: 'added',
    priority: 'medium',
    requestedBy,
    requestedAt: now,
    requestNotes,
    designStatus: 'not_started',
    engineeringStatus: 'not_started',
    procurementStatus: 'not_started',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(newPartsRef, newPart);

  // Link the NewPart back to the BomItem
  const bomItemRef = doc(db, 'projects', projectId, 'bomItems', bomItem.id);
  await updateDoc(bomItemRef, {
    newPartTrackerId: docRef.id,
    newPartStatus: 'added',
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * Create a new part directly (without BOM item)
 */
export async function createNewPart(
  projectId: string,
  data: Partial<NewPart>,
  requestedBy: string
): Promise<string> {
  const newPartsRef = getNewPartsCollection(projectId);
  const now = Timestamp.now();

  const newPart: Omit<NewPart, 'id'> = {
    projectId,
    bomItemId: data.bomItemId || '',
    placeholderCode: data.placeholderCode || '',
    description: data.description || '',
    groupCode: data.groupCode || '',
    quantity: data.quantity || 1,
    status: 'added',
    priority: data.priority || 'medium',
    requestedBy,
    requestedAt: now,
    requestNotes: data.requestNotes,
    designStatus: 'not_started',
    engineeringStatus: 'not_started',
    procurementStatus: 'not_started',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(newPartsRef, newPart);
  return docRef.id;
}

/**
 * Update a new part's status (move between Kanban columns)
 */
export async function updateNewPartStatus(
  projectId: string,
  newPartId: string,
  status: NewPartStatus
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'newParts', newPartId);
  const now = Timestamp.now();

  const updateData: Partial<NewPart> = {
    status,
    updatedAt: now,
  };

  // Update phase-specific status based on the new status
  switch (status) {
    case 'design':
      updateData.designStatus = 'in_progress';
      break;
    case 'engineering':
      updateData.designStatus = 'complete';
      updateData.designCompletedAt = now;
      updateData.engineeringStatus = 'in_progress';
      break;
    case 'procurement':
      updateData.engineeringStatus = 'approved';
      updateData.engineeringApprovedAt = now;
      updateData.procurementStatus = 'rfq_sent';
      break;
    case 'complete':
      updateData.completedAt = now;
      break;
  }

  await updateDoc(docRef, updateData);

  // Also update the linked BOM item's status
  const newPart = await getNewPart(projectId, newPartId);
  if (newPart?.bomItemId) {
    const bomItemRef = doc(db, 'projects', projectId, 'bomItems', newPart.bomItemId);
    await updateDoc(bomItemRef, {
      newPartStatus: status,
      updatedAt: now,
    });
  }
}

/**
 * Update new part details
 */
export async function updateNewPart(
  projectId: string,
  newPartId: string,
  data: Partial<NewPart>
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'newParts', newPartId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Complete a new part - assign final B-code and update BOM item
 */
export async function completeNewPart(
  projectId: string,
  newPartId: string,
  finalItemCode: string,
  finalUnitPrice: number,
  landingPct: number,
  completedBy: string
): Promise<void> {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // Update the NewPart document
  const newPartRef = doc(db, 'projects', projectId, 'newParts', newPartId);
  batch.update(newPartRef, {
    status: 'complete' as NewPartStatus,
    finalItemCode,
    finalUnitPrice,
    landingPct,
    completedAt: now,
    completedBy,
    updatedAt: now,
  });

  // Get the NewPart to find the linked BomItem
  const newPart = await getNewPart(projectId, newPartId);
  if (newPart?.bomItemId) {
    // Update the BomItem with the final details
    const bomItemRef = doc(db, 'projects', projectId, 'bomItems', newPart.bomItemId);
    
    const landingCost = finalUnitPrice * (landingPct / 100);
    const unitCost = finalUnitPrice + landingCost;
    const extendedCost = unitCost * (newPart.quantity || 1);

    batch.update(bomItemRef, {
      itemCode: finalItemCode,
      isPlaceholder: false,
      isNewPart: false,
      newPartStatus: 'complete' as NewPartStatus,
      finalItemCode,
      materialCost: finalUnitPrice,
      landingCost,
      landingPct,
      extendedCost,
      costSource: 'contract',
      vendorCode: newPart.vendorCode,
      vendorName: newPart.vendorName,
      updatedAt: now,
    });
  }

  await batch.commit();
}

/**
 * Delete a new part
 */
export async function deleteNewPart(
  projectId: string,
  newPartId: string
): Promise<void> {
  // First unlink from BOM item if needed
  const newPart = await getNewPart(projectId, newPartId);
  if (newPart?.bomItemId) {
    const bomItemRef = doc(db, 'projects', projectId, 'bomItems', newPart.bomItemId);
    await updateDoc(bomItemRef, {
      newPartTrackerId: null,
      newPartStatus: null,
      updatedAt: Timestamp.now(),
    });
  }

  const docRef = doc(db, 'projects', projectId, 'newParts', newPartId);
  await deleteDoc(docRef);
}

/**
 * Calculate statistics for new parts
 */
export function calculateNewPartStats(parts: NewPart[]): NewPartStats {
  const byStatus: Record<NewPartStatus, number> = {
    pending: 0,
    added: 0,
    design: 0,
    engineering: 0,
    procurement: 0,
    complete: 0,
    on_hold: 0,
    cancelled: 0,
  };

  const byPriority: Record<'low' | 'medium' | 'high' | 'critical', number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  let completedThisWeek = 0;

  parts.forEach((part) => {
    byStatus[part.status]++;
    byPriority[part.priority]++;

    if (
      part.status === 'complete' &&
      part.completedAt &&
      part.completedAt.toDate() >= weekAgo
    ) {
      completedThisWeek++;
    }
  });

  return {
    total: parts.length,
    byStatus,
    byPriority,
    completedThisWeek,
    overdue: 0, // TODO: Implement based on due dates if added
  };
}

/**
 * Get status display info
 */
export function getStatusInfo(status: NewPartStatus): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const statusMap: Record<NewPartStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
    pending: {
      label: 'Pending',
      color: 'text-[var(--text-secondary)]',
      bgColor: 'bg-[var(--bg-tertiary)]',
      borderColor: 'border-[var(--border-subtle)]',
    },
    added: {
      label: 'Added',
      color: 'text-[var(--accent-blue)]',
      bgColor: 'bg-[var(--accent-blue)]/10',
      borderColor: 'border-[var(--accent-blue)]/30',
    },
    design: {
      label: 'Design',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
    engineering: {
      label: 'Engineering',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
    },
    procurement: {
      label: 'Procurement',
      color: 'text-[var(--accent-orange)]',
      bgColor: 'bg-[var(--accent-orange)]/10',
      borderColor: 'border-[var(--accent-orange)]/30',
    },
    complete: {
      label: 'Complete',
      color: 'text-[var(--accent-green)]',
      bgColor: 'bg-[var(--accent-green)]/10',
      borderColor: 'border-[var(--accent-green)]/30',
    },
    on_hold: {
      label: 'On Hold',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
    },
    cancelled: {
      label: 'Cancelled',
      color: 'text-[var(--accent-red)]',
      bgColor: 'bg-[var(--accent-red)]/10',
      borderColor: 'border-[var(--accent-red)]/30',
    },
  };

  return statusMap[status] || statusMap.pending;
}

/**
 * Get priority display info
 */
export function getPriorityInfo(priority: 'low' | 'medium' | 'high' | 'critical'): {
  label: string;
  color: string;
  bgColor: string;
} {
  const priorityMap = {
    low: { label: 'Low', color: 'text-[var(--text-secondary)]', bgColor: 'bg-[var(--bg-tertiary)]' },
    medium: { label: 'Medium', color: 'text-[var(--accent-blue)]', bgColor: 'bg-[var(--accent-blue)]/10' },
    high: { label: 'High', color: 'text-[var(--accent-orange)]', bgColor: 'bg-[var(--accent-orange)]/10' },
    critical: { label: 'Critical', color: 'text-[var(--accent-red)]', bgColor: 'bg-[var(--accent-red)]/10' },
  };

  return priorityMap[priority];
}

/**
 * Kanban column configuration
 */
export const KANBAN_COLUMNS: {
  id: NewPartStatus;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    id: 'added',
    title: 'Added',
    description: 'New parts awaiting action',
    color: 'var(--accent-blue)',
  },
  {
    id: 'design',
    title: 'Design',
    description: 'Creating drawings & specs',
    color: '#a855f7', // purple
  },
  {
    id: 'engineering',
    title: 'Engineering',
    description: 'Technical review & approval',
    color: '#22d3ee', // cyan
  },
  {
    id: 'procurement',
    title: 'Procurement',
    description: 'Getting quotes & ordering',
    color: 'var(--accent-orange)',
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'Final B-code assigned',
    color: 'var(--accent-green)',
  },
];

/**
 * Sync existing BOM items with isNewPart: true to the New Parts tracker.
 * This finds BOM items that have isNewPart: true but no newPartTrackerId,
 * and creates NewPart documents for them.
 * 
 * Useful for migrating existing data or fixing sync issues.
 */
export async function syncBomItemsToNewParts(
  projectId: string,
  requestedBy: string = 'system'
): Promise<{ synced: number; errors: string[] }> {
  const bomItemsRef = collection(db, 'projects', projectId, 'bomItems');
  const newPartsRef = getNewPartsCollection(projectId);
  const now = Timestamp.now();
  let synced = 0;
  const errors: string[] = [];

  try {
    // Query BOM items that have isNewPart: true but no newPartTrackerId
    const q = query(
      bomItemsRef,
      where('isNewPart', '==', true)
    );
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const bomItem = docSnap.data() as BomItem;
      const bomItemId = docSnap.id;

      // Skip if already has a tracker
      if (bomItem.newPartTrackerId) {
        continue;
      }

      try {
        // Create NewPart document
        const newPart: Omit<NewPart, 'id'> = {
          projectId,
          bomItemId,
          placeholderCode: bomItem.itemCode,
          description: bomItem.itemDescription || '',
          groupCode: bomItem.groupCode || '',
          quantity: bomItem.quantity || 1,
          status: (bomItem.newPartStatus as NewPartStatus) || 'added',
          priority: 'medium',
          requestedBy,
          requestedAt: bomItem.newPartAddedAt || now,
          designStatus: 'not_started',
          engineeringStatus: 'not_started',
          procurementStatus: 'not_started',
          createdAt: now,
          updatedAt: now,
        };

        const newPartDocRef = await addDoc(newPartsRef, newPart);

        // Update BomItem with newPartTrackerId
        await updateDoc(doc(bomItemsRef, bomItemId), {
          newPartTrackerId: newPartDocRef.id,
          newPartStatus: newPart.status,
          updatedAt: now,
        });

        synced++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Failed to sync ${bomItem.itemCode}: ${errorMessage}`);
      }
    }

    return { synced, errors };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { synced: 0, errors: [`Query failed: ${errorMessage}`] };
  }
}

