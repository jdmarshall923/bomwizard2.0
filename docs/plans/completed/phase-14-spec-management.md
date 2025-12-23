# Phase 14: Spec Management System

**Status**: ✅ Completed  
**Completed Date**: December 23, 2024  
**Dependencies**: Phase 10.1 (New Parts & BOM Integration)

---

## Overview

A complete spec management ecosystem that makes the **Spec Sheet the central hub** for project configuration. Includes importing specs, viewing/editing specs, applying specs to BOMs with a learning system, and a submission workflow for Product Managers.

---

## Core Concepts

### Spec as Source of Truth

```
                              ┌─────────────┐
                              │    SPEC     │
                              │   (Hub)     │
                              └──────┬──────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ↓                            ↓                            ↓
┌───────────────┐          ┌─────────────────┐          ┌─────────────────┐
│ Spec Builder  │          │  Apply to BOM   │          │  Track Changes  │
│ (Submit/Edit) │          │ (Group Mapping) │          │   (Versions)    │
└───────────────┘          └─────────────────┘          └─────────────────┘
```

### The Learning System

Instead of pre-mapping a million+ combinations, the system **learns from user selections**:

1. **First time**: User manually selects which BOM groups match each spec option
2. **System saves**: The mapping is stored with confidence scoring
3. **Next time**: System suggests previously used mappings
4. **Over time**: Most selections auto-populate, users only handle exceptions

---

## Learning System - Detailed Design

### Core Principle: Automatic Data Labeling

**Every group selection is automatically saved as a mapping.** There is no "Save mapping" checkbox - it just happens. This ensures:

1. **Zero friction** - Users don't need to think about whether to save
2. **Complete data capture** - Every decision contributes to the learning database
3. **Continuous improvement** - Confidence scores improve automatically over time

The learning happens discreetly in the background. Users focus on their work; the system learns from their actions.

### Where is the Learning Data Stored?

The learning data is stored in a **global collection** (not per-project) so knowledge transfers across all projects. **Critically, mappings are scoped by bike type** because the same spec option (e.g., "12 Speed") requires different groups for different bike types.

```
Firestore Collections:
├── specMappings/                    ← GLOBAL learning database
│   ├── {mappingId}                  ← One doc per unique bikeType + category + option
│   │   ├── bikeType: "Mountain"     ← KEY: Which bike type this applies to
│   │   ├── category: "SPEEDS"
│   │   ├── optionValue: "12 Speed"
│   │   ├── groupCodes: ["GDR-MTB-1201", "GDR-MTB-1202", ...]  ← MTB-specific groups
│   │   ├── contextMappings: [...]   ← Combination-specific overrides
│   │   ├── usageCount: 47
│   │   ├── confidence: 94
│   │   └── confirmedBy: ["user1", "user2", ...]
│   │
│   ├── {mappingId}                  ← SAME option, DIFFERENT bike type
│   │   ├── bikeType: "Road"
│   │   ├── category: "SPEEDS"
│   │   ├── optionValue: "12 Speed"
│   │   ├── groupCodes: ["GDR-RD-1201", "GDR-RD-1202", ...]    ← Road-specific groups
│   │   └── ...
│   │
│   └── {mappingId}
│       ├── bikeType: "E-Bike"
│       ├── category: "HANDLEBAR"
│       ├── optionValue: "Straight Bar"
│       └── ...
│
├── projects/{projectId}/
│   └── specs/{specId}               ← Project-specific spec record
│       └── (includes applied mappings for audit trail)
```

**Why Bike Type Matters:**

| Spec Option | Mountain Bike Groups | Road Bike Groups | E-Bike Groups |
|-------------|---------------------|------------------|---------------|
| 12 Speed | GDR-MTB-12xx (Shimano XT) | GDR-RD-12xx (Ultegra) | GDR-EB-12xx (EP8 compatible) |
| Hydraulic Brakes | GBR-MTB-HYD (4-piston) | GBR-RD-HYD (flat mount) | GBR-EB-HYD (high power) |
| Straight Bar | GHB-MTB-STR (wide 780mm) | GHB-RD-STR (narrow 420mm) | GHB-EB-STR (with display mount) |

