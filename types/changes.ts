import { Timestamp } from 'firebase/firestore';

/**
 * Phase 14: Cell-Level Change Tracking Types
 * 
 * These types support granular change history at the cell level,
 * enabling "who changed what, when, and why" tracking for every field.
 */

// ============================================
// CHANGE RECORD
// ============================================

/**
 * Type of change that triggered the record
 */
export type ChangeType = 
  | 'manual'      // User edited directly in UI
  | 'import'      // Value came from CSV/file import
  | 'sync'        // Synced from master data (vendor prices, etc.)
  | 'calculated'  // Auto-calculated from other fields
  | 'override'    // User overrode a calculated/master value
  | 'bulk'        // Part of a bulk edit operation
  | 'revert';     // Reverted to previous value

/**
 * ChangeRecord - Tracks a single field change on a BOM item
 * Stored in: projects/{projectId}/changeRecords/{recordId}
 * 
 * This provides cell-level history, allowing users to see:
 * - What the previous value was
 * - Who changed it and when
 * - Why it was changed (optional reason)
 * - Whether it was part of a batch operation
 */
export interface ChangeRecord {
  id: string;
  projectId: string;
  
  // What was changed
  itemId: string;                    // BomItem ID
  itemCode: string;                  // Denormalized for display
  itemDescription?: string;          // Denormalized for display
  field: string;                     // Field name that changed (e.g., 'materialCost')
  fieldDisplayName?: string;         // Human-readable name (e.g., 'Material Cost')
  
  // The change
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  
  // Change context
  changeType: ChangeType;
  source?: string;                   // e.g., 'VendorContractPrices.csv', 'Acme Corp Quote'
  reason?: string;                   // User-provided reason for the change
  
  // Who/When
  changedBy: string;                 // User ID
  changedByName?: string;            // Denormalized display name
  changedAt: Timestamp;
  
  // Grouping for batch operations
  batchId?: string;                  // Groups related changes together
  batchDescription?: string;         // e.g., 'Bulk price update from Q1 contracts'
  
  // Version reference (if change triggered a version)
  versionId?: string;
  versionNumber?: number;
}

// ============================================
// BATCH CHANGE
// ============================================

/**
 * BatchChange - Groups multiple ChangeRecords from a single operation
 * Stored in: projects/{projectId}/changeBatches/{batchId}
 */
export interface ChangeBatch {
  id: string;
  projectId: string;
  
  // Batch info
  description: string;               // e.g., 'Applied vendor prices from Acme Corp'
  changeType: ChangeType;
  
  // Summary
  itemCount: number;                 // How many items affected
  fieldCount: number;                // How many unique fields changed
  totalChanges: number;              // Total ChangeRecord count
  
  // Source info
  source?: string;                   // e.g., 'Import', 'Bulk Edit Dialog'
  sourceFile?: string;               // If from import
  
  // Who/When
  createdBy: string;
  createdByName?: string;
  createdAt: Timestamp;
  
  // Version reference
  versionId?: string;
  versionNumber?: number;
}

// ============================================
// FIELD HISTORY QUERY RESULT
// ============================================

/**
 * Result type for querying history of a specific field
 */
export interface FieldHistory {
  itemId: string;
  itemCode: string;
  field: string;
  fieldDisplayName: string;
  currentValue: string | number | boolean | null;
  changes: ChangeRecord[];
  totalChanges: number;
}

/**
 * Result type for querying all changes to an item
 */
export interface ItemHistory {
  itemId: string;
  itemCode: string;
  itemDescription: string;
  groupCode: string;
  changes: ChangeRecord[];
  totalChanges: number;
  changedFields: string[];           // List of fields that have been modified
  lastModifiedAt?: Timestamp;
  lastModifiedBy?: string;
}

// ============================================
// CHANGE SUMMARY
// ============================================

/**
 * Summary of changes for display in UI
 */
export interface ChangeSummary {
  projectId: string;
  
  // Time range
  fromDate: Timestamp;
  toDate: Timestamp;
  
  // Counts
  totalChanges: number;
  itemsAffected: number;
  
  // Breakdown by type
  byChangeType: {
    type: ChangeType;
    count: number;
  }[];
  
  // Breakdown by field (top 10)
  byField: {
    field: string;
    fieldDisplayName: string;
    count: number;
  }[];
  
  // Top changers
  byUser: {
    userId: string;
    userName: string;
    count: number;
  }[];
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Input for creating a change record
 */
export interface CreateChangeRecordInput {
  projectId: string;
  itemId: string;
  itemCode: string;
  itemDescription?: string;
  field: string;
  fieldDisplayName?: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  changeType: ChangeType;
  source?: string;
  reason?: string;
  batchId?: string;
}

/**
 * Filters for querying change records
 */
export interface ChangeRecordFilters {
  projectId: string;
  itemId?: string;
  field?: string;
  changeType?: ChangeType;
  changedBy?: string;
  fromDate?: Timestamp;
  toDate?: Timestamp;
  batchId?: string;
  limit?: number;
}
