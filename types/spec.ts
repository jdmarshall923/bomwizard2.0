import { Timestamp } from 'firebase/firestore';

// ============================================
// SPEC STATUS & WORKFLOW
// ============================================

/**
 * Spec workflow status
 */
export type SpecStatus = 
  | 'draft'        // Initial state, being edited
  | 'submitted'    // Submitted for review
  | 'in_review'    // Being reviewed by coordinator
  | 'accepted'     // Approved and applied
  | 'rejected'     // Rejected with reason
  | 'archived';    // Old/superseded spec

/**
 * Mapping status for spec options/categories
 */
export type MappingStatus = 
  | 'unmapped'           // No groups mapped yet
  | 'partial'            // Some options mapped, some not
  | 'mapped'             // All selected options have group mappings
  | 'has_custom';        // Has custom parts requiring New Parts workflow

// ============================================
// SPEC CORE TYPES
// ============================================

/**
 * Main Spec record - the central hub for project configuration
 * Stored in: projects/{projectId}/specs/{specId}
 */
export interface Spec {
  id: string;
  projectId: string;
  
  // Status & Workflow
  status: SpecStatus;
  version: number;
  
  // Submission tracking
  submittedBy?: string;
  submittedAt?: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  
  // Header / Project Metadata
  header: SpecHeader;
  
  // Timeline / Planning
  timeline: SpecTimeline;
  
  // Component Categories (19 categories, each with multiple options)
  categories: SpecCategory[];
  
  // Colour Configurations (up to 5)
  colourOptions: ColourOption[];
  
  // Audit
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Spec header information - project metadata
 */
export interface SpecHeader {
  projectName: string;
  productFamily?: string;
  modelYear?: string;
  productCategory?: string;
  productClass?: string;
  productLine?: string;
  productType?: string;
  
  // CRITICAL: bikeType drives mapping lookups
  // All spec-to-group mappings are scoped by this value
  // Examples: "Mountain", "Road", "E-Bike", "Gravel", "City", "Hybrid"
  bikeType: string;
  
  componentColour?: string;
  frameMaterial?: string;
}

/**
 * Spec timeline information - planning dates
 */
export interface SpecTimeline {
  dateAvailableInTp?: string;
  orderingOpenWeek?: string;
  orderingCloseWeek?: string;
  sprintRunWeek?: string;
  productionWeek?: string;
  totalQty?: number;
  pbomCodeName?: string;
  countriesTabCompleted?: boolean;
  businessCaseLink?: string;
  numColoursAvailable?: number;
}

/**
 * Spec category - a configuration area with multiple options
 * E.g., HANDLEBAR, SPEEDS, GEAR RATIO, BRAKES, etc.
 */
export interface SpecCategory {
  category: string;              // "HANDLEBAR", "SPEEDS", "GEAR RATIO", etc.
  options: SpecOption[];         // All options for this category
  
  // BOM Mapping Status (aggregated from selected options)
  mappingStatus: MappingStatus;
}

/**
 * Individual option within a category
 * NOTE: Multiple options can be selected per category (e.g., Forward + Reverse Brakes for multi-country)
 */
export interface SpecOption {
  optionName: string;            // "Straight Bar", "12 Speed", "Forward Brakes", etc.
  available: boolean;            // Y/N - is this option available for this spec?
  selected: boolean;             // Is this option selected/active?
  isDefault: boolean;            // Is this the default option?
  
  // Quantity & Planning
  estQtyMin?: number;
  estQtyMax?: number;
  estSplit?: number;             // Percentage
  warrantyParts?: boolean;
  notes?: string;
  
  // Gear Ratio specific fields (only populated for GEAR RATIO category)
  gearRatioDetails?: GearRatioDetails;
  
