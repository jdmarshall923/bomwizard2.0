/**
 * Project Metrics Service
 * 
 * Calculates project metrics including BOM confidence, risk levels,
 * and gate readiness based on working BOM data.
 */

import { collection, doc, getDoc, getDocs, query, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Project, 
  ProjectGate, 
  ProjectGates, 
  ProjectMetrics, 
  GateKey,
  createDefaultGates 
} from '@/types';

// ============================================
// Metrics Calculation
// ============================================

export interface BomItemForMetrics {
  id: string;
  partNumber: string;
  hasContractPrice?: boolean;
  hasQuote?: boolean;
  leadTimeDays?: number;
  status?: string;
}

/**
 * Calculate BOM confidence based on items with pricing
 * bomConfidence = (itemsWithContractPrice + itemsWithQuote) / totalItems * 100
 */
export function calculateBomConfidence(items: BomItemForMetrics[]): number {
  if (items.length === 0) return 0;
  
  const itemsWithPricing = items.filter(
    item => item.hasContractPrice || item.hasQuote
  ).length;
  
  return (itemsWithPricing / items.length) * 100;
}

/**
 * Calculate risk level based on parts at risk percentage
 */
export function calculateRiskLevel(partsAtRisk: number, totalParts: number): ProjectMetrics['riskLevel'] {
  if (totalParts === 0) return 'low';
  
  const atRiskPercentage = (partsAtRisk / totalParts) * 100;
  
  if (atRiskPercentage > 20) return 'critical';
  if (atRiskPercentage > 10) return 'high';
  if (atRiskPercentage > 5) return 'medium';
  return 'low';
}

/**
 * Determine if a part is "at risk" based on lead time and gate dates
 */
