# Phase 10.1: New Parts & BOM Integration

**Status**: ✅ Complete  
**Completed**: December 20, 2024  
**Dependencies**: Phase 10 (Parts Order Timeline)

---

## Overview

Reimagine the New Parts tracking to be fully integrated with the BOM. Create a seamless workflow where:
- Parts added to BOM automatically appear in tracking
- Parts created in tracking automatically appear in BOM
- Order data (lead time, scrap rate, etc.) is visible in Table view
- Timeline view visualizes that data clearly
- Kanban shows "missing info" badges to flag incomplete data

---

## Current Problems

1. **Disconnected workflows** - New Parts tracking and BOM are separate
2. **Timeline is confusing** - Hard to understand what's happening on the Gantt
3. **Order data hidden in dialogs** - Should be visible inline in table view
4. **Parts don't auto-sync** - Manual sync required between BOM and tracking
5. **No visibility of missing data** - Can't tell what info is still needed

---

## Proposed Solution

### Page Structure

```
New Parts Tracker
├── View Toggle: [Kanban] [Table]  ← Same data, different detail levels
│   ├── Kanban: Cards with workflow status + "missing info" badges  
│   └── Table: Full details with order data columns (inline editable)
└── Tab: TIMELINE (Gantt view - improved visualization)
```

### Kanban View (Quick Overview)
- Keep existing workflow columns (requested → design → engineering → procurement → complete)
- **NEW**: Show "missing info" badges on cards:
  - ⚠️ "No vendor" 
  - ⚠️ "No lead time"
  - ⚠️ "No quote"
- Visual indicator of completion: progress bar or checkmarks
- Click card to open detail drawer

### Table View (Full Details)
Same parts as Kanban, but with all order data columns:

```
┌────────────┬─────────────┬──────────┬──────────┬────────┬────────┬────────┬────────┬────────┬──────────┐
│ Part Code  │ Description │ Status   │ Group    │ Qty    │ Vendor │ Lead   │ 🚢 Sea │ ✈️ Air │ Scrap %  │
├────────────┼─────────────┼──────────┼──────────┼────────┼────────┼────────┼────────┼────────┼──────────┤
│ Bxxx001    │ New Frame   │ Design   │ GRP-FRAME│ 100    │ -      │ -      │ 35d    │ 5d     │ 5%       │
│ Bxxx002    │ Widget      │ Procure  │ GRP-ELEC │ 500    │ Acme   │ 45d    │ 35d    │ 5d     │ 2%       │
│ B107234    │ Bracket     │ Complete │ GRP-FRAME│ 200    │ Jones  │ 21d    │ 35d    │ 5d     │ 3%       │
└────────────┴─────────────┴──────────┴──────────┴────────┴────────┴────────┴────────┴────────┴──────────┘

Empty cells shown as "-" or light gray to indicate data not yet entered.
Cells are inline-editable where appropriate.
```

### Timeline Tab (Improved Gantt)
Clearer visualization with duration labels:

```
                    TODAY
                      ↓
GATE:    [DA]────────[DTX]─────────────[Sprint]───────────[Mass Prod]
          │            │                   │                    │
─────────────────────────────────────────────────────────────────────────
Bxxx001  ┃████ ORDER █████████ TRANSIT ████████┃→ Sprint
         ├────── 30d ───────├────── 35d ──────┤  
                                                          
Bxxx002  ┃██████████████ ORDER ████████████████████ TRANSIT ████┃→ Sprint
         ├──────────── 45d ────────────┼───── 35d ─────┤
                                                          
B107234            ┃███ ORDER ███████ TRANSIT ███┃ ✓ RECEIVED
                   ├── 21d ──├───── 35d ─────┤

Legend: ████ Order Period   ████ Transit (Sea)   ████ Transit (Air)   ✓ Received   ⚠ Late
```

**Only shows parts that have lead time data entered** - parts without lead times won't appear on timeline (nothing to visualize).