  // BOM Mapping (per option, since multiple can be selected)
  mappingStatus: MappingStatus;
  mappedGroups?: string[];       // Group codes mapped to this option
}

/**
 * Gear ratio specific details - determines chainring, chain, and sprocket groups
 */
export interface GearRatioDetails {
  chainring?: string;            // e.g., "54T" - determines chainring group
  chain?: string;                // e.g., "116L" - determines chain group  
  sprockets?: string;            // e.g., "11-42T" - determines sprocket group
}

/**
 * Colour option - one of up to 5 colour configurations
 */
export interface ColourOption {
  optionNumber: number;          // 1-5
  parts: ColourPart[];
  estQty?: number | string;      // Can be number or "TBC"
}

/**
 * Individual part within a colour option
 */
export interface ColourPart {
  partName: string;              // "MAIN FRAME", "FRONT FORK", etc.
  colour?: string;               // Can be "TBC" or actual colour
  finish?: string;               // "GLOSS", "MATTE"
  decal?: string;
  notes?: string;
  isCustom: boolean;             // Flagged for New Parts (detected from "custom" keywords)
}

// ============================================
// SPEC-TO-GROUP MAPPING (LEARNING DATABASE)
// ============================================

/**
 * Spec group mapping - learned association between spec options and BOM groups
 * Stored in: specMappings/{mappingId} (GLOBAL collection)
 */
export interface SpecGroupMapping {
  id: string;
  
  // CRITICAL: Bike type context - same option needs different groups per bike type
  bikeType: string;              // "Mountain", "Road", "E-Bike", "Gravel", "City", etc.
  
  // What spec option this mapping is for
  category: string;              // "SPEEDS", "HANDLEBAR", "GEAR RATIO", etc.
  optionValue: string;           // "12 Speed", "Straight Bar", "Standard"
  
  // Which groups are needed for THIS bike type
  groupCodes: string[];          // ["GDR-MTB-1201", "GDR-MTB-1202"] for Mountain
  
  // Context rules - for combination-specific mappings
  contextMappings?: ContextMapping[];
  
  // Gear Ratio specific - map gear details to specific groups
  gearRatioMappings?: {
    chainring?: { value: string; groupCode: string };
    chain?: { value: string; groupCode: string };
    sprockets?: { value: string; groupCode: string };
  };
  
  // Learning metadata
  usageCount: number;
  lastUsed: Timestamp;
  confirmedBy: string[];         // User IDs who confirmed this mapping
  confidence: number;            // 0-100 calculated from usage/confirmations
  wasEverChanged: boolean;       // Track if users have modified this mapping
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Context-specific mapping override
 * For when combinations of options require different groups
 */
export interface ContextMapping {
  // When these OTHER options are also selected...
  conditions: ContextCondition[];
  
  // ...modify the groups like this:
  addGroups: string[];           // Add these groups
  removeGroups: string[];        // Remove these groups
  replaceWith?: string[];        // Or replace entirely with these
  
  // Learning metadata for this specific combination
  usageCount: number;
  confidence: number;
}

/**
 * Condition for context mapping
 */
export interface ContextCondition {
  category: string;              // e.g., "SPEEDS"
  optionValue: string;           // e.g., "12 Speed"
}

/**
 * Suggested mapping result from learning system
 */
export interface SuggestedMapping {
  bikeType: string;
  category: string;
  optionValue: string;
  groupCodes: string[];
  confidence: number;
  usageCount: number;
  lastUsed?: Timestamp;
  hasContextOverrides: boolean;
  
  // Similar mappings from other bike types (for when no direct match)
  similarMappings?: {
    bikeType: string;
    groupCodes: string[];
    confidence: number;
  }[];
}

// ============================================
// SPEC CHANGE TRACKING
// ============================================

/**
 * Spec change record - tracks changes between versions
 * Stored in: projects/{projectId}/specs/{specId}/changes/{changeId}
 */
export interface SpecChange {
  id: string;
  specId: string;
  version: number;
  
  changeType: 'created' | 'submitted' | 'accepted' | 'rejected' | 'edited';
  changes: FieldChange[];
  
