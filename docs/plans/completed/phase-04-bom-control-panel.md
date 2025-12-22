# Phase 4: BOM Control Panel

**Status**: ✅ Complete  
**Completed**: December 2024

---

## Overview

Master-detail layout with Template BOM on left and Working BOM on right, enabling group selection and item transfer.

---

## What Was Built

### Components
- [x] `TemplateBomPanel.tsx` - Left panel showing full template structure
- [x] `WorkingBomPanel.tsx` - Right panel showing selected items
- [x] `BomTransferBar.tsx` - Transfer controls between panels

### Services
- [x] `templateBomService.ts` - Template BOM operations
- [x] `transferService.ts` - Transfer logic with pricing lookup
- [x] `vendorPriceService.ts` - Vendor contract price lookup

---

## Layout

```
┌───────────────────────────┬─────────────────────────────────────┐
│  TEMPLATE BOM (Left)      │          WORKING BOM (Right)        │
│  ┌─────────────────────┐  │  ┌─────────────────────────────┐   │
│  │ ☑ GRP-FRAME-A01     │  │  │ Stats: 156 items | £45,230 │   │
│  │   ☑ B103985         │  │  ├─────────────────────────────┤   │
│  │   ☐ B104001         │  │  │ [Tree View] [Table View]   │   │
│  │ ▣ GRP-SEAT-A01      │  │  │ Working BOM Items...       │   │
│  └─────────────────────┘  │  └─────────────────────────────┘   │
├───────────────────────────┴─────────────────────────────────────┤
│  [Copy 5 Selected →]        [Clear Selection]                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cascading Checkbox Selection

| State | Icon | Meaning |
|-------|------|---------|
| Checked | ☑ | All items in group selected |
| Unchecked | ☐ | No items selected |
| Indeterminate | ▣ | Some items selected |

### Selection Behavior
- Click group checkbox: Select/deselect all items
- Click item checkbox: Toggle individual item
- Parent updates to indeterminate if partial selection

---

## Transfer Logic

### Transfer Flow
1. Check for duplicates (skip items already in Working BOM)
2. Lookup vendor contract prices for each item
3. Calculate landing costs (base + landing rate)
4. Batch write to Working BOM collection
5. Update statistics

### Duplicate Handling
- Skip duplicates by default
- Option to replace existing
- Visual indicator for duplicates

### Pricing Lookup
```typescript
// For each item being transferred:
1. Find vendor contract price by itemCode
2. Apply quantity-based pricing (MOQ)
3. Calculate: materialCost + (materialCost × landingRate%)
4. Set costSource to 'contract' if found, 'placeholder' if not
```

---

## Files Created

```
components/bom/
├── TemplateBomPanel.tsx
├── WorkingBomPanel.tsx
└── BomTransferBar.tsx

lib/bom/
├── templateBomService.ts
├── transferService.ts
└── vendorPriceService.ts

app/(dashboard)/project/[projectId]/configure/
└── page.tsx
```

---

## Key Features

### Template BOM Panel
- Full hierarchical view of imported BOM
- Collapsible groups
- Item count per group
- Select all / deselect all

### Working BOM Panel
- Only selected items
- Real-time cost calculations
- Edit capabilities
- Remove items

### Transfer Bar
- Selection count
- Transfer button with confirmation
- Clear selection
- Duplicate warning



