import {
  BomItem,
  BomVersion,
  VersionComparison,
  DateRangeComparison,
  CostDriver,
  DriverAggregate,
  AssemblyAggregate,
} from '@/types';
import { Timestamp } from 'firebase/firestore';
import { getVersions, getLatestVersion, getEarliestVersion } from './versionService';
import { compareVersions, compareDateRange, COST_DRIVER_LABELS } from './comparisonService';

// ============================================
// TYPES
// ============================================

export interface CostSummary {
  totalCost: number;
  materialCost: number;
  landingCost: number;
  labourCost: number;
  itemCount: number;
  assemblyCount: number;
  
  // Price source breakdown
  costBySource: {
    contract: number;
    quote: number;
    estimate: number;
    placeholder: number;
  };
  
  // Risk indicators
  placeholderCount: number;
  placeholderCost: number;
  newPartsCount: number;
  
  // Price confidence
  priceConfidenceScore: number; // 0-100
}

export interface AssemblyCost {
  groupCode: string;
  groupDescription?: string;
  totalCost: number;
  itemCount: number;
  percentOfTotal: number;
  materialCost: number;
  landingCost: number;
  labourCost: number;
}

export interface CostTrendPoint {
  date: Date;
  versionNumber: number;
  versionName?: string;
  totalCost: number;
  materialCost: number;
  landingCost: number;
  labourCost: number;
  itemCount: number;
  trigger?: string;
}

export interface CostDriverSummary {
  driver: CostDriver;
  label: string;
  totalImpact: number;
  itemCount: number;
  percentOfChange: number;
  isPositive: boolean;
}

export interface PriceVolatilityItem {
  itemCode: string;
  itemDescription: string;
  groupCode: string;
  currentCost: number;
  originalCost: number;
  absoluteChange: number;
  percentChange: number;
  changeCount: number;
  volatilityScore: number; // 0-100 based on frequency and magnitude
}

export interface CostAnalysisSummary {
  currentCost: CostSummary;
  costTrend: CostTrendPoint[];
  costByAssembly: AssemblyCost[];
  
  // Comparison data (if versions exist)
  totalVersions: number;
  firstVersionCost?: number;
  latestVersionCost?: number;
  overallChange?: number;
  overallChangePercent?: number;
  
  // Top level KPIs
  largestAssembly?: AssemblyCost;
  highestCostItems?: BomItem[];
  
  // Risk metrics
  placeholderRisk: number; // Percentage of cost that's placeholder
  newPartRisk: number; // Percentage of items that are new parts
}

// ============================================
// COST ANALYSIS FUNCTIONS
// ============================================

/**
 * Calculate cost summary from BOM items
 */
export function calculateCostSummary(items: BomItem[]): CostSummary {
  const groupCodes = new Set<string>();
  let totalMaterial = 0;
  let totalLanding = 0;
  let totalLabour = 0;
  let contractCost = 0;
  let quoteCost = 0;
  let estimateCost = 0;
  let placeholderCost = 0;
  let placeholderCount = 0;
  let newPartsCount = 0;
  let contractCount = 0;
  let quoteCount = 0;
  
  for (const item of items) {
    // Skip GRP- items
    if (item.itemCode.startsWith('GRP-')) continue;
    
    if (item.groupCode) groupCodes.add(item.groupCode);
    
    const extCost = item.extendedCost || 0;
    totalMaterial += (item.materialCost || 0) * (item.quantity || 0);
    totalLanding += (item.landingCost || 0) * (item.quantity || 0);
    totalLabour += (item.labourCost || 0) * (item.quantity || 0);
    
    if (item.isPlaceholder) {
      placeholderCount++;
      placeholderCost += extCost;
    }
    if (item.isNewPart) newPartsCount++;
    
    switch (item.costSource) {
      case 'contract':
        contractCost += extCost;
        contractCount++;
        break;
      case 'quote':
        quoteCost += extCost;
        quoteCount++;
        break;
      case 'estimate':
        estimateCost += extCost;
        break;
      case 'placeholder':
        placeholderCost += extCost;
        break;
    }
  }
  
  const totalCost = totalMaterial + totalLanding + totalLabour;
  const itemCount = items.filter(i => !i.itemCode.startsWith('GRP-')).length;
  
  // Calculate price confidence score
  // 100% contract/quote = high confidence
  // More placeholders/estimates = lower confidence
  let priceConfidenceScore = 0;
  if (itemCount > 0) {
    const confirmedCount = contractCount + quoteCount;
    priceConfidenceScore = Math.round((confirmedCount / itemCount) * 100);
  }
  
  return {
    totalCost,
    materialCost: totalMaterial,
    landingCost: totalLanding,
    labourCost: totalLabour,
    itemCount,
    assemblyCount: groupCodes.size,
    costBySource: {
      contract: contractCost,
      quote: quoteCost,
      estimate: estimateCost,
      placeholder: placeholderCost,
    },
    placeholderCount,
    placeholderCost,
    newPartsCount,
    priceConfidenceScore,
  };
}

