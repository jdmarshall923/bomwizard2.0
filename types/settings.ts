import { Timestamp } from 'firebase/firestore';

/**
 * Phase 14: Column Settings & Visibility Types
 * 
 * Supports a hierarchical settings system:
 * Organization defaults → Project overrides → User preferences
 */

// ============================================
// COLUMN DEFINITIONS
// ============================================

/**
 * Column group identifiers
 */
export type ColumnGroupId = 
  | 'core'           // Always visible: itemCode, description, qty, level, sequence
  | 'identification' // partCategory, drawingNumber, revision, groupCode, P/M flag
  | 'costing'        // costSource, materialCost, landingCost, labourCost, extendedCost
  | 'vendor'         // vendorCode, vendorName, vendorLocalPrice, vendorCurrency, shipFromCountry
  | 'classification' // pdmWorkflowState, bikeCategory, bikeType, functionalCategory
  | 'weight'         // weightKg, weightExtended
  | 'reference';     // crcn, targetSwitchStatus

/**
 * Individual column definition
 */
export interface ColumnDefinition {
  id: string;                        // Field name in BomItem (e.g., 'materialCost')
  displayName: string;               // Human-readable name (e.g., 'Material Cost')
  shortName?: string;                // Abbreviated for narrow columns (e.g., 'Mat £')
  group: ColumnGroupId;              // Which group this column belongs to
  
  // Display properties
  width?: number;                    // Default width in pixels
  minWidth?: number;                 // Minimum width
  maxWidth?: number;                 // Maximum width
  align?: 'left' | 'center' | 'right';
  
  // Data properties
  dataType: 'string' | 'number' | 'currency' | 'percentage' | 'date' | 'boolean' | 'select';
  editable: boolean;                 // Can be edited inline
  calculated?: boolean;              // Is this a calculated field?
  calculatedFrom?: string[];         // Fields used in calculation
  
  // Formatting
  format?: string;                   // e.g., '£#,##0.00' for currency
  decimals?: number;                 // Decimal places for numbers
  prefix?: string;                   // e.g., '£' for currency
  suffix?: string;                   // e.g., 'kg' for weight
  
  // Cell behavior
  showOverrideIndicator?: boolean;   // Show orange dot when overridden
  showCommentIndicator?: boolean;    // Show comment icon when has comments
  
  // CCM column reference
  ccmColumn?: string;                // CCM spreadsheet column (A, B, C, etc.)
  ccmHeader?: string;                // Original CCM column header
}

/**
 * Column group definition
 */
export interface ColumnGroup {
  id: ColumnGroupId;
  displayName: string;
  description?: string;
  columns: string[];                 // Column IDs in this group
  defaultVisible: boolean;           // Visible by default
  alwaysVisible?: boolean;           // Cannot be hidden (core group)
  order: number;                     // Display order in toggle chips
}

// ============================================
// COLUMN CONFIGURATION (Static)
// ============================================

/**
 * All available columns with their definitions
 */
