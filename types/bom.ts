import { Timestamp } from 'firebase/firestore';

export interface Assembly {
  id: string;
  code: string; // e.g., "GMF-0130-A02"
  description: string;
  assemblyType: 'standard' | 'bco'; // bco = country compliance
  weighting: number; // Product mix % (0-1)
  isActive: boolean;
  createdAt: Timestamp;
}

export interface Item {
  id: string;
  code: string; // e.g., "B103985"
  description: string;
  drawingNumber?: string;
  revision?: string;
  isManufactured: boolean;
  isPlaceholder: boolean; // Items without complete B code (B + 6 digits)
  buyer?: string;
  weightKg?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * BOM Group - Configuration option within a template BOM
 * Groups represent different variants (e.g., Standard vs Extended seat)
 * Stored in: projects/{projectId}/templateGroups/{groupId}
 */
export interface BomGroup {
  id: string;
  groupCode: string;           // e.g., "GRP-SEAT-A01"
  description: string;         // e.g., "Seat Post Assembly"
  groupType: 'assembly' | 'option' | 'variant';
  category?: string;           // e.g., "Seating", "Drivetrain", "Frame"
  isStandard: boolean;         // Is this the default option in its category?
  
  // Metadata from import
  itemCount: number;           // Number of items in this group
  maxLevel: number;            // Deepest nesting level (0, 1, 2, 3...)
  
  // Import reference
  importId?: string;
  importedAt?: Timestamp;
}

/**
 * Project Group Selection - Which groups are selected for this project
 * Stored in: projects/{projectId}/groupSelections/{selectionId}
 */
export interface ProjectGroupSelection {
  id: string;
  projectId: string;
  groupCode: string;
  groupDescription?: string;
  isSelected: boolean;
  
  // Split/mix tracking (for when multiple variants are used)
  splitPercentage?: number;    // e.g., 70 for 70%
  splitNote?: string;          // e.g., "70% extended, 30% standard"
  
  // Selection metadata
  selectedAt?: Timestamp;
  selectedBy?: string;
}

/**
 * Vendor Contract Price - Pricing data from Infor
 * Global reference data, matched to items by itemCode (BCode)
 * Stored in: vendorContractPrices/{priceId}
 */
export interface VendorContractPrice {
  id: string;
  
  // Keys for matching
  vendorCode: string;          // e.g., "V100001"
  vendorName: string;          // e.g., "Acme Fasteners Co"
  itemCode: string;            // B-code to match to BOM items
  
  // Price details
  unitPrice: number;
  currency: string;            // GBP, EUR, USD, JPY
  moq: number;                 // Minimum order quantity
  leadTimeDays: number;
  
  // Landing costs
  landingPct?: number;         // Landing percentage
  shipFromCountry?: string;
  
  // Contract validity
  status: 'active' | 'expired' | 'pending';
  effectiveDate?: Timestamp;
  expiryDate?: Timestamp;
  
  // Additional reference data
  drawingNumber?: string;
  description?: string;
  weightKg?: number;
  notes?: string;
  
