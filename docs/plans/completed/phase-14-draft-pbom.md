# Phase 14: Draft PBoM, Excel-Like Table & Collaboration

**Status**: ✅ Implemented  
**Actual Duration**: Phase 14A-14F Complete  
**Dependencies**: Phase 10.1 (New Parts Integration)

---

## Implementation Summary

### Completed Files

| Phase | Category | Files Created |
|-------|----------|---------------|
| 14A | Types | `types/bom.ts` (extended), `types/changes.ts`, `types/settings.ts` |
| 14A | Services | `lib/services/settingsService.ts` |
| 14A | Components | `components/bom/ColumnGroupToggle.tsx` |
| 14A | Hooks | `lib/hooks/useColumnSettings.ts` |
| 14B | Components | `components/bom/EditableCell.tsx`, `components/bom/ExcelTable.tsx` |
| 14B | Components | `components/bom/OverrideConfirmDialog.tsx`, `components/bom/CellOverrideIndicator.tsx` |
| 14C | Services | `lib/services/changeTrackingService.ts` |
| 14C | Components | `components/history/ItemHistoryTab.tsx`, `components/history/CellChangeCard.tsx` |
| 14D | Types | `types/comments.ts` |
| 14D | Services | `lib/services/commentService.ts`, `lib/services/taskService.ts` |
| 14D | Components | `components/comments/CellCommentPopover.tsx`, `components/comments/CommentInput.tsx` |
| 14D | Components | `components/comments/CommentBubble.tsx`, `components/comments/TaskCreateDialog.tsx` |
| 14E | Types | `types/activity.ts` |
| 14E | Services | `lib/services/activityService.ts` |
| 14E | Components | `components/activity/NotificationBell.tsx`, `components/activity/ActivityCard.tsx` |
| 14E | Pages | `app/(dashboard)/activity/page.tsx` |
| 14F | Services | `lib/services/exportService.ts` |
| 14F | Components | `components/settings/ColumnSettingsDialog.tsx` |
| 14F | Config | `firestore.rules`, `firestore.indexes.json` (updated)

---

## Overview

This phase introduces:
1. **Excel-Like Table Editing** - Inline cell editing with keyboard navigation
2. **Override System** - Track when values differ from master data sources
3. **Cell-Level Change History** - Granular tracking of every edit
4. **Cell Comments & Assignments** - Collaborate with @mentions and tasks
5. **Activity & Notifications** - Bell icon with activity feed page
6. **Column Visibility Settings** - Org → Project → User hierarchy with toggle chips

---

## Current State Analysis

### Existing BomItem Interface

The current `BomItem` in `types/bom.ts` has ~25 fields including:
- Core: `id`, `level`, `groupCode`, `itemCode`, `itemDescription`, `sequence`, `quantity`
- Costing: `materialCost`, `landingCost`, `labourCost`, `extendedCost`, `costSource`
- Vendor: `vendorCode`, `vendorName`, `vendorContractPriceId`, `currency`, `moq`, `leadTimeDays`
- Change tracking: `hasCostChange`, `hasQuantityChange`, `originalMaterialCost`, etc.
- New Part: `isNewPart`, `newPartStatus`, `newPartTrackerId`

### CCM Columns to Add

| Column | Field | Category |
|--------|-------|----------|
| A | partCategory | Classification |
| B | drawingNumber | Engineering |
| C | revision | Version |
| I | purchasedOrManufactured | Source (P/M flag) |
| K | pdmWorkflowState | Status |
| L | bikeCategory | Analytics |
| M | bikeType | Product type |
| N | functionalCategory | System group |
| Q | vendorLocalPrice | Pricing |
| R | vendorCurrency | Currency |
| S | shipFromCountry | Logistics |
| Z | weightKg | Physical |
| AA | weightExtended | Extended weight |
| AB | crcn | Reference |
| AC | targetSwitchStatus | Control |

All new fields will be **optional** to preserve backward compatibility.

---

## BOM Level Hierarchy

- Level 0 = Top assembly (whole product)
- Level 1 = Group code level
- Level 2+ = Nested items
- Levels chain downward: sequence 2 → 2 → 2 → 3 → 3 → 4 means the level 3 items are children of the preceding level 2, and level 4 is child of the preceding level 3

---

## Column Groups (Toggle Chips)

Column visibility controlled via toggle chips above the table:

| Group | Columns | Default Visible |
|-------|---------|-----------------|
| **Core** (always on) | itemCode, itemDescription, quantity, level, sequence | Yes |
| **Identification** | partCategory, drawingNumber, revision, groupCode, purchasedOrManufactured | No |
| **Costing** | costSource, materialCost, landingCost, labourCost, extendedCost | Yes |
| **Vendor** | vendorCode, vendorName, vendorLocalPrice, vendorCurrency, shipFromCountry | No |
| **Classification** | pdmWorkflowState, bikeCategory, bikeType, functionalCategory | No |
| **Weight** | weightKg, weightExtended | No |
| **Reference** | crcn, targetSwitchStatus | No |