  changedBy: string;
  changedAt: Timestamp;
  notes?: string;
}

/**
 * Individual field change
 */
export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// ============================================
// SPEC COMPARISON & BOM IMPACT
// ============================================

/**
 * Spec comparison - diff between two spec versions
 */
export interface SpecComparison {
  specId: string;
  fromVersion: number;
  toVersion: number;
  
  // Header/Timeline changes
  headerChanges: FieldChange[];
  timelineChanges: FieldChange[];
  
  // Selection changes (the important ones)
  selectionChanges: SelectionChange[];
  
  // Colour changes
  colourChanges: ColourChange[];
  
  // BOM Impact Analysis
  bomImpact: BomImpact;
  
  generatedAt: Timestamp;
}

/**
 * Selection change - change to a category option
 */
export interface SelectionChange {
  category: string;
  changeType: 'added' | 'removed' | 'modified' | 'quantity_changed';
  
  oldOption?: string;
  newOption?: string;
  
  // For multi-select categories (like BRAKES)
  addedOptions?: string[];
  removedOptions?: string[];
  
  // Quantity changes
  oldQty?: { min: number; max: number; split: number };
  newQty?: { min: number; max: number; split: number };
  
  // BOM impact for THIS change
  groupsToAdd: string[];
  groupsToRemove: string[];
}

/**
 * Colour option change
 */
export interface ColourChange {
  optionNumber: number;
  changeType: 'added' | 'removed' | 'modified';
  
  partChanges: ColourPartChange[];
}

/**
 * Individual colour part change
 */
export interface ColourPartChange {
  partName: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  isNowCustom: boolean;
}

/**
 * BOM impact analysis from spec changes
 */
export interface BomImpact {
  // Summary counts
  groupsToAdd: number;
  groupsToRemove: number;
  partsAffected: number;
  newPartsNeeded: number;
  
  // Detailed lists
  addGroups: GroupImpact[];
  removeGroups: GroupImpact[];
  newPartsRequired: NewPartImpact[];
  
  // Risk assessment
  hasUnmappedOptions: boolean;
  unmappedOptions: { category: string; option: string }[];
}

/**
 * Group impact detail
 */
export interface GroupImpact {
  groupCode: string;
  groupName: string;
  partCount: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
}

/**
 * New part impact detail
 */
export interface NewPartImpact {
  reason: string;
  category: string;
  suggestedDescription: string;
}

// ============================================
// BOM GROUP ORIGIN TRACKING
// ============================================

/**
 * Tracks how groups got into the Working BOM
 * Stored as part of BomItem or in separate collection
 */
export interface BomGroupOrigin {
  groupCode: string;
  projectId: string;
  
  // How this group got into the BOM
  origin: 'spec_mapping' | 'manual_add' | 'import' | 'unknown';
  
  // If from spec mapping, which option
  specCategory?: string;
  specOption?: string;
  
  // When and who
  addedAt: Timestamp;
  addedBy: string;
}

// ============================================
// APPLIED MAPPING TRACKING
// ============================================

/**
 * Record of a mapping being applied to a project's BOM
 */
export interface AppliedMapping {
  category: string;
  optionValue: string;
  groupCodes: string[];
  appliedAt: Timestamp;
  appliedBy: string;
  wasAutoSuggested: boolean;
  wasModified: boolean;
}

/**
 * Result of applying spec to BOM
 */
export interface ApplySpecResult {
  success: boolean;
  groupsAdded: string[];
  groupsRemoved: string[];
  partsAdded: number;
  partsRemoved: number;
  newPartsCreated: number;
  errors: string[];
  warnings: string[];
}

// ============================================
// ADMIN & ANALYTICS
// ============================================

/**
 * Aggregated mapping stats for admin view
 */
export interface MappingStats {
  totalMappings: number;
  byBikeType: { bikeType: string; count: number }[];
  byCategory: { category: string; count: number }[];
  lowConfidenceCount: number;
  averageConfidence: number;
}

/**
 * Missing mapping - options used but no mapping exists
 */
export interface MissingMapping {
  bikeType: string;
  category: string;
  optionValue: string;
  usedInProjects: string[];
}

// ============================================
// SPEC IMPORT
// ============================================

/**
 * Parsed spec from Excel import
 */
export interface ParsedSpec {
  header: Partial<SpecHeader>;
  timeline: Partial<SpecTimeline>;
  categories: SpecCategory[];
  colourOptions: ColourOption[];
  
