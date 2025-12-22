# Phase 14: Spec Management System

**Status**: 📋 Planned  
**Estimated Duration**: 3-4 weeks  
**Dependencies**: Phase 10.5 (New Parts & BOM Integration - Completed)

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

### Where is the Learning Data Stored?

The learning data is stored in a **global collection** (not per-project) so knowledge transfers across all projects:

```
Firestore Collections:
├── specMappings/                    ← GLOBAL learning database
│   ├── {mappingId}                  ← One doc per unique option
│   │   ├── category: "SPEEDS"
│   │   ├── optionValue: "12 Speed"
│   │   ├── groupCodes: ["GDR-1001", "GDR-1002", ...]
│   │   ├── contextMappings: [...]   ← Combination-specific overrides
│   │   ├── usageCount: 47
│   │   ├── confidence: 94
│   │   └── confirmedBy: ["user1", "user2", ...]
│   │
│   └── {mappingId}
│       ├── category: "HANDLEBAR"
│       ├── optionValue: "Straight Bar"
│       └── ...
│
├── projects/{projectId}/
│   └── specs/{specId}               ← Project-specific spec record
│       └── (includes applied mappings for audit trail)
```

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
│     │ Query: specMappings WHERE category = "SPEEDS"                    │   │
│     │                      AND optionValue = "12 Speed"                │   │
│     │                                                                  │   │
│     │ Result: { groupCodes: [...], confidence: 94%, usageCount: 47 }   │   │
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
│  5. SAVE & LEARN                                                            │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │ After user confirms:                                             │   │
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

### Admin: Viewing & Managing Learned Mappings

There should be an admin page to view/edit the learning database:

```
/data/spec-mappings

┌─────────────────────────────────────────────────────────────────────────────┐
│ SPEC GROUP MAPPINGS                                        [Export] [Import]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Search: [                    ]  Filter: [All Categories ▼] [Confidence ▼] │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Category   │ Option        │ Groups │ Confidence │ Uses │ Actions  │   │
│  ├────────────┼───────────────┼────────┼────────────┼──────┼──────────┤   │
│  │ SPEEDS     │ 12 Speed      │ 4      │ 94%        │ 47   │ [Edit]   │   │
│  │ SPEEDS     │ 6 Speed       │ 3      │ 88%        │ 31   │ [Edit]   │   │
│  │ HANDLEBAR  │ Straight Bar  │ 2      │ 76%        │ 23   │ [Edit]   │   │
│  │ HANDLEBAR  │ High Bar      │ 2      │ 82%        │ 28   │ [Edit]   │   │
│  │ LIGHTING   │ Dynamo SV8    │ 3      │ 45%        │ 5    │ [Edit]   │   │
│  │ BRAKES     │ Forward       │ 2      │ 91%        │ 40   │ [Edit]   │   │
│  │ BRAKES     │ Reverse       │ 2      │ 67%        │ 12   │ [Edit]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  LOW CONFIDENCE (Need attention)                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ LIGHTING: Dynamo SV8 - 45% confidence, only 5 uses               │   │
│  │ ⚠️ TUBES: Tubolito Presta - 38% confidence, groups changed twice    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

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
    bikeType?: string;
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
  // These drive which part groups are selected in the BOM
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
  
  // What spec option this mapping is for
  category: string;           // "SPEEDS", "HANDLEBAR", "GEAR RATIO", etc.
  optionValue: string;        // "12 Speed", "Straight Bar", "Standard"
  
  // Which groups are needed
  groupCodes: string[];       // ["GDR-1001-A01", "GDR-1002-A01"]
  
  // Context rules - for combination-specific mappings
  // e.g., "12 Speed + Straight Bar" needs different groups than "12 Speed + High Bar"
  contextRules?: ContextRule[];
  
  // Gear Ratio specific - map gear details to specific groups
  // When category is "GEAR RATIO", these details drive group selection
  gearRatioMappings?: {
    chainring?: { value: string; groupCode: string };   // "54T" -> "GCR-1054-A01"
    chain?: { value: string; groupCode: string };       // "116L" -> "GCH-2116-A01"
    sprockets?: { value: string; groupCode: string };   // "11-42T" -> "GSP-3042-A01"
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
  // This mapping only applies when another option is also selected
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
  field: string;              // "selections.HANDLEBAR.selectedOption"
  oldValue: unknown;
  newValue: unknown;
}
```

---

## Pages & Routes

> **Note:** Following existing codebase patterns with `/project/[projectId]/` prefix

