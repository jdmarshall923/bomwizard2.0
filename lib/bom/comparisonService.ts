import {
  BomVersion,
  BomChange,
  VersionItem,
  VersionComparison,
  DateRangeComparison,
  VersionTransition,
  CostDriver,
  CostImpact,
  ChangeType,
  DriverAggregate,
  AssemblyAggregate,
} from '@/types';
import { Timestamp, collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  getVersion,
  getVersionItems,
  getVersionAtDate,
  getVersionsInRange,
  getEarliestVersion,
  getLatestVersion,
} from './versionService';

// ============================================
// COST DRIVER LABELS
// ============================================

export const COST_DRIVER_LABELS: Record<CostDriver, string> = {
  quantity_increase: 'Quantity Increase',
  quantity_decrease: 'Quantity Decrease',
  material_price_increase: 'Material Price Increase',
  material_price_decrease: 'Material Price Decrease',
  landing_rate_change: 'Landing Rate Change',
  labour_cost_change: 'Labour Cost Change',
  vendor_change: 'Vendor Change',
  price_source_change: 'Price Source Change',
  new_item: 'New Item Added',
  removed_item: 'Item Removed',
  item_replacement: 'Item Replaced',
  bulk_adjustment: 'Bulk Adjustment',
  currency_change: 'Currency Change',
  other: 'Other',
};

// ============================================
// COST DRIVER DETECTION
// ============================================

/**
 * Automatically detect the cost driver for a change
 * Prioritizes the most significant change as the driver
 */
export function detectCostDriver(
  oldItem: VersionItem | null,
  newItem: VersionItem | null
): CostDriver {
  // New item added
  if (!oldItem && newItem) {
    return 'new_item';
  }
  
  // Item removed
  if (oldItem && !newItem) {
    return 'removed_item';
  }
  
  // Both exist - determine what changed
  if (oldItem && newItem) {
    // Check quantity change first (often most impactful)
    if (oldItem.quantity !== newItem.quantity) {
      return newItem.quantity > oldItem.quantity 
        ? 'quantity_increase' 
        : 'quantity_decrease';
    }
    
    // Check material cost change
    if (oldItem.materialCost !== newItem.materialCost) {
      return newItem.materialCost > oldItem.materialCost
        ? 'material_price_increase'
        : 'material_price_decrease';
    }
    
    // Check vendor change
    if (oldItem.vendorCode !== newItem.vendorCode) {
      return 'vendor_change';
    }
    
    // Check cost source change (e.g., placeholder → contract)
    if (oldItem.costSource !== newItem.costSource) {
      return 'price_source_change';
    }
    
    // Check landing rate change
    if (oldItem.landingCost !== newItem.landingCost) {
      return 'landing_rate_change';
    }
    
    // Check labour cost change
    if (oldItem.labourCost !== newItem.labourCost) {
      return 'labour_cost_change';
    }
  }
  
  return 'other';
}

/**
 * Calculate the cost impact of a change
 */
export function calculateCostImpact(
  oldItem: VersionItem | null,
  newItem: VersionItem | null
): CostImpact {
  const oldMaterial = oldItem?.extendedCost ? (oldItem.materialCost * oldItem.quantity) : 0;
  const newMaterial = newItem?.extendedCost ? (newItem.materialCost * newItem.quantity) : 0;
  
  const oldLanding = oldItem?.extendedCost ? (oldItem.landingCost * oldItem.quantity) : 0;
  const newLanding = newItem?.extendedCost ? (newItem.landingCost * newItem.quantity) : 0;
  
  const oldLabour = oldItem?.extendedCost ? (oldItem.labourCost * oldItem.quantity) : 0;
  const newLabour = newItem?.extendedCost ? (newItem.labourCost * newItem.quantity) : 0;
  
  const oldExtended = oldItem?.extendedCost || 0;
  const newExtended = newItem?.extendedCost || 0;
  
  const materialDelta = newMaterial - oldMaterial;
  const landingDelta = newLanding - oldLanding;
  const labourDelta = newLabour - oldLabour;
  const extendedDelta = newExtended - oldExtended;
  
  // Calculate percentage change (avoid division by zero)
  let percentageChange = 0;
  if (oldExtended > 0) {
    percentageChange = (extendedDelta / oldExtended) * 100;
  } else if (newExtended > 0) {
    percentageChange = 100; // New item = 100% increase
  }
  
  return {
    materialDelta,
    landingDelta,
    labourDelta,
    extendedDelta,
    percentageChange,
  };
}

