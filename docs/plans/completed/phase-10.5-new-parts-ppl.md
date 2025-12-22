# Phase 10.5: New Parts Tracker - PPL Replacement (Timeline & New Parts Page Upgrade)

**Status**: ✅ Completed  
**Completed**: December 22, 2024  
**Dependencies**: Phase 9 (Project Management - for PACE gate dates)

---

## Overview

Complete rebuild of the New Parts Tracker as a **procurement management tool** to replace the PPL (Project Parts List) Excel spreadsheet. Designed to handle 500+ parts for a completely new bike project.

### Core Workflow

- **DTX = Order Trigger** - Everything gets ordered when DTX gate is passed
- **Exceptions** - Long lead time parts flagged for early ordering
- **Bulk Management** - Efficiently work through hundreds of parts
- **Visual Planning** - Timeline view to verify parts arrive before Sprint/Mass Prod gates

### Goals

1. **Full PPL parity** - All 54 PPL columns mapped to the app
2. **Two-tab design** - Parts Table (bulk management) + Timeline (visual planning)
3. **500+ part scale** - Virtualized lists, grouped views, bulk actions
4. **PPL Import** - Drag-drop Excel import with create/update logic
5. **Unassigned group** - Parts without a group go to a holding area in BOM
6. **PACE gates on timeline** - Visual markers for DA, DTX, Sprint, Mass Prod
7. **Early order flagging** - Long lead time parts identified automatically

---

## Current State vs Target

| Feature | Current | Target |
|---------|---------|--------|
| Fields tracked | ~20 | 54 (full PPL parity) |
| Part capacity | Untested at scale | 500+ parts, virtualized |
| Sprint order tracking | Basic qty only | Full PO tracking (number, date, late flag, receipt) |
| Production order tracking | Basic qty only | Full PO tracking (number, date, late flag, receipt) |
| Drawing info | None | Drawing number, revision, workflow state |
| Assignments | None | Coordinator, Buyer, SQE, Designer |
| Timeline gates | None | All 8 PACE gates as markers |
| PPL import | None | Full Excel import with mapping |
| Unassigned parts | None | Dedicated BOM group |
| Bulk actions | None | Multi-select, bulk update vendor/PO/status |
| Long lead time alerts | None | Auto-flag parts needing early order |

---

## Data Model Changes

### Updated NewPart Interface

```typescript
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
  status: 'added' | 'design' | 'engineering' | 'procurement' | 'complete';
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
}
```

---

## Page Structure: Two-Tab Design

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ New Parts Tracker                                       [Import PPL] [+ Add]   │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  [📋 Parts Table]    [📅 Timeline]                                             │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  (Tab content - either table or timeline)                                      │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│ 500 parts │ 312 ordered │ Sprint: 8 at risk, 2 late │ Prod: 5 at risk, 3 late │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Tab 1: Parts Table** - Full-width table for bulk management  
**Tab 2: Timeline** - Full-screen Gantt with PACE gates (can go fullscreen)  
**Summary Bar** - Always visible stats, clickable to filter

---

## Tab 1: Parts Table (Bulk Management)