| Route | Page | Description |
|-------|------|-------------|
| `/project/[projectId]/spec` | Spec Overview | View spec, apply to BOM, see mapping status |
| `/project/[projectId]/spec/edit` | Spec Editor | Edit spec selections (Spec Builder UI) |
| `/project/[projectId]/spec/import` | Spec Import | Upload Excel spec sheet |
| `/project/[projectId]/spec/apply` | Apply to BOM | Map spec to groups with learning system |
| `/project/[projectId]/spec/history` | Spec History | View version history and changes |
| `/specs/pending` | Pending Specs | Review queue for submitted specs (Coordinators) |
| `/data/spec-mappings` | Spec Mappings Admin | View/edit the learning database |

---

## UI Components

### 1. Spec Overview Page (`/project/[projectId]/spec`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SPEC                                                                    │
│ Project Name                                    [Edit] [Import] [History]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STATUS BAR                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✓ Accepted │ v2 │ Submitted: J.Smith, Dec 10 │ Accepted: Dec 15 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────┬───────────────────────────────┐   │
│  │ PRODUCT INFO                    │ TIMELINE                      │   │
│  │ ─────────────                   │ ────────                      │   │
│  │ Family: Product Line            │ Sprint: Week 12               │   │
│  │ Year: 2025                      │ Production: Week 20           │   │
│  │ Category: Category A            │ Total Qty: 5,000              │   │
│  │ Bike Type: Type X               │ Ordering: Wk 8 - Wk 10        │   │
│  │ Frame Material: Aluminium       │ PBOM: PBOM-2025-001           │   │
│  │                                 │ Countries Tab: ✓ Complete     │   │
│  │                                 │ Colours Available: 3          │   │
│  │                                 │ Business Case: [Link]         │   │
│  └─────────────────────────────────┴───────────────────────────────┘   │
│                                                                         │
│  CONFIGURATION                        [Show All Options ▼] / [Selected] │
│  ─────────────                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Category        │ Selected Options     │ Qty Split │ BOM Status │   │
│  ├─────────────────┼──────────────────────┼───────────┼────────────┤   │
│  │ HANDLEBAR       │ Straight Bar         │ 100%      │ ✓ 3 groups │   │
│  │ SPEEDS          │ 12 Speed             │ 100%      │ ✓ 4 groups │   │
│  │ GEAR RATIO      │ Standard             │ 100%      │ ✓ 2 groups │   │
│  │                 │   → Chainring: 54T                            │   │
│  │                 │   → Chain: 116L                               │   │
│  │                 │   → Sprockets: 11-42T                         │   │
│  │ LIGHTING        │ Dynamo SV8           │ 100%      │ ⚠ Unmapped │   │
│  │ BRAKES          │ Forward Brakes       │ 60%       │ ✓ 2 groups │   │
│  │                 │ Reverse Brakes       │ 40%       │ ✓ 2 groups │   │
│  │ ...             │                      │           │            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  COLOUR OPTIONS                                                         │
│  ─────────────                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Option 1: Blue Gloss                              🆕 Custom      │   │
│  │   Main Frame, Front Frame, Rear Frame, Fork, Stem, Pin          │   │
│  │   Finish: Gloss │ Qty: 2,500                                    │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Option 2: Black Matte                             ✓ Standard    │   │
│  │   Main Frame, Front Frame                                        │   │
│  │   Finish: Matte │ Qty: 2,500                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Apply Spec to BOM]        [View BOM]        [Export Spec]            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Spec Editor / Builder (`/project/[projectId]/spec/edit`)

Tabbed interface with sections: Product Info, Timeline, Configuration, Colours

### 3. Apply Spec to BOM (`/project/[projectId]/spec/apply`)

Wizard-style interface showing each category with:
- Suggested groups (with confidence indicator)
- Confirm/adjust selection
- Search for additional groups
- Flag for combination-specific mappings

### 4. Pending Specs Review (`/specs/pending`)

Queue-style page showing submitted specs awaiting review

### 5. Spec History (`/project/[projectId]/spec/history`)

Timeline view of spec versions with diff view capability

---

## Services

> **Note:** Following existing service patterns in `lib/bom/` and `lib/import/`

### lib/spec/specService.ts

```typescript
// CRUD operations for Spec records
createSpec(projectId: string, data: Partial<Spec>): Promise<Spec>
getSpec(projectId: string): Promise<Spec | null>
getSpecById(projectId: string, specId: string): Promise<Spec | null>
updateSpec(projectId: string, specId: string, data: Partial<Spec>): Promise<void>
deleteSpec(projectId: string, specId: string): Promise<void>

// Workflow operations
submitSpec(projectId: string, specId: string, userId: string): Promise<void>
acceptSpec(projectId: string, specId: string, reviewerId: string): Promise<void>
rejectSpec(projectId: string, specId: string, reviewerId: string, reason: string): Promise<void>

// Version operations
getSpecHistory(projectId: string, specId: string): Promise<SpecChange[]>
revertToVersion(projectId: string, specId: string, version: number): Promise<void>

// Pending specs for review queue
getPendingSpecs(): Promise<Spec[]>
```