### How Learning Works - Step by Step

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER APPLIES SPEC TO BOM                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. LOOKUP PHASE                                                            │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │ For each selected option in the spec:                            │   │
│     │                                                                  │   │
│     │ Query: specMappings WHERE bikeType = "Mountain"   ← FROM PROJECT │   │
│     │                      AND category = "SPEEDS"                     │   │
│     │                      AND optionValue = "12 Speed"                │   │
│     │                                                                  │   │
│     │ Result: { groupCodes: [...], confidence: 94%, usageCount: 47 }   │   │
│     │                                                                  │   │
│     │ If no match for this bike type, show "No mapping found"          │   │
│     │ (don't fall back to other bike types - they're different!)       │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  2. CONTEXT CHECK (for combination-specific mappings)                       │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │ If "12 Speed" + "Straight Bar" selected together:                │   │
│     │                                                                  │   │
│     │ Check contextMappings for rules like:                            │   │
│     │   { when: {HANDLEBAR: "Straight Bar"},                           │   │
│     │     addGroups: ["GHB-COMBO-12SPD-STR"],                          │   │
│     │     removeGroups: ["GHB-GENERIC-001"] }                          │   │
│     │                                                                  │   │
│     │ These override/supplement the base mapping                       │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  3. DISPLAY SUGGESTIONS                                                     │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │ Show user the suggested groups with confidence indicator:        │   │
│     │                                                                  │   │
│     │ SPEEDS: 12 Speed                                                 │   │
│     │ ┌────────────────────────────────────────────────────────────┐  │   │
│     │ │ SUGGESTED (94% confidence, used 47 times)        [Confirm] │  │   │
│     │ │ ☑ GDR-1001  12 Speed Drivetrain Assembly                   │  │   │
│     │ │ ☑ GDR-1002  12 Speed Cassette                              │  │   │
│     │ │ ☑ GDR-1003  12 Speed Chain                                 │  │   │
│     │ │ ☐ GDR-1099  12 Speed Special (click to add)                │  │   │
│     │ │                                                            │  │   │
│     │ │ [+ Search for more groups]                                 │  │   │
│     │ └────────────────────────────────────────────────────────────┘  │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  4. USER CONFIRMS OR ADJUSTS                                                │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │ User can:                                                        │   │
│     │ • Click "Confirm" to accept suggestions                          │   │
│     │ • Uncheck groups to remove them                                  │   │
│     │ • Search and add additional groups                               │   │
│     │ • Flag as "needs different groups when combined with X"          │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  5. SAVE & LEARN (AUTOMATIC)                                                │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │ After user confirms (happens automatically, no checkbox):        │   │
│     │                                                                  │   │
│     │ IF user accepted suggestions unchanged:                          │   │
│     │   → Increment usageCount                                         │   │
│     │   → Add userId to confirmedBy[]                                  │   │
│     │   → Recalculate confidence (goes UP)                             │   │
│     │                                                                  │   │
│     │ IF user made changes:                                            │   │
│     │   → Update groupCodes with new selection                         │   │
│     │   → Reset or lower confidence                                    │   │
│     │   → Log the change for review                                    │   │
│     │                                                                  │   │
│     │ IF user flagged a combination-specific mapping:                  │   │
│     │   → Add to contextMappings[] array                               │   │
│     │   → Future lookups with same combination use this override       │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Confidence Scoring Algorithm

```typescript
function calculateConfidence(mapping: SpecGroupMapping): number {
  // Factors that increase confidence:
  // 1. Usage count - more uses = more reliable
  // 2. Multiple confirmers - different people agreed
  // 3. Recency - recently used = still relevant
  // 4. Consistency - same groups selected each time
  
  const usageScore = Math.min(mapping.usageCount / 10, 1) * 40;  // Max 40 points
  const confirmerScore = Math.min(mapping.confirmedBy.length / 5, 1) * 30;  // Max 30 points
  const recencyScore = isRecentlyUsed(mapping.lastUsed) ? 20 : 10;  // 10-20 points
  const consistencyScore = mapping.wasEverChanged ? 5 : 10;  // 5-10 points
  
  return Math.round(usageScore + confirmerScore + recencyScore + consistencyScore);
}

// Confidence thresholds:
// 0-30%   = "No data" - user must manually select
// 31-60%  = "Low confidence" - show suggestions but highlight uncertainty
// 61-85%  = "Good confidence" - show suggestions, likely correct
// 86-100% = "High confidence" - auto-select, user just confirms
```

### Handling Combination-Specific Mappings

Some combinations need different groups than individual options would suggest:

```typescript
interface SpecGroupMapping {
  // Base mapping (applies when this option selected alone or with "neutral" options)
  bikeType: string;
  category: string;
  optionValue: string;
  groupCodes: string[];
  
  // Context-specific overrides
  contextMappings: ContextMapping[];
}

interface ContextMapping {
  // When these OTHER options are also selected...
  conditions: {
    category: string;
    optionValue: string;
  }[];
  
  // ...modify the groups like this:
  addGroups: string[];      // Add these groups
  removeGroups: string[];   // Remove these groups
  replaceWith?: string[];   // Or replace entirely with these
  
  // Learning metadata for this specific combination
  usageCount: number;
  confidence: number;
}
```

**Example:**

```
Base Mapping:
  SPEEDS: "12 Speed" → [GDR-1001, GDR-1002, GDR-1003]

Context Mapping:
  When SPEEDS: "12 Speed" + HANDLEBAR: "Straight Bar" selected together:
    addGroups: [GHB-COMBO-12STR]     // Special combo group
    removeGroups: [GHB-GENERIC]       // Don't need generic one
```

