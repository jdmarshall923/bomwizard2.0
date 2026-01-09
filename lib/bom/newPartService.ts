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
import { NewPart, NewPartStats, NewPartStatus, EarlyOrderCheck, NEW_PART_DEFAULTS } from '@/types/newPart';
import { BomItem, UNASSIGNED_GROUP_CODE } from '@/types/bom';
import { Project, ProjectGates } from '@/types/project';

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
    
    // ERP defaults
    inInfor: false,
    
    // Lead time defaults
    seaFreightDays: NEW_PART_DEFAULTS.seaFreightDays ?? 35,
    airFreightDays: NEW_PART_DEFAULTS.airFreightDays ?? 5,
    freightType: NEW_PART_DEFAULTS.freightType ?? 'sea',
    
    // Legacy fields for backward compatibility
    requestedBy,
    requestedAt: now,
    requestNotes,
    designStatus: 'not_started',
    engineeringStatus: 'not_started',
    procurementStatus: 'not_started',
    
    // Metadata
    createdAt: now,
    updatedAt: now,
    createdBy: requestedBy,
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
 * Updated for Phase 10.5 with PPL defaults
 * 
 * @param projectId - The project ID
 * @param data - Partial NewPart data
 * @param createdBy - User email/ID
 * @param project - Optional project for auto-filling target dates from PACE gates
 */
export async function createNewPart(
  projectId: string,
  data: Partial<NewPart>,
  createdBy: string,
  project?: Project
): Promise<string> {
  const newPartsRef = getNewPartsCollection(projectId);
  const now = Timestamp.now();

  // Calculate default target dates from project gates if not provided
  let sprintTargetDate = data.sprintTargetDate;
  let productionTargetDate = data.productionTargetDate;
  
  if (project && (!sprintTargetDate || !productionTargetDate)) {
    const defaultDates = calculateDefaultTargetDates(project);
    if (!sprintTargetDate && defaultDates.sprintTargetDate) {
      sprintTargetDate = defaultDates.sprintTargetDate;
    }
    if (!productionTargetDate && defaultDates.productionTargetDate) {
      productionTargetDate = defaultDates.productionTargetDate;
    }
  }

  // Merge with defaults
  const newPart: Omit<NewPart, 'id'> = {
    projectId,
    bomItemId: data.bomItemId,
    placeholderCode: data.placeholderCode || '',
    description: data.description || '',
    groupCode: data.groupCode || UNASSIGNED_GROUP_CODE,
    category: data.category,
    quantity: data.quantity || NEW_PART_DEFAULTS.quantity || 1,
    status: data.status || NEW_PART_DEFAULTS.status || 'added',
    priority: data.priority || NEW_PART_DEFAULTS.priority || 'medium',
    
    // ERP
    inInfor: data.inInfor ?? NEW_PART_DEFAULTS.inInfor ?? false,
    
    // Lead times with defaults
    seaFreightDays: data.seaFreightDays ?? NEW_PART_DEFAULTS.seaFreightDays ?? 35,
    airFreightDays: data.airFreightDays ?? NEW_PART_DEFAULTS.airFreightDays ?? 5,
    freightType: data.freightType ?? NEW_PART_DEFAULTS.freightType ?? 'sea',
    
    // Target dates (auto-filled from project gates)
    sprintTargetDate,
    productionTargetDate,
    
    // Vendor
    vendorCode: data.vendorCode,
    vendorName: data.vendorName,
    
    // Pricing
    quotedPrice: data.quotedPrice,
    currency: data.currency,
    costSource: data.costSource || 'placeholder',
    
    // Legacy fields for backward compatibility
    requestedBy: createdBy,
    requestedAt: now,
    requestNotes: data.requestNotes,
    designStatus: 'not_started',
    engineeringStatus: 'not_started',
    procurementStatus: 'not_started',
    
    // Metadata
    createdAt: now,
    updatedAt: now,
    createdBy,
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
    
    // Check if the BOM item still exists before trying to update it
    const bomItemDoc = await getDoc(bomItemRef);
    if (bomItemDoc.exists()) {
      await updateDoc(bomItemRef, {
        newPartTrackerId: null,
        newPartStatus: null,
        updatedAt: Timestamp.now(),
      });
    }
  }

  const docRef = doc(db, 'projects', projectId, 'newParts', newPartId);
  await deleteDoc(docRef);
}

