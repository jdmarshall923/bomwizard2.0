import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Spec, 
  SpecStatus, 
  SpecHeader, 
  SpecTimeline, 
  SpecCategory, 
  ColourOption,
  SpecChange 
} from '@/types/spec';

// ============================================
// SPEC CRUD OPERATIONS
// ============================================

/**
 * Create a new spec for a project
 */
export async function createSpec(
  projectId: string, 
  data: {
    header: SpecHeader;
    timeline?: SpecTimeline;
    categories?: SpecCategory[];
    colourOptions?: ColourOption[];
  },
  userId: string
): Promise<Spec> {
  const specsRef = collection(db, 'projects', projectId, 'specs');
  
  const newSpec: Omit<Spec, 'id'> = {
    projectId,
    status: 'draft',
    version: 1,
    header: data.header,
    timeline: data.timeline || {},
    categories: data.categories || [],
    colourOptions: data.colourOptions || [],
    createdAt: Timestamp.now(),
    createdBy: userId,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  };
  
  const docRef = await addDoc(specsRef, newSpec);
  
  // Record the creation as a change
  await recordSpecChange(projectId, docRef.id, 1, 'created', [], userId);
  
  return {
    id: docRef.id,
    ...newSpec,
  };
}

/**
 * Get the current spec for a project
 * Returns the most recent non-archived spec
 */
export async function getSpec(projectId: string): Promise<Spec | null> {
  const specsRef = collection(db, 'projects', projectId, 'specs');
  const q = query(
    specsRef, 
    where('status', '!=', 'archived'),
    orderBy('status'),
    orderBy('version', 'desc')
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Spec;
}

/**
 * Get a spec by ID
 */
export async function getSpecById(projectId: string, specId: string): Promise<Spec | null> {
  const docRef = doc(db, 'projects', projectId, 'specs', specId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Spec;
}

/**
 * Get all specs for a project (including archived)
 */
export async function getAllSpecs(projectId: string): Promise<Spec[]> {
  const specsRef = collection(db, 'projects', projectId, 'specs');
  const q = query(specsRef, orderBy('version', 'desc'));
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Spec[];
}

/**
 * Update a spec
 */
export async function updateSpec(
  projectId: string,
  specId: string, 
  data: Partial<Spec>,
  userId: string,
  changeNotes?: string
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'specs', specId);
  
  // Get current spec for change tracking
  const currentSpec = await getSpecById(projectId, specId);
  if (!currentSpec) {
    throw new Error('Spec not found');
  }
  
  // Calculate changes
  const changes = calculateFieldChanges(currentSpec, data);
  
  // Update the spec
  const updateData = {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  };
  
  // Remove id if present
  delete updateData.id;
  delete updateData.projectId;
  
  await updateDoc(docRef, updateData);
  
  // Record the change
  if (changes.length > 0) {
    await recordSpecChange(
      projectId,
      specId, 
      currentSpec.version, 
      'edited', 
      changes, 
      userId,
      changeNotes
    );
  }
}

/**
 * Delete a spec
 */
export async function deleteSpec(projectId: string, specId: string): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'specs', specId);
  await deleteDoc(docRef);
}

// ============================================
// WORKFLOW OPERATIONS
// ============================================

/**
 * Submit a spec for review
 */
export async function submitSpec(
  projectId: string,
  specId: string, 
  userId: string
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'specs', specId);
  
  // Get current spec
  const currentSpec = await getSpecById(projectId, specId);
  if (!currentSpec) {
    throw new Error('Spec not found');
  }
  
  if (currentSpec.status !== 'draft') {
    throw new Error('Only draft specs can be submitted');
  }
  
  // Update status
  await updateDoc(docRef, {
    status: 'submitted',
    submittedBy: userId,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
  
  // Record the change
  await recordSpecChange(projectId, specId, currentSpec.version, 'submitted', [], userId);
}

/**
 * Accept a submitted spec
 */
export async function acceptSpec(
  projectId: string,
  specId: string, 
  reviewerId: string
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'specs', specId);
  
  // Get current spec
  const currentSpec = await getSpecById(projectId, specId);
  if (!currentSpec) {
    throw new Error('Spec not found');
  }
  
  if (currentSpec.status !== 'submitted' && currentSpec.status !== 'in_review') {
    throw new Error('Only submitted specs can be accepted');
  }
  
  // Update status
  await updateDoc(docRef, {
    status: 'accepted',
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: reviewerId,
  });
  
  // Record the change
  await recordSpecChange(projectId, specId, currentSpec.version, 'accepted', [], reviewerId);
}