### lib/spec/specImportService.ts

```typescript
// Parse Excel spec sheet (similar pattern to pplImportService.ts)
parseSpecSheet(file: File): Promise<ParsedSpec>
validateParsedSpec(parsed: ParsedSpec): ValidationResult

// Map parsed data to Spec record
createSpecFromImport(projectId: string, parsed: ParsedSpec, userId: string): Promise<Spec>
```

### lib/spec/specMappingService.ts

```typescript
// Learning system for spec-to-group mappings
getSuggestedGroups(category: string, option: string, context?: SpecSelection[]): Promise<SuggestedMapping>
saveMapping(category: string, option: string, groups: string[], userId: string): Promise<void>
confirmMapping(mappingId: string, userId: string): Promise<void>
updateMapping(mappingId: string, groups: string[], userId: string): Promise<void>

// Apply mappings to build BOM
applySpecToBom(projectId: string, specId: string, mappings: AppliedMapping[]): Promise<BuildResult>

// Search groups (uses existing templateBomService)
searchGroups(projectId: string, query: string): Promise<BomGroup[]>

// Admin functions
getAllMappings(): Promise<SpecGroupMapping[]>
getMappingsByCategory(category: string): Promise<SpecGroupMapping[]>
getLowConfidenceMappings(threshold: number): Promise<SpecGroupMapping[]>
```

### lib/spec/specChangeService.ts

```typescript
// Track changes between versions
recordChange(projectId: string, specId: string, changeType: string, changes: FieldChange[], notes?: string): Promise<void>
compareVersions(projectId: string, specId: string, versionA: number, versionB: number): Promise<FieldChange[]>
```

---

## Hooks

> **Note:** Following existing hook patterns in `lib/hooks/`

### lib/hooks/useSpec.ts

```typescript
// Main spec data hook (follows useProjects pattern)
export function useSpec(projectId: string) {
  // Uses react-firebase-hooks/firestore
  return {
    spec: Spec | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
  };
}
```

### lib/hooks/useSpecMapping.ts

```typescript
export function useSpecMapping(category: string, option: string) {
  return {
    suggestions: SuggestedMapping | null;
    confidence: number;
    loading: boolean;
    saveMapping: (groups: string[]) => Promise<void>;
  };
}
```

### lib/hooks/usePendingSpecs.ts

```typescript
export function usePendingSpecs() {
  return {
    specs: Spec[];
    loading: boolean;
    acceptSpec: (specId: string) => Promise<void>;
    rejectSpec: (specId: string, reason: string) => Promise<void>;
  };
}
```

### lib/hooks/useSpecHistory.ts

```typescript
export function useSpecHistory(projectId: string, specId: string) {
  return {
    history: SpecChange[];
    loading: boolean;
    revertTo: (version: number) => Promise<void>;
  };
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
│       └── history/page.tsx         # Version history
├── specs/
│   └── pending/page.tsx             # Pending reviews queue (global)
└── data/
    └── spec-mappings/page.tsx       # Admin: learning database

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
├── SpecHistoryTimeline.tsx          # Version history display
├── SpecChangeCard.tsx               # Single change entry
├── PendingSpecCard.tsx              # Card for review queue
├── SpecStatusBadge.tsx              # Status indicator
└── ConfidenceIndicator.tsx          # Show mapping confidence %

lib/spec/
├── specService.ts                   # Spec CRUD & workflow
├── specImportService.ts             # Excel parsing
├── specMappingService.ts            # Learning system
└── specChangeService.ts             # Version tracking

lib/hooks/
├── useSpec.ts
├── useSpecMapping.ts
├── usePendingSpecs.ts
├── useSpecMappings.ts               # For admin page
└── useSpecHistory.ts

types/
└── spec.ts                          # All spec-related types
```

---

## Implementation Tasks

### Task 1: Data Models & Types (1 day)
- [ ] Create `types/spec.ts` with all interfaces
- [ ] Add export to `types/index.ts`
- [ ] Set up Firestore collections: `specs` (under projects), `specMappings` (global), `specChanges` (under projects)
- [ ] Create Firestore security rules for spec collections

### Task 2: Core Services (2-3 days)
- [ ] Implement `specService.ts` - CRUD and workflow
- [ ] Implement `specChangeService.ts` - version tracking
- [ ] Implement `specMappingService.ts` - learning system core with confidence scoring
- [ ] Create hooks: `useSpec`, `useSpecHistory`