Designed for efficiently processing 500 parts like working in Excel.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ New Parts Tracker                                       [Import PPL] [+ Add]   │
├────────────────────────────────────────────────────────────────────────────────┤
│ [📋 Parts Table]    [📅 Timeline]                                              │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ ┌──────────────────────────────────────────────────────────────────────────┐  │
│ │ 🔍 Search...    [Status ▼] [Group ▼] [⚠️ Missing Info] [🕐 Long Lead]   │  │
│ │                                                                          │  │
│ │ 23 selected                        [Set Vendor...] [Mark Ordered] [...]  │  │
│ └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│ ┌────┬───────────┬─────────────────┬──────────┬─────────┬────────┬──────────┐ │
│ │ ☑  │ Part      │ Description     │ Vendor   │ Lead    │ Sprint │ Prod     │ │
│ ├────┼───────────┼─────────────────┼──────────┼─────────┼────────┼──────────┤ │
│ │    │           │                 │          │         │        │          │ │
│ │ ▼ GRP-FRAME-A01 (45 parts)                                      12 at risk │ │
│ ├────┼───────────┼─────────────────┼──────────┼─────────┼────────┼──────────┤ │
│ │ ☑  │ B184398   │ 16" fork        │ Supplier │ 39w     │ ✅ Ord │ ✅ Ord   │ │
│ │ ☑  │ Bxxx001   │ Frame bracket   │ —        │ —       │ ⚠️ —   │ ⚠️ —     │ │
│ │ ☐  │ Bxxx002   │ Head tube       │ Jones Co │ 12w     │ ✅ Ord │ ⚠️ —     │ │
│ │    │           │                 │          │         │        │          │ │
│ │ ▶ GRP-GEAR-A01 (32 parts)                                       2 at risk  │ │
│ │ ▶ GRP-ELEC-A01 (28 parts)                                       0 at risk  │ │
│ │ ▶ UNASSIGNED (5 parts)                                          5 at risk  │ │
│ │    │           │                 │          │         │        │          │ │
│ └────┴───────────┴─────────────────┴──────────┴─────────┴────────┴──────────┘ │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│ 500 parts │ 312 ordered │ Sprint: 8 at risk, 2 late │ Prod: 5 at risk, 3 late │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Table Features

**Grouped by BOM Group**
- Collapsible sections
- At-risk count shown per group
- UNASSIGNED group at bottom

**Quick Filters**
| Filter | Purpose |
|--------|---------|
| ⚠️ Missing Info | No vendor, no lead time, or no PO |
| 🕐 Long Lead | Parts needing order before DTX |
| Status | Added, Design, Engineering, Procurement, Complete |
| Group | Filter to specific BOM group |

**Bulk Actions (when rows selected)**
- Set Vendor - Apply vendor to all selected
- Mark Ordered - Enter PO# and date for all selected
- Update Freight - Set sea/air for all selected
- Change Status - Move all selected to new status
- Assign Group - Move to a BOM group

**Inline Editing**
- Click any cell to edit
- Tab through cells like Excel
- Auto-save on blur

**Column Visibility**
- Default columns: Part, Description, Vendor, Lead Time, Sprint Status, Prod Status
- Toggle additional columns via column picker (⚙️)
- Columns grouped: Drawing, Assignments, Pricing, Sprint Order, Prod Order, Planning

### Sprint/Production Status Badges

Compact badges with hover details:

| Badge | Meaning |
|-------|---------|
| ✅ Ord | PO placed, on track |
| ⚠️ — | No PO yet |
| 🔴 Late | PO date past target, or not received by target |
| ✓ Rcvd | Fully received |

**Hover to see details:**
```
┌──────────────────────────────────┐
│ Sprint Order                     │
│ ────────────────────────────────│
│ Qty: 40                          │
│ Target: Dec 6, 2026              │
│ PO: PX00057395                   │
│ PO Date: Dec 1, 2026             │
│ Status: On Track ✅              │
│ Received: 40/40                  │
└──────────────────────────────────┘
```

---

## Tab 2: Timeline (Visual Planning)