  // Import metadata
  importId?: string;
  importedAt?: Timestamp;
}

/**
 * Item types in Infor BOM structure
 */
export type BomItemType = 
  | 'group'        // GRP-xxx top-level assembly
  | 'material'     // Regular purchased/manufactured part
  | 'manufactured' // G-code sub-assembly (made in-house)
  | 'check'        // CHECK-xxx quality/assembly checkpoint
  | 'substitute'   // SUB-xxx alternative part option
  | 'other';       // Other types

/**
 * New Part Status - tracks through design and procurement lifecycle
 * Used for items flagged as "New Part" during batch add
 * 
 * @deprecated Import NewPartStatus from '@/types/newPart' instead
 */
export type NewPartStatus = 
  | 'pending'        // Flagged as new part but not yet in tracker
  | 'added'          // In tracker, initial state
  | 'design'         // In design phase (drawings, specs)
  | 'engineering'    // Engineering review/approval
  | 'procurement'    // Getting quotes, ordering
  | 'complete'       // Final part code assigned, pricing confirmed
  | 'on_hold'        // Paused
  | 'cancelled';     // No longer needed

/**
 * Special group code for parts without a group assignment.
 * Parts imported from PPL or created without a group go here.
 * This is a system group that cannot be deleted or renamed.
 */
export const UNASSIGNED_GROUP_CODE = '__UNASSIGNED__';

/**
 * Unassigned group display info
 */
export const UNASSIGNED_GROUP_INFO = {
  code: UNASSIGNED_GROUP_CODE,
  description: 'Unassigned Parts',
  displayName: 'Unassigned',
  isSystemGroup: true,
};

/**
 * Item source (Purchased vs Manufactured)
 */
export type ItemSource = 'purchased' | 'manufactured';

/**
 * Template BOM Item - Imported from Infor, read-only reference
 * Contains full BOM structure with all configuration groups
 * Stored in: projects/{projectId}/templateBom/{itemId}
 */
export interface TemplateBomItem {
  id: string;
  
  // Hierarchy structure
  level: number;               // 0 = top assembly, 1, 2, 3, 4 for nesting
  groupCode: string;           // Parent group (GRP-xxx)
  parentItemCode?: string;     // Parent item code for nested items
  sequence: number;            // Order within parent
  
  // Item identification
  itemCode: string;            // B-code, G-code, GRP-code, etc.
  itemDescription: string;
  itemType: BomItemType;       // group, material, manufactured, check, substitute
  source: ItemSource;          // purchased or manufactured
  
  // Quantities
  quantity: number;
  unitOfMeasure: string;       // EA, KG, M, etc.
  per?: 'unit' | 'lot';
  
  // Reference data from import
  altGroup?: number;           // Alternate group number
  altGroupRank?: number;       // Rank within alternates
  revision?: string;
  stocked?: boolean;
  
  // Legacy fields (for backward compatibility)
  assemblyId?: string;
  assemblyCode?: string;
  itemId?: string;
  partCategory?: 'new_part' | 'existing_part';
  
  // Original costs from import (usually zero in BOM structure file)
  originalMaterialCost: number;
  originalLandingCost: number;
  originalLabourCost: number;
  originalExtendedCost: number;
  
  // Import metadata
  importId: string;
  importedAt: Timestamp;
  sourceSystem: 'infor' | 'manual' | 'api';
  sourceFilename?: string;
  rawRowData?: Record<string, unknown>;  // Original CSV row for reference
}

/**
 * Working BOM Item - Editable copy for cost building
 * Created from selected template groups, contains only chosen configurations
 * Stored in: projects/{projectId}/bomItems/{itemId}
 */
export interface BomItem {
  id: string;
  
  // Hierarchy structure (from template)
  level: number;               // 0, 1, 2, 3, 4...
  groupCode: string;           // Parent group (GRP-xxx)
  parentItemCode?: string;     // Parent item for nested items
  sequence: number;
  
  // Item identification
  itemCode: string;
  itemDescription: string;
  itemType: BomItemType;
  source: ItemSource;
  isPlaceholder: boolean;      // Items without complete B code (B + 6 digits, e.g., B123456)
  
  // Quantities
  quantity: number;
  unitOfMeasure: string;
  
  // Legacy fields (for backward compatibility)
  assemblyId?: string;
  assemblyCode?: string;
  itemId?: string;
  partCategory?: 'new_part' | 'existing_part';
  
  // Current costs (editable)
  materialCost: number;
  landingCost: number;
  labourCost: number;
  extendedCost: number;        // qty * (material + landing + labour)
  
  // Cost source tracking
  costSource: 'placeholder' | 'estimate' | 'quote' | 'contract';
  vendorId?: string;           // Legacy field
  quoteId?: string;
  contractPriceId?: string;    // Legacy field
  
