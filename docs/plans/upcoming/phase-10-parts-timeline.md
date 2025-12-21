# Phase 10: Parts Order Timeline (Gantt Chart)

**Status**: 📋 Planned  
**Estimated Duration**: 2-3 weeks  
**Dependencies**: Phase 9 (Project Management)

---

## Overview

Interactive Gantt chart for tracking part orders against project gates, with freight toggle for sea/air shipping.

---

## Route

| Route | Description |
|-------|-------------|
| `/project/[id]/parts-timeline` | NEW - Gantt chart view |

---

## Page Layout

The Parts Timeline page has three main sections:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           SUMMARY STAT CARDS                                  │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Total Parts │  │ Sprint      │  │ Mass Prod   │  │ ⚠ At Risk   │          │
│  │     47      │  │  Ready      │  │   Ready     │  │             │          │
│  │             │  │  32/38      │  │   18/47     │  │     6       │          │
│  │             │  │   84%  ✓    │  │    38%      │  │   parts     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Days to     │  │ Days to     │  │ Orders      │  │ In Transit  │          │
│  │ Sprint Gate │  │ Mass Prod   │  │  Placed     │  │             │          │
│  │    23       │  │    67       │  │   28/47     │  │     12      │          │
│  │             │  │             │  │    60%      │  │   parts     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           GANTT CHART AREA                                    │
│  (Fixed height, large, prominent - takes up majority of screen)              │
│                                                                              │
│  Gate Markers:  |DTX|          |Sprint|              |DTL|     |Mass Prod|   │
│                 ▼              ▼                     ▼         ▼             │
│  ───────────────┼──────────────┼─────────────────────┼─────────┼──────────►  │
│                                                                              │
│  UNIFIED ROWS (one bar per part, combined orders):                           │
│                                                                              │
│  Part A (sea)   [███ Sprint ███]✓[░░░░░░░░░░ Mass Prod ░░░░░░░░░░░░░░░░░]→   │
│  Part B (air)         [█ Sprint █]✓                                          │
│  Part C (sea)   [█████ LATE! █████]⚠[░░░░░░░░ Mass Prod ░░░░░░░░░░░░░░]→     │
│  Part D (sea)                      [██ Combined Order ██░░░░░░░░░░░░░░░]→    │
│                   (Sprint+Mass ordered together - single start, extended bar)│
│                                                                              │
│  ────────────────────────────────────────────────────────────────────────    │
│                        (Blank space if fewer parts)                          │
│                                                                              │
│  Legend: [███] Sprint order  [░░░] Mass Prod extension  ✓ Received  ⚠ Late   │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        PART SELECTION TABLE                                   │
│  Select which parts to display in the Gantt chart above                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ☑ Select All                                          [X] selected    │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ ▼ MOTOR ASSEMBLY                                      [☑ Select All]  │  │
│  │   ☑ | MOT-001 | Drive Motor Assembly    | Sprint | 🚢 Sea | 45 days   │  │
│  │   ☑ | MOT-002 | Motor Controller PCB    | Sprint | ✈️ Air | 12 days   │  │
│  │   ☐ | MOT-003 | Motor Mount Bracket     | Mass   | 🚢 Sea | 60 days   │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ ▼ CHASSIS                                             [☐ Select All]  │  │
│  │   ☐ | CHS-001 | Main Frame Weldment     | Sprint | 🚢 Sea | 90 days   │  │
│  │   ☐ | CHS-002 | Cross Member Bracket    | Mass   | 🚢 Sea | 30 days   │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ ▼ ELECTRONICS                                         [☑ Select All]  │  │
│  │   ☑ | ELC-001 | Main Control Board      | Sprint | ✈️ Air | 21 days   │  │
│  │   ☑ | ELC-002 | Power Distribution      | Sprint | 🚢 Sea | 35 days   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Gantt Chart Behavior

### Fixed Height Design
- Gantt chart area has a **minimum height** (e.g., `min-h-[500px]` or `min-h-[60vh]`)
- Chart is large and prominent - the main focus of the page
- If fewer parts are selected, blank space shows below the rows
- Rows do NOT stretch to fill the space - maintain consistent row height
- Scrollable internally if many parts selected

### Visual Hierarchy
- Gate markers always visible at top
- Selected parts render as rows from top-down
- Empty state shows centered message: "Select parts below to view timeline"

### Unified Bar Design
Each part has **one row** with a unified bar that can show:

1. **Sprint only**: Single solid bar ending at Sprint gate
2. **Mass Production only**: Single lighter/striped bar ending at Mass Prod gate
3. **Both (separate orders)**: Solid bar to Sprint gate, then lighter bar extends to Mass Prod gate
4. **Both (combined order)**: Single start point, bar extends all the way to Mass Prod gate with color transition at Sprint gate