Full-screen Gantt for reviewing schedule and identifying risks.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ New Parts Tracker                                       [Import PPL] [+ Add]   │
├────────────────────────────────────────────────────────────────────────────────┤
│ [📋 Parts Table]    [📅 Timeline]                               [⛶ Fullscreen] │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ [Zoom: Month ▼]  [◀ Prev]  [Today]  [Next ▶]           [Filter: All ▼]        │
│                                                                                │
│      TODAY        DA         DTX              Sprint              Mass Prod    │
│        │          │          │                   │                    │        │
│  ──────┼──────────┼──────────┼───────────────────┼────────────────────┼─────▶  │
│        │       Jan 15     Feb 1              Mar 15               May 1        │
│        │          │          │                   │                    │        │
│                   │          │                   │                    │        │
│ ⚠️ EARLY ORDERS (3 parts - order before DTX)     │                    │        │
│   B107234 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░│                    │        │
│   B108456 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░│                    │        │
│   B109789 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░│                    │        │
│                   │          │                   │                    │        │
│ ▼ GRP-FRAME-A01 (45 parts)   │                   │    Sprint ────────│──────  │
│   B184398         │  ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░│                    │        │
│   Bxxx001         │       ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░│                    │        │
│   Bxxx002         │          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│▓▓▓▓ 🔴             │        │
│                   │          │                   │                    │        │
│ ▶ GRP-GEAR-A01 (32 parts) ─────────────── 2 at risk                  │        │
│ ▶ GRP-ELEC-A01 (28 parts) ─────────────── all on track               │        │
│ ▶ GRP-SEAT-A01 (18 parts) ─────────────── 1 late                     │        │
│                   │          │                   │                    │        │
├────────────────────────────────────────────────────────────────────────────────┤
│ 500 parts │ 312 ordered │ Sprint: 8 at risk, 2 late │ Prod: 5 at risk, 3 late │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Timeline Features

**PACE Gate Markers**
- Vertical dashed lines for each gate
- Labels at top: DA, DTX, Sprint, Mass Prod, etc.
- Dates shown below labels
- Gate dates from Project Settings (Phase 9)

**Grouped View**
- Groups collapsed by default (shows summary bar)
- Click to expand and see individual parts
- At-risk/late count per group

**Early Orders Section**
- Auto-detected: lead time exceeds time until DTX
- Shown at top with ⚠️ warning
- These parts need ordering NOW, not at DTX

**Gantt Bars**
- ▓▓▓ Solid = Order/manufacturing period
- ░░░ Lighter = Transit period (sea or air)
- 🔴 = Bar extends past target gate (late)
- Two bars per part if showing both Sprint and Production

**Controls**
- Zoom: Day / Week / Month / Quarter
- Navigation: Previous, Today, Next
- Filter: All / At Risk / Late / By Group
- Fullscreen: Expand for presentations

**Interactions**
- Click bar → Open part detail drawer
- Click gate → Show all parts targeting that gate
- Hover bar → Show order details tooltip

---

## Detail Drawer (Shared)

Opens when clicking a part in either tab. Reorganized into 6 focused tabs.

### Tab Structure

**Tab 1: Overview**
- Part code (placeholder → final)
- Description
- Category
- BOM Group (dropdown, includes Unassigned)
- Status workflow selector
- Priority selector
- Key flags: OEM part, Color touchpoint, New supplier

**Tab 2: Drawing & Design**
- Drawing number (incl. variant)
- Drawing revision
- PDF revision
- Workflow state (Not Started → In Progress → In Review → Released)
- Drawing release deadline
- Design engineer assignment
- Design notes

**Tab 3: Sourcing & Pricing**
- Vendor selection
- OEM part number (if OEM)
- Country of origin
- New/existing supplier flag
- Factory location
- Quoted price + currency
- Cost source (Placeholder / Estimate / Quote / Contract)
- Quotation requested checkbox

**Tab 4: Sprint Order**
```
┌─────────────────────────────────────────────────────────────┐
│ SPRINT ORDER                                                │
├─────────────────────────────────────────────────────────────┤
│ Quantity          [40        ]                              │
│ Target Date       [Dec 6, 2026      ] 📅                    │
│                                                             │
│ ── Order Details ──────────────────────────────────────     │
│ PO Number         [PX00057395       ]                       │
│ PO Date           [Dec 1, 2026      ] 📅                    │
│ PO Release Deadline [Nov 15, 2026   ] 📅                    │
│                                                             │
│ Status: ✅ On Track                                         │
│ (PO placed, arriving 5 days before target)                  │
│                                                             │
│ ── Receipt ────────────────────────────────────────────     │
│ Received?         [Yes ▼]                                   │
│ Qty Received      [40        ] / 40                         │
│ Qty Outstanding   0                                         │
└─────────────────────────────────────────────────────────────┘
```

