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

## Gantt Chart Visual

```
Gate Markers:  |DTX|          |Sprint|              |DTL|     |Mass Prod|
               ▼              ▼                     ▼         ▼
───────────────┼──────────────┼─────────────────────┼─────────┼──────────►
               
SPRINT ORDERS:
Part A (sea)   [███ order ██████████ transit ██]✓ arrived
Part B (air)         [██ order ██]✓ arrived (faster!)
Part C (sea)   [████████████████ LATE! ████████████]⚠ behind schedule

MASS PROD ORDERS:
Part A (sea)                            [██████████ order ████████████]→
Part D (sea)                                   [████████ order ████████]→

Legend: [███] Order/Transit period  ✓ Received  ⚠ Late  → In Progress
```

---

## Tasks

- [ ] **Create PartOrder data model** in `types/newPart.ts`
- [ ] **Create orderTrackingService.ts** with lead time calculations
- [ ] **Build PartsGantt.tsx** component (main chart)
- [ ] **Build GanttRow.tsx** component (individual part row)
- [ ] **Implement FreightToggle.tsx** (sea/air with live updates)
- [ ] **Create parts-timeline page**
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
  orderType: 'sprint' | 'mass_production';
  
  // Part info (denormalized for display)
  itemCode: string;
  description: string;
  
  // Quantities
  quantity: number;               // Required quantity
  scrapRate: number;              // Percentage (e.g., 5 = 5%)
  orderQuantity: number;          // Calculated: quantity * (1 + scrapRate/100)
  
  // Lead times (in days)
  baseLeadTimeDays: number;       // From vendor contract or manual
  freightType: 'sea' | 'air';     // Default: sea
  airFreightDays: number;         // Transit time if using air
  seaFreightDays: number;         // Transit time if using sea (default)
  effectiveLeadTime: number;      // Based on selected freight type
  
  // Timeline dates
  requiredByDate?: Timestamp;     // Gate date (Sprint or Mass Prod)
  orderByDate?: Timestamp;        // Calculated: requiredByDate - effectiveLeadTime
  actualOrderDate?: Timestamp;    // When order was actually placed
  expectedArrivalDate?: Timestamp;// Calculated or entered
  actualArrivalDate?: Timestamp;  // When it actually arrived
  
  // Status
  orderStatus: 'not_ordered' | 'ordered' | 'in_transit' | 'received';
  isLate: boolean;                // orderByDate < today AND status = not_ordered
  
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
- X-axis: Date timeline with gate markers
- Y-axis: Part list (grouped by order type)
- Bars showing order → transit → arrival
- Color coding for status
- Zoom controls (week/month/quarter view)

### GanttRow.tsx
Individual part row:
- Part code and description
- Freight type indicator (🚢 sea / ✈️ air)
- Timeline bar with phases
- Status indicator
- Click to open details

### FreightToggle.tsx
Toggle between sea and air freight:
- Visual toggle switch
- Shows lead time difference
- Shows cost difference (if available)
- Instantly updates timeline bar

---

## Files to Create/Modify

| Type | Path |
|------|------|
| Modify | `types/newPart.ts` |
| Create | `components/new-parts/PartsGantt.tsx` |
| Create | `components/new-parts/GanttRow.tsx` |
| Create | `components/new-parts/FreightToggle.tsx` |
| Create | `components/new-parts/GanttLegend.tsx` |
| Create | `lib/bom/orderTrackingService.ts` |
| Create | `lib/import/partOrderImporter.ts` |
| Create | `lib/hooks/usePartOrders.ts` |
| Create | `app/(dashboard)/project/[projectId]/parts-timeline/page.tsx` |
| Modify | `components/layout/ProjectSidebar.tsx` (add Parts Timeline link) |

---

## Order Tracking Service

`lib/bom/orderTrackingService.ts`:

```typescript
// Calculate order timeline based on gates
function calculateOrderTimeline(
  part: NewPart,
  order: PartOrder,
  gates: ProjectGates
): { orderByDate: Date; isLate: boolean }

// Toggle freight type and recalculate
async function toggleFreightType(
  projectId: string,
  orderId: string,
  newFreightType: 'sea' | 'air'
): Promise<PartOrder>

// Get all parts at risk of missing gates
async function getPartsAtRisk(projectId: string): Promise<{
  sprintAtRisk: PartOrder[];
  massProductionAtRisk: PartOrder[];
}>

// Sync lead times from VendorContractPrices as defaults
async function syncLeadTimesFromVendorPrices(projectId: string): Promise<void>

// Create orders for new parts
async function createOrdersFromNewParts(
  projectId: string, 
  newPartIds: string[]
): Promise<PartOrder[]>
```

---

## Interactive Features

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
partsAtRisk = partOrders.filter(o => o.isLate && o.orderType === 'sprint').length;
partsOnTrack = partOrders.filter(o => !o.isLate).length;

sprintReadiness = 
  partOrders.filter(o => o.orderType === 'sprint' && o.orderStatus === 'received').length /
  partOrders.filter(o => o.orderType === 'sprint').length * 100;
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
3. Build GanttRow component
4. Build PartsGantt component
5. Create FreightToggle component
6. Build parts-timeline page
7. Connect to Phase 9 metrics
8. Build Excel importer (when format provided)

---

## Success Criteria

Phase 10 is complete when:
- [ ] Gantt chart displays part orders with timeline bars
- [ ] Gate markers show on the timeline
- [ ] Freight type can be toggled with instant visual update
- [ ] Late parts are highlighted in red
- [ ] Parts at risk feed into Project metrics
- [ ] Order status can be updated (ordered, in transit, received)
- [ ] Parts timeline page is accessible from sidebar