  // Vendor Contract Price link (from VendorContractPrices.csv)
  vendorContractPriceId?: string;
  vendorCode?: string;
  vendorName?: string;
  currency?: string;
  moq?: number;                // Minimum order quantity
  leadTimeDays?: number;
  landingPct?: number;         // Landing percentage from contract
  contractStatus?: 'active' | 'expired' | 'pending';
  effectiveDate?: Timestamp;
  expiryDate?: Timestamp;
  
  // Template reference
  templateItemId?: string;     // ID of the TemplateBomItem this was created from
  isFromTemplate: boolean;     // Was this item created from a template?
  isAddedItem: boolean;        // Was this item added after template/group selection?
  isCustomGroup: boolean;      // Is this in a user-created group (not from template)?
  
  // Change tracking
  hasCostChange: boolean;
  hasQuantityChange: boolean;
  originalMaterialCost?: number;
  originalLandingCost?: number;
  originalLabourCost?: number;
  originalQuantity?: number;
  
  // Notes and flags
  notes?: string;
  isIncomplete?: boolean;      // Missing required fields
  
  // New Part tracking (Phase 3.7 - set during batch add)
  isNewPart: boolean;              // Flag: needs to go through design/procurement
  newPartStatus?: NewPartStatus;   // Current status in new part workflow
  newPartTrackerId?: string;       // Link to NewPart document (set by Phase 7)
  newPartAddedAt?: Timestamp;      // When flagged as new part
  finalItemCode?: string;          // Final B-code when part is complete
  
  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ============================================
// VERSION CONTROL TYPES (Phase 5)
// ============================================

/**
 * What triggered the version creation
 */
export type VersionTrigger = 
  | 'import'              // BOM imported from CSV
  | 'manual'              // User manually created snapshot
  | 'price_update'        // Vendor prices applied (bulk)
  | 'bulk_edit'           // Bulk changes made (10+ items)
  | 'transfer'            // Items transferred from template to working BOM
  | 'scheduled';          // Automatic scheduled snapshot

/**
 * Cost driver - WHY did the cost change?
 * Critical for cost analysis and reporting
 */
export type CostDriver = 
  | 'quantity_increase'
  | 'quantity_decrease'
  | 'material_price_increase'
  | 'material_price_decrease'
  | 'landing_rate_change'
  | 'labour_cost_change'
  | 'vendor_change'
  | 'price_source_change'    // e.g., placeholder → contract
  | 'new_item'
  | 'removed_item'
  | 'item_replacement'
  | 'bulk_adjustment'
  | 'currency_change'
  | 'other';

/**
 * Change type for item-level changes
 */
export type ChangeType = 'added' | 'removed' | 'modified' | 'replaced';

/**
 * Version summary - cost totals at a point in time
 */
export interface VersionSummary {
  // Item counts
  totalItems: number;
  totalAssemblies: number;
  
  // Cost totals
  totalMaterialCost: number;
  totalLandingCost: number;
  totalLabourCost: number;
  totalExtendedCost: number;
  
  // Item category counts
  newPartsCount: number;
  placeholdersCount: number;
  contractPricedCount: number;
  quotePricedCount: number;
  manualPricedCount: number;
  
  // Cost breakdown by source
  costBySource: {
    contract: number;
    quote: number;
    estimate: number;
    placeholder: number;
  };
  
  // Cost breakdown by assembly (top-level groups)
  costByAssembly: {
    groupCode: string;
    groupDescription?: string;
    totalCost: number;
    itemCount: number;
  }[];
}

/**
 * BOM Version - A snapshot of the BOM at a point in time
 * Stored in: projects/{projectId}/versions/{versionId}
 */
export interface BomVersion {
  id: string;
  projectId: string;
  
  // Version identification
  versionNumber: number;           // Sequential: 1, 2, 3...
  versionName?: string;            // Optional: "Initial Import", "Q1 Price Update"
  description?: string;            // Notes about this version
  
  // Snapshot timing
  createdAt: Timestamp;
  createdBy: string;               // User ID who created/triggered
  createdByName?: string;          // User display name (denormalized)
  
