import { Timestamp } from 'firebase/firestore';

/**
 * Running Change - Continuous improvement change that affects B-codes
 * A running change indicates that a B-code in a BOM should change after a certain date (Go Live).
 * 
 * Stored in: /runningChanges/{changeId}
 */
export interface RunningChange {
  id: string;
  
  // ============================================
  // FROM CSV IMPORT
  // ============================================
  
  /** CN Number - unique identifier for the change */
  cnNumber: string;
  
  /** CN Description - what the change is about */
  cnDescription: string;
  
  /** Who - person responsible for the change */
  owner: string;
  
  /** Assignee - person assigned to implement the change */
  assignee: string;
  
  /** Estimated GO LIVE date - when the change takes effect */
  estimatedGoLiveDate: Timestamp;
  
  /** Affected Line - production lines affected (X, Y, etc.) */
  affectedLine: string;
  
  /** Old B-codes - the B-codes being replaced (can be multiple) */
  oldBCodes: string[];
  
  /** New B-codes - the replacement B-codes (can be multiple) */
  newBCodes: string[];
  
  /** Current status description - free text status */
  statusDescription: string;
  
  /** Change Type - Running, etc. */
  changeType: string;
  
  /** NPI/CMS - whether this is NPI or CMS */
  npiOrCms: 'NPI' | 'CMS' | string;
  
  /** Project Code - optional project code from CSV */
  projectCode?: string;
  
  /** Team - optional team name */
  team?: string;
  
  /** Projects Affected - "Project is affects" column, free text */
  projectsAffected?: string;
  
  /** B-codes changing - original column value (informational) */
  bCodesChanging?: string;
  
  // ============================================
  // METADATA
  // ============================================
  
  /** When this running change was imported */
  importedAt: Timestamp;
  
  /** User ID who imported this change */
  importedBy: string;
  
  /** Last update timestamp */
  updatedAt: Timestamp;
  
  /** Whether this change is still active */
  isActive: boolean;
  
  /** Original filename this was imported from */
  sourceFilename?: string;
}

/**
 * Result of importing running changes
 */
export interface RunningChangeImportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors?: string[];
}

/**
 * An item in the BOM that is affected by a running change
 */
export interface AffectedBomItem {
  /** The BOM item that matches */
  bomItemId: string;
  bomItemCode: string;
  bomItemDescription: string;
  groupCode: string;
  quantity: number;
  
  /** The running change that affects it */
  runningChangeId: string;
  cnNumber: string;
  cnDescription: string;
  
  /** The specific B-code match */
  oldBCode: string;
  newBCode: string;
  
  /** Go-live information */
  goLiveDate: Date;
  isLive: boolean;           // go-live date has passed
  isAfterDtx: boolean;       // go-live date is after project DTx
  daysUntilGoLive: number;   // negative if already live
  
  /** Additional context */
  owner: string;
  assignee: string;
  statusDescription: string;
}

/**
 * Summary stats for running changes
 */
export interface RunningChangeStats {
  total: number;
  active: number;
  upcoming: number;      // go-live date in future
  live: number;          // go-live date has passed
  uniqueOldBCodes: number;
  uniqueNewBCodes: number;
}
