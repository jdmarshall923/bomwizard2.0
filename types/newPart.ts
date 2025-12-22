import { Timestamp } from 'firebase/firestore';

/**
 * NewPart Interface - Phase 10.5: PPL Replacement
 * 
 * Complete rebuild for procurement management with full PPL parity (54 fields).
 * Designed to handle 500+ parts for a completely new bike project.
 * 
 * Core Workflow:
 * - DTX = Order Trigger - Everything gets ordered when DTX gate is passed
 * - Exceptions - Long lead time parts flagged for early ordering
 * - Bulk Management - Efficiently work through hundreds of parts
 * - Visual Planning - Timeline view to verify parts arrive before Sprint/Mass Prod gates
 * 
 * Stored in: projects/{projectId}/newParts/{newPartId}
 */
export interface NewPart {
  id: string;
  projectId: string;
  bomItemId?: string;
  
  // ============================================
  // IDENTIFICATION
  // ============================================
  placeholderCode: string;        // Bxxx001
  finalItemCode?: string;         // B184398 (when assigned)
  description: string;
  groupCode?: string;             // Optional - if empty, goes to Unassigned
  category?: string;              // Fork, Frame, etc.
  
  // ============================================
  // DRAWING & DESIGN (Product Coordinator)
  // ============================================
  drawingNumber?: string;         // "283928" incl. variant
  drawingRevision?: string;       // PDM revision
  drawingWorkflowState?: 'not_started' | 'in_progress' | 'in_review' | 'released';
  pdfRevision?: string;
  drawingReleaseDeadline?: Timestamp;  // CnO approval deadline
  
  // ============================================
  // ERP SYNC STATUS
  // ============================================
  inInfor: boolean;               // Is it in ERP?
  inforRevision?: string;         // ERP item revision
  inforLeadTimeDays?: number;     // Lead time from ERP lookup
  
  // ============================================
  // ASSIGNMENTS
  // ============================================
  projectCoordinator?: string;    // Owner
  buyer?: string;                 // Purchasing assignee
  sqe?: string;                   // Quality assignee
  designEngineer?: string;        // Design owner
  
  // ============================================
  // WORKFLOW STATUS
  // ============================================
  status: NewPartStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // ============================================
  // VENDOR & SOURCING (Category Buying)
  // ============================================
  vendorCode?: string;
  vendorName?: string;
  isOemPart?: boolean;
  oemPartNumber?: string;         // Supplier model ref
  countryOfOrigin?: string;
  isNewSupplier?: boolean;
  factoryLocation?: string;       // Unit 1 Factory
  
  // ============================================
  // PRICING (Category Buying)
  // ============================================
  quotedPrice?: number;
  currency?: string;              // USD, GBP, EUR
  costSource?: 'placeholder' | 'estimate' | 'quote' | 'contract';
  quotationRequested?: boolean;
  
  // ============================================
  // LEAD TIMES
  // ============================================
  productionLeadTimeWeeks?: string;  // Free text "39 weeks sea, 28 air"
  baseLeadTimeDays?: number;
  seaFreightDays: number;            // Default: 35
  airFreightDays: number;            // Default: 5
  freightType?: 'sea' | 'air';
  poReleaseDeadline?: Timestamp;
  
  // ============================================
  // QUANTITIES (Planning)
  // ============================================
  quantity: number;                  // BOM quantity
  sprintQuantity?: number;
  massProductionQuantity?: number;
  paForecast?: number;               // P&A / Warranty
  scrapRate?: number;                // e.g., 0.04 = 4%
  totalProductionQty?: number;       // Calculated field
  
  // ============================================
  // SPRINT ORDER (Product Coordinator)
  // ============================================
  sprintTargetDate?: Timestamp;      // Stock in plant target
  sprintPoNumber?: string;
  sprintPoDate?: Timestamp;          // PO due date
  sprintPoLate?: boolean;            // Calculated: is PO late?
  sprintReceived?: boolean;
  sprintReceivedQty?: number;
  sprintQtyOutstanding?: number;
  