  // Trigger information - WHY was this version created?
  trigger: VersionTrigger;
  triggerDetails?: string;         // Additional context (e.g., "Imported from BOM_2024Q1.csv")
  
  // Cost summary at this point in time
  summary: VersionSummary;
  
  // Storage strategy for items
  // - 'subcollection': Items stored in versions/{id}/items/ (default for 100-1000 items)
  // - 'inline': Items embedded in this document (small BOMs <100 items)
  // - 'storage': Items stored in Cloud Storage JSON file (very large BOMs)
  itemsStorage: 'subcollection' | 'inline' | 'storage';
  itemsStoragePath?: string;       // Cloud Storage path if itemsStorage === 'storage'
  inlineItems?: VersionItem[];     // Items if itemsStorage === 'inline'
  
  // Reference to what triggered this version
  importId?: string;               // Import ID if trigger === 'import'
  previousVersionId?: string;      // Previous version (for diff reference)
}

/**
 * Version Item - Snapshot of an item's state at a version
 * Stored in: projects/{projectId}/versions/{versionId}/items/{itemId}
 */
export interface VersionItem {
  id: string;                      // Same as original BomItem ID for tracking
  
  // Item identity
  itemCode: string;
  itemDescription: string;
  groupCode: string;
  groupDescription?: string;
  itemType: BomItemType;
  source: ItemSource;
  
  // Hierarchy
  level: number;
  sequence: number;
  parentItemCode?: string;
  
  // Quantity and costs at this version
  quantity: number;
  unitOfMeasure: string;
  materialCost: number;
  landingCost: number;
  labourCost: number;
  unitCost: number;                // material + landing + labour
  extendedCost: number;            // unitCost * quantity
  
  // Price source information
  costSource: 'placeholder' | 'estimate' | 'quote' | 'contract';
  vendorCode?: string;
  vendorName?: string;
  contractPriceId?: string;
  landingPct?: number;
  
  // Status flags
  isPlaceholder: boolean;
  isNewPart: boolean;
  isAddedItem: boolean;
  isFromTemplate: boolean;
  
  // Original item reference
  bomItemId: string;               // Reference to original BomItem
  
  // Metadata
  lastModified?: Timestamp;
  lastModifiedBy?: string;
}

/**
 * Cost Impact - detailed breakdown of cost change
 */
export interface CostImpact {
  materialDelta: number;           // Change in material cost
  landingDelta: number;            // Change in landing cost
  labourDelta: number;             // Change in labour cost
  extendedDelta: number;           // Change in extended cost (total impact)
  percentageChange: number;        // % change (can be Infinity for new items)
}

/**
 * BOM Change - A single change between two versions
 * Stored in: projects/{projectId}/changes/{changeId}
 */
export interface BomChange {
  id: string;
  projectId: string;
  
  // Version references
  fromVersionId: string;
  toVersionId: string;
  fromVersionNumber: number;
  toVersionNumber: number;
  
  // Change detection timing
  detectedAt: Timestamp;
  
  // Change type
  changeType: ChangeType;
  
  // Item identification
  itemId: string;                  // Original BomItem ID
  itemCode: string;
  itemDescription: string;
  groupCode: string;
  groupDescription?: string;
  
  // What changed (for 'modified' changes)
  changedFields?: string[];        // e.g., ['quantity', 'materialCost']
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  
  // Cost impact - THE KEY DATA
  costImpact: CostImpact;
  
  // Root cause categorization
  costDriver: CostDriver;
  costDriverNote?: string;         // User-provided note/override
  costDriverAutoDetected: boolean; // Was this auto-detected or manual?
  
  // For vendor changes
  oldVendorCode?: string;
  oldVendorName?: string;
  newVendorCode?: string;
  newVendorName?: string;
  
  // For quantity changes
  oldQuantity?: number;
  newQuantity?: number;
  