/**
 * Calculate statistics for new parts (updated for PPL)
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
  let ordered = 0;
  let sprintAtRisk = 0;
  let sprintLate = 0;
  let productionAtRisk = 0;
  let productionLate = 0;
  let missingInfo = 0;
  let longLeadTime = 0;
  let unassigned = 0;

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

    // Count ordered parts (has any PO)
    if (part.sprintPoNumber || part.productionPoNumber) {
      ordered++;
    }

    // Count sprint at-risk (no PO and status is not complete)
    if (!part.sprintPoNumber && part.status !== 'complete' && part.sprintTargetDate) {
      sprintAtRisk++;
    }

    // Count sprint late
    if (part.sprintPoLate) {
      sprintLate++;
    }

    // Count production at-risk (no PO and status is not complete)
    if (!part.productionPoNumber && part.status !== 'complete' && part.productionTargetDate) {
      productionAtRisk++;
    }

    // Count production late
    if (part.productionPoLate) {
      productionLate++;
    }

    // Count missing info (no vendor or no lead time)
    if (!part.vendorName || (!part.baseLeadTimeDays && !part.quotedLeadTimeDays)) {
      missingInfo++;
    }

    // Count unassigned parts
    if (!part.groupCode || part.groupCode === UNASSIGNED_GROUP_CODE) {
      unassigned++;
    }
  });

  return {
    total: parts.length,
    byStatus,
    byPriority,
    completedThisWeek,
    overdue: sprintLate + productionLate,
    ordered,
    sprintAtRisk,
    sprintLate,
    productionAtRisk,
    productionLate,
    missingInfo,
    longLeadTime, // This will be set by early order detection
    unassigned,
  };
}

/**
 * Check if a part needs early ordering (before DTX gate)
 * Parts with long lead times that won't arrive in time if ordered at DTX
 */
export function checkEarlyOrder(part: NewPart, project: Project): EarlyOrderCheck {
  const today = new Date();
  
  if (!project.gates?.dtx?.date || !project.gates?.sprint?.date) {
    return {
      needsEarlyOrder: false,
      mustOrderBy: today,
      reason: 'Missing gate dates',
    };
  }

  const dtxDate = project.gates.dtx.date.toDate();
  const sprintDate = project.gates.sprint.date.toDate();
  
  // Calculate total lead time (manufacturing + transit)
  const freightDays = part.freightType === 'air' 
    ? (part.airFreightDays || 5) 
    : (part.seaFreightDays || 35);
  const baseLead = part.baseLeadTimeDays || part.quotedLeadTimeDays || 0;
  const totalLeadTimeDays = baseLead + freightDays;
  
  // When must this part be ordered to arrive before Sprint?
  const mustOrderBy = new Date(sprintDate);
  mustOrderBy.setDate(mustOrderBy.getDate() - totalLeadTimeDays);
  
  // Does it need to be ordered before DTX?
  const needsEarlyOrder = mustOrderBy < dtxDate;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  
  return {
    needsEarlyOrder,
    mustOrderBy,
    reason: needsEarlyOrder 
      ? `${totalLeadTimeDays} day lead time requires ordering by ${formatDate(mustOrderBy)}`
      : ''
  };
}

/**
 * Get sprint order status
 */
export function getSprintOrderStatus(part: NewPart): {
  status: 'not_ordered' | 'ordered' | 'late' | 'received';
  label: string;
  color: string;
} {
  if (part.sprintReceived) {
    return { status: 'received', label: 'Rcvd', color: 'text-[var(--accent-green)]' };
  }
  if (part.sprintPoLate) {
    return { status: 'late', label: 'Late', color: 'text-[var(--accent-red)]' };
  }
  if (part.sprintPoNumber) {
    return { status: 'ordered', label: 'Ord', color: 'text-[var(--accent-green)]' };
  }
  return { status: 'not_ordered', label: '—', color: 'text-[var(--text-tertiary)]' };
}