### First-Time vs Repeat Usage

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FIRST TIME (No existing mapping FOR THIS BIKE TYPE)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Project: MY2025 Gravel Explorer                                            │
│  Bike Type: Gravel                           ← Determines mapping context   │
│                                                                             │
│  SPEEDS: 12 Speed                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ ⚠️ NO MAPPING FOR "GRAVEL" BIKES                                    │    │
│  │                                                                    │    │
│  │ ℹ️ Similar mappings exist for:                                      │    │
│  │   • Mountain (94% confidence) - [View Groups]                      │    │
│  │   • Road (88% confidence) - [View Groups]                          │    │
│  │                                                                    │    │
│  │ [Start from Mountain mapping]  [Start from scratch]                │    │
│  │                                                                    │    │
│  │ Search groups: [12 speed gravel drivetrain    ] [Search]          │    │
│  │                                                                    │    │
│  │ RESULTS:                                                           │    │
│  │ ☐ GDR-GRV-1201  12 Speed Gravel Drivetrain - GRX                  │    │
│  │ ☐ GDR-GRV-1202  12 Speed Cassette 10-51T                          │    │
│  │ ☐ GDR-GRV-1203  12 Speed Chain 126L                               │    │
│  │                                                                    │    │
│  │ Select the groups needed for "12 Speed" on GRAVEL bikes            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  → User selects groups                                                      │
│  → Creates NEW specMappings document with bikeType: "Gravel"               │
│  → confidence starts at 20% (single use)                                    │
│  → Next Gravel project using "12 Speed" will see this as suggestion        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ REPEAT USAGE (Existing mapping with 94% confidence FOR THIS BIKE TYPE)      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Project: MY2026 Trail Master                                               │
│  Bike Type: Mountain                                                        │
│                                                                             │
│  SPEEDS: 12 Speed                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ SUGGESTED FOR MOUNTAIN BIKES (94% confidence)          [Confirm]  │    │
│  │                                                                    │    │
│  │ ☑ GDR-MTB-1201  12 Speed Drivetrain Assembly - Shimano XT         │    │
│  │ ☑ GDR-MTB-1202  12 Speed Cassette 10-51T                          │    │
│  │ ☑ GDR-MTB-1203  12 Speed Chain 126L                               │    │
│  │ ☑ GDR-MTB-1204  12 Speed Derailleur XT                            │    │
│  │                                                                    │    │
│  │ Used 47 times for Mountain bikes • Last: 3 days ago               │    │
│  │                                                                    │    │
│  │ [+ Add more groups]  [This combo needs different groups]          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  → User clicks Confirm                                                      │
│  → usageCount → 48                                                          │
│  → confidence stays high                                                    │
│  → Fast, minimal effort                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Admin: Viewing & Managing Learned Mappings

Admin page to view/edit the learning database at `/admin/spec-mappings`:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ SPEC GROUP MAPPINGS                                              [Export] [Import]  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  Bike Type: [All Types ▼]  Category: [All ▼]  Confidence: [All ▼]  Search: [    ]  │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ Bike Type  │ Category   │ Option        │ Groups │ Conf. │ Uses │ Actions  │   │
│  ├────────────┼────────────┼───────────────┼────────┼───────┼──────┼──────────┤   │
│  │ Mountain   │ SPEEDS     │ 12 Speed      │ 4      │ 94%   │ 47   │ [Edit]   │   │
│  │ Road       │ SPEEDS     │ 12 Speed      │ 4      │ 88%   │ 31   │ [Edit]   │   │
│  │ E-Bike     │ SPEEDS     │ 12 Speed      │ 5      │ 72%   │ 18   │ [Edit]   │   │
│  │ Mountain   │ SPEEDS     │ 6 Speed       │ 3      │ 85%   │ 28   │ [Edit]   │   │
│  │ City       │ SPEEDS     │ 6 Speed       │ 3      │ 91%   │ 52   │ [Edit]   │   │
│  │ Mountain   │ HANDLEBAR  │ Straight Bar  │ 2      │ 76%   │ 23   │ [Edit]   │   │
│  │ Road       │ HANDLEBAR  │ Straight Bar  │ 2      │ 82%   │ 28   │ [Edit]   │   │
│  │ E-Bike     │ LIGHTING   │ Dynamo SV8    │ 3      │ 45%   │ 5    │ [Edit]   │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  ⚠️ LOW CONFIDENCE (Need attention)                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ E-Bike   │ LIGHTING: Dynamo SV8 - 45% confidence, only 5 uses              │   │
│  │ Gravel   │ TUBES: Tubolito Presta - 38% confidence, groups changed twice   │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  ℹ️ MISSING MAPPINGS (Options used but no mapping for this bike type)               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ Gravel   │ SPEEDS: 12 Speed - No mapping (exists for Mountain, Road)       │   │
│  │ City     │ HANDLEBAR: High Bar - No mapping                                │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Admin can:**
- Filter by bike type to see all mappings for that type
- Identify gaps (option exists for one bike type but not another)
- Copy mappings between bike types as a starting point
- Merge similar mappings if groups are actually the same

---

## Data Models

### Spec Record

```typescript
// types/spec.ts

interface Spec {
  id: string;
  projectId: string;
  
  // Status & Workflow
  status: 'draft' | 'submitted' | 'in_review' | 'accepted' | 'rejected' | 'archived';
  version: number;
  
  // Submission tracking
  submittedBy?: string;
  submittedAt?: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  
  // Header / Project Metadata
  header: {
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
    bikeType: string;           // ← REQUIRED - used for learning system lookup
    
    componentColour?: string;
    frameMaterial?: string;
  };
  
  // Timeline / Planning
  timeline: {
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
  };
  
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

// Each category contains ALL available options (mirrors Excel structure)
interface SpecCategory {
  category: string;           // "HANDLEBAR", "SPEEDS", "GEAR RATIO", etc.
  options: SpecOption[];      // All options for this category
  
  // BOM Mapping Status (aggregated from selected options)
  mappingStatus: 'unmapped' | 'partial' | 'mapped' | 'has_custom';
}

// Individual option within a category
// NOTE: Multiple options can be selected per category (e.g., Forward + Reverse Brakes for multi-country)
interface SpecOption {
  optionName: string;         // "Straight Bar", "12 Speed", "Forward Brakes", etc.
  available: boolean;         // Y/N - is this option available for this spec?
  selected: boolean;          // Is this option selected/active?
  isDefault: boolean;         // Is this the default option?
  
  // Quantity & Planning
  estQtyMin?: number;
  estQtyMax?: number;
  estSplit?: number;          // Percentage
  warrantyParts?: boolean;
  notes?: string;
  
  // Gear Ratio specific fields (only populated for GEAR RATIO category)
  gearRatioDetails?: {
    chainring?: string;       // e.g., "54T" - determines chainring group
    chain?: string;           // e.g., "116L" - determines chain group  
    sprockets?: string;       // e.g., "11-42T" - determines sprocket group
  };
  
  // BOM Mapping (per option, since multiple can be selected)
  mappingStatus: 'unmapped' | 'mapped' | 'custom_new_parts';
  mappedGroups?: string[];    // Group codes mapped to this option
}

interface ColourOption {
  optionNumber: number;       // 1-5
  parts: ColourPart[];
  estQty?: number | string;   // Can be number or "TBC"
}

interface ColourPart {
  partName: string;           // "MAIN FRAME", "FRONT FORK", etc.
  colour?: string;            // Can be "TBC" or actual colour
  finish?: string;            // "GLOSS", "MATTE"
  decal?: string;
  notes?: string;
  isCustom: boolean;          // Flagged for New Parts (detected from "custom" keywords)
}
```