/**
 * Determine which fields changed between two items
 */
function getChangedFields(oldItem: VersionItem, newItem: VersionItem): string[] {
  const fields: string[] = [];
  
  if (oldItem.quantity !== newItem.quantity) fields.push('quantity');
  if (oldItem.materialCost !== newItem.materialCost) fields.push('materialCost');
  if (oldItem.landingCost !== newItem.landingCost) fields.push('landingCost');
  if (oldItem.labourCost !== newItem.labourCost) fields.push('labourCost');
  if (oldItem.costSource !== newItem.costSource) fields.push('costSource');
  if (oldItem.vendorCode !== newItem.vendorCode) fields.push('vendorCode');
  if (oldItem.itemDescription !== newItem.itemDescription) fields.push('itemDescription');
  
  return fields;
}

// ============================================
// VERSION COMPARISON
// ============================================

/**
 * Compare two versions and generate detailed change records
 */
export async function compareVersions(
  projectId: string,
  baseVersionId: string,
  compareVersionId: string
): Promise<VersionComparison> {
  // Get both versions and their items
  const [baseVersion, compareVersion] = await Promise.all([
    getVersion(projectId, baseVersionId),
    getVersion(projectId, compareVersionId),
  ]);
  
  if (!baseVersion || !compareVersion) {
    throw new Error('One or both versions not found');
  }
  
  const [baseItems, compareItems] = await Promise.all([
    getVersionItems(projectId, baseVersionId),
    getVersionItems(projectId, compareVersionId),
  ]);
  
  // Create maps for efficient lookup
  const baseItemMap = new Map<string, VersionItem>();
  baseItems.forEach(item => baseItemMap.set(item.itemCode, item));
  
  const compareItemMap = new Map<string, VersionItem>();
  compareItems.forEach(item => compareItemMap.set(item.itemCode, item));
  
  // Detect all changes
  const changes: BomChange[] = [];
  const processedCodes = new Set<string>();
  
  // Check items in compare version (added or modified)
  for (const compareItem of compareItems) {
    // Skip GRP- items for change tracking
    if (compareItem.itemCode.startsWith('GRP-')) continue;
    
    processedCodes.add(compareItem.itemCode);
    const baseItem = baseItemMap.get(compareItem.itemCode);
    
    if (!baseItem) {
      // Item was added
      const costImpact = calculateCostImpact(null, compareItem);
      changes.push({
        id: `${baseVersionId}-${compareVersionId}-${compareItem.itemCode}`,
        projectId,
        fromVersionId: baseVersionId,
        toVersionId: compareVersionId,
        fromVersionNumber: baseVersion.versionNumber,
        toVersionNumber: compareVersion.versionNumber,
        detectedAt: Timestamp.now(),
        changeType: 'added',
        itemId: compareItem.bomItemId,
        itemCode: compareItem.itemCode,
        itemDescription: compareItem.itemDescription,
        groupCode: compareItem.groupCode,
        costImpact,
        costDriver: 'new_item',
        costDriverAutoDetected: true,
        newQuantity: compareItem.quantity,
        newCostSource: compareItem.costSource,
        newVendorCode: compareItem.vendorCode,
        newVendorName: compareItem.vendorName,
      });
    } else {
      // Check if modified
      const costImpact = calculateCostImpact(baseItem, compareItem);
      
      if (Math.abs(costImpact.extendedDelta) > 0.001) {
        // Item was modified
        const changedFields = getChangedFields(baseItem, compareItem);
        const costDriver = detectCostDriver(baseItem, compareItem);
        
        changes.push({
          id: `${baseVersionId}-${compareVersionId}-${compareItem.itemCode}`,
          projectId,
          fromVersionId: baseVersionId,
          toVersionId: compareVersionId,
          fromVersionNumber: baseVersion.versionNumber,
          toVersionNumber: compareVersion.versionNumber,
          detectedAt: Timestamp.now(),
          changeType: 'modified',
          itemId: compareItem.bomItemId,
          itemCode: compareItem.itemCode,
          itemDescription: compareItem.itemDescription,
          groupCode: compareItem.groupCode,
          changedFields,
          oldValues: {
            quantity: baseItem.quantity,
            materialCost: baseItem.materialCost,
            landingCost: baseItem.landingCost,
            labourCost: baseItem.labourCost,
            extendedCost: baseItem.extendedCost,
            costSource: baseItem.costSource,
            vendorCode: baseItem.vendorCode,
          },
          newValues: {
            quantity: compareItem.quantity,
            materialCost: compareItem.materialCost,
            landingCost: compareItem.landingCost,
            labourCost: compareItem.labourCost,
            extendedCost: compareItem.extendedCost,
            costSource: compareItem.costSource,
            vendorCode: compareItem.vendorCode,
          },
          costImpact,
          costDriver,
          costDriverAutoDetected: true,
          oldQuantity: baseItem.quantity,
          newQuantity: compareItem.quantity,
          oldCostSource: baseItem.costSource,
          newCostSource: compareItem.costSource,
          oldVendorCode: baseItem.vendorCode,
          oldVendorName: baseItem.vendorName,
          newVendorCode: compareItem.vendorCode,
          newVendorName: compareItem.vendorName,
        });
      }
    }
  }
  
  // Check for removed items (in base but not in compare)
  for (const baseItem of baseItems) {
    if (baseItem.itemCode.startsWith('GRP-')) continue;
    if (processedCodes.has(baseItem.itemCode)) continue;
    
    // Item was removed
    const costImpact = calculateCostImpact(baseItem, null);
    changes.push({
      id: `${baseVersionId}-${compareVersionId}-${baseItem.itemCode}`,
      projectId,
      fromVersionId: baseVersionId,
      toVersionId: compareVersionId,
      fromVersionNumber: baseVersion.versionNumber,
      toVersionNumber: compareVersion.versionNumber,
      detectedAt: Timestamp.now(),
      changeType: 'removed',
      itemId: baseItem.bomItemId,
      itemCode: baseItem.itemCode,
      itemDescription: baseItem.itemDescription,
      groupCode: baseItem.groupCode,
      costImpact,
      costDriver: 'removed_item',
      costDriverAutoDetected: true,
      oldQuantity: baseItem.quantity,
      oldCostSource: baseItem.costSource,
      oldVendorCode: baseItem.vendorCode,
      oldVendorName: baseItem.vendorName,
    });
  }
  
  // Aggregate by driver
  const changesByDriver = aggregateByDriver(changes);
  
  // Aggregate by assembly
  const changesByAssembly = aggregateByAssembly(changes);
  
  // Get top increases and decreases
  const sortedByImpact = [...changes].sort(
    (a, b) => b.costImpact.extendedDelta - a.costImpact.extendedDelta
  );
  const topIncreases = sortedByImpact.filter(c => c.costImpact.extendedDelta > 0).slice(0, 10);
  const topDecreases = sortedByImpact.filter(c => c.costImpact.extendedDelta < 0).slice(-10).reverse();
  
  // Calculate summary
  const baseTotalCost = baseVersion.summary.totalExtendedCost;
  const compareTotalCost = compareVersion.summary.totalExtendedCost;
  const absoluteChange = compareTotalCost - baseTotalCost;
  const percentageChange = baseTotalCost > 0 ? (absoluteChange / baseTotalCost) * 100 : 0;
  
  // Count change types
  const itemsAdded = changes.filter(c => c.changeType === 'added').length;
  const itemsRemoved = changes.filter(c => c.changeType === 'removed').length;
  const itemsModified = changes.filter(c => c.changeType === 'modified').length;
  const itemsUnchanged = baseItems.filter(i => !i.itemCode.startsWith('GRP-')).length - itemsRemoved - itemsModified;
  
  const comparison: VersionComparison = {
    id: `${baseVersionId}-${compareVersionId}`,
    projectId,
    baseVersionId,
    baseVersionNumber: baseVersion.versionNumber,
    baseVersionName: baseVersion.versionName,
    baseVersionDate: baseVersion.createdAt,
    compareVersionId,
    compareVersionNumber: compareVersion.versionNumber,
    compareVersionName: compareVersion.versionName,
    compareVersionDate: compareVersion.createdAt,
    generatedAt: Timestamp.now(),
    costSummary: {
      baseTotalCost,
      compareTotalCost,
      absoluteChange,
      percentageChange,
      materialChange: compareVersion.summary.totalMaterialCost - baseVersion.summary.totalMaterialCost,
      landingChange: compareVersion.summary.totalLandingCost - baseVersion.summary.totalLandingCost,
      labourChange: compareVersion.summary.totalLabourCost - baseVersion.summary.totalLabourCost,
    },
    changesByDriver,
    changesByAssembly,
    topIncreases,
    topDecreases,
    itemsAdded,
    itemsRemoved,
    itemsModified,
    itemsUnchanged,
    allChanges: changes,
    changesCount: changes.length,
  };
  
  return comparison;
}