**Tab 5: Production Order**
Same structure as Sprint Order, plus:
- P&A Forecast field
- Scrap Rate field
- Total Qty (calculated: mass prod + P&A + scrap)

**Tab 6: Notes & History**
- Comments (dated entries like PPL)
- Tooling/commitment notes
- Yearly forecasts (Year 1-4)
- Change history log

---

## Assignments

Tracked per part for accountability:

| Role | Purpose |
|------|---------|
| Project Coordinator | Overall part owner (you) |
| Buyer | Purchasing responsibility |
| SQE | Quality responsibility |
| Design Engineer | Design responsibility |

**Implementation**: Free text fields (not linked to user accounts). Can filter table by assignee.

---

## PPL Import Feature

### Import Dialog Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  IMPORT FROM PPL                                                  [X]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1: Upload                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │   📄 Drop your PPL Excel file here                              │   │
│  │      or click to browse                                          │   │
│  │                                                                  │   │
│  │   Supports: .xlsx, .xls, .csv                                   │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│  IMPORT FROM PPL                                                  [X]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 2: Review                                                         │
│                                                                         │
│  Found 45 parts in "PPL_Project_Alpha.xlsx"                            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ✨ 32 new parts                                                 │   │
│  │     Will create in New Parts Tracker + BOM                       │   │
│  │                                                                  │   │
│  │  🔄 8 existing parts (matched by B-code)                         │   │
│  │     Will update with PPL data                                    │   │
│  │                                                                  │   │
│  │  📥 5 parts without group                                        │   │
│  │     Will go to Unassigned in BOM                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Preview:                                                               │
│  ┌────────────┬─────────────────┬───────────────┬───────────┐          │
│  │ B-Code     │ Description     │ Group         │ Action    │          │
│  ├────────────┼─────────────────┼───────────────┼───────────┤          │
│  │ B184398    │ 16" fork        │ —             │ ✨ Create │          │
│  │ B103456    │ Frame tube      │ GRP-FRAME-A01 │ 🔄 Update │          │
│  │ Bxxx001    │ New bracket     │ —             │ ✨ Create │          │
│  │ B107234    │ Seat post       │ GRP-SEAT-A01  │ 🔄 Update │          │
│  │ ...        │                 │               │           │          │
│  └────────────┴─────────────────┴───────────────┴───────────┘          │
│                                                     [Show all 45]       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ☑ Create parts in BOM (Unassigned if no group)                  │   │
│  │ ☑ Update existing parts with PPL data                           │   │
│  │ ☐ Overwrite my changes with PPL data (caution)                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Cancel]                                        [Import 45 Parts]      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Column Mapping

Auto-detect PPL columns and map to NewPart fields:

| PPL Column | NewPart Field |
|------------|---------------|
| B or Q Code | placeholderCode / finalItemCode |
| Description | description |
| Drawing Number incl. Variant | drawingNumber |
| PDM revision | drawingRevision |
| Category | category |
| Part Cost | quotedPrice |
| Currency | currency |
| Estimate or Quote | costSource |
| Supplier Selected for Production Parts | vendorName |
| Production Leadtime Incl. Shipping (weeks) | productionLeadTimeWeeks |
| Sprint qty | sprintQuantity |
| Sprint Stock in plant TARGET DATE | sprintTargetDate |
| Sprint PO number | sprintPoNumber |
| Sprint PO due date | sprintPoDate |
| Single Production run qty | massProductionQuantity |
| P&A forecast/Warranty | paForecast |
| Scrap rate | scrapRate |
| Production Run MRD TARGET DATE | productionTargetDate |
| Production PO number | productionPoNumber |
| Production PO due date | productionPoDate |
| Is PO late? For production | productionPoLate |
| Received? | productionReceived |
| Qty Outstanding | productionQtyOutstanding |
| Comments | comments |
| ... | ... |

### Import Service

```typescript
// lib/import/pplImportService.ts

interface PplImportResult {
  created: number;
  updated: number;
  unassigned: number;
  errors: Array<{ row: number; error: string }>;
}

async function importFromPpl(
  projectId: string,
  file: File,
  options: {
    createInBom: boolean;
    updateExisting: boolean;
    overwriteChanges: boolean;
  }
): Promise<PplImportResult>
```

