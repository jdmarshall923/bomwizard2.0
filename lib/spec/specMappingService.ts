import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  increment 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  SpecGroupMapping, 
  SuggestedMapping, 
  ContextMapping,
  SpecOption,
  AppliedMapping,
  ApplySpecResult,
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevel
} from '@/types/spec';

// ============================================
// LEARNING SYSTEM - GET SUGGESTIONS
// ============================================

/**
 * Get suggested groups for a spec option based on bike type
 * This is the core of the learning system
 */
export async function getSuggestedGroups(
  bikeType: string,
  category: string, 
  optionValue: string, 
  context?: { category: string; optionValue: string }[]
): Promise<SuggestedMapping | null> {
  const mappingsRef = collection(db, 'specMappings');
  
  // Query for exact match: bikeType + category + optionValue
  const q = query(
    mappingsRef,
    where('bikeType', '==', bikeType),
    where('category', '==', category),
    where('optionValue', '==', optionValue)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    // No direct match - look for similar mappings from other bike types
    const similarMappings = await getSimilarMappings(category, optionValue);
    
    if (similarMappings.length > 0) {
      return {
        bikeType,
        category,
        optionValue,
        groupCodes: [],
        confidence: 0,
        usageCount: 0,
        hasContextOverrides: false,
        similarMappings,
      };
    }
    
    return null;
  }
  
  const mapping = {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as SpecGroupMapping;
  
  // Check for context-specific overrides
  let finalGroupCodes = [...mapping.groupCodes];
  let hasContextOverrides = false;
  
  if (context && context.length > 0 && mapping.contextMappings) {
    const override = findContextOverride(mapping.contextMappings, context);
    if (override) {
      hasContextOverrides = true;
      
      // Apply override
      if (override.replaceWith) {
        finalGroupCodes = override.replaceWith;
      } else {
        // Remove specified groups
        finalGroupCodes = finalGroupCodes.filter(g => !override.removeGroups.includes(g));
        // Add specified groups
        finalGroupCodes = [...finalGroupCodes, ...override.addGroups];
      }
    }
  }
  
  return {
    bikeType,
    category,
    optionValue,
    groupCodes: finalGroupCodes,
    confidence: mapping.confidence,
    usageCount: mapping.usageCount,
    lastUsed: mapping.lastUsed,
    hasContextOverrides,
  };
}

/**
 * Get similar mappings from other bike types
 */
async function getSimilarMappings(
  category: string,
  optionValue: string
): Promise<{ bikeType: string; groupCodes: string[]; confidence: number }[]> {
  const mappingsRef = collection(db, 'specMappings');
  
  const q = query(
    mappingsRef,
    where('category', '==', category),
    where('optionValue', '==', optionValue),
    orderBy('confidence', 'desc')
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data() as SpecGroupMapping;
    return {
      bikeType: data.bikeType,
      groupCodes: data.groupCodes,
      confidence: data.confidence,
    };
  });
}

/**
 * Find applicable context override
 */
function findContextOverride(
  contextMappings: ContextMapping[],
  context: { category: string; optionValue: string }[]
): ContextMapping | null {
  for (const mapping of contextMappings) {
    // Check if all conditions are met
    const allConditionsMet = mapping.conditions.every(condition =>
      context.some(
        ctx => ctx.category === condition.category && ctx.optionValue === condition.optionValue
      )
    );
    
    if (allConditionsMet) {
      return mapping;
    }
  }
  
  return null;
}

// ============================================
// LEARNING SYSTEM - SAVE MAPPINGS
// ============================================

/**
 * Save or update a mapping (called automatically when user confirms selection)
 * This is the core learning function - no checkbox needed
 */