// ============================================
// AGGREGATION FUNCTIONS
// ============================================

/**
 * Aggregate changes by cost driver
 */
export function aggregateByDriver(changes: BomChange[]): DriverAggregate[] {
  const driverMap = new Map<CostDriver, BomChange[]>();
  
  // Group changes by driver
  for (const change of changes) {
    const existing = driverMap.get(change.costDriver) || [];
    existing.push(change);
    driverMap.set(change.costDriver, existing);
  }
  
  // Calculate total impact for percentage calculation
  const totalImpact = changes.reduce((sum, c) => sum + Math.abs(c.costImpact.extendedDelta), 0);
  
  // Convert to array and calculate totals
  const aggregates: DriverAggregate[] = [];
  
  for (const [driver, driverChanges] of driverMap.entries()) {
    const driverTotalImpact = driverChanges.reduce((sum, c) => sum + c.costImpact.extendedDelta, 0);
    
    aggregates.push({
      driver,
      driverLabel: COST_DRIVER_LABELS[driver],
      itemCount: driverChanges.length,
      totalImpact: driverTotalImpact,
      percentOfTotalChange: totalImpact > 0 ? (Math.abs(driverTotalImpact) / totalImpact) * 100 : 0,
      changes: driverChanges,
    });
  }
  
  // Sort by absolute impact (descending)
  return aggregates.sort((a, b) => Math.abs(b.totalImpact) - Math.abs(a.totalImpact));
}