---

## Settings Hierarchy

### Organization Level (`organizations/{orgId}/settings`)
- `columnDefaults`: Which column groups visible by default
- `columnOrder`: Default column ordering

### Project Level (`projects/{projectId}/settings`)
- `columnOverrides`: Override org defaults for this project
- `customColumnGroups`: Project-specific groupings

### User Level (`users/{userId}/preferences`)
- `bomTableColumns`: User's preferred column visibility
- `savedViews`: Named view configurations (e.g., "My Costing View")

---

## Key Data Models

### CellMetadata (stored on BomItem)

```typescript
interface CellMetadata {
  source: 'manual' | 'calculated' | 'master' | 'imported';
  originalValue?: any;
  overriddenAt?: Timestamp;
  overriddenBy?: string;
  overrideReason?: string;
  hasComments?: boolean;
  commentCount?: number;
}
```

### ChangeRecord

```typescript
interface ChangeRecord {
  id: string;
  projectId: string;
  itemId: string;
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'manual' | 'import' | 'sync' | 'calculated' | 'override';
  reason?: string;
  changedBy: string;
  changedAt: Timestamp;
  batchId?: string;
}
```

### CellComment

```typescript
interface CellComment {
  id: string;
  projectId: string;
  itemId: string;
  field: string;
  threadId: string;
  content: string;
  mentions: string[];
  status: 'open' | 'resolved';
  createdBy: string;
  createdAt: Timestamp;
}
```

### Activity

```typescript
interface Activity {
  id: string;
  type: 'mention' | 'assignment' | 'reply' | 'change' | 'gate_reminder';
  projectId: string;
  itemId?: string;
  field?: string;
  title: string;
  description: string;
  actorId: string;
  targetUserIds: string[];
  readBy: string[];
  createdAt: Timestamp;
}
```

---

## Firestore Collections (New)

```
projects/{projectId}/
├── bomItems/{itemId}              # Existing - add cellMetadata field
├── changeRecords/{recordId}       # NEW - cell-level change history
├── commentThreads/{threadId}      # NEW - comment thread metadata
├── comments/{commentId}           # NEW - individual comments
└── tasks/{taskId}                 # NEW - task assignments

organizations/{orgId}/
└── settings                       # NEW - org column defaults

users/{userId}/
├── preferences                    # NEW - user column preferences
└── notifications                  # NEW - notification preferences

activity/{activityId}              # NEW - global activity feed
```

---

## Excel-Like Table Editing

### Cell Types & Behavior

| Cell Type | Visual | Behavior |
|-----------|--------|----------|
| **Editable** | White bg, border on focus | Click to edit, Tab to next |
| **Calculated** | Light grey bg, italic | Auto-computed, shows formula on hover |
| **Master Data** | Blue text | Pulled from Item Master, can override |
| **Overridden** | Orange dot (●) in corner | User changed from source |
| **Locked** | Darker grey | Cannot edit (system fields) |
| **Has Comments** | 💬 indicator | Click to open thread |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Next editable cell |
| Shift+Tab | Previous editable cell |
| Enter | Confirm edit, move down |
| Escape | Cancel edit |
| Arrow keys | Navigate cells |
| F2 | Edit current cell |

---

## Override System

When user changes a value from master data or calculation:

1. Show confirmation dialog with original value
2. Optionally capture reason for override
3. Store original value in `cellMetadata`
4. Show orange dot indicator on cell
5. Log change to `changeRecords` collection

---

## Version History (Three Levels)

| Level | What It Shows | Use Case |
|-------|---------------|----------|
| **Project** | Major milestones, snapshots | "Show BOM as of DA gate" |
| **Item** | All changes to one part | "What changed on B103985?" |
| **Cell** | Individual field changes | "Who changed material cost?" |

---

## Implementation Plan

### Phase 14A: Foundation (Week 1)
- [ ] Extend BomItem interface with all 29 CCM columns (optional fields)
- [ ] Create types/changes.ts, types/settings.ts
- [ ] Create settingsService.ts for column preferences
- [ ] Build ColumnGroupToggle.tsx (toggle chips UI)
- [ ] Add column visibility to BomTable

### Phase 14B: Excel-Like Table (Week 2)
- [ ] Build EditableCell.tsx with click-to-edit
- [ ] Create ExcelTable.tsx with inline editing
- [ ] Implement Tab/Enter/Escape keyboard navigation
- [ ] Build OverrideConfirmDialog.tsx for master data overrides
- [ ] Add CellOverrideIndicator.tsx (orange dot)

### Phase 14C: Change Tracking (Week 3)
- [ ] Create changeTrackingService.ts
- [ ] Log all cell edits to changeRecords collection
- [ ] Build ItemHistoryTab.tsx for drawer
- [ ] Add CellChangeCard.tsx for change display
- [ ] Integrate with useBom hook