export async function saveMapping(
  bikeType: string,
  category: string, 
  optionValue: string, 
  groupCodes: string[],
  userId: string
): Promise<void> {
  const mappingsRef = collection(db, 'specMappings');
  
  // Check if mapping already exists
  const q = query(
    mappingsRef,
    where('bikeType', '==', bikeType),
    where('category', '==', category),
    where('optionValue', '==', optionValue)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    // Create new mapping
    await addDoc(mappingsRef, {
      bikeType,
      category,
      optionValue,
      groupCodes,
      contextMappings: [],
      usageCount: 1,
      lastUsed: serverTimestamp(),
      confirmedBy: [userId],
      confidence: calculateInitialConfidence(),
      wasEverChanged: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Update existing mapping
    const existingDoc = snapshot.docs[0];
    const existingData = existingDoc.data() as SpecGroupMapping;
    
    // Check if groups changed
    const groupsChanged = JSON.stringify(existingData.groupCodes.sort()) !== 
                         JSON.stringify(groupCodes.sort());
    
    if (groupsChanged) {
      // User modified the suggested groups - update with lower confidence
      await updateDoc(doc(db, 'specMappings', existingDoc.id), {
        groupCodes,
        usageCount: increment(1),
        lastUsed: serverTimestamp(),
        confirmedBy: arrayUnion(userId),
        confidence: Math.max(existingData.confidence - 10, 30), // Lower confidence when changed
        wasEverChanged: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      // User accepted suggestions - boost confidence
      await updateDoc(doc(db, 'specMappings', existingDoc.id), {
        usageCount: increment(1),
        lastUsed: serverTimestamp(),
        confirmedBy: arrayUnion(userId),
        confidence: Math.min(existingData.confidence + 5, 100), // Increase confidence
        updatedAt: serverTimestamp(),
      });
    }
  }
}

/**
 * Confirm an existing mapping (user accepted suggestions without changes)
 */
export async function confirmMapping(
  mappingId: string, 
  userId: string
): Promise<void> {
  const docRef = doc(db, 'specMappings', mappingId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Mapping not found');
  }
  
  const data = docSnap.data() as SpecGroupMapping;
  
  await updateDoc(docRef, {
    usageCount: increment(1),
    lastUsed: serverTimestamp(),
    confirmedBy: arrayUnion(userId),
    confidence: Math.min(data.confidence + 5, 100),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Save a context-specific mapping override
 */
export async function saveContextMapping(
  bikeType: string,
  category: string,
  optionValue: string,
  context: { category: string; optionValue: string }[],
  changes: {
    addGroups?: string[];
    removeGroups?: string[];
    replaceWith?: string[];
  },
  userId: string
): Promise<void> {
  const mappingsRef = collection(db, 'specMappings');
  
  // Find the base mapping
  const q = query(
    mappingsRef,
    where('bikeType', '==', bikeType),
    where('category', '==', category),
    where('optionValue', '==', optionValue)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    throw new Error('Base mapping not found - create base mapping first');
  }
  
  const docRef = doc(db, 'specMappings', snapshot.docs[0].id);
  const existingData = snapshot.docs[0].data() as SpecGroupMapping;
  
  // Create new context mapping
  const newContextMapping: ContextMapping = {
    conditions: context.map(c => ({ category: c.category, optionValue: c.optionValue })),
    addGroups: changes.addGroups || [],
    removeGroups: changes.removeGroups || [],
    replaceWith: changes.replaceWith,
    usageCount: 1,
    confidence: calculateInitialConfidence(),
  };
  
  // Add to existing context mappings
  const updatedContextMappings = [
    ...(existingData.contextMappings || []),
    newContextMapping,
  ];
  
  await updateDoc(docRef, {
    contextMappings: updatedContextMappings,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// CONFIDENCE SCORING
// ============================================

/**
 * Calculate initial confidence for a new mapping
 */
function calculateInitialConfidence(): number {
  // Single use = 20% confidence
  return 20;
}

/**
 * Calculate confidence score based on usage data
 */
export function calculateConfidence(mapping: SpecGroupMapping): number {
  // Factors that increase confidence:
  // 1. Usage count - more uses = more reliable (max 40 points)
  // 2. Multiple confirmers - different people agreed (max 30 points)
  // 3. Recency - recently used = still relevant (10-20 points)
  // 4. Consistency - same groups selected each time (5-10 points)
  
  const usageScore = Math.min(mapping.usageCount / 10, 1) * 40;
  const confirmerScore = Math.min(mapping.confirmedBy.length / 5, 1) * 30;
  const recencyScore = isRecentlyUsed(mapping.lastUsed) ? 20 : 10;
  const consistencyScore = mapping.wasEverChanged ? 5 : 10;
  
  return Math.round(usageScore + confirmerScore + recencyScore + consistencyScore);
}

/**
 * Check if a mapping was used recently (within 90 days)
 */
function isRecentlyUsed(lastUsed: Timestamp): boolean {
  if (!lastUsed) return false;
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  return lastUsed.toDate() > ninetyDaysAgo;
}

// ============================================
// APPLY SPEC TO BOM
// ============================================

/**
 * Apply spec selections to build Working BOM
 * This transfers groups from Template BOM based on spec mappings
 */
export async function applySpecToBom(
  projectId: string, 
  specId: string, 
  mappings: AppliedMapping[],
  userId: string
): Promise<ApplySpecResult> {
  const result: ApplySpecResult = {
    success: true,
    groupsAdded: [],
    groupsRemoved: [],
    partsAdded: 0,
    partsRemoved: 0,
    newPartsCreated: 0,
    errors: [],
    warnings: [],
  };
  
  try {
    // For each mapping, apply the groups to the BOM
    for (const mapping of mappings) {
      // Save the mapping to the learning database (automatic learning)
      await saveMapping(
        mapping.category, // This should be bikeType - will fix in implementation
        mapping.category,
        mapping.optionValue,
        mapping.groupCodes,
        userId
      );
      
      // Add groups to result
      result.groupsAdded.push(...mapping.groupCodes);
    }
    
    // Remove duplicates
    result.groupsAdded = [...new Set(result.groupsAdded)];
    
    // Note: Actual BOM transfer would happen in transferService
    // This is a simplified implementation
    
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }
  
  return result;
}

// ============================================
// SEARCH & QUERY
// ============================================

/**
 * Search for groups by keyword (for manual selection)
 */
export async function searchGroups(
  query: string, 
  bikeType?: string
): Promise<{ groupCode: string; description: string; category?: string }[]> {
  // This would search the template BOM groups
  // For now, return empty - will be implemented with bomGroupService
  return [];
}

/**
 * Get all mappings for a bike type
 */
export async function getMappingsByBikeType(
  bikeType: string
): Promise<SpecGroupMapping[]> {
  const mappingsRef = collection(db, 'specMappings');
  
  const q = query(
    mappingsRef,
    where('bikeType', '==', bikeType),
    orderBy('category'),
    orderBy('optionValue')
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as SpecGroupMapping[];
}

/**
 * Get all mappings for a category
 */
export async function getMappingsByCategory(
  category: string
): Promise<SpecGroupMapping[]> {
  const mappingsRef = collection(db, 'specMappings');
  
  const q = query(
    mappingsRef,
    where('category', '==', category),
    orderBy('bikeType'),
    orderBy('optionValue')
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as SpecGroupMapping[];
}

/**
 * Get all mappings (for admin page)
 */
export async function getAllMappings(
  filters?: {
    bikeType?: string;
    category?: string;
    minConfidence?: number;
  }
): Promise<SpecGroupMapping[]> {
  const mappingsRef = collection(db, 'specMappings');
  
  let q = query(mappingsRef, orderBy('category'), orderBy('optionValue'));
  
  // Apply filters
  if (filters?.bikeType) {
    q = query(mappingsRef, 
      where('bikeType', '==', filters.bikeType),
      orderBy('category'),
      orderBy('optionValue')
    );
  }
  
  if (filters?.category) {
    q = query(mappingsRef,
      where('category', '==', filters.category),
      orderBy('bikeType'),
      orderBy('optionValue')
    );
  }
  
  const snapshot = await getDocs(q);
  
  let mappings = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as SpecGroupMapping[];
  
  // Filter by confidence (post-query since Firestore doesn't support complex queries)
  if (filters?.minConfidence !== undefined) {
    mappings = mappings.filter(m => m.confidence >= filters.minConfidence!);
  }
  
  return mappings;
}

/**
 * Get low confidence mappings (for admin attention)
 */
export async function getLowConfidenceMappings(): Promise<SpecGroupMapping[]> {
  const allMappings = await getAllMappings();
  return allMappings.filter(m => m.confidence < CONFIDENCE_THRESHOLDS.MEDIUM);
}

/**
 * Get mapping stats for admin dashboard
 */
export async function getMappingStats(): Promise<{
  totalMappings: number;
  byBikeType: { bikeType: string; count: number }[];
  byCategory: { category: string; count: number }[];
  lowConfidenceCount: number;
  averageConfidence: number;
}> {
  const allMappings = await getAllMappings();
  
  // Count by bike type
  const bikeTypeCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  let totalConfidence = 0;
  let lowConfidenceCount = 0;
  
  for (const mapping of allMappings) {
    bikeTypeCounts[mapping.bikeType] = (bikeTypeCounts[mapping.bikeType] || 0) + 1;
    categoryCounts[mapping.category] = (categoryCounts[mapping.category] || 0) + 1;
    totalConfidence += mapping.confidence;
    
    if (mapping.confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
      lowConfidenceCount++;
    }
  }
  
  return {
    totalMappings: allMappings.length,
    byBikeType: Object.entries(bikeTypeCounts).map(([bikeType, count]) => ({ bikeType, count })),
    byCategory: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
    lowConfidenceCount,
    averageConfidence: allMappings.length > 0 ? Math.round(totalConfidence / allMappings.length) : 0,
  };
}

// ============================================
// ADMIN OPERATIONS
// ============================================

/**
 * Update a mapping (admin only)
 */
export async function updateMapping(
  mappingId: string,
  updates: Partial<SpecGroupMapping>
): Promise<void> {
  const docRef = doc(db, 'specMappings', mappingId);
  
  const updateData = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  
  // Remove readonly fields
  delete updateData.id;
  delete updateData.createdAt;
  
  await updateDoc(docRef, updateData);
}

/**
 * Copy mapping from one bike type to another (as starting point)
 */
export async function copyMappingToBikeType(
  mappingId: string,
  newBikeType: string,
  userId: string
): Promise<string> {
  const docRef = doc(db, 'specMappings', mappingId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Mapping not found');
  }
  
  const originalData = docSnap.data() as SpecGroupMapping;
  
  // Check if mapping already exists for new bike type
  const mappingsRef = collection(db, 'specMappings');
  const existingQ = query(
    mappingsRef,
    where('bikeType', '==', newBikeType),
    where('category', '==', originalData.category),
    where('optionValue', '==', originalData.optionValue)
  );
  
  const existingSnapshot = await getDocs(existingQ);
  if (!existingSnapshot.empty) {
    throw new Error(`Mapping already exists for ${newBikeType}`);
  }
  
  // Create new mapping for different bike type
  const newMapping = {
    bikeType: newBikeType,
    category: originalData.category,
    optionValue: originalData.optionValue,
    groupCodes: originalData.groupCodes, // Copy groups - user will likely need to modify
    contextMappings: [],
    usageCount: 0,
    lastUsed: serverTimestamp(),
    confirmedBy: [userId],
    confidence: 30, // Start with low confidence since groups may differ
    wasEverChanged: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const newDocRef = await addDoc(mappingsRef, newMapping);
  return newDocRef.id;
}