/**
 * Calculate cost breakdown by assembly
 */
export function calculateCostByAssembly(items: BomItem[]): AssemblyCost[] {
  const assemblyMap = new Map<string, {
    items: BomItem[];
    totalCost: number;
    materialCost: number;
    landingCost: number;
    labourCost: number;
  }>();
  
  // Filter out GRP- items and group by assembly
  const regularItems = items.filter(i => !i.itemCode.startsWith('GRP-'));
  const totalCost = regularItems.reduce((sum, i) => sum + (i.extendedCost || 0), 0);
  
  for (const item of regularItems) {
    const groupCode = item.groupCode || 'UNGROUPED';
    const existing = assemblyMap.get(groupCode) || {
      items: [],
      totalCost: 0,
      materialCost: 0,
      landingCost: 0,
      labourCost: 0,
    };
    
    existing.items.push(item);
    existing.totalCost += item.extendedCost || 0;
    existing.materialCost += (item.materialCost || 0) * (item.quantity || 0);
    existing.landingCost += (item.landingCost || 0) * (item.quantity || 0);
    existing.labourCost += (item.labourCost || 0) * (item.quantity || 0);
    
    assemblyMap.set(groupCode, existing);
  }
  
  // Convert to array and calculate percentages
  const assemblyCosts: AssemblyCost[] = [];
  
  for (const [groupCode, data] of assemblyMap.entries()) {
    // Try to get description from first item
    const description = data.items[0]?.itemDescription;
    
    assemblyCosts.push({
      groupCode,
      groupDescription: description,
      totalCost: data.totalCost,
      itemCount: data.items.length,
      percentOfTotal: totalCost > 0 ? (data.totalCost / totalCost) * 100 : 0,
      materialCost: data.materialCost,
      landingCost: data.landingCost,
      labourCost: data.labourCost,
    });
  }
  
  // Sort by cost descending
  return assemblyCosts.sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Build cost trend from version history
 */
export async function buildCostTrend(projectId: string): Promise<CostTrendPoint[]> {
  const versions = await getVersions(projectId);
  
  // Sort by version number ascending for chronological order
  const sortedVersions = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  
  return sortedVersions.map(version => ({
    date: version.createdAt.toDate(),
    versionNumber: version.versionNumber,
    versionName: version.versionName,
    totalCost: version.summary.totalExtendedCost,
    materialCost: version.summary.totalMaterialCost,
    landingCost: version.summary.totalLandingCost,
    labourCost: version.summary.totalLabourCost,
    itemCount: version.summary.totalItems,
    trigger: version.trigger,
  }));
}

/**
 * Get cost drivers between first and latest version
 */
export async function getCostDriversSummary(
  projectId: string
): Promise<CostDriverSummary[]> {
  const earliest = await getEarliestVersion(projectId);
  const latest = await getLatestVersion(projectId);
  
  if (!earliest || !latest || earliest.id === latest.id) {
    return [];
  }
  
  const comparison = await compareVersions(projectId, earliest.id, latest.id);
  
  return comparison.changesByDriver.map(driver => ({
    driver: driver.driver,
    label: driver.driverLabel,
    totalImpact: driver.totalImpact,
    itemCount: driver.itemCount,
    percentOfChange: driver.percentOfTotalChange,
    isPositive: driver.totalImpact >= 0,
  }));
}

/**
 * Calculate price volatility for items
 */
export async function calculatePriceVolatility(
  projectId: string
): Promise<PriceVolatilityItem[]> {
  const earliest = await getEarliestVersion(projectId);
  const latest = await getLatestVersion(projectId);
  
  if (!earliest || !latest || earliest.id === latest.id) {
    return [];
  }
  
  const comparison = await compareVersions(projectId, earliest.id, latest.id);
  
  // Get items that had price changes
  const priceChanges = comparison.allChanges?.filter(
    change => 
      change.costDriver === 'material_price_increase' ||
      change.costDriver === 'material_price_decrease'
  ) || [];
  
  const volatilityItems: PriceVolatilityItem[] = priceChanges.map(change => {
    const oldCost = change.oldValues?.extendedCost as number || 0;
    const newCost = change.newValues?.extendedCost as number || 0;
    const absoluteChange = newCost - oldCost;
    const percentChange = oldCost > 0 ? (absoluteChange / oldCost) * 100 : 0;
    
    // Volatility score based on magnitude
    const volatilityScore = Math.min(100, Math.abs(percentChange));
    
    return {
      itemCode: change.itemCode,
      itemDescription: change.itemDescription,
      groupCode: change.groupCode,
      currentCost: newCost,
      originalCost: oldCost,
      absoluteChange,
      percentChange,
      changeCount: 1,
      volatilityScore,
    };
  });
  
  // Sort by absolute change descending
  return volatilityItems.sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange));
}