### Phase 14D: Comments & Tasks (Week 4)
- [ ] Create types/comments.ts
- [ ] Build commentService.ts
- [ ] Create CellCommentPopover.tsx
- [ ] Add @mention autocomplete with CommentInput.tsx
- [ ] Build TaskCreateDialog.tsx
- [ ] Add Comments tab to ItemEditDrawer

### Phase 14E: Activity System (Week 5)
- [ ] Create types/activity.ts
- [ ] Build activityService.ts
- [ ] Create NotificationBell.tsx with badge
- [ ] Build NotificationDropdown.tsx
- [ ] Create /activity page with ActivityFeed.tsx
- [ ] Add notification preferences

### Phase 14F: Admin Settings & Polish (Week 5-6)
- [ ] Build ColumnSettingsDialog.tsx for org/project defaults
- [ ] Create /settings/columns page
- [ ] Add preset views (Compact, Costing, Full CCM)
- [ ] XLSX export with formatting (olive groups, frozen headers)
- [ ] Performance testing with 500+ item BOMs
- [ ] Update firestore.rules and indexes

---

## Files to Create

| File | Purpose |
|------|---------|
| `types/changes.ts` | ChangeRecord, CellMetadata interfaces |
| `types/comments.ts` | CellComment, CommentThread, CellTask |
| `types/activity.ts` | Activity, NotificationPreferences |
| `types/settings.ts` | ColumnSettings, ViewPreset interfaces |
| `components/bom/ExcelTable.tsx` | Main Excel-like table with inline editing |
| `components/bom/EditableCell.tsx` | Inline cell editor component |
| `components/bom/CellOverrideIndicator.tsx` | Orange dot for overridden cells |
| `components/bom/ColumnGroupToggle.tsx` | Toggle chips for column groups |
| `components/bom/OverrideConfirmDialog.tsx` | Confirm override with reason |
| `components/comments/CellCommentPopover.tsx` | Comment thread popover |
| `components/comments/CommentInput.tsx` | With @mention autocomplete |
| `components/comments/TaskCreateDialog.tsx` | Create task from comment |
| `components/history/ItemHistoryTab.tsx` | History tab for drawer |
| `components/history/CellChangeCard.tsx` | Individual change display |
| `components/activity/NotificationBell.tsx` | Header bell with badge |
| `components/activity/NotificationDropdown.tsx` | Quick notification view |
| `components/activity/ActivityFeed.tsx` | Full activity page |
| `components/settings/ColumnSettingsDialog.tsx` | Admin column configuration |
| `lib/services/changeTrackingService.ts` | Log cell-level changes |
| `lib/services/commentService.ts` | Comment/thread CRUD |
| `lib/services/activityService.ts` | Activity feed operations |
| `lib/services/settingsService.ts` | Column settings CRUD |
| `lib/hooks/useColumnSettings.ts` | Column visibility hook |
| `lib/hooks/useCellEdit.ts` | Cell editing state |
| `lib/hooks/useComments.ts` | Comment threads hook |
| `lib/hooks/useActivity.ts` | Activity feed hook |
| `app/(dashboard)/activity/page.tsx` | Activity feed page |
| `app/(dashboard)/settings/columns/page.tsx` | Column admin settings |

---

## Files to Modify

| File | Changes |
|------|--------|
| `types/bom.ts` | Add missing CCM fields + cellMetadata |
| `components/bom/BomTable.tsx` | Enhance for inline edit or replace with ExcelTable |
| `components/bom/ItemEditDrawer.tsx` | Add History & Comments tabs |
| `components/layout/Header.tsx` | Add NotificationBell |
| `lib/hooks/useBom.ts` | Add change logging on updates |
| `firestore.rules` | Add rules for new collections |
| `firestore.indexes.json` | Add indexes for queries |

---

## Export with Formatting

XLSX export will include:
- **Blue frozen header row** (#4472C4)
- **Olive green group rows** (#808000) for Level 0/1
- **White part rows** for Level 2+
- **Sequence numbers** with gaps (100, 110, 120... for parts in group 1)

---

## Success Criteria

Phase 14 is complete when:

- [ ] All 29 CCM columns exist in BomItem (optional, with defaults)
- [ ] Toggle chips control column group visibility
- [ ] Org → Project → User settings hierarchy works
- [ ] Table has inline cell editing with Tab navigation
- [ ] Override system tracks original vs modified values with reason
- [ ] Cell-level change history logged automatically
- [ ] Item drawer shows History tab with full change log
- [ ] Comments can be added to any cell with @mentions
- [ ] Tasks can be created from comments and assigned
- [ ] Activity bell shows unread count
- [ ] /activity page shows full feed with filters
- [ ] XLSX export produces formatted output
- [ ] Performance acceptable with 500+ item BOMs

---

## Risk Mitigation

1. **All new BomItem fields are optional** - won't break existing Firestore data
2. **Existing BomTable preserved** - new features added alongside
3. **Feature flags available** - can disable new features if issues arise
4. **Frequent commits** - easy to revert if needed
5. **Change tracking is append-only** - won't affect existing data
