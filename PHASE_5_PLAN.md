# Phase 5: Version Control & Cost Change Tracking

## Status: 🚧 IN PROGRESS

## Overview

Phase 5 implements a comprehensive version control system that not only tracks WHAT changed in the BOM, but critically captures WHY costs changed. This data feeds directly into Phase 6 (Cost Analysis) for charts, graphs, and insights.

### Configuration Decisions
- **Version triggers**: Auto on import, bulk operations (10+ items), and manual
- **BOM size**: Large (500-1000 items) - using subcollection storage
- **Cost drivers**: Auto-detect with manual override/notes
- **Date range comparison**: Select any date range to see all changes in that period

## Key Principle

> **Every cost change must be traceable to a root cause.**

When someone asks "Why did the BOM cost increase by £5,000?", we need to answer with specifics:
- "£3,200 from vendor price increases on 12 items"
- "£1,500 from 3 new parts added"
- "£800 from quantity increases"
- "-£500 from switching to cheaper vendor on brackets"

---

## Cost Change Drivers

Understanding what can cause costs to change is essential for tracking:

| Driver | Description | Example |
|--------|-------------|---------|
| **Quantity Change** | Item quantity increased/decreased | Qty 10 → 15 = +50% cost |
| **Material Cost Change** | Unit price changed | £5.00 → £5.50 = +10% per unit |
| **Landing Cost Change** | Import/shipping rate changed | 8% → 12% landing |
| **Labour Cost Change** | Manufacturing cost changed | £2.00 → £2.50 labour |
| **Vendor Change** | Switched to different supplier | Vendor A → Vendor B |
| **Price Source Change** | Moved from estimate to actual | Placeholder → Contract |
| **Item Added** | New part added to BOM | +£500 for new bracket |
| **Item Removed** | Part removed from BOM | -£200 removed fasteners |
| **Item Replaced** | One part swapped for another | B103 → B104 (different spec) |

---

## Data Model Requirements

### Version Snapshot

Each version snapshot must capture the complete state for comparison:

```typescript
interface BomVersion {
  id: string;
  projectId: string;
  
  // Version metadata
  versionNumber: number;           // Sequential: 1, 2, 3...
  versionName?: string;            // Optional: "Initial Import", "Q1 Price Update"
  description?: string;            // Notes about this version
  
  // Snapshot timing
  createdAt: Timestamp;
  createdBy: string;               // User who created/triggered
  
  // Trigger information - WHY was this version created?
  trigger: VersionTrigger;
  triggerDetails?: string;         // Additional context
  
  // Cost summary at this point in time
  summary: {
    totalItems: number;
    totalAssemblies: number;
    
    // Cost totals
    totalMaterialCost: number;
    totalLandingCost: number;
    totalLabourCost: number;
    totalExtendedCost: number;
    
    // Item categories
    newPartsCount: number;
    placeholdersCount: number;
    contractPricedCount: number;
    manualPricedCount: number;
    
    // Cost source breakdown
    costBySource: {
      contract: number;
      quote: number;
      manual: number;
      placeholder: number;
      calculated: number;
    };
  };
  
  // Full item snapshot (stored in subcollection for large BOMs)
  // OR reference to storage file for very large BOMs
  itemsSnapshot: 'inline' | 'subcollection' | 'storage';
  itemsStoragePath?: string;       // If stored in Cloud Storage
}

type VersionTrigger = 
  | 'import'              // BOM imported from CSV
  | 'manual'              // User manually created snapshot
  | 'price_update'        // Vendor prices applied
  | 'bulk_edit'           // Bulk changes made
  | 'scheduled'           // Automatic scheduled snapshot
  | 'milestone';          // Project milestone marker
```

### Version Item Snapshot

Each item's state at the time of the version:

```typescript
interface VersionItem {
  // Item identity
  itemId: string;                  // Original BomItem ID
  itemCode: string;
  itemDescription: string;
  groupCode: string;
  
  // Quantity and costs at this version
  quantity: number;
  materialCost: number;
  landingCost: number;
  labourCost: number;
  unitCost: number;                // material + landing + labour
  extendedCost: number;            // unitCost * quantity
  
  // Price source information
  costSource: CostSource;
  vendorCode?: string;
  vendorName?: string;
  contractId?: string;             // Reference to vendor contract
  
  // Status flags
  isPlaceholder: boolean;
  isNewPart: boolean;
  isAddedItem: boolean;            // Added manually (not from template)
  
  // Metadata
  lastModified: Timestamp;
  lastModifiedBy?: string;
}
```

