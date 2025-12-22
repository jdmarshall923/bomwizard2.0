# Phase 7: New Part Tracker

**Status**: ✅ Complete  
**Completed**: December 2024

---

## Overview

Kanban board for tracking new parts through their lifecycle from design to procurement.

---

## What Was Built

### Components
- [x] `NewPartKanban.tsx` - Drag-and-drop Kanban board
- [x] `NewPartCard.tsx` - Card with priority badge, actions
- [x] `NewPartDetailDrawer.tsx` - Tabbed drawer (Details, Design, Engineering, Procurement)
- [x] `NewPartStats.tsx` - Stats cards + progress bar

### Services
- [x] `newPartService.ts` - New part CRUD operations

### Hooks
- [x] `useNewParts.ts` - New parts data hook

### Cloud Functions
- [x] `autoCreateNewPart` - Triggered on BomItem created with `isNewPart: true`
- [x] `onNewPartComplete` - Syncs completion back to BomItem

---

## Kanban Board

```
┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐
│  Added   │ │  Design  │ │Engineering│ │Procurement│ │ Complete │
├──────────┤ ├──────────┤ ├───────────┤ ├───────────┤ ├──────────┤
│ Bxxx001  │ │ Bxxx004  │ │ Bxxx006   │ │ Bxxx008   │ │ B107234  │
│ ●●○ Med  │ │ ●●● High │ │ ●○○ Low   │ │ ●●●● Crit │ │ ✓ Done   │
├──────────┤ │          │ │           │ │           │ │          │
│ Bxxx002  │ │          │ │           │ │           │ │          │
│ ●○○ Low  │ │          │ │           │ │           │ │          │
└──────────┘ └──────────┘ └───────────┘ └───────────┘ └──────────┘
```

---

## Status Flow

```
Added → Design → Engineering → Procurement → Complete
```

| Status | Description |
|--------|-------------|
| Added | New part identified, needs review |
| Design | Being designed, awaiting drawings |
| Engineering | Engineering review, specifications |
| Procurement | Sourcing vendor, getting quotes |
| Complete | Final B-code assigned, ready for BOM |

---

## Data Model

```typescript
interface NewPart {
  id: string;
  projectId: string;
  bomItemId: string;
  placeholderCode: string;    // e.g., "Bxxx001"
  description: string;
  groupCode: string;
  quantity: number;
  
  status: 'added' | 'design' | 'engineering' | 'procurement' | 'complete';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Design phase
  designNotes?: string;
  drawingUrl?: string;
  designApprovedBy?: string;
  designApprovedAt?: Timestamp;
  
  // Engineering phase
  specifications?: string;
  engineeringApprovedBy?: string;
  engineeringApprovedAt?: Timestamp;
  
  // Procurement phase
  vendorCode?: string;
  vendorName?: string;
  quotedPrice?: number;
  leadTimeDays?: number;
  
  // Completion
  finalItemCode?: string;     // Actual B-code when assigned
  finalUnitPrice?: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Detail Drawer Tabs

### Details Tab
- Placeholder code
- Description
- Group
- Quantity
- Priority selector
- Status history

### Design Tab
- Design notes (rich text)
- Upload drawings
- Approval checkbox
- Designer assignment

### Engineering Tab
- Specifications
- Technical requirements
- Engineering approval
- Engineer assignment

### Procurement Tab
- Vendor selection
- Quote entry
- Lead time
- Final B-code assignment

---

## Cloud Functions

### autoCreateNewPart
```typescript
// Trigger: BomItem created with isNewPart: true
// Action: Create NewPart document with initial status "added"
```

### onNewPartComplete
```typescript
// Trigger: NewPart status changed to "complete"
// Action: Update linked BomItem with:
//   - itemCode: finalItemCode
//   - materialCost: finalUnitPrice
//   - costSource: 'contract' or 'quote'
//   - isNewPart: false
//   - isPlaceholder: false
```

---

## Files Created

```
components/new-parts/
├── NewPartKanban.tsx
├── NewPartCard.tsx
├── NewPartDetailDrawer.tsx
├── NewPartStats.tsx
└── index.ts

lib/bom/
└── newPartService.ts

lib/hooks/
└── useNewParts.ts

functions/src/
└── index.ts  (added autoCreateNewPart, onNewPartComplete)

app/(dashboard)/project/[projectId]/new-parts/
└── page.tsx
```

---

## Key Features

### Drag and Drop
- Drag cards between columns
- Status auto-updates
- Confirmation on complete

### Priority Badges
| Priority | Color | Icon |
|----------|-------|------|
| Low | Gray | ● ○ ○ |
| Medium | Yellow | ● ● ○ |
| High | Orange | ● ● ● |
| Critical | Red | ● ● ● ● |

### Stats Dashboard
- Total new parts
- By status breakdown
- Completion percentage
- Average time in each stage