/**
 * Get top N costly items
 */
export function getTopCostlyItems(items: BomItem[], limit: number = 10): BomItem[] {
  return [...items]
    .filter(i => !i.itemCode.startsWith('GRP-'))
    .sort((a, b) => (b.extendedCost || 0) - (a.extendedCost || 0))
    .slice(0, limit);
}

/**
 * Get full cost analysis summary
 */
export async function getFullCostAnalysis(
  projectId: string,
  currentItems: BomItem[]
): Promise<CostAnalysisSummary> {
  const currentCost = calculateCostSummary(currentItems);
  const costByAssembly = calculateCostByAssembly(currentItems);
  const costTrend = await buildCostTrend(projectId);
  
  // Get version comparison data
  const earliest = await getEarliestVersion(projectId);
  const latest = await getLatestVersion(projectId);
  
  let overallChange: number | undefined;
  let overallChangePercent: number | undefined;
  
  if (earliest && latest && earliest.id !== latest.id) {
    const firstCost = earliest.summary.totalExtendedCost;
    const latestCost = latest.summary.totalExtendedCost;
    overallChange = latestCost - firstCost;
    overallChangePercent = firstCost > 0 ? (overallChange / firstCost) * 100 : 0;
  }
  
  // Find largest assembly
  const largestAssembly = costByAssembly[0];
  
  // Get top costly items
  const highestCostItems = getTopCostlyItems(currentItems, 5);
  
  // Calculate risk metrics
  const placeholderRisk = currentCost.totalCost > 0 
    ? (currentCost.placeholderCost / currentCost.totalCost) * 100 
    : 0;
  const newPartRisk = currentCost.itemCount > 0 
    ? (currentCost.newPartsCount / currentCost.itemCount) * 100 
    : 0;
  
  return {
    currentCost,
    costTrend,
    costByAssembly,
    totalVersions: costTrend.length,
    firstVersionCost: earliest?.summary.totalExtendedCost,
    latestVersionCost: latest?.summary.totalExtendedCost,
    overallChange,
    overallChangePercent,
    largestAssembly,
    highestCostItems,
    placeholderRisk,
    newPartRisk,
  };
}

// ============================================
// FORMATTING HELPERS
// ============================================

export function formatCurrency(value: number, compact: boolean = false): string {
  if (compact) {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(1)}K`;
    }
  }
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number, includeSign: boolean = false): string {
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export { COST_DRIVER_LABELS };