/**
 * Get production order status
 */
export function getProductionOrderStatus(part: NewPart): {
  status: 'not_ordered' | 'ordered' | 'late' | 'received';
  label: string;
  color: string;
} {
  if (part.productionReceived) {
    return { status: 'received', label: 'Rcvd', color: 'text-[var(--accent-green)]' };
  }
  if (part.productionPoLate) {
    return { status: 'late', label: 'Late', color: 'text-[var(--accent-red)]' };
  }
  if (part.productionPoNumber) {
    return { status: 'ordered', label: 'Ord', color: 'text-[var(--accent-green)]' };
  }
  return { status: 'not_ordered', label: '—', color: 'text-[var(--text-tertiary)]' };
}

/**
 * Calculate total production quantity
 * mass prod + P&A + scrap
 */
export function calculateTotalProductionQty(part: NewPart): number {
  const massQty = part.massProductionQuantity || 0;
  const paQty = part.paForecast || 0;
  const scrapRate = part.scrapRate || 0;
  const baseQty = massQty + paQty;
  const scrapQty = Math.ceil(baseQty * (scrapRate / 100));
  return baseQty + scrapQty;
}

/**
 * Calculate default target dates based on project PACE gates
 * Sprint MRD = 2 weeks before Sprint gate
 * Production MRD = 2 weeks before Mass Production gate
 */
export function calculateDefaultTargetDates(project: Project): {
  sprintTargetDate?: Timestamp;
  productionTargetDate?: Timestamp;
} {
  const result: {
    sprintTargetDate?: Timestamp;
    productionTargetDate?: Timestamp;
  } = {};

  // Sprint target = 2 weeks before Sprint gate
  if (project.gates?.sprint?.date) {
    const sprintGate = project.gates.sprint.date.toDate();
    const sprintTarget = new Date(sprintGate);
    sprintTarget.setDate(sprintTarget.getDate() - 14); // 2 weeks before
    result.sprintTargetDate = Timestamp.fromDate(sprintTarget);
  }

  // Production target = 2 weeks before Mass Production gate
  if (project.gates?.massProduction?.date) {
    const massProdGate = project.gates.massProduction.date.toDate();
    const prodTarget = new Date(massProdGate);
    prodTarget.setDate(prodTarget.getDate() - 14); // 2 weeks before
    result.productionTargetDate = Timestamp.fromDate(prodTarget);
  }

  return result;
}

/**
 * Fill target dates for parts that don't have them.
 * Uses project PACE gates to calculate default dates.
 */
export async function fillMissingTargetDates(
  projectId: string,
  project: Project,
  partIds?: string[] // Optional - if not provided, updates all parts without dates
): Promise<{ updated: number }> {
  const defaultDates = calculateDefaultTargetDates(project);
  
  if (!defaultDates.sprintTargetDate && !defaultDates.productionTargetDate) {
    return { updated: 0 }; // No gate dates set
  }
  
  const newPartsRef = getNewPartsCollection(projectId);
  const now = Timestamp.now();
  let updated = 0;
  
  // Get parts to update
  let partsToUpdate: NewPart[];
  
  if (partIds && partIds.length > 0) {
    // Update specific parts
    const promises = partIds.map(id => getNewPart(projectId, id));
    const results = await Promise.all(promises);
    partsToUpdate = results.filter((p): p is NewPart => p !== null);
  } else {
    // Update all parts without target dates
    partsToUpdate = await getNewParts(projectId);
  }
  
  // Update parts that are missing dates
  for (const part of partsToUpdate) {
    const updates: Partial<NewPart> = {};
    
    if (!part.sprintTargetDate && defaultDates.sprintTargetDate) {
      updates.sprintTargetDate = defaultDates.sprintTargetDate;
    }
    if (!part.productionTargetDate && defaultDates.productionTargetDate) {
      updates.productionTargetDate = defaultDates.productionTargetDate;
    }
    
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      await updateDoc(doc(newPartsRef, part.id), updates);
      updated++;
    }
  }
  
  return { updated };
}