---

## Unassigned Group in BOM

### BOM Structure

```
BOM Explorer
│
├── GRP-FRAME-A01 (Frame Assembly)
│   ├── B103985 - Frame tube main
│   └── B104001 - Frame bracket
│
├── GRP-GEAR-A01 (Gear Assembly)
│   └── B105001 - Chainring
│
├── GRP-SEAT-A01 (Seat Assembly)
│   └── B107234 - Seat post
│
└── 📥 UNASSIGNED (3 parts)              ← Special group
    ├── Bxxx001 - New bracket            ← No group assigned yet
    ├── B184398 - 16" fork               ← Imported from PPL, no group
    └── Bxxx002 - Custom widget          ← Created in tracker, no group
```

### Behaviour

1. **Auto-created**: The UNASSIGNED group is created automatically when needed
2. **System group**: Cannot be deleted or renamed
3. **Visual distinction**: Different styling (dashed border, muted color)
4. **Drag to assign**: Drag parts from Unassigned to a real group
5. **Inline assign**: Dropdown in table to assign group
6. **Counts toward totals**: Unassigned parts still count in BOM stats
7. **Warning indicator**: Show count in BOM header if parts are unassigned

### Implementation

```typescript
// Special group code
const UNASSIGNED_GROUP_CODE = '__UNASSIGNED__';

// Check if group exists when creating BomItem
if (!groupCode || groupCode === '') {
  groupCode = UNASSIGNED_GROUP_CODE;
}
```

---

## Two-Way Sync

### BOM → New Parts Tracker

When a BOM item is created/updated with `isNewPart: true`:

```typescript
// Firestore trigger or service function
async function syncBomToNewParts(bomItem: BomItem) {
  if (!bomItem.isNewPart) return;
  
  const existingPart = await findNewPartByBomItemId(bomItem.id);
  
  if (existingPart) {
    // Update existing
    await updateNewPart(existingPart.id, {
      description: bomItem.itemDescription,
      groupCode: bomItem.groupCode,
      quantity: bomItem.quantity,
    });
  } else {
    // Create new
    await createNewPart({
      projectId: bomItem.projectId,
      bomItemId: bomItem.id,
      placeholderCode: bomItem.itemCode,
      description: bomItem.itemDescription,
      groupCode: bomItem.groupCode || UNASSIGNED_GROUP_CODE,
      quantity: bomItem.quantity,
      status: 'added',
      priority: 'medium',
      // ... defaults
    });
  }
}
```

### New Parts Tracker → BOM

When a NewPart is created:

```typescript
async function syncNewPartToBom(newPart: NewPart) {
  const existingBomItem = await findBomItemByCode(
    newPart.projectId, 
    newPart.placeholderCode
  );
  
  if (existingBomItem) {
    // Link to existing
    await updateNewPart(newPart.id, { bomItemId: existingBomItem.id });
  } else {
    // Create BOM item
    const bomItem = await createBomItem({
      projectId: newPart.projectId,
      itemCode: newPart.placeholderCode,
      itemDescription: newPart.description,
      groupCode: newPart.groupCode || UNASSIGNED_GROUP_CODE,
      quantity: newPart.quantity,
      isNewPart: true,
      isPlaceholder: true,
      costSource: 'placeholder',
    });
    
    await updateNewPart(newPart.id, { bomItemId: bomItem.id });
  }
}
```

### On Part Completion

When NewPart status → 'complete':

```typescript
async function onNewPartComplete(newPart: NewPart) {
  if (!newPart.bomItemId) return;
  
  await updateBomItem(newPart.bomItemId, {
    itemCode: newPart.finalItemCode,
    materialCost: newPart.quotedPrice,
    vendorCode: newPart.vendorCode,
    vendorName: newPart.vendorName,
    costSource: newPart.costSource || 'contract',
    isNewPart: false,
    isPlaceholder: false,
  });
}
```