### Spec-to-Group Mapping (Learning Database)

```typescript
// types/spec.ts

interface SpecGroupMapping {
  id: string;
  
  // CRITICAL: Bike type context - same option needs different groups per bike type
  bikeType: string;            // "Mountain", "Road", "E-Bike", "Gravel", "City", etc.
  
  // What spec option this mapping is for
  category: string;           // "SPEEDS", "HANDLEBAR", "GEAR RATIO", etc.
  optionValue: string;        // "12 Speed", "Straight Bar", "Standard"
  
  // Which groups are needed for THIS bike type
  groupCodes: string[];       // ["GDR-MTB-1201", "GDR-MTB-1202"] for Mountain
                              // vs ["GDR-RD-1201", "GDR-RD-1202"] for Road
  
  // Context rules - for combination-specific mappings
  contextRules?: ContextRule[];
  
  // Gear Ratio specific - map gear details to specific groups
  gearRatioMappings?: {
    chainring?: { value: string; groupCode: string };
    chain?: { value: string; groupCode: string };
    sprockets?: { value: string; groupCode: string };
  };
  
  // Learning metadata
  usageCount: number;
  lastUsed: Timestamp;
  confirmedBy: string[];      // User IDs who confirmed this mapping
  confidence: number;         // 0-100 calculated from usage/confirmations
  wasEverChanged: boolean;    // Track if users have modified this mapping
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ContextRule {
  requiresCategory: string;   // e.g., "SPEEDS"
  requiresValue: string;      // e.g., "12 Speed"
}
```

### Spec Change History

```typescript
// types/spec.ts

interface SpecChange {
  id: string;
  specId: string;
  version: number;
  
  changeType: 'created' | 'submitted' | 'accepted' | 'rejected' | 'edited';
  changes: FieldChange[];
  
  changedBy: string;
  changedAt: Timestamp;
  notes?: string;
}

interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}
```

### Spec Comparison & BOM Impact Analysis

```typescript
// types/spec.ts

interface SpecComparison {
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

interface SelectionChange {
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

interface ColourChange {
  optionNumber: number;
  changeType: 'added' | 'removed' | 'modified';
  
  partChanges: {
    partName: string;
    field: string;
    oldValue?: string;
    newValue?: string;
    isNowCustom: boolean;
  }[];
}

interface BomImpact {
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

interface GroupImpact {
  groupCode: string;
  groupName: string;
  partCount: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
}

interface NewPartImpact {
  reason: string;
  category: string;
  suggestedDescription: string;
}
```

### BOM Group Origin Tracking

```typescript
// types/bom.ts - extend existing

interface BomGroupOrigin {
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
```

---

## Spec Comparison - Detailed Design

### Comparison Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SPEC COMPARISON FLOW                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DETECT CHANGES                                                          │
│     Compare v1 to v2, detect: added, removed, modified, quantity changes    │
│                                                                             │
│  2. CALCULATE BOM IMPACT                                                    │
│     Look up OLD option mapping → get old groups                             │
│     Look up NEW option mapping → get new groups                             │
│     Groups to REMOVE = old groups - new groups                              │
│     Groups to ADD = new groups - old groups                                 │
│                                                                             │
│  3. DISPLAY COMPARISON                                                      │
│     Show side-by-side or unified diff view                                  │
│     Highlight changes with colours                                          │
│     Show BOM impact summary and details                                     │
│                                                                             │
│  4. ACTION OPTIONS                                                          │
│     • Apply changes to BOM                                                  │
│     • Review and adjust mappings                                            │
│     • Create New Parts for custom items                                     │
│     • Accept/Reject spec (if in review)                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Handling Unknown Mappings

When the learning system doesn't have mappings, compare against **ACTUAL BOM**:

```typescript
interface SpecComparisonWithActualBom {
  // Standard comparison fields...
  
  actualBomAnalysis: {
    currentGroups: string[];           // Groups actually in Working BOM now
    requiredGroups: string[];          // Groups needed for new spec
    unmappedCategories: string[];      // Categories without mappings
    
    groupsToRemove: GroupWithReason[];
    groupsToAdd: GroupWithReason[];
    groupsToKeep: string[];
    
    hasUnmappedNewOptions: boolean;
    requiresManualReview: boolean;
  };
}
```

---

## Manual Group Management

### Enhanced BOM Explorer with Spec Tags

Enhance the existing Tree View with spec linking - add a "Spec Link" column:

```
│ Lvl │ Item         │ Description              │ Qty │ Mat £   │ ... │ Spec Link   │
│─────│──────────────│──────────────────────────│─────│─────────│─────│─────────────│
│  1  │ GMF-2030-A02 │ G Line, Andwander        │  1  │ £245.00 │     │ SPEEDS:12Sp │
│  2  │ ├─ B103849   │ Crankset 12-Speed        │  1  │  £89.00 │     │             │
│  2  │ ├─ B103850   │ Bottom Bracket           │  1  │  £34.00 │     │             │
│     │              │                          │     │         │     │             │
│  1  │ GHB-STR-01   │ Straight Bar Assembly    │  1  │  £56.00 │     │ HANDLEBAR   │
│  2  │ ├─ B200100   │ Handlebar Straight       │  1  │  £32.00 │     │             │
│     │              │                          │     │         │     │             │
│  1  │ GRP-MISC-01  │ Miscellaneous Hardware   │  1  │  £23.00 │     │ ⚠️ Unlinked │
```

**Key points:**
- Spec Link column only shows value on Level 1 rows (groups)
- Part rows (Level 2+) leave column blank
- Abbreviated format: "SPEEDS:12Sp" instead of full text
- Hover/click shows full detail
- "⚠️ Unlinked" for groups not tied to any spec category

### Add Groups Dialog

From BOM Explorer, click "+ Add Groups" to add from Template BOM:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ADD GROUPS TO WORKING BOM                                          [X]     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Search Template BOM: [                                    ] [Search]       │
│  Filter by:  [All Categories ▼]  [Contains keyword... ]                    │
│                                                                             │
│  DRIVETRAIN                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ░░ GDR-0601  6 Speed Drivetrain      │ 12 parts │ Already in BOM   │   │
│  │ ☑ GDR-1201  12 Speed Drivetrain     │ 15 parts │ £245              │   │
│  │ ☑ GDR-1202  12 Speed Cassette       │  4 parts │  £89              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  SELECTED: 4 groups (24 parts, £435 total)                                 │
│                                                                             │
│  Link to Spec Category: [SPEEDS ▼] Option: [12 Speed ▼]                    │
│  (Mapping will be saved automatically for future projects)                 │
│                                                                             │
│  [Cancel]                                      [Add 4 Groups to BOM]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Remove Groups Dialog

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ REMOVE GROUPS FROM WORKING BOM                                     [X]     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ⚠️ You are about to remove 3 groups containing 17 parts                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ▼ GDR-0601  6 Speed Drivetrain      │ 12 parts │ £198              │   │
│  │   ├── B100001 │ Crankset 6-Speed    │ Qty: 1   │                   │   │
│  │   └── ... 10 more parts                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  IMPACT SUMMARY                                                             │
│  Parts to be removed: 17                                                   │
│  Cost reduction: £282                                                      │
│  Spec link: SPEEDS → 6 Speed (will be unlinked)                           │
│                                                                             │
│  ☐ Also remove from New Parts Tracker                                      │
│                                                                             │
│  [Cancel]                              [Remove 3 Groups]                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Spec Change Workspace

Side-by-side view for applying spec changes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ APPLY SPEC CHANGES                                                         │
│ SPEEDS: 6 Speed → 12 Speed                                        [Cancel] │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────┬───────────────────────────────────┐   │
│  │ REMOVE FROM BOM                 │ ADD TO BOM                        │   │
│  │ (Groups linked to 6 Speed)      │ (Groups for 12 Speed)             │   │
│  ├─────────────────────────────────┼───────────────────────────────────┤   │
│  │ ☑ GDR-0601  6 Speed Drivetrain │ ☑ GDR-1201  12 Speed Drivetrain  │   │
│  │   12 parts │ £198              │   15 parts │ £245                │   │
│  │ ☑ GDR-0602  6 Speed Cassette   │ ☑ GDR-1202  12 Speed Cassette    │   │
│  │   3 parts │ £56                │   4 parts │ £89                  │   │
│  │                                 │ ☑ GDR-1204  12 Speed Derailleur  │   │
│  │                                 │   3 parts │ £67                  │   │
│  ├─────────────────────────────────┼───────────────────────────────────┤   │
│  │ TOTAL: 3 groups, 17 parts      │ TOTAL: 4 groups, 24 parts        │   │
│  │ Cost: -£282                    │ Cost: +£435                       │   │
│  └─────────────────────────────────┴───────────────────────────────────┘   │
│                                                                             │
│  NET IMPACT: Groups: +1  |  Parts: +7  |  Cost: +£153                      │
│                                                                             │
│  [Preview Full Parts List]            [Apply Changes]                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Link to Spec Dialog