export const COLUMN_DEFINITIONS: Record<string, ColumnDefinition> = {
  // Core columns (always visible)
  itemCode: {
    id: 'itemCode',
    displayName: 'Item Code',
    shortName: 'B Code',
    group: 'core',
    dataType: 'string',
    editable: false,
    align: 'left',
    width: 120,
    ccmColumn: 'E',
    ccmHeader: 'Item',
  },
  itemDescription: {
    id: 'itemDescription',
    displayName: 'Description',
    shortName: 'Desc',
    group: 'core',
    dataType: 'string',
    editable: true,
    align: 'left',
    width: 250,
    minWidth: 150,
    ccmColumn: 'G',
    ccmHeader: 'Description',
  },
  quantity: {
    id: 'quantity',
    displayName: 'Quantity',
    shortName: 'Qty',
    group: 'core',
    dataType: 'number',
    editable: true,
    align: 'right',
    width: 80,
    decimals: 0,
    showOverrideIndicator: true,
    ccmColumn: 'H',
    ccmHeader: 'Qty per CPQ',
  },
  level: {
    id: 'level',
    displayName: 'Level',
    shortName: 'Lvl',
    group: 'core',
    dataType: 'number',
    editable: false,
    align: 'center',
    width: 60,
    ccmColumn: 'D',
    ccmHeader: 'Level',
  },
  sequence: {
    id: 'sequence',
    displayName: 'Sequence',
    shortName: 'Seq',
    group: 'core',
    dataType: 'number',
    editable: false,
    align: 'right',
    width: 80,
    ccmColumn: 'J',
    ccmHeader: 'Sequence',
  },
  
  // Identification columns
  partCategory: {
    id: 'partCategory',
    displayName: 'Part Category',
    shortName: 'Category',
    group: 'identification',
    dataType: 'string',
    editable: true,
    align: 'left',
    width: 120,
    ccmColumn: 'A',
    ccmHeader: 'Part category',
  },
  drawingNumber: {
    id: 'drawingNumber',
    displayName: 'Drawing Number',
    shortName: 'Drwg #',
    group: 'identification',
    dataType: 'string',
    editable: true,
    align: 'left',
    width: 120,
    ccmColumn: 'B',
    ccmHeader: 'Drawing Number',
  },
  revision: {
    id: 'revision',
    displayName: 'Revision',
    shortName: 'Rev',
    group: 'identification',
    dataType: 'string',
    editable: true,
    align: 'center',
    width: 60,
    ccmColumn: 'C',
    ccmHeader: 'Revision',
  },
  groupCode: {
    id: 'groupCode',
    displayName: 'Group Code',
    shortName: 'Group',
    group: 'identification',
    dataType: 'string',
    editable: false,
    align: 'left',
    width: 120,
    ccmColumn: 'F',
    ccmHeader: 'Part Group',
  },
  purchasedOrManufactured: {
    id: 'purchasedOrManufactured',
    displayName: 'P/M',
    shortName: 'P/M',
    group: 'identification',
    dataType: 'select',
    editable: true,
    align: 'center',
    width: 50,
    ccmColumn: 'I',
    ccmHeader: 'Purchased or Manufactured',
  },
  
  // Costing columns
  costSource: {
    id: 'costSource',
    displayName: 'Cost Source',
    shortName: 'Source',
    group: 'costing',
    dataType: 'select',
    editable: true,
    align: 'center',
    width: 100,
    ccmColumn: 'O',
    ccmHeader: 'Piece cost source',
  },
  materialCost: {
    id: 'materialCost',
    displayName: 'Material Cost',
    shortName: 'Mat £',
    group: 'costing',
    dataType: 'currency',
    editable: true,
    align: 'right',
    width: 100,
    decimals: 2,
    prefix: '£',
    showOverrideIndicator: true,
    showCommentIndicator: true,
    ccmColumn: 'T',
    ccmHeader: 'Material cost (£)',
  },
  materialCostExtended: {
    id: 'materialCostExtended',
    displayName: 'Material Ext',
    shortName: 'Mat Ext',
    group: 'costing',
    dataType: 'currency',
    editable: false,
    calculated: true,
    calculatedFrom: ['quantity', 'materialCost'],
    align: 'right',
    width: 100,
    decimals: 2,
    prefix: '£',
    ccmColumn: 'U',
    ccmHeader: 'Material cost (£) x Qty per CPQ',
  },
  landingCost: {
    id: 'landingCost',
    displayName: 'Landing Cost',
    shortName: 'Land £',
    group: 'costing',
    dataType: 'currency',
    editable: true,
    align: 'right',
    width: 100,
    decimals: 2,
    prefix: '£',
    showOverrideIndicator: true,
    showCommentIndicator: true,
    ccmColumn: 'V',
    ccmHeader: 'Landing cost (£)',
  },
  landingCostExtended: {
    id: 'landingCostExtended',
    displayName: 'Landing Ext',
    shortName: 'Land Ext',
    group: 'costing',
    dataType: 'currency',
    editable: false,
    calculated: true,
    calculatedFrom: ['quantity', 'landingCost'],
    align: 'right',
    width: 100,
    decimals: 2,
    prefix: '£',
    ccmColumn: 'W',
    ccmHeader: 'Qty per CPQ x Landing Cost (£)',
  },
  labourCost: {
    id: 'labourCost',
    displayName: 'Labour Cost',
    shortName: 'Lab £',
    group: 'costing',
    dataType: 'currency',
    editable: true,
    align: 'right',
    width: 100,
    decimals: 2,
    prefix: '£',
    showOverrideIndicator: true,
    showCommentIndicator: true,
    ccmColumn: 'X',
    ccmHeader: 'Labour cost (£)',
  },
  labourCostExtended: {
    id: 'labourCostExtended',
    displayName: 'Labour Ext',
    shortName: 'Lab Ext',
    group: 'costing',
    dataType: 'currency',
    editable: false,
    calculated: true,
    calculatedFrom: ['quantity', 'labourCost'],
    align: 'right',
    width: 100,
    decimals: 2,
    prefix: '£',
    ccmColumn: 'Y',
    ccmHeader: 'Labour cost (£) x Qty per CPQ',
  },
  extendedCost: {
    id: 'extendedCost',
    displayName: 'Extended Cost',
    shortName: 'Ext £',
    group: 'costing',
    dataType: 'currency',
    editable: false,
    calculated: true,
    calculatedFrom: ['quantity', 'materialCost', 'landingCost', 'labourCost'],
    align: 'right',
    width: 110,
    decimals: 2,
    prefix: '£',
  },
  
  // Vendor columns
  vendorCode: {
    id: 'vendorCode',
    displayName: 'Vendor Code',
    shortName: 'Vnd Code',
    group: 'vendor',
    dataType: 'string',
    editable: false,
    align: 'left',
    width: 100,
    ccmColumn: 'P',
    ccmHeader: 'Contract Vendor',
  },
  vendorName: {
    id: 'vendorName',
    displayName: 'Vendor Name',
    shortName: 'Vendor',
    group: 'vendor',
    dataType: 'string',
    editable: false,
    align: 'left',
    width: 150,
    ccmColumn: 'P',
    ccmHeader: 'Contract Vendor',
  },
  vendorLocalPrice: {
    id: 'vendorLocalPrice',
    displayName: 'Vendor Price (Local)',
    shortName: 'Vnd Price',
    group: 'vendor',
    dataType: 'currency',
    editable: false,
    align: 'right',
    width: 100,
    decimals: 2,
    ccmColumn: 'Q',
    ccmHeader: 'Vendor contract price local currency',
  },
  vendorCurrency: {
    id: 'vendorCurrency',
    displayName: 'Currency',
    shortName: 'Curr',
    group: 'vendor',
    dataType: 'string',
    editable: false,
    align: 'center',
    width: 60,
    ccmColumn: 'R',
    ccmHeader: 'Vendor local currency',
  },
  shipFromCountry: {
    id: 'shipFromCountry',
    displayName: 'Ship From',
    shortName: 'Ship From',
    group: 'vendor',
    dataType: 'string',
    editable: false,
    align: 'left',
    width: 100,
    ccmColumn: 'S',
    ccmHeader: 'Contract Vendor Ship from Country',
  },
  
  // Classification columns
  pdmWorkflowState: {
    id: 'pdmWorkflowState',
    displayName: 'PDM State',
    shortName: 'PDM',
    group: 'classification',
    dataType: 'string',
    editable: true,
    align: 'left',
    width: 100,
    ccmColumn: 'K',
    ccmHeader: 'PDM workflow state',
  },
  bikeCategory: {
    id: 'bikeCategory',
    displayName: 'Bike Category',
    shortName: 'Bike Cat',
    group: 'classification',
    dataType: 'string',
    editable: true,
    align: 'left',
    width: 120,
    ccmColumn: 'L',
    ccmHeader: 'Bike Category (for KPI)',
  },
  bikeType: {
    id: 'bikeType',
    displayName: 'Bike Type',
    shortName: 'Bike Type',
    group: 'classification',
    dataType: 'string',
    editable: true,
    align: 'left',
    width: 120,
    ccmColumn: 'M',
    ccmHeader: 'Bike Type (for CCM)',
  },
  functionalCategory: {
    id: 'functionalCategory',
    displayName: 'Functional Category',
    shortName: 'Func Cat',
    group: 'classification',
    dataType: 'string',
    editable: true,
    align: 'left',
    width: 140,
    ccmColumn: 'N',
    ccmHeader: 'Category (Functional systems)',
  },
  
  // Weight columns
  weightKg: {
    id: 'weightKg',
    displayName: 'Weight (kg)',
    shortName: 'Wt kg',
    group: 'weight',
    dataType: 'number',
    editable: true,
    align: 'right',
    width: 80,
    decimals: 3,
    suffix: ' kg',
    showOverrideIndicator: true,
    ccmColumn: 'Z',
    ccmHeader: 'Weight (kg)',
  },
  weightExtended: {
    id: 'weightExtended',
    displayName: 'Weight Ext (kg)',
    shortName: 'Wt Ext',
    group: 'weight',
    dataType: 'number',
    editable: false,
    calculated: true,
    calculatedFrom: ['quantity', 'weightKg'],
    align: 'right',
    width: 100,
    decimals: 3,
    suffix: ' kg',
    ccmColumn: 'AA',
    ccmHeader: 'Weight (kg) x Qty per CPQ',
  },
  
  // Reference columns
  crcn: {
    id: 'crcn',
    displayName: 'CRCN',
    shortName: 'CRCN',
    group: 'reference',
    dataType: 'string',
    editable: true,
    align: 'left',
    width: 100,
    ccmColumn: 'AB',
    ccmHeader: 'CRCN',
  },
  targetSwitchStatus: {
    id: 'targetSwitchStatus',
    displayName: 'Target Switch/Status',
    shortName: 'Switch',
    group: 'reference',
    dataType: 'string',
    editable: true,
    align: 'left',
    width: 120,
    ccmColumn: 'AC',
    ccmHeader: 'Target Switch/Status',
  },
};