### Change Record

When comparing versions, we generate detailed change records:

```typescript
interface BomChange {
  id: string;
  projectId: string;
  
  // Version references
  fromVersionId: string;
  toVersionId: string;
  fromVersionNumber: number;
  toVersionNumber: number;
  
  // Change timing
  detectedAt: Timestamp;
  
  // Change type
  changeType: ChangeType;
  
  // Item references
  itemId?: string;                 // For item-level changes
  itemCode: string;
  itemDescription: string;
  groupCode: string;
  
  // What changed
  field?: string;                  // Which field changed
  oldValue?: any;
  newValue?: any;
  
  // Cost impact - THE KEY DATA
  costImpact: {
    materialDelta: number;         // Change in material cost
    landingDelta: number;          // Change in landing cost
    labourDelta: number;           // Change in labour cost
    extendedDelta: number;         // Change in extended cost (total impact)
    percentageChange: number;      // % change
  };
  
  // Root cause categorization
  costDriver: CostDriver;
  costDriverDetail?: string;
  
  // For vendor changes
  oldVendor?: string;
  newVendor?: string;
  
  // For quantity changes
  oldQuantity?: number;
  newQuantity?: number;
}

type ChangeType = 
  | 'added'           // Item added to BOM
  | 'removed'         // Item removed from BOM
  | 'modified'        // Item properties changed
  | 'replaced';       // Item swapped for different item

type CostDriver = 
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
```

### Version Comparison Summary

Aggregated view of changes between versions:

```typescript
interface VersionComparison {
  id: string;
  projectId: string;
  
  // Versions being compared
  baseVersionId: string;
  baseVersionNumber: number;
  compareVersionId: string;
  compareVersionNumber: number;
  
  // Generated
  generatedAt: Timestamp;
  
  // Overall cost impact
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
  changesByDriver: {
    driver: CostDriver;
    itemCount: number;
    totalImpact: number;
    percentOfTotalChange: number;
  }[];
  
  // Changes grouped by assembly
  changesByAssembly: {
    groupCode: string;
    groupDescription: string;
    itemCount: number;
    totalImpact: number;
    percentOfTotalChange: number;
  }[];
  
  // Top impactful changes (for highlighting)
  topIncreases: BomChange[];       // Top 10 cost increases
  topDecreases: BomChange[];       // Top 10 cost decreases
  
  // Item counts
  itemsAdded: number;
  itemsRemoved: number;
  itemsModified: number;
  itemsUnchanged: number;
}
```

---

## Firestore Collections

```
projects/{projectId}/
├── bomItems/                     # Current working BOM (existing)
├── templateBomItems/             # Template BOM (existing)
├── versions/                     # Version snapshots
│   └── {versionId}/
│       └── items/                # Subcollection for version items
├── changes/                      # Change records between versions
└── comparisons/                  # Cached comparison summaries
```

---

## User Workflows

### 1. Creating a Version Snapshot

**Manual snapshot:**
```
User clicks "Create Version" button
    ↓
Dialog asks for:
  - Version name (optional): "Pre-quote update"
  - Description (optional): "Snapshot before applying Q1 vendor prices"
    ↓
System captures current BOM state
    ↓
Version created with trigger: 'manual'
```

**Automatic snapshot (on significant changes):**
```
User applies vendor prices (bulk operation)
    ↓
System detects significant change (>£X or >Y items)
    ↓
Auto-creates version with trigger: 'price_update'
    ↓
User notified: "Version 5 created - Price Update"
```

### 2. Viewing Version History