For groups in BOM that aren't linked to any spec category:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LINK GROUPS TO SPEC CATEGORY                                       [X]     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Selected Groups:                                                           │
│  • GRP-MISC-01  Miscellaneous Hardware (5 parts)                           │
│  • GRP-TOOL-01  Tool Kit (8 parts)                                         │
│                                                                             │
│  Link to Spec Category:                                                     │
│  ○ SPEEDS → 12 Speed                                                       │
│  ○ HANDLEBAR → Straight Bar                                                │
│  ● KITTING → Standard Kit                                                  │
│  ○ (Don't link - keep as manual)                                           │
│                                                                             │
│  ℹ️ Mapping will be saved automatically for future projects                 │
│                                                                             │
│  [Cancel]                                      [Link to KITTING]            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/project/[projectId]/spec` | Spec Overview | View spec, apply to BOM, see mapping status |
| `/project/[projectId]/spec/edit` | Spec Editor | Edit spec selections (Spec Builder UI) |
| `/project/[projectId]/spec/import` | Spec Import | Upload Excel spec sheet |
| `/project/[projectId]/spec/apply` | Apply to BOM | Map spec to groups with learning system |
| `/project/[projectId]/spec/compare` | Spec Comparison | Compare versions, see BOM impact |
| `/project/[projectId]/spec/history` | Spec History | View version history and changes |
| `/specs/pending` | Pending Specs | Review queue for submitted specs (Coordinators) |
| `/admin/spec-mappings` | Mapping Admin | View/edit the learning database |

---

## Services

### lib/spec/specService.ts

```typescript
// CRUD operations for Spec records
createSpec(projectId: string, data: Partial<Spec>): Promise<Spec>
getSpec(projectId: string): Promise<Spec | null>
updateSpec(specId: string, data: Partial<Spec>): Promise<void>
deleteSpec(specId: string): Promise<void>

// Workflow operations
submitSpec(specId: string): Promise<void>
acceptSpec(specId: string, reviewerId: string): Promise<void>
rejectSpec(specId: string, reviewerId: string, reason: string): Promise<void>

// Version operations
getSpecHistory(specId: string): Promise<SpecChange[]>
revertToVersion(specId: string, version: number): Promise<void>
```

### lib/spec/specImportService.ts

```typescript
// Parse Excel spec sheet
parseSpecSheet(file: File): Promise<ParsedSpec>
validateParsedSpec(parsed: ParsedSpec): ValidationResult

// Map parsed data to Spec record
createSpecFromImport(projectId: string, parsed: ParsedSpec): Promise<Spec>
```

### lib/spec/specMappingService.ts

```typescript
// Learning system - ALL lookups scoped by bikeType
getSuggestedGroups(
  bikeType: string,
  category: string, 
  option: string, 
  context?: SpecSelection[]
): Promise<SuggestedMapping>

saveMapping(
  bikeType: string,
  category: string, 
  option: string, 
  groups: string[]
): Promise<void>

confirmMapping(mappingId: string, userId: string): Promise<void>

// Apply mappings to build BOM
applySpecToBom(projectId: string, specId: string, mappings: AppliedMapping[]): Promise<BuildResult>

// Search groups
searchGroups(query: string, bikeType?: string): Promise<BomGroup[]>
```

### lib/spec/specComparisonService.ts

```typescript
// Compare two spec versions and calculate BOM impact
compareSpecs(specId: string, fromVersion: number, toVersion: number): Promise<SpecComparison>

// Compare imported spec to current
compareImportedSpec(projectId: string, importedSpec: ParsedSpec): Promise<SpecComparison>

// Apply changes from comparison to BOM
applySpecChanges(projectId: string, comparison: SpecComparison, options: ApplyOptions): Promise<ApplyResult>

// Generate comparison report
generateComparisonReport(comparison: SpecComparison): Promise<Blob>
```

### lib/spec/specChangeService.ts

```typescript
// Track changes between versions
recordChange(specId: string, changeType: string, changes: FieldChange[], notes?: string): Promise<void>
compareVersions(specId: string, versionA: number, versionB: number): Promise<FieldChange[]>
```

### lib/bom/bomGroupService.ts

```typescript
// Get groups in Working BOM, organized by spec category
getGroupsBySpecCategory(projectId: string): Promise<GroupsByCategory>

// Add groups from Template to Working BOM (auto-saves mapping)
addGroupsToBom(
  projectId: string, 
  groupCodes: string[], 
  specLink?: { category: string; option: string }
): Promise<AddResult>

// Remove groups from Working BOM
removeGroupsFromBom(
  projectId: string, 
  groupCodes: string[],
  options?: { removeFromTracker: boolean }
): Promise<RemoveResult>

// Link existing groups to spec category (auto-saves mapping)
linkGroupsToSpec(
  projectId: string,
  groupCodes: string[],
  specCategory: string,
  specOption: string
): Promise<void>

// Get available groups from Template BOM
getAvailableGroups(
  projectId: string,
  filter?: { category?: string; search?: string }
): Promise<TemplateGroup[]>
```

---

## Hooks

```typescript
// lib/hooks/useSpec.ts
useSpec(projectId: string): {
  spec: Spec | null;
  loading: boolean;
  error: Error | null;
  updateSpec: (data: Partial<Spec>) => Promise<void>;
  submitSpec: () => Promise<void>;
}

// lib/hooks/useSpecMapping.ts
useSpecMapping(bikeType: string, category: string, option: string): {
  suggestions: SuggestedMapping | null;
  confidence: number;
  loading: boolean;
  saveMapping: (groups: string[]) => Promise<void>;
}

// lib/hooks/useSpecComparison.ts
useSpecComparison(specId: string, fromVersion: number, toVersion: number): {
  comparison: SpecComparison | null;
  loading: boolean;
  applyChanges: (options: ApplyOptions) => Promise<ApplyResult>;
}

// lib/hooks/usePendingSpecs.ts
usePendingSpecs(): {
  specs: Spec[];
  loading: boolean;
  acceptSpec: (specId: string) => Promise<void>;
  rejectSpec: (specId: string, reason: string) => Promise<void>;
}

// lib/hooks/useSpecHistory.ts
useSpecHistory(specId: string): {
  history: SpecChange[];
  loading: boolean;
  revertTo: (version: number) => Promise<void>;
}

// lib/hooks/useSpecMappings.ts (for admin page)
useSpecMappings(filters?: { bikeType?: string; category?: string }): {
  mappings: SpecGroupMapping[];
  loading: boolean;
  lowConfidence: SpecGroupMapping[];
  missingMappings: { bikeType: string; category: string; option: string }[];
}
```

---

## Files to Create

```
app/(dashboard)/
├── project/[projectId]/
│   └── spec/
│       ├── page.tsx                 # Spec overview
│       ├── edit/page.tsx            # Spec editor/builder
│       ├── import/page.tsx          # Import Excel spec
│       ├── apply/page.tsx           # Apply spec to BOM
│       ├── compare/page.tsx         # Compare versions, BOM impact
│       └── history/page.tsx         # Version history
├── specs/
│   └── pending/page.tsx             # Pending reviews queue
└── admin/
    └── spec-mappings/page.tsx       # Learning database admin

components/spec/
├── SpecOverview.tsx                 # Main spec display
├── SpecHeader.tsx                   # Status bar and metadata
├── SpecConfigTable.tsx              # Configuration selections table
├── SpecColourOptions.tsx            # Colour options display
├── SpecEditor.tsx                   # Edit form for spec
├── SpecCategoryEditor.tsx           # Single category option selector
├── SpecColourEditor.tsx             # Colour option editor
├── SpecImporter.tsx                 # Excel import UI
├── SpecApplyWizard.tsx              # Apply to BOM wizard
├── SpecMappingCard.tsx              # Single category mapping UI
├── GroupSearchDialog.tsx            # Search and select groups
├── SpecComparison.tsx               # Full comparison view
├── SpecComparisonSummary.tsx        # Summary cards
├── SelectionChangeCard.tsx          # Single selection change with BOM impact
├── ColourChangeCard.tsx             # Colour change display
├── BomImpactPanel.tsx               # Shows groups to add/remove
├── SpecHistoryTimeline.tsx          # Version history display
├── SpecChangeCard.tsx               # Single change entry
├── PendingSpecCard.tsx              # Card for review queue
├── SpecStatusBadge.tsx              # Status indicator
├── ConfidenceIndicator.tsx          # Show mapping confidence %
└── MappingAdminTable.tsx            # Admin view of learned mappings

components/bom/
├── SpecLinkBadge.tsx                # Small badge showing spec category link
├── GroupSelector.tsx                # Multi-select groups from template
├── AddGroupsDialog.tsx              # Dialog to add groups
├── RemoveGroupsDialog.tsx           # Confirmation with impact preview
├── LinkToSpecDialog.tsx             # Link unlinked groups to spec
├── SpecChangeWorkspace.tsx          # Side-by-side add/remove
└── CategoryChangeCard.tsx           # Single category change in multi-change view

lib/spec/
├── specService.ts                   # Spec CRUD & workflow
├── specImportService.ts             # Excel parsing
├── specComparisonService.ts         # Compare specs, calculate BOM impact
├── specMappingService.ts            # Learning system
└── specChangeService.ts             # Version tracking

lib/bom/
└── bomGroupService.ts               # Group-level BOM operations

lib/hooks/
├── useSpec.ts
├── useSpecMapping.ts
├── useSpecComparison.ts
├── usePendingSpecs.ts
├── useSpecMappings.ts               # For admin page
└── useSpecHistory.ts

types/
└── spec.ts                          # All spec-related types
```

---

## Implementation Tasks

### Task 1: Data Models & Types (1 day)
- [ ] Create `types/spec.ts` with all interfaces (including bikeType)
- [ ] Set up Firestore collections: `specs`, `specMappings`, `specChanges`
- [ ] Create Firestore security rules for spec collections
- [ ] Add BomGroupOrigin interface to track group origins

### Task 2: Core Services (2-3 days)
- [ ] Implement `specService.ts` - CRUD and workflow
- [ ] Implement `specChangeService.ts` - version tracking
- [ ] Implement `specMappingService.ts` - learning system with bikeType scoping
- [ ] Create hooks: `useSpec`, `useSpecHistory`

### Task 3: Spec Import (2 days)
- [ ] Implement `specImportService.ts` - Excel parsing
- [ ] Build `SpecImporter.tsx` component
- [ ] Create `/project/[projectId]/spec/import` page
- [ ] Handle the 19 categories + 5 colour slots parsing

### Task 4: Spec Overview Page (2 days)
- [ ] Build `SpecOverview.tsx` with all sections
- [ ] Build `SpecHeader.tsx` with status bar
- [ ] Build `SpecConfigTable.tsx` with mapping status
- [ ] Build `SpecColourOptions.tsx`
- [ ] Create `/project/[projectId]/spec` page

### Task 5: Spec Editor / Builder (3 days)
- [ ] Build `SpecEditor.tsx` with tabbed interface
- [ ] Build `SpecCategoryEditor.tsx` for each category
- [ ] Build `SpecColourEditor.tsx` for colour options
- [ ] Create `/project/[projectId]/spec/edit` page
- [ ] Implement draft saving and submit workflow

### Task 6: Apply Spec to BOM - Learning System (3-4 days)
- [ ] Build `SpecApplyWizard.tsx` main component
- [ ] Build `SpecMappingCard.tsx` for each category
- [ ] Build `GroupSearchDialog.tsx` for manual selection
- [ ] Build `ConfidenceIndicator.tsx`
- [ ] Implement confidence scoring algorithm
- [ ] Implement bikeType-scoped suggestions
- [ ] Implement automatic mapping saves (no checkbox)
- [ ] Create `/project/[projectId]/spec/apply` page
- [ ] Connect to BOM building (transfer to Working BOM)

### Task 7: Spec Comparison & BOM Impact (2-3 days)
- [ ] Implement `specComparisonService.ts`
- [ ] Build `SpecComparison.tsx` main component
- [ ] Build `SpecComparisonSummary.tsx`
- [ ] Build `SelectionChangeCard.tsx` and `ColourChangeCard.tsx`
- [ ] Build `BomImpactPanel.tsx`
- [ ] Create `/project/[projectId]/spec/compare` page
- [ ] Create `useSpecComparison` hook

### Task 8: Manual Group Management (2 days)
- [ ] Implement `bomGroupService.ts`
- [ ] Enhance BomTree.tsx with Spec Link column
- [ ] Build `SpecLinkBadge.tsx`
- [ ] Build `AddGroupsDialog.tsx`
- [ ] Build `RemoveGroupsDialog.tsx`
- [ ] Build `LinkToSpecDialog.tsx`
- [ ] Build `SpecChangeWorkspace.tsx`

### Task 9: Submission & Review Workflow (2 days)
- [ ] Build `PendingSpecCard.tsx`
- [ ] Create `/specs/pending` page
- [ ] Implement accept/reject with auto-comparison display
- [ ] Add role-based access

### Task 10: Version History (1-2 days)
- [ ] Build `SpecHistoryTimeline.tsx`
- [ ] Build `SpecChangeCard.tsx`
- [ ] Create `/project/[projectId]/spec/history` page
- [ ] Implement revert functionality

### Task 11: Admin - Spec Mappings Page (1 day)
- [ ] Create `/admin/spec-mappings` page
- [ ] Build `MappingAdminTable.tsx`
- [ ] Implement bike type filtering
- [ ] Show low-confidence and missing mappings
- [ ] Add copy/merge mapping functionality

### Task 12: Navigation & Integration (1 day)
- [ ] Add Spec link to ProjectSidebar
- [ ] Add Pending Specs to GlobalSidebar
- [ ] Add Spec Mappings to admin section
- [ ] Connect spec timeline dates to PACE gates
- [ ] Add "New Parts from Spec" integration

### Task 13: Polish & Testing (2 days)
- [ ] Loading states for all pages
- [ ] Error handling throughout
- [ ] Empty states (no spec yet, no pending reviews)
- [ ] Test with real-world spec sheet structure
- [ ] Mobile responsiveness

---

## Navigation Updates

### ProjectSidebar.tsx

Add to `projectNavigation` array:

```typescript
import { ClipboardList } from 'lucide-react';

const projectNavigation = [
  { name: 'Overview', href: '/project/[projectId]/overview', icon: Target },
  { name: 'Spec', href: '/project/[projectId]/spec', icon: ClipboardList }, // NEW
  { name: 'BOM Explorer', href: '/project/[projectId]/bom', icon: FileText },
  // ... rest
];
```

### GlobalSidebar.tsx

Add Pending Specs link:

```typescript
import { ClipboardCheck, Layers } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Pending Specs', href: '/specs/pending', icon: ClipboardCheck }, // NEW
  {
    name: 'Master Data',
    items: [
      // ... existing items
    ],
  },
  {
    name: 'Admin',
    items: [
      { name: 'Spec Mappings', href: '/admin/spec-mappings', icon: Layers }, // NEW
    ],
  },
];
```

---

## Firestore Security Rules

```javascript
// Specs - project members can read, owners can write
match /projects/{projectId}/specs/{specId} {
  allow read: if isProjectMember(projectId);
  allow create, update: if isProjectMember(projectId);
  allow delete: if isProjectOwner(projectId);
}