/**
 * Column groups configuration
 */
export const COLUMN_GROUPS: ColumnGroup[] = [
  {
    id: 'core',
    displayName: 'Core',
    description: 'Essential item identification',
    columns: ['itemCode', 'itemDescription', 'quantity', 'level', 'sequence'],
    defaultVisible: true,
    alwaysVisible: true,
    order: 0,
  },
  {
    id: 'identification',
    displayName: 'ID & Drawing',
    description: 'Part category, drawing, revision',
    columns: ['partCategory', 'drawingNumber', 'revision', 'groupCode', 'purchasedOrManufactured'],
    defaultVisible: false,
    order: 1,
  },
  {
    id: 'costing',
    displayName: 'Costing',
    description: 'Material, landing, labour costs',
    columns: ['costSource', 'materialCost', 'materialCostExtended', 'landingCost', 'landingCostExtended', 'labourCost', 'labourCostExtended', 'extendedCost'],
    defaultVisible: true,
    order: 2,
  },
  {
    id: 'vendor',
    displayName: 'Vendor',
    description: 'Vendor and pricing info',
    columns: ['vendorCode', 'vendorName', 'vendorLocalPrice', 'vendorCurrency', 'shipFromCountry'],
    defaultVisible: false,
    order: 3,
  },
  {
    id: 'classification',
    displayName: 'Classification',
    description: 'PDM, bike type, categories',
    columns: ['pdmWorkflowState', 'bikeCategory', 'bikeType', 'functionalCategory'],
    defaultVisible: false,
    order: 4,
  },
  {
    id: 'weight',
    displayName: 'Weight',
    description: 'Weight in kg',
    columns: ['weightKg', 'weightExtended'],
    defaultVisible: false,
    order: 5,
  },
  {
    id: 'reference',
    displayName: 'Reference',
    description: 'CRCN, status flags',
    columns: ['crcn', 'targetSwitchStatus'],
    defaultVisible: false,
    order: 6,
  },
];

