# Phase 9.5: Merge Parts Timeline into New Parts Page

**Status**: ✅ Complete  
**Estimated Duration**: 1 day  
**Dependencies**: Phase 9 (Project Management), Phase 10 (Parts Timeline)

---

## Overview

Consolidate the Parts Timeline (Gantt chart) functionality directly into the New Parts page, providing a unified view for tracking parts through their lifecycle AND their order timeline.

---

## Changes

### Before
- `/project/[id]/new-parts` - Kanban/Table view of new parts
- `/project/[id]/parts-timeline` - Separate Gantt chart page

### After
- `/project/[id]/new-parts` - Unified page with tabs:
  - **Tracker** (default) - Kanban/Table view
  - **Timeline** - Gantt chart for order tracking
  - Stats cards visible across both views

---

## Tasks

- [x] Update New Parts page to include Timeline tab
- [x] Integrate Part Orders with New Parts (create orders from parts)
- [x] Remove separate parts-timeline page
- [x] Update sidebar navigation (remove Parts Timeline link)
- [x] Add "Create Order" action from part detail drawer

---

## Implementation

### Tab Structure
```
┌─────────────────────────────────────────────────────────┐
│  New Part Tracker                          [Sync] [Add] │
├─────────────────────────────────────────────────────────┤
│  [Tracker]  [Timeline]                                  │
├─────────────────────────────────────────────────────────┤
│  Stats Cards (visible on both tabs)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tab Content:                                           │
│  - Tracker: Kanban/Table + filters                      │
│  - Timeline: Gantt chart + order controls               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/(dashboard)/project/[projectId]/new-parts/page.tsx` | Add Timeline tab with Gantt chart |
| `components/layout/ProjectSidebar.tsx` | Remove Parts Timeline link |
| `components/new-parts/NewPartDetailDrawer.tsx` | Add "Create Order" button |

## Files to Delete

| File | Reason |
|------|--------|
| `app/(dashboard)/project/[projectId]/parts-timeline/page.tsx` | Merged into new-parts |

---

## Success Criteria

- [x] New Parts page has Tracker and Timeline tabs
- [x] Gantt chart displays in Timeline tab
- [x] Orders can be created directly from parts
- [x] Single navigation item for all part-related functionality