// Spec Changes
match /projects/{projectId}/specs/{specId}/changes/{changeId} {
  allow read: if isProjectMember(projectId);
  allow create: if isAuthenticated();
}

// Spec Mappings (global learning database)
match /specMappings/{mappingId} {
  allow read: if isAuthenticated();
  allow create, update: if isAuthenticated();
  allow delete: if isAdmin();
}
```

---

## Success Criteria

Phase 14 is complete when:

- [ ] Excel spec sheets can be imported and parsed
- [ ] Spec overview page shows full configuration clearly
- [ ] Specs can be edited via the Spec Builder UI
- [ ] Product Managers can submit specs for review
- [ ] Coordinators can accept/reject submitted specs (with comparison view)
- [ ] Apply Spec to BOM wizard suggests groups from learning database
- [ ] Mappings are scoped by bike type correctly
- [ ] Manual group selections are saved automatically (no checkbox)
- [ ] Spec comparison shows BOM impact (groups to add/remove)
- [ ] BOM Explorer shows spec link tags on groups
- [ ] Groups can be manually added/removed with impact preview
- [ ] Unlinked groups can be linked to spec categories
- [ ] Confidence scoring shows reliability of suggestions
- [ ] Custom items are flagged for New Parts tracking
- [ ] Spec changes are tracked with full version history
- [ ] Specs can be reverted to previous versions
- [ ] Admin page allows viewing/editing spec mappings by bike type

---

## Future Enhancements (Post Phase 14)

- **Bulk spec import** - Import multiple specs at once
- **Spec templates** - Pre-configured starting points by bike type
- **Approval chains** - Multi-level approval workflow
- **Auto-notifications** - Email/Slack when spec submitted or status changes
- **Spec analytics** - Which options are most commonly selected by bike type
- **AI suggestions** - Use patterns to predict likely configurations (integrate with Phase 12)
- **Copy mappings** - Copy mappings between bike types as starting point