export function isPartAtRisk(
  item: BomItemForMetrics, 
  nextGateDate?: Date
): boolean {
  // If no gate date, can't determine risk based on timing
  if (!nextGateDate) return false;
  
  // If no lead time data, assume some risk
  if (!item.leadTimeDays) return false;
  
  const today = new Date();
  const daysUntilGate = Math.ceil((nextGateDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Part is at risk if lead time exceeds days until gate
  return item.leadTimeDays > daysUntilGate;
}

/**
 * Calculate parts on track vs at risk
 */
export function calculatePartsRisk(
  items: BomItemForMetrics[],
  nextGateDate?: Date
): { partsOnTrack: number; partsAtRisk: number } {
  if (!nextGateDate) {
    return { partsOnTrack: items.length, partsAtRisk: 0 };
  }

  let partsAtRisk = 0;
  let partsOnTrack = 0;

  for (const item of items) {
    if (isPartAtRisk(item, nextGateDate)) {
      partsAtRisk++;
    } else {
      partsOnTrack++;
    }
  }

  return { partsOnTrack, partsAtRisk };
}

/**
 * Calculate sprint readiness (% of parts ready for sprint production)
 */
export function calculateSprintReadiness(items: BomItemForMetrics[], sprintDate?: Date): number {
  if (items.length === 0) return 100;
  if (!sprintDate) return 0;
  
  const readyParts = items.filter(item => !isPartAtRisk(item, sprintDate)).length;
  return (readyParts / items.length) * 100;
}

/**
 * Calculate mass production readiness
 */
export function calculateMassProductionReadiness(items: BomItemForMetrics[], massProdDate?: Date): number {
  if (items.length === 0) return 100;
  if (!massProdDate) return 0;
  
  const readyParts = items.filter(item => !isPartAtRisk(item, massProdDate)).length;
  return (readyParts / items.length) * 100;
}

/**
 * Get the next upcoming gate (in_progress or first not_started)
 */
export function getNextGate(gates: ProjectGates): { key: GateKey; gate: ProjectGate } | null {
  const gateOrder: GateKey[] = ['briefed', 'dti', 'da', 'dtx', 'sprint', 'dtl', 'massProduction', 'dtc'];
  
  // First check for in_progress
  for (const key of gateOrder) {
    if (gates[key].status === 'in_progress') {
      return { key, gate: gates[key] };
    }
  }
  
  // Then find first not_started
  for (const key of gateOrder) {
    if (gates[key].status === 'not_started') {
      return { key, gate: gates[key] };
    }
  }
  
  return null;
}

/**
 * Calculate all project metrics from BOM items and gates
 */
export function calculateProjectMetrics(
  items: BomItemForMetrics[],
  gates: ProjectGates
): ProjectMetrics {
  const nextGate = getNextGate(gates);
  const nextGateDate = nextGate?.gate.date?.toDate?.();
  const sprintDate = gates.sprint.date?.toDate?.();
  const massProdDate = gates.massProduction.date?.toDate?.();

  const bomConfidence = calculateBomConfidence(items);
  const { partsOnTrack, partsAtRisk } = calculatePartsRisk(items, nextGateDate);
  const riskLevel = calculateRiskLevel(partsAtRisk, items.length);
  const sprintReadiness = calculateSprintReadiness(items, sprintDate);
  const massProductionReadiness = calculateMassProductionReadiness(items, massProdDate);

  return {
    bomConfidence,
    riskLevel,
    partsAtRisk,
    partsOnTrack,
    sprintReadiness,
    massProductionReadiness,
  };
}

// ============================================
// Firestore Operations
// ============================================

/**
 * Get project gates, creating defaults if not present
 */
export async function getProjectGates(projectId: string): Promise<ProjectGates> {
  const projectRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);
  
  if (!projectSnap.exists()) {
    throw new Error(`Project ${projectId} not found`);
  }

  const project = projectSnap.data() as Project;
  return project.gates || createDefaultGates();
}

/**
 * Update project gates in Firestore
 */
export async function updateProjectGates(
  projectId: string, 
  gates: ProjectGates
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, {
    gates,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update a single gate
 */
export async function updateProjectGate(
  projectId: string,
  gateKey: GateKey,
  updates: Partial<ProjectGate>
): Promise<void> {
  const currentGates = await getProjectGates(projectId);
  const updatedGates = {
    ...currentGates,
    [gateKey]: {
      ...currentGates[gateKey],
      ...updates,
    },
  };
  await updateProjectGates(projectId, updatedGates);
}

/**
 * Update project metrics in Firestore
 */
export async function updateProjectMetrics(
  projectId: string, 
  metrics: ProjectMetrics
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, {
    metrics,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Fetch working BOM items for metrics calculation
 */
export async function fetchBomItemsForMetrics(projectId: string): Promise<BomItemForMetrics[]> {
  const workingBomRef = collection(db, 'projects', projectId, 'workingBom');
  const snapshot = await getDocs(query(workingBomRef));
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      partNumber: data.partNumber || '',
      hasContractPrice: !!data.contractPriceId || !!data.contractPrice,
      hasQuote: !!data.quoteId || !!data.quotedPrice,
      leadTimeDays: data.leadTimeDays,
      status: data.status,
    };
  });
}

/**
 * Recalculate and update all metrics for a project
 */
export async function refreshProjectMetrics(projectId: string): Promise<ProjectMetrics> {
  const [items, gates] = await Promise.all([
    fetchBomItemsForMetrics(projectId),
    getProjectGates(projectId),
  ]);

  const metrics = calculateProjectMetrics(items, gates);
  await updateProjectMetrics(projectId, metrics);
  
  return metrics;
}

/**
 * Initialize gates for a project if not present
 */
export async function initializeProjectGates(projectId: string): Promise<ProjectGates> {
  const projectRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);
  
  if (!projectSnap.exists()) {
    throw new Error(`Project ${projectId} not found`);
  }

  const project = projectSnap.data() as Project;
  
  if (project.gates) {
    return project.gates;
  }

  const defaultGates = createDefaultGates();
  await updateDoc(projectRef, {
    gates: defaultGates,
    updatedAt: Timestamp.now(),
  });

  return defaultGates;
}

// ============================================
// Gate Progress Utilities
// ============================================

/**
 * Calculate gate progress percentage
 */
export function calculateGateProgress(gates: ProjectGates): number {
  const gateKeys: GateKey[] = ['briefed', 'dti', 'da', 'dtx', 'sprint', 'dtl', 'massProduction', 'dtc'];
  const passedCount = gateKeys.filter(key => gates[key].status === 'passed').length;
  return (passedCount / gateKeys.length) * 100;
}

/**
 * Get current gate name for display
 */
export function getCurrentGateName(gates: ProjectGates): string {
  const nextGate = getNextGate(gates);
  if (!nextGate) return 'Complete';
  
  const gateNames: Record<GateKey, string> = {
    briefed: 'Briefed',
    dti: 'DTI',
    da: 'DA',
    dtx: 'DTX',
    sprint: 'Sprint',
    dtl: 'DTL',
    massProduction: 'Mass Prod',
    dtc: 'DTC',
  };
  
  return gateNames[nextGate.key];
}

/**
 * Get next gate date for display
 */
export function getNextGateDate(gates: ProjectGates): Date | null {
  const nextGate = getNextGate(gates);
  return nextGate?.gate.date?.toDate?.() || null;
}