### Task 3: Spec Import (2 days)
- [ ] Implement `specImportService.ts` - Excel parsing (use xlsx library, similar to PPL import)
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
- [ ] Implement context-aware suggestions
- [ ] Create `/project/[projectId]/spec/apply` page
- [ ] Connect to BOM building (transfer to Working BOM)

### Task 7: Submission & Review Workflow (2 days)
- [ ] Build `PendingSpecCard.tsx`
- [ ] Create `/specs/pending` page
- [ ] Create `usePendingSpecs` hook
- [ ] Implement accept/reject with notifications
- [ ] Add role-based access (who can submit vs review)

### Task 8: Version History (1-2 days)
- [ ] Build `SpecHistoryTimeline.tsx`
- [ ] Build `SpecChangeCard.tsx`
- [ ] Create `/project/[projectId]/spec/history` page
- [ ] Implement revert functionality

### Task 9: Admin: Spec Mappings Page (1 day)
- [ ] Create `/data/spec-mappings` page
- [ ] Build table with filtering by category, confidence
- [ ] Implement edit/delete mapping functionality
- [ ] Show low-confidence mappings that need attention

### Task 10: Navigation & Integration (1 day)
- [ ] Add Spec link to `ProjectSidebar.tsx` in projectNavigation array
- [ ] Add Pending Specs link to `GlobalSidebar.tsx`
- [ ] Add Spec Mappings to Master Data section in `GlobalSidebar.tsx`
- [ ] Connect spec timeline dates to PACE gates
- [ ] Add "New Parts from Spec" integration

### Task 11: Polish & Testing (2 days)
- [ ] Loading states for all pages
- [ ] Error handling throughout
- [ ] Empty states (no spec yet, no pending reviews)
- [ ] Test with real-world spec sheet structure
- [ ] Mobile responsiveness

---

## Navigation Updates

### ProjectSidebar.tsx Changes

Add to `projectNavigation` array:

```typescript
const projectNavigation = [
  { name: 'Overview', href: '/project/[projectId]/overview', icon: Target },
  { name: 'Spec', href: '/project/[projectId]/spec', icon: ClipboardList }, // NEW
  { name: 'BOM Explorer', href: '/project/[projectId]/bom', icon: FileText },
  // ... rest
];
```

### GlobalSidebar.tsx Changes

Add Pending Specs link and Spec Mappings to Master Data:

```typescript
const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Pending Specs', href: '/specs/pending', icon: ClipboardCheck }, // NEW
  {
    name: 'Master Data',
    items: [
      { name: 'SLItems', href: '/data/sl-items', icon: Package },
      { name: 'SLVendors', href: '/data/sl-vendors', icon: Building2 },
      { name: 'VendorContractPrices', href: '/data/vendor-contract-prices', icon: PoundSterling },
      { name: 'Spec Mappings', href: '/data/spec-mappings', icon: Layers }, // NEW
    ],
  },
  // ...
];
```

---

## Firestore Security Rules Additions

```javascript
// firestore.rules - add these rules

// Specs - project members can read, owners can write
match /projects/{projectId}/specs/{specId} {
  allow read: if isProjectMember(projectId);
  allow create, update: if isProjectMember(projectId);
  allow delete: if isProjectOwner(projectId);
}

// Spec Changes - project members can read, system writes on changes
match /projects/{projectId}/specs/{specId}/changes/{changeId} {
  allow read: if isProjectMember(projectId);
  allow create: if isAuthenticated();
}

// Spec Mappings (global learning database) - authenticated users can read and contribute
match /specMappings/{mappingId} {
  allow read: if isAuthenticated();
  allow create, update: if isAuthenticated();
  // Only admins can delete to prevent data loss
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
- [ ] Coordinators can accept/reject submitted specs
- [ ] Apply Spec to BOM wizard suggests groups from learning database
- [ ] Manual group selections are saved and improve future suggestions
- [ ] Confidence scoring shows reliability of suggestions
- [ ] Custom items are flagged for New Parts tracking
- [ ] Spec changes are tracked with full version history
- [ ] Specs can be reverted to previous versions
- [ ] Admin page allows viewing/editing spec mappings

---

## Future Enhancements (Post Phase 14)

- **Bulk spec import** - Import multiple specs at once
- **Spec templates** - Pre-configured starting points
- **Approval chains** - Multi-level approval workflow
- **Spec comparison** - Side-by-side compare two specs
- **Auto-notifications** - Email/Slack when spec submitted or status changes
- **Spec analytics** - Which options are most commonly selected
- **AI suggestions** - Use patterns to predict likely configurations (integrate with Phase 12)