```
Sprint only:        [████████████]✓ Sprint
Mass Prod only:                      [░░░░░░░░░░░░░░░░]→ Mass Prod
Both (separate):    [████████████]✓ Sprint [░░░░░░░░░░░░]→ Mass Prod
Combined order:     [██████████████████░░░░░░░░░░░░░░░░]→ (ordered together)
```

---

## Tasks

- [ ] **Create PartOrder data model** in `types/newPart.ts`
- [ ] **Create orderTrackingService.ts** with lead time calculations
- [ ] **Build TimelineSummaryCards.tsx** (stat cards at top)
- [ ] **Build PartsGantt.tsx** component (main chart with fixed height)
- [ ] **Build GanttRow.tsx** component (individual part row)
- [ ] **Implement FreightToggle.tsx** (sea/air with live updates)
- [ ] **Build PartSelectionTable.tsx** (grouped table with checkboxes)
- [ ] **Create parts-timeline page** with three-section layout
- [ ] **Build Excel importer** for part orders (awaiting file format)
- [ ] **Connect risk metrics** with Phase 9

---

## Data Model

Add to `types/newPart.ts`:

```typescript
export interface PartOrder {
  id: string;
  newPartId: string;              // Link to NewPart
  projectId: string;
  
  // Part info (denormalized for display)
  itemCode: string;
  description: string;
  groupName?: string;             // Assembly/category for grouping in selection table
  
  // Order types (can have both!)
  hasSprint: boolean;             // Part needed for Sprint
  hasMassProduction: boolean;     // Part needed for Mass Production
  isCombinedOrder: boolean;       // Sprint + Mass ordered together (same order date)
  
  // Quantities
  sprintQuantity?: number;        // Qty for Sprint (if hasSprint)
  massProductionQuantity?: number;// Qty for Mass Production (if hasMassProduction)
  scrapRate: number;              // Percentage (e.g., 5 = 5%)
  totalOrderQuantity: number;     // Combined qty with scrap applied
  
  // Lead times (in days)
  baseLeadTimeDays: number;       // From vendor contract or manual
  freightType: 'sea' | 'air';     // Default: sea
  airFreightDays: number;         // Transit time if using air
  seaFreightDays: number;         // Transit time if using sea (default)
  effectiveLeadTime: number;      // Based on selected freight type
  
  // Timeline dates - Sprint
  sprintRequiredBy?: Timestamp;   // Sprint gate date
  sprintOrderBy?: Timestamp;      // When to order for Sprint
  sprintArrivalDate?: Timestamp;  // Actual/expected arrival for Sprint
  sprintStatus?: 'not_ordered' | 'ordered' | 'in_transit' | 'received';
  
  // Timeline dates - Mass Production
  massProductionRequiredBy?: Timestamp;  // Mass Prod gate date
  massProductionOrderBy?: Timestamp;     // When to order for Mass Prod
  massProductionArrivalDate?: Timestamp; // Actual/expected arrival for Mass Prod
  massProductionStatus?: 'not_ordered' | 'ordered' | 'in_transit' | 'received';
  
  // Combined order dates (when isCombinedOrder = true)
  actualOrderDate?: Timestamp;    // Single order date for combined
  
  // Status flags
  isSprintLate: boolean;          // Sprint order date passed & not ordered
  isMassProductionLate: boolean;  // Mass Prod order date passed & not ordered
  
  // Costs
  unitPrice?: number;
  totalCost?: number;
  airFreightPremium?: number;     // Extra cost for air freight
  
  // Metadata
  vendorCode?: string;
  vendorName?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Components to Create

### PartsGantt.tsx
Main Gantt chart component:
- X-axis: Date timeline with gate markers (DTX, Sprint, DTL, Mass Prod)
- Y-axis: Selected parts only (one row per part, NOT grouped by order type)
- **Unified bars** with color segments for Sprint vs Mass Production
- Color coding:
  - Sprint portion: solid color (e.g., `bg-blue-500`)
  - Mass Prod portion: different shade/pattern (e.g., `bg-blue-300` or striped)
  - Late: red highlight
  - Received: green with checkmark
- Zoom controls (week/month/quarter view)
- **Fixed minimum height** (`min-h-[500px]` or `min-h-[60vh]`)
- **Blank space preserved** when fewer parts are displayed
- Rows align to top, do not stretch
- Empty state when no parts selected

### GanttRow.tsx
Individual part row with **unified timeline bar**:
- Part code and description (left side)
- Freight type indicator (🚢 sea / ✈️ air)
- **Single unified bar** showing:
  - **Sprint segment** (solid color, e.g., blue) - ends at Sprint gate
  - **Mass Production segment** (different color/pattern, e.g., striped or lighter shade) - extends to Mass Prod gate
  - **Combined order indicator** when Sprint + Mass ordered together (single start point)
- Status indicators per segment (✓ received, ⚠ late)
- Click to open details drawer
- Hover to see dates and quantities

### FreightToggle.tsx
Toggle between sea and air freight:
- Visual toggle switch
- Shows lead time difference
- Shows cost difference (if available)
- Instantly updates timeline bar

### PartSelectionTable.tsx
Grouped selection table below Gantt chart:
- **Master "Select All" checkbox** at top (selects all parts across all groups)
- **Shows count** of selected parts (e.g., "12 selected")
- **Collapsible groups** by assembly/category
- **Group header row** with:
  - Expand/collapse toggle (▼/▶)
  - Group name
  - "Select All" checkbox for that group only
- **Part rows within each group**:
  - Individual checkbox
  - Part code
  - Description
  - Order type (Sprint/Mass)
  - Freight indicator (🚢/✈️)
  - Lead time (days)
- **Selection state syncs** with Gantt chart above in real-time
- Scrollable with sticky header

### TimelineSummaryCards.tsx
Summary stat cards displayed at top of page:
- **Row 1:**
  - Total Parts (count of all parts in project)
  - Sprint Ready (X/Y parts received for Sprint, percentage, green if >80%)
  - Mass Prod Ready (X/Y parts received for Mass Prod, percentage)
  - At Risk (count of late parts, red highlight if >0)
- **Row 2:**
  - Days to Sprint Gate (countdown, yellow if <14 days, red if <7)
  - Days to Mass Prod Gate (countdown)
  - Orders Placed (X/Y, percentage)
  - In Transit (count of parts currently shipping)
- Cards are responsive - stack on mobile
- Click a card to filter the Gantt chart (optional enhancement)

---

## Files to Create/Modify

| Type | Path |
|------|------|
| Modify | `types/newPart.ts` |
| Create | `components/new-parts/PartsGantt.tsx` |
| Create | `components/new-parts/GanttRow.tsx` |
| Create | `components/new-parts/FreightToggle.tsx` |
| Create | `components/new-parts/GanttLegend.tsx` |
| Create | `components/new-parts/PartSelectionTable.tsx` |
| Create | `components/new-parts/TimelineSummaryCards.tsx` |
| Create | `lib/bom/orderTrackingService.ts` |
| Create | `lib/import/partOrderImporter.ts` |
| Create | `lib/hooks/usePartOrders.ts` |
| Create | `lib/hooks/usePartSelection.ts` |
| Create | `lib/hooks/useTimelineStats.ts` |
| Create | `app/(dashboard)/project/[projectId]/parts-timeline/page.tsx` |
| Modify | `components/layout/ProjectSidebar.tsx` (add Parts Timeline link) |

---

## Order Tracking Service

`lib/bom/orderTrackingService.ts`:

```typescript
// Calculate order timeline based on gates (handles both Sprint & Mass Prod)
function calculateOrderTimeline(
  part: NewPart,
  order: PartOrder,
  gates: ProjectGates
): { 
  sprintOrderBy?: Date; 
  massProductionOrderBy?: Date;
  isSprintLate: boolean;
  isMassProductionLate: boolean;
}