```
┌─────────────────────────────────────────────────────────────────────┐
│  VERSION HISTORY                                    [Create Version] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ──●── v5: Current                              £125,430   Today    │
│    │   Working BOM                              ▲ +2.3%             │
│    │                                                                 │
│  ──●── v4: Q1 Price Update                      £122,650   Dec 15   │
│    │   Applied vendor contract prices           ▲ +5.1%             │
│    │   12 items updated                                             │
│    │                                                                 │
│  ──●── v3: Design Changes                       £116,700   Dec 10   │
│    │   Added cooling assembly                   ▲ +8.2%             │
│    │   15 new items                                                 │
│    │                                                                 │
│  ──●── v2: Initial Costing                      £107,850   Dec 5    │
│    │   Manual cost estimates added              ▲ +12.4%            │
│    │                                                                 │
│  ──●── v1: Initial Import                       £95,920    Dec 1    │
│       Imported from Infor BOM                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Comparing Two Versions

```
┌─────────────────────────────────────────────────────────────────────┐
│  COMPARE VERSIONS                                                    │
│  Base: v3 (Dec 10)  →  Compare: v5 (Current)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  COST SUMMARY                                                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  £116,700  ──────────────────────────────────►  £125,430       │ │
│  │   Base                  +£8,730 (+7.5%)              Compare   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  COST DRIVERS (What caused the change?)                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ████████████████████░░░░░  Vendor Price Increases   +£5,200   │ │
│  │  ████████░░░░░░░░░░░░░░░░░  New Items Added          +£2,800   │ │
│  │  ████░░░░░░░░░░░░░░░░░░░░░  Quantity Increases       +£1,100   │ │
│  │  ██░░░░░░░░░░░░░░░░░░░░░░░  Labour Cost Changes        +£430   │ │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░  Vendor Changes             -£800   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  TOP COST IMPACTS                                                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🔺 B104523  Motor Assembly      +£1,850  Vendor price +15%     │ │
│  │ 🔺 BNEW-007 Custom Bracket      +£1,200  New item added        │ │
│  │ 🔺 B103456  Control Board       +£890    Qty 5→8 (+60%)        │ │
│  │ 🔻 B102345  Fastener Kit        -£450    Switched to Vendor B  │ │
│  │ 🔻 B101234  Gasket              -£350    Removed from BOM      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  CHANGES BY ASSEMBLY                                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  GRP-FRAME-A01     +£3,200  (37% of change)                    │ │
│  │  GRP-COOLING-A01   +£2,800  (32% of change)  ← New assembly    │ │
│  │  GRP-CONTROL-A01   +£1,890  (22% of change)                    │ │
│  │  GRP-FASTENERS     -£450    (-5% of change)                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [View All Changes]  [Export Report]  [View Side-by-Side]           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Side-by-Side Detail View

```
┌─────────────────────────────────────────────────────────────────────┐
│  SIDE-BY-SIDE COMPARISON                          [Filter: Changes] │
├───────────────────────────────┬─────────────────────────────────────┤
│  v3: Design Changes (Base)    │  v5: Current (Compare)              │
├───────────────────────────────┼─────────────────────────────────────┤
│  GRP-FRAME-A01                │  GRP-FRAME-A01                      │
│  ├─ B104523  Motor Assembly   │  ├─ B104523  Motor Assembly         │
│  │  Qty: 2   £850.00  £1,700  │  │  Qty: 2   £925.00  £1,850 🔺+£150│
│  │  Vendor: MotorCo           │  │  Vendor: MotorCo   (price ↑)     │
│  │                            │  │                                   │
│  ├─ B103456  Control Board    │  ├─ B103456  Control Board          │
│  │  Qty: 5   £178.00  £890    │  │  Qty: 8   £178.00  £1,424 🔺+£534│
│  │                            │  │  (qty 5→8)                        │
│  │                            │  │                                   │
│  │  (not present)             │  ├─ BNEW-007  Custom Bracket  🆕    │
│  │                            │  │  Qty: 4   £300.00  £1,200        │
│  │                            │  │  NEW ITEM                        │
│  │                            │  │                                   │
│  ├─ B101234  Gasket           │  │  (removed) ❌                     │
│  │  Qty: 10  £35.00   £350    │  │                                   │
│                               │                                      │
├───────────────────────────────┼─────────────────────────────────────┤
│  TOTALS                       │  TOTALS                             │
│  Items: 45   Cost: £116,700   │  Items: 48   Cost: £125,430         │
│                               │              +£8,730 (+7.5%)        │
└───────────────────────────────┴─────────────────────────────────────┘
```

---

## Feeding into Phase 6: Cost Analysis

The version/change data directly powers these Phase 6 charts:

### Chart 1: Cost Trend Over Time
```
£130k ┤                                          ●─── v5 Current
      │                                     ●───┘
£120k ┤                                ●───┘     v4 Price Update
      │                           ●───┘
£110k ┤                      ●───┘               v3 Design Changes
      │                 ●───┘
£100k ┤            ●───┘                         v2 Initial Costing
      │       ●───┘
 £90k ┤  ●───┘                                   v1 Import
      └────┬────┬────┬────┬────┬────┬────┬────
         Dec 1  5   10   15   20   25   30
```

