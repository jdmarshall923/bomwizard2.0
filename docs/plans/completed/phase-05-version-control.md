# Phase 5: Version Control

**Status**: ✅ Complete  
**Completed**: December 2024

---

## Overview

Version control system for BOMs with snapshots, comparison, and cost driver detection.

---

## What Was Built

### Components
- [x] `VersionTimeline.tsx` - Visual timeline of versions
- [x] `CreateVersionDialog.tsx` - Manual version creation
- [x] `VersionComparison.tsx` - Compare two versions
- [x] `DateRangeComparison.tsx` - Compare by date range

### Services
- [x] `versionService.ts` - Version CRUD, date queries
- [x] `comparisonService.ts` - Diff algorithm, cost driver detection

### Hooks
- [x] `useVersions.ts` - Version data hook

---

## Version Triggers

| Trigger | When |
|---------|------|
| Manual | User clicks "Create Version" |
| Import | Auto-create after CSV import |
| Bulk Operations | Auto-create when 10+ items affected |

---

## Data Model

```typescript
interface BomVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  versionName?: string;
  trigger: 'import' | 'manual' | 'price_update' | 'bulk_edit';
  summary: {
    totalItems: number;
    totalExtendedCost: number;
    materialCost: number;
    landingCost: number;
    labourCost: number;
    newPartsCount: number;
    placeholderCount: number;
  };
  snapshot: BomItemSnapshot[];
  createdAt: Timestamp;
  createdBy: string;
}
```

---

## Cost Drivers Tracked

| Driver | Description | Example |
|--------|-------------|---------|
| `quantity_increase` | Quantity went up | Qty 10 → 15 |
| `quantity_decrease` | Quantity went down | Qty 15 → 10 |
| `material_price_increase` | Material cost up | £5.00 → £5.50 |
| `material_price_decrease` | Material cost down | £5.50 → £5.00 |
| `vendor_change` | Different vendor | Switched supplier |
| `new_item` | Item added | New bracket |
| `removed_item` | Item removed | Fasteners deleted |
| `cost_source_upgrade` | Better pricing | placeholder → contract |

---

## Comparison Algorithm

```
For each item in Version B:
  1. Find matching item in Version A (by itemCode)
  2. If not found → NEW_ITEM
  3. If found, compare fields:
     - quantity: detect increase/decrease
     - materialCost: detect price change
     - vendorCode: detect vendor change
     - costSource: detect source upgrade/downgrade
  
For each item in Version A not in B:
  → REMOVED_ITEM
```

---

## Timeline Visual

```
v1 ──●────── v2 ──●────── v3 ──●────── v4 ──●─────→
    Import      Manual     Price        Bulk
    Dec 1       Dec 5      Update       Edit
                           Dec 10       Dec 15
```

---

## Files Created

```
components/versions/
├── VersionTimeline.tsx
├── VersionCard.tsx
├── CreateVersionDialog.tsx
├── VersionComparison.tsx
├── DateRangeComparison.tsx
├── DiffView.tsx
└── ChangeCard.tsx

lib/bom/
├── versionService.ts
└── comparisonService.ts

lib/hooks/
└── useVersions.ts

app/(dashboard)/project/[projectId]/versions/
└── page.tsx
```

---

## Key Features

### Version Creation
- Manual create with optional name
- Auto-snapshot of all BOM items
- Summary statistics calculated

### Version Comparison
- Side-by-side diff view
- Changed items highlighted
- Cost impact summary
- Export comparison report

### Date Range Query
- "Compare January to March"
- Finds versions within date range
- Multiple version comparison