  // For price source changes
  oldCostSource?: string;
  newCostSource?: string;
}

/**
 * Aggregated changes by cost driver
 */
export interface DriverAggregate {
  driver: CostDriver;
  driverLabel: string;             // Human-readable label
  itemCount: number;
  totalImpact: number;
  percentOfTotalChange: number;
  changes: BomChange[];            // Individual changes in this category
}

/**
 * Aggregated changes by assembly
 */
export interface AssemblyAggregate {
  groupCode: string;
  groupDescription?: string;
  itemCount: number;
  totalImpact: number;
  percentOfTotalChange: number;
  changes: BomChange[];
}

/**
 * Version Comparison - Full comparison between two versions
 * Can be cached in: projects/{projectId}/comparisons/{comparisonId}
 */
export interface VersionComparison {
  id: string;
  projectId: string;
  
  // Versions being compared
  baseVersionId: string;
  baseVersionNumber: number;
  baseVersionName?: string;
  baseVersionDate: Timestamp;
  
  compareVersionId: string;
  compareVersionNumber: number;
  compareVersionName?: string;
  compareVersionDate: Timestamp;
  
  // When comparison was generated
  generatedAt: Timestamp;
  
  // Overall cost summary
  costSummary: {
    baseTotalCost: number;
    compareTotalCost: number;
    absoluteChange: number;        // £ change
    percentageChange: number;      // % change
    
    // Breakdown by cost type
    materialChange: number;
    landingChange: number;
    labourChange: number;
  };
  
  // Changes grouped by driver (for charts!)
  changesByDriver: DriverAggregate[];
  
  // Changes grouped by assembly
  changesByAssembly: AssemblyAggregate[];
  
  // Top impactful changes (for highlighting)
  topIncreases: BomChange[];       // Top 10 cost increases
  topDecreases: BomChange[];       // Top 10 cost decreases
  
  // Item change counts
  itemsAdded: number;
  itemsRemoved: number;
  itemsModified: number;
  itemsUnchanged: number;
  
  // All changes (or reference to them)
  allChanges?: BomChange[];        // Inline for small comparisons
  changesCount: number;
}

/**
 * Version transition - summary of changes between consecutive versions
 */
export interface VersionTransition {
  fromVersion: BomVersion;
  toVersion: BomVersion;
  costChange: number;
  percentageChange: number;
  changeCount: number;
  summary: string;                 // Auto-generated summary text
  topDrivers: {
    driver: CostDriver;
    impact: number;
  }[];
}

/**
 * Date Range Comparison - comparison across a time period
 */
export interface DateRangeComparison {
  id: string;
  projectId: string;
  
  // Date range selected
  startDate: Timestamp;
  endDate: Timestamp;
  
  // Boundary versions
  startVersion: BomVersion;        // Version at/before start date
  endVersion: BomVersion;          // Version at/before end date
  
  // All versions within the range
  versionsInRange: BomVersion[];
  
  // Aggregated totals for full period
  totalCostChange: number;
  percentageChange: number;
  
  // Cost trend data (for line chart)
  costTrend: {
    date: Timestamp;
    versionNumber: number;
    versionName?: string;
    totalCost: number;
  }[];
  
  // Aggregated by driver across full period
  changesByDriver: DriverAggregate[];
  
  // Aggregated by assembly across full period
  changesByAssembly: AssemblyAggregate[];
  
  // Per-version breakdown
  versionTransitions: VersionTransition[];
  
  // When comparison was generated
  generatedAt: Timestamp;
}

// ============================================
// LEGACY TYPES (kept for backward compatibility)
// ============================================

export interface ManufacturingCost {
  id: string;
  itemId: string;
  itemCode: string; // Denormalized
  operationType: string; // assembly, brazing, welding, etc.
  factoryCode: string; // AFAC, BFAC, CFAC, etc.
  estimatedTimeMinutes?: number;
  actualTimeMinutes?: number;
  labourRatePerHour: number;
  costSource: 'estimated' | 'actual';
  effectiveDate: Timestamp;
  createdAt: Timestamp;
}