### Chart 2: Cost Drivers Breakdown (Waterfall)
```
        ┌───────────────────────────────────────────────────────┐
£95,920 │███│                                                   │ v1 Base
        │   │+£11,930                                           │ Manual estimates
        │   │████████│                                          │
        │   │        │+£8,850                                   │ Design changes
        │   │        │███████│                                  │
        │   │        │       │+£5,930                           │ Price updates
        │   │        │       │█████│                            │
        │   │        │       │     │+£2,800                     │ New items
        │   │        │       │     │███│                        │
£125,430│   │        │       │     │   │                        │ v5 Current
        └───┴────────┴───────┴─────┴───┴────────────────────────┘
```

### Chart 3: Cost by Assembly (Treemap/Pie)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌────────────────────────┐  ┌──────────────────────────┐ │
│   │    GRP-FRAME-A01       │  │   GRP-CONTROL-A01        │ │
│   │    £45,200 (36%)       │  │   £28,400 (23%)          │ │
│   │                        │  │                          │ │
│   └────────────────────────┘  └──────────────────────────┘ │
│   ┌────────────────┐  ┌──────────────┐  ┌───────────────┐  │
│   │ GRP-COOLING    │  │ GRP-SEAT     │  │ GRP-OTHER     │  │
│   │ £22,100 (18%)  │  │ £18,500 (15%)│  │ £11,230 (9%)  │  │
│   └────────────────┘  └──────────────┘  └───────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Chart 4: Price Volatility by Item
```
Items with highest price changes v1→v5:

B104523  Motor Assembly     ████████████████████  +18.2%
B105678  Hydraulic Pump     ███████████████       +12.5%
B102345  Sensor Module      ██████████            +8.3%
B103456  Control Board      ██████                +5.1%
B101234  Bracket Assembly   ████                  +3.2%
                            ─────────────────────────────
                            0%    5%    10%   15%   20%
```

---

## Implementation Tasks

### Task 1: Data Model Updates
- [ ] Add `BomVersion` interface to `types/`
- [ ] Add `VersionItem` interface
- [ ] Add `BomChange` interface
- [ ] Add `VersionComparison` interface
- [ ] Add `CostDriver` type
- [ ] Update Firestore indexes

### Task 2: Version Service
- [ ] `createVersion()` - Create new version snapshot
- [ ] `getVersions()` - List all versions for project
- [ ] `getVersion()` - Get single version with items
- [ ] `deleteVersion()` - Delete a version (with confirmation)
- [ ] Auto-snapshot logic for bulk operations

### Task 3: Diff/Comparison Service
- [ ] `compareVersions()` - Generate comparison between two versions
- [ ] `detectChanges()` - Find all changes between versions
- [ ] `categorizeChange()` - Determine cost driver for each change
- [ ] `calculateCostImpact()` - Calculate £ impact of each change
- [ ] `aggregateByDriver()` - Group changes by cost driver
- [ ] `aggregateByAssembly()` - Group changes by assembly

### Task 4: Version Timeline Component
- [ ] `VersionTimeline.tsx` - Visual timeline of versions
- [ ] Version cards with summary stats
- [ ] Compare button to select versions
- [ ] Create version button with dialog

### Task 5: Comparison View Components
- [ ] `VersionComparison.tsx` - Main comparison page
- [ ] `CostSummaryCard.tsx` - Before/after cost summary
- [ ] `CostDriversChart.tsx` - Bar chart of cost drivers
- [ ] `ChangesByAssembly.tsx` - Assembly breakdown
- [ ] `TopChangesTable.tsx` - Most impactful changes
- [ ] `SideBySideView.tsx` - Detailed side-by-side

### Task 6: Integration
- [ ] Add versions tab/section to BOM page
- [ ] Hook into bulk operations to auto-create versions
- [ ] Add "View History" button to item edit drawer
- [ ] Export comparison report

### Task 7: Cloud Functions (Optional)
- [ ] `onBomChange` - Detect significant changes
- [ ] `createScheduledSnapshot` - Daily/weekly snapshots
- [ ] `generateComparisonReport` - PDF generation

---

## Design Decisions (Confirmed)

### 1. Version Creation Triggers
✅ **All of the above:**
- Manual - User clicks "Create Version"
- Auto on import - Always create version after CSV import
- Auto on bulk operations - Create version when 10+ items affected

### 2. Storage Strategy
✅ **Subcollection** - Store items in `versions/{id}/items/` (for 500-1000 items)