  // Import metadata
  sourceFilename: string;
  parseErrors: ParseError[];
  parseWarnings: string[];
}

/**
 * Parse error detail
 */
export interface ParseError {
  row?: number;
  column?: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation result for parsed spec
 */
export interface SpecValidationResult {
  isValid: boolean;
  errors: ParseError[];
  warnings: ParseError[];
  
  // Specific validation results
  hasBikeType: boolean;
  hasSelectedOptions: boolean;
  unknownCategories: string[];
  unknownOptions: string[];
}

// ============================================
// STANDARD SPEC CATEGORIES
// ============================================

/**
 * Standard spec category names (19 categories from spec sheet)
 */
export const SPEC_CATEGORIES = [
  'HANDLEBAR',
  'SPEEDS',
  'GEAR RATIO',
  'BRAKES',
  'WHEELS',
  'TYRES',
  'TUBES',
  'LIGHTING',
  'MUDGUARD',
  'RACK',
  'KICKSTAND',
  'LOCK',
  'BELL',
  'REFLECTORS',
  'PEDALS',
  'GRIPS',
  'SADDLE',
  'SEAT POST',
  'KITTING',
] as const;

export type SpecCategoryName = typeof SPEC_CATEGORIES[number];

/**
 * Common bike types for spec mappings
 */
export const BIKE_TYPES = [
  'Mountain',
  'Road',
  'E-Bike',
  'Gravel',
  'City',
  'Hybrid',
  'Kids',
  'BMX',
  'Folding',
  'Cargo',
] as const;

export type BikeType = typeof BIKE_TYPES[number];

// ============================================
// COLOUR PARTS STANDARD NAMES
// ============================================

/**
 * Standard colour part names
 */
export const COLOUR_PARTS = [
  'MAIN FRAME',
  'FRONT FORK',
  'REAR TRIANGLE',
  'STEM',
  'HANDLEBAR',
  'SEAT POST',
  'RIMS',
  'HUBS',
  'CRANKSET',
  'PEDALS',
] as const;

export type ColourPartName = typeof COLOUR_PARTS[number];

// ============================================
// CONFIDENCE THRESHOLDS
// ============================================

/**
 * Confidence level thresholds for mapping suggestions
 */
export const CONFIDENCE_THRESHOLDS = {
  NO_DATA: 0,
  LOW: 30,
  MEDIUM: 60,
  GOOD: 85,
  HIGH: 100,
} as const;

/**
 * Get confidence level label from score
 */
export function getConfidenceLevel(score: number): 'none' | 'low' | 'medium' | 'good' | 'high' {
  if (score <= CONFIDENCE_THRESHOLDS.NO_DATA) return 'none';
  if (score <= CONFIDENCE_THRESHOLDS.LOW) return 'low';
  if (score <= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  if (score <= CONFIDENCE_THRESHOLDS.GOOD) return 'good';
  return 'high';
}

/**
 * Get confidence colour for UI display
 */
export function getConfidenceColor(score: number): string {
  const level = getConfidenceLevel(score);
  switch (level) {
    case 'none': return 'text-muted-foreground';
    case 'low': return 'text-red-500';
    case 'medium': return 'text-yellow-500';
    case 'good': return 'text-blue-500';
    case 'high': return 'text-green-500';
    default: return 'text-muted-foreground';
  }
}

