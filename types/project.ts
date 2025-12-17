import { Timestamp } from 'firebase/firestore';

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