---

## BOM Integration

### 1. Part Added to BOM → Auto-appears in Tracking
When `isNewPart: true` is set on a BOM item:
- Automatically creates a NewPart record
- Appears in Kanban as "Requested"
- Appears in Table view with default/empty order fields

### 2. Part Added in Tracking → Auto-added to BOM
When creating a new part in tracking:
- User selects existing BOM group (dropdown of available groups)
- Part is automatically added to Working BOM
- Sets `isNewPart: true` on the BOM item
- Links NewPart.bomItemId to the BOM item

### 3. Two-way Sync
- Changes to part code/description sync between BOM and tracking
- When part is completed (assigned final B-code), BOM item updates
- Quantity in tracking reflects BOM quantity

---

## Data Model: Order Data on NewPart

Store order data directly on the NewPart record (simpler - one record per part):

```typescript
// Add to NewPart interface:
export interface NewPart {
  // ... existing fields ...
  
  // Order data (Phase 10.1)
  scrapRate?: number;           // Percentage (e.g., 5 = 5%)
  baseLeadTimeDays?: number;    // Vendor lead time
  seaFreightDays?: number;      // Default: 35
  airFreightDays?: number;      // Default: 5
  freightType?: 'sea' | 'air';  // Selected freight method
  orderStatus?: 'not_ordered' | 'ordered' | 'in_transit' | 'received';
  orderDate?: Timestamp;        // When ordered
  expectedArrivalDate?: Timestamp;
  actualArrivalDate?: Timestamp;
}
```

This means we can **remove the separate PartOrder collection** - all data lives on NewPart.

---

## Tasks

### Cleanup ✅
- [x] Remove Quote Log page
- [x] Remove Manufacturing Log page  
- [x] Update sidebar navigation

### Kanban View Updates ✅
- [x] Add "missing info" badges to cards (e.g., ⚠️ No vendor, ⚠️ No lead time, ⚠️ No drawing)
- [x] Show lead time on cards when available
- [x] Visual distinction for parts missing critical order data (orange badges)

### Table View Enhancement ✅
- [x] Extend existing table to include order columns
- [x] Add columns: Vendor, Lead Time, Scrap %, Freight Type, Info Status
- [x] Make cells inline-editable (click to edit)
- [x] Show empty cells as placeholder text
- [x] Freight toggle button (Sea ↔ Air) with emoji indicators
- [x] Info column with ✓ or ⚠ for complete/incomplete data

### Timeline Improvements ✅
- [x] Only show parts WITH lead time data (skip parts without)
- [x] Summary card showing parts ready vs needing data
- [x] **Fixed**: Gantt bar width now reflects actual lead time duration
- [x] **Fixed**: Timeline bounds calculation includes implied end dates based on lead times
- [x] Quick-action cards for parts ready to become orders
- [x] Better empty state with guidance

### BOM Integration ✅
- [x] Auto-create NewPart when BOM item marked as isNewPart (existing sync)
- [x] Create "Add Part" dialog with BOM group dropdown
- [x] "Also add to BOM" checkbox creates placeholder BOM item
- [x] Link NewPart.bomItemId correctly
- [x] When part completed, update BOM item with final code (existing)

### Data Model ✅
- [x] Add order fields to NewPart interface (scrapRate, freightType, airFreightDays, seaFreightDays, order tracking)
- [x] PartOrder collection kept for explicit order tracking (separate from part data)
- [x] Order data can also be inline on NewPart for simple cases

---

## Files to Modify

| Type | Path | Description |
|------|------|-------------|
| Modify | `types/newPart.ts` | Add order fields to NewPart interface |
| Modify | `components/new-parts/NewPartCard.tsx` | Add missing info badges |
| Modify | `app/(dashboard)/project/[projectId]/new-parts/page.tsx` | Enhance table columns |
| Modify | `components/new-parts/PartsGantt.tsx` | Improve clarity, only show parts with data |
| Modify | `components/new-parts/GanttRow.tsx` | Add duration labels |
| Modify | `lib/bom/newPartService.ts` | Add BOM integration, use NewPart for orders |
| Modify | `lib/hooks/useNewParts.ts` | Update for order data on NewPart |

