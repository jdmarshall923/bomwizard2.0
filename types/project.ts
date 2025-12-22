import { Timestamp } from 'firebase/firestore';

// ============================================
// PACE Gates Types
// ============================================

export type GateStatus = 'not_started' | 'in_progress' | 'passed' | 'failed' | 'skipped';

export type GateKey = 'briefed' | 'dti' | 'da' | 'dtx' | 'sprint' | 'dtl' | 'massProduction' | 'dtc';

export interface ProjectGate {
  date?: Timestamp;        // Target date for this gate
  status: GateStatus;
  completedAt?: Timestamp; // When gate was passed
  notes?: string;
}

export interface ProjectGates {
  briefed: ProjectGate;
  dti: ProjectGate;
  da: ProjectGate;
  dtx: ProjectGate;
  sprint: ProjectGate;
  dtl: ProjectGate;
  massProduction: ProjectGate;
  dtc: ProjectGate;
}

export interface ProjectMetrics {
  bomConfidence: number;          // 0-100 percentage
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  partsAtRisk: number;            // Parts that won't arrive in time
  partsOnTrack: number;
  sprintReadiness: number;        // 0-100 % ready for sprint
  massProductionReadiness: number; // 0-100 % ready for mass prod
}

export interface GateMeta {
  key: GateKey;
  name: string;
  fullName: string;
  description: string;
}

export const GATE_METADATA: GateMeta[] = [
  { key: 'briefed', name: 'Briefed', fullName: 'Project Briefed', description: 'Initial project brief approved' },
  { key: 'dti', name: 'DTI', fullName: 'Decision to Initiate', description: 'Go/no-go for project start' },
  { key: 'da', name: 'DA', fullName: 'Design Approval', description: 'Design pens down, drawings complete' },
  { key: 'dtx', name: 'DTX', fullName: 'Decision to Execute', description: 'Approve for production preparation' },
  { key: 'sprint', name: 'Sprint', fullName: 'Sprint MRD', description: 'Test/sprint production run date' },
  { key: 'dtl', name: 'DTL', fullName: 'Decision to Launch', description: 'Final approval for mass production' },
  { key: 'massProduction', name: 'Mass Prod', fullName: 'Mass Production', description: 'Full production start date' },
  { key: 'dtc', name: 'DTC', fullName: 'Decision to Close', description: 'Project closure and handover' },
];

/**
 * Create default gates with all statuses set to not_started
 */
export function createDefaultGates(): ProjectGates {
  return {
    briefed: { status: 'not_started' },
    dti: { status: 'not_started' },
    da: { status: 'not_started' },
    dtx: { status: 'not_started' },
    sprint: { status: 'not_started' },
    dtl: { status: 'not_started' },
    massProduction: { status: 'not_started' },
    dtc: { status: 'not_started' },
  };
}

// ============================================
// Project Types
// ============================================

export interface Project {
  id: string;
  code: string; // e.g., "PROJ-2024-001"
  name: string; // e.g., "New Product Line 2024"
  description?: string;
  status: 'active' | 'archived' | 'draft';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // User UID
  
  // Template BOM tracking
  hasTemplateBom: boolean; // Has a template BOM been imported?
  templateBomImportId?: string; // ID of the import that created the template
  templateBomImportedAt?: Timestamp; // When template was imported
  templateBomItemCount?: number; // Number of items in template
  templateBomGroupCount?: number; // Number of groups in template
  
  // Working BOM tracking
  hasWorkingBom: boolean; // Has a working BOM been created from template?
  workingBomCreatedAt?: Timestamp; // When working BOM was created
  workingBomItemCount?: number; // Number of items in working BOM
  
  // Global template reference (if created from global template)
  globalTemplateId?: string; // Reference to global template if used
  
  metadata?: {
    targetCost?: number;
    gate?: string;
    [key: string]: any;
  };
  
  // PACE Gates (Phase 10.15)
  gates?: ProjectGates;
  metrics?: ProjectMetrics;
}

/**
 * Global Template - Shared across projects
 * Stored in: globalTemplates/{templateId}
 */
export interface GlobalTemplate {
  id: string;
  name: string;
  description?: string;
  sourceProjectId?: string; // Project it was saved from (if any)
  sourceSystem: 'infor' | 'manual' | 'api';
  itemCount: number;
  assemblyCount: number;
  
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastUsedAt?: Timestamp;
  usageCount: number; // How many projects have used this template
}