/**
 * Sync all parts' target dates when project gates are updated.
 * This updates all parts (not just those missing dates) to match the gate dates minus 2 weeks.
 * Only updates parts where the gate date has actually changed.
 */
export async function syncTargetDatesFromGates(
  projectId: string,
  project: Project,
  updatedGateKey?: 'sprint' | 'massProduction' // Optional: only sync for a specific gate
): Promise<{ updated: number }> {
  const defaultDates = calculateDefaultTargetDates(project);
  
  if (!defaultDates.sprintTargetDate && !defaultDates.productionTargetDate) {
    return { updated: 0 }; // No gate dates set
  }
  
  const newPartsRef = getNewPartsCollection(projectId);
  const now = Timestamp.now();
  let updated = 0;
  
  // Get all parts
  const partsToUpdate = await getNewParts(projectId);
  
  for (const part of partsToUpdate) {
    const updates: Partial<NewPart> = {};
    
    // If sprint gate was updated (or syncing all), update sprint target dates
    if ((!updatedGateKey || updatedGateKey === 'sprint') && defaultDates.sprintTargetDate) {
      // Only update if part doesn't have a date, or the existing date matches the old pattern
      // For simplicity, we update all parts missing dates
      if (!part.sprintTargetDate) {
        updates.sprintTargetDate = defaultDates.sprintTargetDate;
      }
    }
    
    // If mass production gate was updated (or syncing all), update production target dates
    if ((!updatedGateKey || updatedGateKey === 'massProduction') && defaultDates.productionTargetDate) {
      if (!part.productionTargetDate) {
        updates.productionTargetDate = defaultDates.productionTargetDate;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      await updateDoc(doc(newPartsRef, part.id), updates);
      updated++;
    }
  }
  
  return { updated };
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

// ============================================
// TWO-WAY SYNC: BOM <-> New Parts (Phase 10.5)
// ============================================

/**
 * Sync a BOM item to the New Parts tracker.
 * Called when a BomItem is created/updated with isNewPart: true
 */
export async function syncBomToNewPart(bomItem: BomItem): Promise<string | null> {
  if (!bomItem.isNewPart) return null;
  
  const projectId = bomItem.id.split('/')[0]; // Assume path structure
  const now = Timestamp.now();
  
  // Check if NewPart already exists for this BomItem
  const newPartsRef = getNewPartsCollection(projectId);
  const q = query(newPartsRef, where('bomItemId', '==', bomItem.id));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    // Update existing NewPart
    const existingDoc = snapshot.docs[0];
    await updateDoc(doc(newPartsRef, existingDoc.id), {
      description: bomItem.itemDescription,
      groupCode: bomItem.groupCode || UNASSIGNED_GROUP_CODE,
      quantity: bomItem.quantity,
      updatedAt: now,
    });
    return existingDoc.id;
  } else {
    // Create new NewPart
    const newPart: Omit<NewPart, 'id'> = {
      projectId,
      bomItemId: bomItem.id,
      placeholderCode: bomItem.itemCode,
      description: bomItem.itemDescription,
      groupCode: bomItem.groupCode || UNASSIGNED_GROUP_CODE,
      quantity: bomItem.quantity,
      status: (bomItem.newPartStatus as NewPartStatus) || 'added',
      priority: 'medium',
      inInfor: false,
      seaFreightDays: 35,
      airFreightDays: 5,
      freightType: 'sea',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    };
    
    const docRef = await addDoc(newPartsRef, newPart);
    return docRef.id;
  }
}

/**
 * Sync a NewPart to the BOM.
 * Called when a NewPart is created without a BomItem link.
 */
export async function syncNewPartToBom(
  projectId: string, 
  newPart: NewPart
): Promise<string | null> {
  if (newPart.bomItemId) return newPart.bomItemId; // Already linked
  
  const now = Timestamp.now();
  const bomItemsRef = collection(db, 'projects', projectId, 'bomItems');
  
  // Check if BomItem already exists with this code
  const q = query(bomItemsRef, where('itemCode', '==', newPart.placeholderCode));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    // Link to existing BomItem
    const existingDoc = snapshot.docs[0];
    await updateDoc(doc(bomItemsRef, existingDoc.id), {
      isNewPart: true,
      newPartTrackerId: newPart.id,
      newPartStatus: newPart.status,
      updatedAt: now,
    });
    
    // Update NewPart with bomItemId
    await updateDoc(doc(db, 'projects', projectId, 'newParts', newPart.id), {
      bomItemId: existingDoc.id,
      updatedAt: now,
    });
    
    return existingDoc.id;
  } else {
    // Create new BomItem
    const bomItem: Partial<BomItem> = {
      itemCode: newPart.placeholderCode,
      itemDescription: newPart.description,
      groupCode: newPart.groupCode || UNASSIGNED_GROUP_CODE,
      quantity: newPart.quantity,
      itemType: 'material',
      source: 'purchased',
      level: 1,
      sequence: 0,
      isPlaceholder: true,
      isNewPart: true,
      newPartTrackerId: newPart.id,
      newPartStatus: newPart.status,
      materialCost: newPart.quotedPrice || 0,
      landingCost: 0,
      labourCost: 0,
      extendedCost: (newPart.quotedPrice || 0) * (newPart.quantity || 1),
      costSource: newPart.costSource || 'placeholder',
      isFromTemplate: false,
      isAddedItem: true,
      isCustomGroup: false,
      hasCostChange: false,
      hasQuantityChange: false,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(bomItemsRef, bomItem);
    
    // Update NewPart with bomItemId
    await updateDoc(doc(db, 'projects', projectId, 'newParts', newPart.id), {
      bomItemId: docRef.id,
      updatedAt: now,
    });
    
    return docRef.id;
  }
}

/**
 * Handle NewPart completion - update linked BomItem.
 * Called when a NewPart status changes to 'complete'.
 */
export async function onNewPartComplete(
  projectId: string,
  newPart: NewPart
): Promise<void> {
  if (!newPart.bomItemId || newPart.status !== 'complete') return;
  
  const now = Timestamp.now();
  const bomItemRef = doc(db, 'projects', projectId, 'bomItems', newPart.bomItemId);
  
  const landingCost = (newPart.quotedPrice || 0) * ((newPart.landingPct || 0) / 100);
  const unitCost = (newPart.quotedPrice || 0) + landingCost;
  const extendedCost = unitCost * (newPart.quantity || 1);
  
  await updateDoc(bomItemRef, {
    itemCode: newPart.finalItemCode || newPart.placeholderCode,
    materialCost: newPart.quotedPrice || 0,
    landingCost,
    landingPct: newPart.landingPct,
    extendedCost,
    vendorCode: newPart.vendorCode,
    vendorName: newPart.vendorName,
    costSource: newPart.costSource || 'contract',
    isNewPart: false,
    isPlaceholder: false,
    newPartStatus: 'complete',
    finalItemCode: newPart.finalItemCode,
    updatedAt: now,
  });
}

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
          
          // ERP defaults
          inInfor: false,
          
          // Lead time defaults
          seaFreightDays: NEW_PART_DEFAULTS.seaFreightDays ?? 35,
          airFreightDays: NEW_PART_DEFAULTS.airFreightDays ?? 5,
          freightType: NEW_PART_DEFAULTS.freightType ?? 'sea',
          
          // Legacy fields
          requestedBy,
          requestedAt: bomItem.newPartAddedAt || now,
          designStatus: 'not_started',
          engineeringStatus: 'not_started',
          procurementStatus: 'not_started',
          
          // Metadata
          createdAt: now,
          updatedAt: now,
          createdBy: requestedBy,
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