// ============================================
// SETTINGS TYPES
// ============================================

/**
 * Column visibility settings (which columns/groups are visible)
 */
export interface ColumnVisibilitySettings {
  // Group visibility (toggle chips)
  visibleGroups: ColumnGroupId[];
  
  // Individual column overrides (hide specific columns even if group is visible)
  hiddenColumns?: string[];
  
  // Column order override
  columnOrder?: string[];
}

/**
 * Saved view preset
 */
export interface ViewPreset {
  id: string;
  name: string;
  description?: string;
  visibility: ColumnVisibilitySettings;
  isDefault?: boolean;
  isSystem?: boolean;              // System presets can't be deleted
  createdAt: Timestamp;
  createdBy?: string;
}

/**
 * Organization-level column settings
 * Stored in: organizations/{orgId}/settings/columns
 */
export interface OrganizationColumnSettings {
  // Default visibility for all projects in this org
  defaultVisibility: ColumnVisibilitySettings;
  
  // System presets available to all users
  presets: ViewPreset[];
  
  // Which columns are enabled for this organization
  // (allows hiding columns org-wide, e.g., hide bikeCategory for non-bike companies)
  enabledColumns: string[];
  
  // Custom column definitions (overrides for display names, etc.)
  customColumnNames?: Record<string, string>;
  
  // Metadata
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Project-level column settings
 * Stored in: projects/{projectId}/settings/columns
 */
export interface ProjectColumnSettings {
  // Override org defaults for this project
  visibility?: ColumnVisibilitySettings;
  
  // Project-specific presets
  presets?: ViewPreset[];
  
  // Project-specific column overrides
  customColumnNames?: Record<string, string>;
  