  // ============================================
  // PRODUCTION ORDER (Product Coordinator)
  // ============================================
  productionTargetDate?: Timestamp;  // MRD target date
  productionPoNumber?: string;
  productionPoDate?: Timestamp;
  productionPoLate?: boolean;        // Calculated: is PO late?
  productionReceived?: boolean;
  productionReceivedQty?: number;
  productionQtyOutstanding?: number;
  
  // ============================================
  // NOTES & COMMENTS
  // ============================================
  comments?: string;                 // Dated comments like PPL
  toolingCommitment?: string;        // Financial commitments
  
  // ============================================
  // FLAGS
  // ============================================
  isColorTouchpoint?: boolean;
  orderTogether?: boolean;           // Order Sprint + Prod together
  
  // ============================================
  // FORECASTS (Planning)
  // ============================================
  yearlyForecasts?: {
    year1?: number;
    year2?: number;
    year3?: number;
    year4?: number;
  };
  
  // ============================================
  // METADATA
  // ============================================
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  importedFromPpl?: boolean;
  lastPplSync?: Timestamp;
  
  // ============================================
  // LEGACY FIELDS (for backward compatibility)
  // ============================================
  requestedBy?: string;        // User who flagged it (legacy)
  requestedAt?: Timestamp;     // (legacy)
  requestNotes?: string;       // (legacy)
  
  // Design phase (legacy)
  designStatus?: 'not_started' | 'in_progress' | 'complete';
  designNotes?: string;
  designCompletedAt?: Timestamp;
  
  // Engineering phase (legacy)
  engineeringStatus?: 'not_started' | 'in_progress' | 'approved' | 'rejected';
  engineeringNotes?: string;
  engineeringApprovedBy?: string;
  engineeringApprovedAt?: Timestamp;
  
  // Procurement phase (legacy)
  procurementStatus?: 'not_started' | 'rfq_sent' | 'quoted' | 'ordered' | 'received';
  quotedCurrency?: string;
  quotedMoq?: number;
  quotedLeadTimeDays?: number;
  poNumber?: string;
  procurementNotes?: string;
  
  // Completion (legacy)
  finalUnitPrice?: number;
  landingPct?: number;
  completedAt?: Timestamp;
  completedBy?: string;
}

/**
 * New Part Status - tracks through design and procurement lifecycle
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
 * Early Order Check - for parts with long lead times
 */
export interface EarlyOrderCheck {
  needsEarlyOrder: boolean;
  mustOrderBy: Date;
  reason: string;
}

/**
 * Sprint/Production Order Status
 */
export type OrderStatus = 'not_ordered' | 'ordered' | 'late' | 'received';

/**
 * Order Status Info for display
 */
export interface OrderStatusInfo {
  status: OrderStatus;
  label: string;
  icon: 'none' | 'check' | 'warning' | 'received';
  color: string;
  tooltip?: string;
}

/**
 * NewPart summary for list views (unchanged from original)
 */
export interface NewPartSummary {
  id: string;
  placeholderCode: string;
  description: string;
  groupCode?: string;
  status: NewPartStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Timestamp;
  finalItemCode?: string;
}

/**
 * Statistics for new parts dashboard (updated for PPL)
 */
export interface NewPartStats {
  total: number;
  byStatus: Record<NewPartStatus, number>;
  byPriority: Record<'low' | 'medium' | 'high' | 'critical', number>;
  completedThisWeek: number;
  overdue: number;
  
  // New PPL-specific stats
  ordered: number;             // Parts with PO placed
  sprintAtRisk: number;        // Sprint parts at risk
  sprintLate: number;          // Sprint PO late
  productionAtRisk: number;    // Production parts at risk  
  productionLate: number;      // Production PO late
  missingInfo: number;         // Parts missing vendor/lead time/PO
  longLeadTime: number;        // Parts needing early order
  unassigned: number;          // Parts without a group
}

/**
 * Grouped parts for table view
 */
export interface GroupedParts {
  groupCode: string;
  groupDescription?: string;
  parts: NewPart[];
  atRiskCount: number;
  lateCount: number;
  isExpanded: boolean;
}

/**
 * Column configuration for table
 */
export interface ColumnConfig {
  id: string;
  label: string;
  group: 'basic' | 'drawing' | 'assignments' | 'pricing' | 'sprint' | 'production' | 'planning';
  width: number;
  isVisible: boolean;
  sortable?: boolean;
}