---

## UI: Missing Info Badges on Kanban Cards

```
┌─────────────────────────┐
│ Bxxx001                 │
│ New Frame Part          │
│ GRP-FRAME               │
│                         │
│ ⚠️ No vendor            │
│ ⚠️ No lead time         │
│                         │
│ ▓▓▓░░░░░░░ 30%          │
└─────────────────────────┘
```

The progress bar shows how "complete" the part data is.

---

## Success Criteria

Phase 10.1 is complete when:
- [x] Kanban cards show "missing info" badges for incomplete data
- [x] Table view shows all order columns with inline editing
- [x] Timeline only shows parts with lead time data
- [x] Timeline has clear duration labels and improved visuals
- [x] Adding a part in tracking auto-adds it to BOM (optional checkbox)
- [x] Adding isNewPart item in BOM auto-creates tracking record
- [x] Order data can be stored on NewPart directly

---

## Implementation Order

1. ✅ Add order fields to NewPart type
2. ✅ Update Kanban cards with missing info badges
3. ✅ Enhance table view with order columns (inline editable)
4. ✅ Improve timeline clarity and filtering
5. ✅ Implement BOM ↔ Tracking sync (Add Part dialog with BOM group selector)
6. ✅ Fixed Gantt bar width calculation to reflect actual lead times

### Bug Fixes Applied
- **Gantt bar too small**: Bar width was calculated only from explicit dates. Fixed to calculate from lead time duration when dates aren't set.
- **Timeline bounds too short**: Timeline end now considers implied end dates (order date + lead time) to ensure bars are fully visible.

### UI Improvements (Post-Phase)
- **Unified Timeline**: Replaced separate Sprint/Mass Prod sections with unified view
  - Each part now shows BOTH Sprint and Mass Production timelines on the same row
  - Two horizontal bars stacked: blue for Sprint, purple for Mass Prod
  - Duration labels on bars (e.g., "Sprint · 125d")
- **Combined Order Feature**: Added `orderTogether` checkbox for parts ordered once for both Sprint and Mass Prod
  - Visual indicator: green link icon and connecting line between bars
  - Toggle in expanded row details
- **NewPart Type Updates**:
  - Added `orderTogether?: boolean` field
  - Added `sprintQuantity` and `massProductionQuantity` fields
- **New UnifiedGantt Component**: `components/new-parts/UnifiedGantt.tsx`
  - Shows all parts with lead time data
  - Gate markers from project gates
  - Freight type indicator (ship/plane icons)
  - Expandable rows with order details
  - **Interactive Zoom & Pan**:
    - Six zoom levels: Day (40px/day), Week (12px/day), Month (4px/day), Quarter (1.5px/day), Year (0.5px/day), Multi-Year (0.15px/day)
    - Ctrl+Scroll to zoom in/out
    - Click and drag to pan
    - Touch pinch-to-zoom support
    - Navigation buttons: Previous month, Today, Next month
    - Bars scale proportionally with zoom level
    - 4-year timeline window (1 year back, 3 years forward)
    - Synchronized scrolling between header and row timelines
  - **Part Selection Table**:
    - Displayed below the Gantt chart
    - Grouped by BOM group with collapsible sections
    - Search by part code, description, group, or vendor
    - "At Risk" filter to show only parts with missing info
    - Select/deselect parts to control what's shown on the Gantt
    - Select All / Clear All buttons
    - Shows lead time and vendor status per part
- **Tracker Tab Improvements**:
  - Added "Missing Info" filter button to quickly find parts needing vendor or lead time
  - Table view now groups parts by BOM group with collapsible headers
  - Active filter badges with clear buttons