  // Metadata
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * User-level column preferences
 * Stored in: users/{userId}/preferences/bomTable
 */
export interface UserColumnPreferences {
  // User's preferred visibility (overrides project/org)
  visibility?: ColumnVisibilitySettings;
  
  // User's saved views
  savedViews?: ViewPreset[];
  
  // Last used preset
  lastPresetId?: string;
  
  // Per-project overrides
  projectOverrides?: Record<string, ColumnVisibilitySettings>;
  
  // Metadata
  updatedAt: Timestamp;
}

// ============================================
// SYSTEM PRESETS
// ============================================

/**
 * Built-in view presets
 */
export const SYSTEM_PRESETS: ViewPreset[] = [
  {
    id: 'compact',
    name: 'Compact',
    description: 'Essential columns only',
    visibility: {
      visibleGroups: ['core'],
    },
    isSystem: true,
    createdAt: null as unknown as Timestamp,
  },
  {
    id: 'costing',
    name: 'Costing',
    description: 'Focus on costs and vendors',
    visibility: {
      visibleGroups: ['core', 'costing', 'vendor'],
    },
    isSystem: true,
    createdAt: null as unknown as Timestamp,
  },
  {
    id: 'engineering',
    name: 'Engineering',
    description: 'Drawings, revisions, categories',
    visibility: {
      visibleGroups: ['core', 'identification', 'classification', 'weight'],
    },
    isSystem: true,
    createdAt: null as unknown as Timestamp,
  },
  {
    id: 'procurement',
    name: 'Procurement',
    description: 'Vendor and pricing focus',
    visibility: {
      visibleGroups: ['core', 'costing', 'vendor'],
    },
    isSystem: true,
    createdAt: null as unknown as Timestamp,
  },
  {
    id: 'full-ccm',
    name: 'Full CCM',
    description: 'All 29 CCM columns',
    visibility: {
      visibleGroups: ['core', 'identification', 'costing', 'vendor', 'classification', 'weight', 'reference'],
    },
    isSystem: true,
    createdAt: null as unknown as Timestamp,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get columns for a given group
 */
export function getColumnsForGroup(groupId: ColumnGroupId): ColumnDefinition[] {
  const group = COLUMN_GROUPS.find(g => g.id === groupId);
  if (!group) return [];
  return group.columns.map(colId => COLUMN_DEFINITIONS[colId]).filter(Boolean);
}

/**
 * Get all visible columns based on settings
 */
export function getVisibleColumns(settings: ColumnVisibilitySettings): ColumnDefinition[] {
  const visibleColumns: ColumnDefinition[] = [];
  
  for (const groupId of settings.visibleGroups) {
    const groupColumns = getColumnsForGroup(groupId);
    for (const col of groupColumns) {
      if (!settings.hiddenColumns?.includes(col.id)) {
        visibleColumns.push(col);
      }
    }
  }
  
  // Apply custom order if specified
  if (settings.columnOrder?.length) {
    visibleColumns.sort((a, b) => {
      const aIndex = settings.columnOrder!.indexOf(a.id);
      const bIndex = settings.columnOrder!.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }
  
  return visibleColumns;
}

/**
 * Get default visibility settings
 */
export function getDefaultVisibility(): ColumnVisibilitySettings {
  return {
    visibleGroups: COLUMN_GROUPS.filter(g => g.defaultVisible).map(g => g.id),
  };
}

/**
 * Merge settings with hierarchy: org → project → user
 */
export function mergeColumnSettings(
  orgSettings?: OrganizationColumnSettings,
  projectSettings?: ProjectColumnSettings,
  userSettings?: UserColumnPreferences,
  projectId?: string
): ColumnVisibilitySettings {
  // Start with defaults
  let visibility = getDefaultVisibility();
  
  // Apply org defaults
  if (orgSettings?.defaultVisibility) {
    visibility = { ...visibility, ...orgSettings.defaultVisibility };
  }
  
  // Apply project overrides
  if (projectSettings?.visibility) {
    visibility = { ...visibility, ...projectSettings.visibility };
  }
  
  // Apply user preferences
  if (userSettings?.visibility) {
    visibility = { ...visibility, ...userSettings.visibility };
  }
  
  // Apply per-project user overrides
  if (projectId && userSettings?.projectOverrides?.[projectId]) {
    visibility = { ...visibility, ...userSettings.projectOverrides[projectId] };
  }
  
  return visibility;
}