/**
 * Reject a submitted spec
 */
export async function rejectSpec(
  projectId: string,
  specId: string, 
  reviewerId: string, 
  reason: string
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'specs', specId);
  
  // Get current spec
  const currentSpec = await getSpecById(projectId, specId);
  if (!currentSpec) {
    throw new Error('Spec not found');
  }
  
  if (currentSpec.status !== 'submitted' && currentSpec.status !== 'in_review') {
    throw new Error('Only submitted specs can be rejected');
  }
  
  // Update status
  await updateDoc(docRef, {
    status: 'rejected',
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
    updatedBy: reviewerId,
  });
  
  // Record the change
  await recordSpecChange(
    projectId,
    specId, 
    currentSpec.version, 
    'rejected', 
    [{ field: 'rejectionReason', oldValue: null, newValue: reason }], 
    reviewerId,
    reason
  );
}

/**
 * Revert spec to draft status (for re-editing after rejection)
 */
export async function revertToDraft(
  projectId: string,
  specId: string, 
  userId: string
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'specs', specId);
  
  // Get current spec
  const currentSpec = await getSpecById(projectId, specId);
  if (!currentSpec) {
    throw new Error('Spec not found');
  }
  
  // Update status and increment version
  await updateDoc(docRef, {
    status: 'draft',
    version: currentSpec.version + 1,
    rejectionReason: null,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
}

/**
 * Archive a spec
 */
export async function archiveSpec(
  projectId: string,
  specId: string, 
  userId: string
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'specs', specId);
  
  await updateDoc(docRef, {
    status: 'archived',
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
}

// ============================================
// VERSION OPERATIONS
// ============================================

/**
 * Get spec change history
 */
export async function getSpecHistory(
  projectId: string,
  specId: string
): Promise<SpecChange[]> {
  const changesRef = collection(db, 'projects', projectId, 'specs', specId, 'changes');
  const q = query(changesRef, orderBy('changedAt', 'desc'));
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as SpecChange[];
}

/**
 * Get a specific version of a spec
 */
export async function getSpecVersion(
  projectId: string,
  specId: string, 
  version: number
): Promise<Spec | null> {
  // For now, we only keep the current spec and track changes
  // A full version restore would need to replay changes in reverse
  // This is a simplified implementation
  
  const spec = await getSpecById(projectId, specId);
  if (!spec || spec.version < version) {
    return null;
  }
  
  return spec;
}

/**
 * Revert to a previous version
 * This creates a new version with the old data
 */
export async function revertToVersion(
  projectId: string,
  specId: string, 
  version: number,
  userId: string
): Promise<void> {
  // In a full implementation, this would restore the spec state from that version
  // For now, we'll just increment the version number
  const docRef = doc(db, 'projects', projectId, 'specs', specId);
  
  const currentSpec = await getSpecById(projectId, specId);
  if (!currentSpec) {
    throw new Error('Spec not found');
  }
  
  await updateDoc(docRef, {
    version: currentSpec.version + 1,
    status: 'draft',
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
  
  // Record the revert as a change
  await recordSpecChange(
    projectId,
    specId, 
    currentSpec.version + 1, 
    'edited', 
    [{ field: 'version', oldValue: currentSpec.version, newValue: version }], 
    userId,
    `Reverted to version ${version}`
  );
}

// ============================================
// PENDING SPECS (FOR REVIEW QUEUE)
// ============================================

/**
 * Get all specs pending review across all projects
 * This requires a collection group query or aggregation
 */
export async function getPendingSpecs(): Promise<Spec[]> {
  // Note: This would need a collection group query in production
  // For now, return empty - the hook will handle this differently
  return [];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Record a spec change for version history
 */
async function recordSpecChange(
  projectId: string,
  specId: string,
  version: number,
  changeType: SpecChange['changeType'],
  changes: SpecChange['changes'],
  userId: string,
  notes?: string
): Promise<void> {
  const changesRef = collection(db, 'projects', projectId, 'specs', specId, 'changes');
  
  await addDoc(changesRef, {
    specId,
    version,
    changeType,
    changes,
    changedBy: userId,
    changedAt: serverTimestamp(),
    notes,
  });
}

/**
 * Calculate field changes between old and new spec data
 */
function calculateFieldChanges(
  oldSpec: Spec, 
  newData: Partial<Spec>
): SpecChange['changes'] {
  const changes: SpecChange['changes'] = [];
  
  // Check header changes
  if (newData.header) {
    for (const [key, value] of Object.entries(newData.header)) {
      const oldValue = oldSpec.header[key as keyof SpecHeader];
      if (oldValue !== value) {
        changes.push({
          field: `header.${key}`,
          oldValue,
          newValue: value,
        });
      }
    }
  }
  
  // Check timeline changes
  if (newData.timeline) {
    for (const [key, value] of Object.entries(newData.timeline)) {
      const oldValue = oldSpec.timeline[key as keyof SpecTimeline];
      if (oldValue !== value) {
        changes.push({
          field: `timeline.${key}`,
          oldValue,
          newValue: value,
        });
      }
    }
  }
  
  // Check category changes (simplified - just track if categories changed)
  if (newData.categories) {
    const oldSelected = getSelectedOptions(oldSpec.categories);
    const newSelected = getSelectedOptions(newData.categories);
    
    if (JSON.stringify(oldSelected) !== JSON.stringify(newSelected)) {
      changes.push({
        field: 'categories',
        oldValue: oldSelected,
        newValue: newSelected,
      });
    }
  }
  
  // Check colour option changes
  if (newData.colourOptions) {
    if (JSON.stringify(oldSpec.colourOptions) !== JSON.stringify(newData.colourOptions)) {
      changes.push({
        field: 'colourOptions',
        oldValue: oldSpec.colourOptions,
        newValue: newData.colourOptions,
      });
    }
  }
  
  return changes;
}

/**
 * Get selected options from categories
 */
function getSelectedOptions(categories: SpecCategory[]): Record<string, string[]> {
  const selected: Record<string, string[]> = {};
  
  for (const category of categories) {
    const selectedOptions = category.options
      .filter(opt => opt.selected)
      .map(opt => opt.optionName);
    
    if (selectedOptions.length > 0) {
      selected[category.category] = selectedOptions;
    }
  }
  
  return selected;
}

// ============================================
// SPEC VALIDATION
// ============================================

/**
 * Validate a spec before submission
 */
export function validateSpec(spec: Spec): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required header fields
  if (!spec.header.projectName) {
    errors.push('Project name is required');
  }
  if (!spec.header.bikeType) {
    errors.push('Bike type is required');
  }
  
  // Must have at least one selected option
  const hasSelectedOptions = spec.categories.some(
    cat => cat.options.some(opt => opt.selected)
  );
  if (!hasSelectedOptions) {
    errors.push('At least one configuration option must be selected');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get spec status label for display
 */
export function getSpecStatusLabel(status: SpecStatus): string {
  switch (status) {
    case 'draft': return 'Draft';
    case 'submitted': return 'Submitted';
    case 'in_review': return 'In Review';
    case 'accepted': return 'Accepted';
    case 'rejected': return 'Rejected';
    case 'archived': return 'Archived';
    default: return status;
  }
}

/**
 * Get spec status color for display
 */
export function getSpecStatusColor(status: SpecStatus): string {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'submitted': return 'bg-blue-100 text-blue-800';
    case 'in_review': return 'bg-yellow-100 text-yellow-800';
    case 'accepted': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'archived': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-800';
  }
}