/**
 * PPL Import Result
 */
export interface PplImportResult {
  created: number;
  updated: number;
  unassigned: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * PPL Column Mapping
 */
export interface PplColumnMapping {
  pplColumn: string;
  newPartField: keyof NewPart;
  transform?: (value: string) => unknown;
}

/**
 * Default values for new parts
 */
export const NEW_PART_DEFAULTS: Partial<NewPart> = {
  status: 'added',
  priority: 'medium',
  inInfor: false,
  seaFreightDays: 35,
  airFreightDays: 5,
  freightType: 'sea',
  quantity: 1,
};

/**
 * Default column configuration
 */
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'placeholderCode', label: 'Part', group: 'basic', width: 100, isVisible: true, sortable: true },
  { id: 'description', label: 'Description', group: 'basic', width: 200, isVisible: true, sortable: true },
  { id: 'status', label: 'Status', group: 'basic', width: 100, isVisible: true, sortable: true },
  { id: 'vendorName', label: 'Vendor', group: 'basic', width: 120, isVisible: true, sortable: true },
  { id: 'baseLeadTimeDays', label: 'Lead', group: 'basic', width: 60, isVisible: true, sortable: true },
  { id: 'freightType', label: 'Freight', group: 'basic', width: 60, isVisible: true },
  { id: 'sprintStatus', label: 'Sprint', group: 'sprint', width: 80, isVisible: true },
  { id: 'productionStatus', label: 'Prod', group: 'production', width: 80, isVisible: true },
  { id: 'finalItemCode', label: 'Final Code', group: 'basic', width: 100, isVisible: true },
  
  // Drawing columns
  { id: 'drawingNumber', label: 'Drawing #', group: 'drawing', width: 100, isVisible: false },
  { id: 'drawingRevision', label: 'Rev', group: 'drawing', width: 50, isVisible: false },
  { id: 'drawingWorkflowState', label: 'Workflow', group: 'drawing', width: 100, isVisible: false },
  { id: 'pdfRevision', label: 'PDF Rev', group: 'drawing', width: 60, isVisible: false },
  
  // Assignment columns
  { id: 'projectCoordinator', label: 'Coordinator', group: 'assignments', width: 100, isVisible: false },
  { id: 'buyer', label: 'Buyer', group: 'assignments', width: 100, isVisible: false },
  { id: 'sqe', label: 'SQE', group: 'assignments', width: 100, isVisible: false },
  { id: 'designEngineer', label: 'Designer', group: 'assignments', width: 100, isVisible: false },
  
  // Pricing columns
  { id: 'quotedPrice', label: 'Price', group: 'pricing', width: 80, isVisible: false, sortable: true },
  { id: 'currency', label: 'Currency', group: 'pricing', width: 60, isVisible: false },
  { id: 'costSource', label: 'Source', group: 'pricing', width: 80, isVisible: false },
  
  // Sprint columns
  { id: 'sprintQuantity', label: 'Sprint Qty', group: 'sprint', width: 80, isVisible: false },
  { id: 'sprintTargetDate', label: 'Sprint Target', group: 'sprint', width: 100, isVisible: false },
  { id: 'sprintPoNumber', label: 'Sprint PO', group: 'sprint', width: 100, isVisible: false },
  { id: 'sprintReceivedQty', label: 'Sprint Rcvd', group: 'sprint', width: 80, isVisible: false },
  
  // Production columns
  { id: 'massProductionQuantity', label: 'Prod Qty', group: 'production', width: 80, isVisible: false },
  { id: 'productionTargetDate', label: 'Prod Target', group: 'production', width: 100, isVisible: false },
  { id: 'productionPoNumber', label: 'Prod PO', group: 'production', width: 100, isVisible: false },
  { id: 'productionReceivedQty', label: 'Prod Rcvd', group: 'production', width: 80, isVisible: false },
  
  // Planning columns
  { id: 'paForecast', label: 'P&A Forecast', group: 'planning', width: 80, isVisible: false },
  { id: 'scrapRate', label: 'Scrap %', group: 'planning', width: 60, isVisible: false },
  { id: 'totalProductionQty', label: 'Total Qty', group: 'planning', width: 80, isVisible: false },
];