---

## Early Order Detection Logic

Parts with long lead times that need ordering before DTX are automatically flagged:

```typescript
interface EarlyOrderCheck {
  needsEarlyOrder: boolean;
  mustOrderBy: Date;
  reason: string;
}

function checkEarlyOrder(part: NewPart, project: Project): EarlyOrderCheck {
  const today = new Date();
  const dtxDate = project.gates.dtx.date;
  const sprintDate = project.gates.sprint.date;
  
  // Calculate total lead time (manufacturing + transit)
  const transitDays = part.freightType === 'sea' ? part.seaFreightDays : part.airFreightDays;
  const totalLeadTimeDays = (part.baseLeadTimeDays || 0) + transitDays;
  
  // When must this part be ordered to arrive before Sprint?
  const mustOrderBy = subDays(sprintDate, totalLeadTimeDays);
  
  // Does it need to be ordered before DTX?
  const needsEarlyOrder = mustOrderBy < dtxDate;
  
  return {
    needsEarlyOrder,
    mustOrderBy,
    reason: needsEarlyOrder 
      ? `${totalLeadTimeDays} day lead time requires ordering by ${format(mustOrderBy, 'MMM d')}`
      : ''
  };
}
```

**In Table**: Shows 🕐 badge, filterable via "Long Lead" filter  
**In Timeline**: Grouped under "⚠️ EARLY ORDERS" section at top

---

## Implementation Tasks

### Phase A: Foundation (2 days)

**Task A1: Data Model Update**
- [ ] Update `NewPart` interface with all 54 PPL fields
- [ ] Add migration script for existing data (set defaults)
- [ ] Update Firestore security rules for new fields
- [ ] Add `UNASSIGNED_GROUP_CODE` constant

**Task A2: Unassigned Group in BOM**
- [ ] Add Unassigned group logic to BOM service
- [ ] Update BomTree to show Unassigned section (special styling)
- [ ] Update BomTable with group dropdown
- [ ] Implement drag-to-assign from Unassigned

### Phase B: Parts Table Tab (4-5 days)

**Task B1: Table Structure**
- [ ] Build new table component with virtualization (TanStack Virtual)
- [ ] Implement grouped rows (collapsible BOM groups)
- [ ] Add row selection (checkbox column)
- [ ] Show at-risk count per group

**Task B2: Filters & Search**
- [ ] Search across part code, description, vendor
- [ ] Status filter dropdown
- [ ] Group filter dropdown
- [ ] "Missing Info" quick filter
- [ ] "Long Lead" quick filter (early order detection)