/**
 * Aggregate changes by assembly (group)
 */
export function aggregateByAssembly(changes: BomChange[]): AssemblyAggregate[] {
  const assemblyMap = new Map<string, BomChange[]>();
  
  // Group changes by assembly
  for (const change of changes) {
    const groupCode = change.groupCode || 'UNGROUPED';
    const existing = assemblyMap.get(groupCode) || [];
    existing.push(change);
    assemblyMap.set(groupCode, existing);
  }
  
  // Calculate total impact for percentage calculation
  const totalImpact = changes.reduce((sum, c) => sum + Math.abs(c.costImpact.extendedDelta), 0);
  
  // Convert to array and calculate totals
  const aggregates: AssemblyAggregate[] = [];
  
  for (const [groupCode, assemblyChanges] of assemblyMap.entries()) {
    const assemblyTotalImpact = assemblyChanges.reduce((sum, c) => sum + c.costImpact.extendedDelta, 0);
    
    aggregates.push({
      groupCode,
      groupDescription: assemblyChanges[0]?.groupDescription,
      itemCount: assemblyChanges.length,
      totalImpact: assemblyTotalImpact,
      percentOfTotalChange: totalImpact > 0 ? (Math.abs(assemblyTotalImpact) / totalImpact) * 100 : 0,
      changes: assemblyChanges,
    });
  }
  
  // Sort by absolute impact (descending)
  return aggregates.sort((a, b) => Math.abs(b.totalImpact) - Math.abs(a.totalImpact));
}