// Toggle freight type and recalculate both segments
async function toggleFreightType(
  projectId: string,
  orderId: string,
  newFreightType: 'sea' | 'air'
): Promise<PartOrder>

// Mark as combined order (Sprint + Mass Prod ordered together)
async function setCombinedOrder(
  projectId: string,
  orderId: string,
  isCombined: boolean
): Promise<PartOrder>

// Get all parts at risk of missing gates
async function getPartsAtRisk(projectId: string): Promise<{
  sprintAtRisk: PartOrder[];
  massProductionAtRisk: PartOrder[];
}>

// Sync lead times from VendorContractPrices as defaults
async function syncLeadTimesFromVendorPrices(projectId: string): Promise<void>

// Create orders for new parts (auto-detects Sprint/Mass Prod needs)
async function createOrdersFromNewParts(
  projectId: string, 
  newPartIds: string[]
): Promise<PartOrder[]>
```

---

## Part Selection Hook

`lib/hooks/usePartSelection.ts`:

```typescript
interface UsePartSelectionReturn {
  // Selection state
  selectedPartIds: Set<string>;
  isAllSelected: boolean;
  isGroupAllSelected: (groupId: string) => boolean;
  selectedCount: number;
  
  // Selection actions
  togglePart: (partId: string) => void;
  toggleGroup: (groupId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  
  // Grouped data
  groupedParts: Map<string, PartOrder[]>;
}

function usePartSelection(partOrders: PartOrder[]): UsePartSelectionReturn {
  // Groups parts by assembly/category
  // Manages selection state
  // Provides toggle functions for individual parts, groups, and all
}
```

---

## Interactive Features

### Part Selection
1. **Master Select All**: Top checkbox selects/deselects all parts across all groups
2. **Group Select All**: Checkbox in group header selects/deselects all parts in that group
3. **Individual Select**: Checkbox per part row
4. **Tri-state checkboxes**: Group checkbox shows indeterminate state when partially selected
5. **Selection count badge**: Shows "X parts selected" in table header
6. **Instant sync**: Gantt chart updates immediately when selection changes

### Freight Toggle
1. Click part row to toggle sea/air freight
2. Instantly recalculates lead time
3. Bar visually shifts on the Gantt chart
4. Shows cost implication (air freight premium)

### Late Warning
Parts highlighted red when:
- `orderByDate` is in the past
- Status is still `not_ordered`

### Gate Markers
- Vertical lines on chart at each gate date
- Gate name label at top
- Highlight current/next gate

### Click Actions
- Click bar: Open order details drawer
- Click freight icon: Toggle sea/air
- Right-click: Context menu (edit, delete, copy)

---

## Excel Import

Create `lib/import/partOrderImporter.ts`:

Support import from Excel with columns:
- Part Code / Description
- Vendor Code
- Sea Freight Lead Time (days)
- Air Freight Lead Time (days)
- Sprint Quantity
- Mass Prod Quantity
- Scrap Rate (%)
- Unit Weight (kg) - for freight cost estimation
- Unit Price

*(Awaiting your file format for exact column mapping)*

---

## Risk Integration with Phase 9

### Update ProjectMetrics calculation:

```typescript
// Parts with Sprint needs that are late
sprintPartsAtRisk = partOrders.filter(o => o.hasSprint && o.isSprintLate).length;

// Parts with Mass Prod needs that are late
massProductionPartsAtRisk = partOrders.filter(o => o.hasMassProduction && o.isMassProductionLate).length;

// Sprint readiness (parts received for Sprint gate)
sprintReadiness = 
  partOrders.filter(o => o.hasSprint && o.sprintStatus === 'received').length /
  partOrders.filter(o => o.hasSprint).length * 100;

// Mass Prod readiness
massProductionReadiness = 
  partOrders.filter(o => o.hasMassProduction && o.massProductionStatus === 'received').length /
  partOrders.filter(o => o.hasMassProduction).length * 100;
```

---

## Navigation Update

Add to Project Sidebar:
```
Project Sidebar:
├── Overview
├── BOM Explorer
├── Configure
├── New Parts
├── Parts Timeline  ← NEW (Phase 10)
├── Versions
├── Costs
└── Settings
```

---

## Implementation Order

1. Create PartOrder type definition
2. Create orderTrackingService with calculations
3. Create useTimelineStats hook for summary card data
4. Build TimelineSummaryCards component (stat cards at top)
5. Create usePartSelection hook for selection state management
6. Build PartSelectionTable component (grouped table with checkboxes)
7. Build GanttRow component
8. Build PartsGantt component (with fixed height and blank space)
9. Create FreightToggle component
10. Build parts-timeline page (combine Summary + Gantt + Selection Table)
11. Connect to Phase 9 metrics
12. Build Excel importer (when format provided)

---

## Success Criteria

Phase 10 is complete when:
- [ ] **Summary stat cards** display at top of page
- [ ] Cards show: Total Parts, Sprint Ready, Mass Prod Ready, At Risk, Days to Gates, Orders Placed, In Transit
- [ ] Cards update in real-time as order statuses change
- [ ] Gantt chart displays selected part orders with **unified timeline bars**
- [ ] Each part has ONE row showing both Sprint and Mass Production segments
- [ ] Sprint segment shows in solid color, Mass Prod in different shade/pattern
- [ ] Combined orders (Sprint + Mass together) display correctly
- [ ] Gantt chart has fixed minimum height with blank space when fewer parts
- [ ] Gate markers show on the timeline (DTX, Sprint, DTL, Mass Prod)
- [ ] Freight type can be toggled with instant visual update
- [ ] Late parts are highlighted in red (per segment)
- [ ] Parts at risk feed into Project metrics
- [ ] Order status can be updated per segment (ordered, in transit, received)
- [ ] Parts timeline page is accessible from sidebar
- [ ] Part selection table shows parts grouped by assembly/category
- [ ] Individual part selection works with checkbox
- [ ] "Select All" per group works correctly
- [ ] Master "Select All" at top works correctly
- [ ] Selected count displays in table header
- [ ] Gantt chart updates in real-time when selection changes