### 3. Cost Driver Detection
✅ **Both** - Auto-detect with option for manual override/notes

### 4. Date Range Comparison
✅ **Enabled** - Users can select a date range to see all changes in that period

---

## Date Range Comparison Feature

### How It Works

1. User selects start date and end date
2. System finds version at/before start date and version at/before end date
3. Shows aggregated changes for full period
4. Shows per-version breakdown within the range
5. Cost trend chart shows how cost evolved through the period

### Date Range UI

```
┌─────────────────────────────────────────────────────────────────────┐
│  COMPARE BY DATE RANGE                                              │
├─────────────────────────────────────────────────────────────────────┤
│  From: [ Dec 1, 2024  v ]    To: [ Dec 15, 2024  v ]   [Compare]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PERIOD SUMMARY: Dec 1 - Dec 15 (4 versions)                       │
│  £95,920 ──────────────────────────────────► £122,650              │
│                    +£26,730 (+27.9%)                                │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  CHANGES BY VERSION                                                 │
│  ├── v1 → v2 (Dec 5): Initial Costing        +£11,930             │
│  │   Material estimates added to 45 items                          │
│  │                                                                  │
│  ├── v2 → v3 (Dec 10): Design Changes        +£8,850              │
│  │   15 new items added (cooling assembly)                         │
│  │                                                                  │
│  └── v3 → v4 (Dec 15): Q1 Price Update       +£5,950              │
│      12 items updated with vendor prices                           │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  AGGREGATED COST DRIVERS (Full Period)                             │
│  ████████████████  New Items Added     +£12,800  (48%)            │
│  ████████████      Manual Estimates    +£8,200   (31%)            │
│  ████████          Vendor Prices       +£5,730   (21%)            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

Phase 5 is complete when:

1. [x] Users can create manual version snapshots with name/description
2. [x] Versions auto-created on import and bulk operations (10+ items)
3. [x] Version timeline shows all versions with cost trend
4. [x] Comparing two versions shows cost delta breakdown by driver
5. [x] Date range picker lets user select any period
6. [x] Date range comparison shows aggregated changes + per-version breakdown
7. [x] Cost trend chart shows how cost evolved through the period
8. [x] Each change shows auto-detected reason (with manual override option)
9. [x] Changes aggregated by assembly and by driver (chart-ready for Phase 6)
10. [ ] Side-by-side view shows detailed item differences (future enhancement)

---

## Estimated Effort

| Task | Estimate |
|------|----------|
| Data Model Updates | 2-3 hours |
| Version Service (with date queries) | 5-6 hours |
| Comparison Service (with date range) | 8-10 hours |
| Auto-Version Triggers | 2-3 hours |
| UI Components (timeline, comparison) | 8-10 hours |
| Date Range UI (picker, trend chart, breakdown) | 4-5 hours |
| Page Integration | 3-4 hours |
| Testing & Polish | 3-4 hours |
| **Total** | **35-45 hours** (~5-6 days) |

---

## Implementation Progress

| Task | Status |
|------|--------|
| Data Model & Types | ✅ Complete |
| Version Service | ✅ Complete |
| Comparison Service | ✅ Complete |
| Auto-Version Triggers | ✅ Complete |
| Timeline UI | ✅ Complete |
| Date Range UI | ✅ Complete |
| Comparison UI | ✅ Complete |
| Side-by-Side View | ⏳ Future Enhancement |
| Page Integration | ✅ Complete |

---

## Files Created/Modified

### New Files
- `lib/bom/versionService.ts` - Version CRUD, date queries
- `lib/bom/comparisonService.ts` - Diff algorithm, cost driver detection
- `components/bom/VersionTimeline.tsx` - Version history timeline
- `components/bom/CreateVersionDialog.tsx` - Manual version creation
- `components/bom/VersionComparison.tsx` - Version comparison view
- `components/bom/DateRangeComparison.tsx` - Date range comparison view
- `app/(dashboard)/project/[projectId]/versions/page.tsx` - Versions page

### Modified Files
- `types/bom.ts` - Added version control types
- `firestore.indexes.json` - Added version query indexes
- `lib/import/importProcessor.ts` - Auto-version on import
- `lib/bom/transferService.ts` - Auto-version on bulk transfer
- `app/(dashboard)/project/[projectId]/bom/page.tsx` - Link to versions page

---

**Phase 5 Status**: ✅ Complete  
**Completed**: December 2024