**Task B3: Bulk Actions**
- [ ] Multi-select UI (select all in group, select all visible)
- [ ] Bulk "Set Vendor" action
- [ ] Bulk "Mark Ordered" action (PO# + date)
- [ ] Bulk "Update Freight" action
- [ ] Bulk "Change Status" action
- [ ] Bulk "Assign Group" action

**Task B4: Inline Editing**
- [ ] Click-to-edit cells
- [ ] Tab navigation between cells
- [ ] Auto-save on blur
- [ ] Validation feedback

**Task B5: Column Management**
- [ ] Column picker component (⚙️ button)
- [ ] Column groups (Drawing, Assignments, Sprint, Prod, etc.)
- [ ] Save column preferences to localStorage
- [ ] Default column set for Product Coordinator role

**Task B6: Status Badges**
- [ ] Sprint status badge with hover tooltip
- [ ] Production status badge with hover tooltip
- [ ] "Late" auto-calculation logic
- [ ] "At Risk" detection (missing info)

### Phase C: Timeline Tab (3-4 days)

**Task C1: Timeline Structure**
- [ ] Full-width Gantt component
- [ ] PACE gate markers (vertical lines with labels)
- [ ] Pull gate dates from project settings
- [ ] Today marker

**Task C2: Grouped View**
- [ ] Collapse groups by default
- [ ] Summary bar per group (date range + risk count)
- [ ] Expand to show individual parts
- [ ] "Early Orders" section at top

**Task C3: Gantt Bars**
- [ ] Order period bar (solid)
- [ ] Transit period bar (lighter shade)
- [ ] Late indicator (bar extends past gate)
- [ ] Dual bars for Sprint + Production

**Task C4: Controls**
- [ ] Zoom levels: Day / Week / Month / Quarter
- [ ] Navigation: Previous / Today / Next
- [ ] Filter dropdown: All / At Risk / Late / By Group
- [ ] Fullscreen button

**Task C5: Interactions**
- [ ] Click bar → open detail drawer
- [ ] Click gate → filter to parts targeting that gate
- [ ] Hover bar → tooltip with order details
- [ ] Pan and zoom (mouse drag, scroll wheel)

### Phase D: Detail Drawer (2 days)

**Task D1: Drawer Structure**
- [ ] 6-tab layout
- [ ] Tab 1: Overview (basic info, assignments, flags)
- [ ] Tab 2: Drawing & Design
- [ ] Tab 3: Sourcing & Pricing

**Task D2: Order Tabs**
- [ ] Tab 4: Sprint Order (qty, target, PO, receipt)
- [ ] Tab 5: Production Order (qty, target, PO, receipt, P&A, scrap)
- [ ] Auto-calculate "Late" status
- [ ] Auto-calculate total production qty

**Task D3: Notes Tab**
- [ ] Tab 6: Notes & History
- [ ] Dated comments (append-style like PPL)
- [ ] Tooling commitment notes
- [ ] Yearly forecasts
- [ ] Change history log

### Phase E: PPL Import (3 days)

**Task E1: Import Dialog**
- [ ] Drag-drop file upload
- [ ] File validation (.xlsx, .xls, .csv)
- [ ] Column auto-detection

**Task E2: Preview & Mapping**
- [ ] Show found parts count
- [ ] Categorize: New / Update / Unassigned
- [ ] Preview table with action column
- [ ] Options checkboxes (create in BOM, update existing, overwrite)

**Task E3: Import Service**
- [ ] Column mapping logic (PPL columns → NewPart fields)
- [ ] Create vs Update detection (match by B-code)
- [ ] Batch processing (chunks of 50)
- [ ] Progress indicator
- [ ] Error handling and reporting

**Task E4: BOM Integration**
- [ ] Create BomItem for each imported part
- [ ] Assign to group or Unassigned
- [ ] Link NewPart.bomItemId

### Phase F: Two-Way Sync (1 day)

**Task F1: BOM → New Parts**
- [ ] When BomItem created with `isNewPart: true`, create NewPart
- [ ] Sync description, group, quantity changes

**Task F2: New Parts → BOM**
- [ ] When NewPart created, create linked BomItem
- [ ] Assign to Unassigned if no group

**Task F3: Completion Sync**
- [ ] When NewPart status → 'complete', update BomItem
- [ ] Set finalItemCode, price, vendor, costSource
- [ ] Clear isNewPart and isPlaceholder flags

### Phase G: Polish & Performance (2 days)

**Task G1: Performance**
- [ ] Test with 500+ parts
- [ ] Verify virtualization works smoothly
- [ ] Optimize Firestore queries (indexes)
- [ ] Lazy load detail drawer content

**Task G2: Summary Stats Bar**
- [ ] Total parts count
- [ ] Ordered count
- [ ] Sprint at-risk and late counts
- [ ] Production at-risk and late counts
- [ ] Click stat to filter

**Task G3: Error Handling**
- [ ] Form validation
- [ ] Save error handling
- [ ] Import error reporting
- [ ] Offline handling

**Task G4: Mobile Responsiveness**
- [ ] Table horizontal scroll on mobile
- [ ] Timeline simplified view on mobile
- [ ] Drawer full-screen on mobile

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `components/new-parts/PartsTableTab.tsx` | Main table tab component |
| `components/new-parts/PartsTable.tsx` | Virtualized grouped table |
| `components/new-parts/TableFilters.tsx` | Filter bar component |
| `components/new-parts/BulkActions.tsx` | Bulk action toolbar |
| `components/new-parts/ColumnPicker.tsx` | Column visibility picker |
| `components/new-parts/StatusBadge.tsx` | Sprint/Prod status badges |
| `components/new-parts/TimelineTab.tsx` | Main timeline tab component |
| `components/new-parts/GanttTimeline.tsx` | Full Gantt with gates |
| `components/new-parts/GateMarkers.tsx` | PACE gate vertical lines |
| `components/new-parts/GroupedGanttRow.tsx` | Collapsible group row |
| `components/new-parts/SummaryStatsBar.tsx` | Bottom stats bar |
| `components/import/PplImportDialog.tsx` | PPL import dialog |
| `components/import/ImportPreview.tsx` | Import preview table |
| `components/bom/UnassignedGroup.tsx` | Unassigned group in BOM |
| `lib/import/pplImportService.ts` | PPL import logic |
| `lib/import/pplColumnMapper.ts` | Column auto-detection |
| `lib/parts/earlyOrderDetection.ts` | Long lead time flagging |

### Modified Files

| File | Changes |
|------|---------|
| `types/newPart.ts` | Add all 54 PPL fields |
| `types/bom.ts` | Add UNASSIGNED_GROUP_CODE |
| `app/(dashboard)/project/[projectId]/new-parts/page.tsx` | Two-tab layout |
| `components/new-parts/NewPartDetailDrawer.tsx` | 6 tabs, new sections |
| `components/bom/BomTree.tsx` | Unassigned group section |
| `components/bom/BomTable.tsx` | Group dropdown |
| `lib/bom/newPartService.ts` | Sync logic, new fields, early order check |
| `lib/bom/bomService.ts` | Unassigned group handling |
| `lib/hooks/useNewParts.ts` | Updated for new fields |

---

## Success Criteria

Phase 10.5 is complete when:

### Data & Import
- [ ] All 54 PPL columns are captured in the app
- [ ] PPL Excel can be imported (create new + update existing)
- [ ] Import handles 500+ parts with progress indicator
- [ ] Parts without groups appear in Unassigned section

### Parts Table Tab
- [ ] Table handles 500+ parts smoothly (virtualized)
- [ ] Rows grouped by BOM group (collapsible)
- [ ] Bulk actions work (set vendor, mark ordered, etc.)
- [ ] Inline editing works with tab navigation
- [ ] Column picker allows showing/hiding column groups
- [ ] "Missing Info" and "Long Lead" filters work

### Timeline Tab
- [ ] All 8 PACE gate markers displayed
- [ ] Groups collapsed by default, expandable
- [ ] "Early Orders" section shows long lead time parts
- [ ] Gantt bars show order + transit periods
- [ ] Late parts visually indicated
- [ ] Fullscreen mode works
- [ ] Zoom and navigation controls work

### Status & Calculations
- [ ] Sprint/Production status badges show correct state
- [ ] "Late" flags auto-calculate based on dates
- [ ] "Early Order" detection flags long lead times
- [ ] Summary stats bar shows accurate counts

### Integration
- [ ] Two-way sync works between BOM and New Parts
- [ ] Part completion updates linked BomItem
- [ ] Unassigned parts can be dragged to groups

---

## Open Questions

1. **Assignments**: Free text confirmed. Should we add autocomplete from previously used names?

2. **Comments format**: Single text field with manual dates, or structured list of dated entries?

3. **Export**: Should there be a "Export to PPL" function to get data back out to Excel?

4. **Notifications**: Should long lead time parts trigger any alerts/notifications?

5. **History**: How much change history to track? Just status changes, or all field changes?

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| A: Foundation | 2 days | - |
| B: Parts Table | 4-5 days | A |
| C: Timeline | 3-4 days | A |
| D: Detail Drawer | 2 days | A |
| E: PPL Import | 3 days | A, B |
| F: Two-Way Sync | 1 day | A, B |
| G: Polish | 2 days | All above |
| **Total** | **~2.5-3 weeks** | |

Phases B, C, D can run in parallel after A is complete.