// ============================================
// DATE RANGE COMPARISON
// ============================================

/**
 * Generate a summary string for a version transition
 */
function generateTransitionSummary(
  fromVersion: BomVersion,
  toVersion: BomVersion,
  changeCount: number,
  topDrivers: { driver: CostDriver; impact: number }[]
): string {
  const costDiff = toVersion.summary.totalExtendedCost - fromVersion.summary.totalExtendedCost;
  const direction = costDiff >= 0 ? 'increased' : 'decreased';
  const absChange = Math.abs(costDiff);
  
  if (topDrivers.length === 0) {
    return `Cost ${direction} by £${absChange.toFixed(2)} with ${changeCount} changes`;
  }
  
  const mainDriver = COST_DRIVER_LABELS[topDrivers[0].driver];
  return `Cost ${direction} by £${absChange.toFixed(2)}. Main driver: ${mainDriver}`;
}

/**
 * Compare BOM changes across a date range
 */
export async function compareDateRange(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<DateRangeComparison> {
  // Adjust dates to cover the full day range
  // Start of start day (00:00:00)
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  // End of end day (23:59:59)
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Get all versions in the range first
  const versionsInRange = await getVersionsInRange(projectId, startOfDay, endOfDay);
  
  // If we have versions in range, use the first and last
  let startVersion: BomVersion | null = null;
  let endVersion: BomVersion | null = null;
  
  if (versionsInRange.length >= 2) {
    // We have multiple versions in range - use first and last
    startVersion = versionsInRange[0];
    endVersion = versionsInRange[versionsInRange.length - 1];
  } else if (versionsInRange.length === 1) {
    // Only one version in range - try to find one before the range
    startVersion = await getVersionAtDate(projectId, new Date(startOfDay.getTime() - 1));
    endVersion = versionsInRange[0];
    
    // If no version before, use earliest and this one
    if (!startVersion) {
      const earliest = await getEarliestVersion(projectId);
      if (earliest && earliest.id !== endVersion.id) {
        startVersion = earliest;
      }
    }
  } else {
    // No versions in range - try to get boundary versions
    startVersion = await getVersionAtDate(projectId, startOfDay);
    endVersion = await getVersionAtDate(projectId, endOfDay);
    
    // If no version before start date, use the earliest available version
    if (!startVersion) {
      startVersion = await getEarliestVersion(projectId);
    }
    
    // If no version before end date, use the latest available version
    if (!endVersion) {
      endVersion = await getLatestVersion(projectId);
    }
  }
  
  // If still no versions, the project has no versions at all
  if (!startVersion || !endVersion) {
    throw new Error('No versions exist for this project. Please create a version first by importing data or clicking "Create Version".');
  }
  
  // If start and end are the same version, we need at least 2 versions
  if (startVersion.id === endVersion.id) {
    throw new Error('Only one version found in this date range. Select a wider range or create more versions.');
  }
  
  // Re-fetch versions in range with proper boundaries and ensure we have all needed versions
  let finalVersionsInRange = await getVersionsInRange(projectId, startOfDay, endOfDay);
  
  // If start version isn't in range (it's before the range), add it
  if (!finalVersionsInRange.find(v => v.id === startVersion!.id)) {
    finalVersionsInRange.unshift(startVersion);
  }
  
  // If end version isn't in range, add it
  if (!finalVersionsInRange.find(v => v.id === endVersion!.id)) {
    finalVersionsInRange.push(endVersion);
  }
  
  // Sort by version number to ensure correct order
  finalVersionsInRange.sort((a, b) => a.versionNumber - b.versionNumber);
  
  // Generate comparisons between consecutive versions
  const versionTransitions: VersionTransition[] = [];
  const allChanges: BomChange[] = [];
  
  for (let i = 0; i < finalVersionsInRange.length - 1; i++) {
    const fromVersion = finalVersionsInRange[i];
    const toVersion = finalVersionsInRange[i + 1];
    
    const comparison = await compareVersions(projectId, fromVersion.id, toVersion.id);
    
    if (comparison.allChanges) {
      allChanges.push(...comparison.allChanges);
    }
    
    // Get top drivers for this transition
    const topDrivers = comparison.changesByDriver.slice(0, 3).map(d => ({
      driver: d.driver,
      impact: d.totalImpact,
    }));
    
    versionTransitions.push({
      fromVersion,
      toVersion,
      costChange: comparison.costSummary.absoluteChange,
      percentageChange: comparison.costSummary.percentageChange,
      changeCount: comparison.changesCount,
      summary: generateTransitionSummary(fromVersion, toVersion, comparison.changesCount, topDrivers),
      topDrivers,
    });
  }
  
  // Calculate aggregated totals
  const totalCostChange = endVersion.summary.totalExtendedCost - startVersion.summary.totalExtendedCost;
  const percentageChange = startVersion.summary.totalExtendedCost > 0
    ? (totalCostChange / startVersion.summary.totalExtendedCost) * 100
    : 0;
  
  // Aggregate all changes by driver and assembly
  const changesByDriver = aggregateByDriver(allChanges);
  const changesByAssembly = aggregateByAssembly(allChanges);
  
  // Build cost trend data
  const costTrend = finalVersionsInRange.map(v => ({
    date: v.createdAt,
    versionNumber: v.versionNumber,
    versionName: v.versionName,
    totalCost: v.summary.totalExtendedCost,
  }));
  
  return {
    id: `${startDate.toISOString()}-${endDate.toISOString()}`,
    projectId,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    startVersion,
    endVersion,
    versionsInRange: finalVersionsInRange,
    totalCostChange,
    percentageChange,
    costTrend,
    changesByDriver,
    changesByAssembly,
    versionTransitions,
    generatedAt: Timestamp.now(),
  };
}

// ============================================
// CHANGE PERSISTENCE (Optional caching)
// ============================================

/**
 * Save changes to Firestore for later retrieval
 */
export async function saveChanges(
  projectId: string,
  changes: BomChange[]
): Promise<void> {
  if (changes.length === 0) return;
  
  const changesRef = collection(db, `projects/${projectId}/changes`);
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchChanges = changes.slice(i, i + BATCH_SIZE);
    
    batchChanges.forEach((change) => {
      const changeRef = doc(changesRef, change.id);
      batch.set(changeRef, change);
    });
    
    await batch.commit();
  }
}

/**
 * Get saved changes between two versions
 */
export async function getSavedChanges(
  projectId: string,
  fromVersionId: string,
  toVersionId: string
): Promise<BomChange[]> {
  const changesRef = collection(db, `projects/${projectId}/changes`);
  const q = query(
    changesRef,
    where('fromVersionId', '==', fromVersionId),
    where('toVersionId', '==', toVersionId)
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as BomChange[];
}

/**
 * Update a change's cost driver (manual override)
 */
export async function updateChangeCostDriver(
  projectId: string,
  changeId: string,
  costDriver: CostDriver,
  costDriverNote?: string
): Promise<void> {
  const changeRef = doc(db, `projects/${projectId}/changes/${changeId}`);
  const batch = writeBatch(db);
  
  batch.update(changeRef, {
    costDriver,
    costDriverNote,
    costDriverAutoDetected: false,
  });
  
  await batch.commit();
}

