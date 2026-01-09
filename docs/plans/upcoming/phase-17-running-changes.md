# Phase 17: Running Changes Management

**Status**: 📋 Planned  
**Estimated Duration**: 1-2 weeks  
**Dependencies**: Phase 14 (BOM Explorer with Excel Table)

---

## Overview

Running changes are continuous improvement changes where a B-code in a BOM could change after a certain date (Go Live). This phase adds:

1. **Global Running Changes page** - Upload and manage running changes CSV
2. **BOM Explorer Integration** - Alert when project BOM items are affected by running changes
3. **Replacement Workflow** - One-click replacement of old B-codes with new ones

---

## Data Model

### RunningChange Interface

Create `types/runningChange.ts`:

```typescript
interface RunningChange {
  id: string;
  
  // From CSV Import
  cnNumber: string;              // CN Number (unique identifier)
  cnDescription: string;         // CN Description
  owner: string;                 // "Who" column
  assignee: string;              // Assignee
  estimatedGoLiveDate: Timestamp; // Estimated GO LIVE date
  affectedLine: string;          // Affected Line (X, Y, etc.)
  oldBCodes: string[];           // Old B-codes (parsed from comma-separated)
  newBCodes: string[];           // New B-codes (parsed from comma-separated)
  statusDescription: string;     // Current status description
  changeType: string;            // Change Type (Running, etc.)
  npiOrCms: 'NPI' | 'CMS';      // NPI/CMS
  projectCode?: string;          // Project Code (from CSV, optional)
  team?: string;                 // Team
  projectsAffected?: string;     // "Project is affects" column
  
  // Metadata
  importedAt: Timestamp;
  importedBy: string;
  updatedAt: Timestamp;
  isActive: boolean;             // Can be deactivated when change is complete
}
```

### Firestore Structure

```
/runningChanges/{changeId}       # Global running changes collection
```

---

## CSV Column Mapping

Based on the provided sample CSV:

| CSV Column | Field | Notes |
|------------|-------|-------|
| Who | owner | Person responsible |
| Project is affects | projectsAffected | Projects affected |
| CN Number | cnNumber | Unique identifier |
| CN Description | cnDescription | Description |
| Assignee | assignee | Person assigned |
| Estimated GO LIVE date | estimatedGoLiveDate | Parse as date |
| Affected Line | affectedLine | X, Y, etc. |
| B-codes changing | (informational) | Original column |
| Old B-codes | oldBCodes | Parse comma-separated |
| New- B-codes | newBCodes | Parse comma-separated |
| Current status description | statusDescription | Status text |
| Change Type | changeType | Running, etc. |
| NPI/CMS | npiOrCms | NPI or CMS |
| Project Code | projectCode | Optional |
| Team | team | Optional |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Running Changes Page                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Upload   │  │ Stats Cards  │  │ Changes      │              │
│  │ CSV      │  │              │  │ Table        │              │
│  └────┬─────┘  └──────────────┘  └──────────────┘              │
│       │                                                          │
└───────┼──────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firestore                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ runningChanges Collection                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────┬──────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BOM Explorer                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Alert Banner │  │ Running Changes  │  │ Replace Button   │  │
│  │              │──▶│ Tab/Section      │──▶│                  │  │
│  └──────────────┘  └──────────────────┘  └────────┬─────────┘  │
│                                                    │             │
└────────────────────────────────────────────────────┼─────────────┘
                                                     │
                                                     ▼
                                            Working BOM Items
```

---

## UI Components

### 1. Global Running Changes Page (`/data/running-changes`)

Add to Global Sidebar under "Master Data":
- Icon: `RefreshCcw` or `ArrowRightLeft`
- Pattern: Similar to VendorContractPrices page

**Features**:
- Upload CSV button (import running changes)
- Stats cards: Total Changes, Active, Upcoming (go-live in future), Applied
- Searchable/filterable table of all running changes
- Clear Data option
- View details of each change

**Key File**: `app/(dashboard)/data/running-changes/page.tsx`

### 2. BOM Explorer Alert Banner

When a project's BOM contains parts affected by running changes:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Running Changes Detected                                     │
│ 3 parts in this BOM are affected by active running changes.    │
│ [View Affected Parts]                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Location**: Top of `WorkingBomPanel.tsx` or as a new alert component

### 3. Affected Parts Tab/Section

In BOM Explorer, show affected parts with:
- Part B-code (current)
- Part description
- CN Number
- New B-code to replace with
- Go Live Date with status badge:
  - "Live" (green) - go-live date has passed
  - "Upcoming: Mar 15, 2026" (orange) - future date
  - "After DTx" (yellow) - if project DTx is before go-live
- Replace button

**Component**: `components/bom/RunningChangesPanel.tsx`

### 4. Go-Live Date Warning

When go-live date is after project's DTx date:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⏰ After DTx                                                     │
│ This change goes live Mar 15, 2026, after your DTx (Feb 1).    │
│ Consider keeping the current B-code for this project.           │
│ [Replace Anyway] [Keep Current]                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Files

### New Files to Create

```
types/
└── runningChange.ts                  # RunningChange interface

lib/
├── runningChanges/
│   ├── runningChangeService.ts       # CRUD + import logic
│   └── matchingService.ts            # Match B-codes against BOM
└── hooks/
    ├── useRunningChanges.ts          # Fetch all running changes
    └── useAffectedParts.ts           # Match project BOM against changes

components/
└── bom/
    ├── RunningChangesAlert.tsx       # Alert banner for BOM Explorer
    └── RunningChangesPanel.tsx       # Affected parts list + replace UI

app/(dashboard)/data/
└── running-changes/
    └── page.tsx                      # Global running changes page
```

### Files to Modify

- `components/layout/GlobalSidebar.tsx` - Add Running Changes nav item
- `app/(dashboard)/project/[projectId]/bom/page.tsx` - Add alert + panel integration
- `components/bom/WorkingBomPanel.tsx` - Show alert when affected parts exist
- `firestore.rules` - Add rules for runningChanges collection
- `types/index.ts` - Export RunningChange types

---

## Key Service Functions

### runningChangeService.ts

```typescript
// Import running changes from CSV
importRunningChanges(data: Record<string, unknown>[], userId: string, filename: string): Promise<ImportResult>

// Get all running changes
getRunningChanges(): Promise<RunningChange[]>

// Clear all running changes
clearRunningChanges(): Promise<{ success: boolean; deletedCount: number }>

// Deactivate a change (mark as complete)
deactivateChange(changeId: string): Promise<void>
```

### matchingService.ts

```typescript
// Find BOM items affected by running changes
findAffectedItems(
  bomItems: BomItem[],
  runningChanges: RunningChange[]
): AffectedItem[]

interface AffectedItem {
  bomItem: BomItem;
  runningChange: RunningChange;
  oldBCode: string;
  newBCode: string;
  goLiveDate: Date;
  isLive: boolean;           // go-live date has passed
  isAfterDtx: boolean;       // go-live date is after project DTx
}

// Replace a B-code in the BOM
replaceWithNewBCode(
  projectId: string,
  bomItemId: string,
  newBCode: string,
  runningChangeId: string,
  userId: string
): Promise<void>
```

---

## Security Rules

Add to `firestore.rules`:

```javascript
// Running Changes (global, read by all authenticated, write by admins/managers)
match /runningChanges/{changeId} {
  allow read: if isAuthenticated();
  allow create, update, delete: if isAuthenticated();
  // Could restrict to specific roles if needed:
  // allow write: if isAdmin() || isManager();
}
```

---

## User Flow

1. **Admin uploads running changes CSV** on `/data/running-changes`
2. System parses CSV and creates RunningChange documents
3. **User opens project BOM Explorer**
4. System checks project's BOM items against running changes
5. If matches found, show alert banner with count
6. User clicks "View Affected Parts" to see details
7. For each affected part:
   - See current B-code, new B-code, go-live date
   - If go-live after DTx, see warning badge
   - Click "Replace" to immediately update BOM item
8. After replacement, item is updated and removed from affected list

---

## Implementation Tasks

### Phase 17.1: Foundation
- [ ] Create `types/runningChange.ts` with RunningChange interface
- [ ] Create `lib/runningChanges/runningChangeService.ts` with CRUD and CSV import
- [ ] Create `lib/runningChanges/matchingService.ts` for BOM matching logic
- [ ] Add Firestore security rules for runningChanges collection

### Phase 17.2: Global Running Changes Page
- [ ] Create `/app/(dashboard)/data/running-changes/page.tsx`
- [ ] Add Running Changes to GlobalSidebar Master Data section
- [ ] Implement CSV upload with column parsing
- [ ] Create stats cards (Total, Active, Upcoming, Applied)
- [ ] Create searchable/filterable table
- [ ] Add Clear Data functionality

### Phase 17.3: Hooks
- [ ] Create `lib/hooks/useRunningChanges.ts` - Fetch all running changes
- [ ] Create `lib/hooks/useAffectedParts.ts` - Match project BOM against changes

### Phase 17.4: BOM Explorer Integration
- [ ] Create `components/bom/RunningChangesAlert.tsx` banner component
- [ ] Create `components/bom/RunningChangesPanel.tsx` with affected parts list
- [ ] Integrate alert and panel into BOM Explorer page
- [ ] Implement go-live date status badges (Live, Upcoming, After DTx)
- [ ] Add "After DTx" warning dialog

### Phase 17.5: Replacement Workflow
- [ ] Implement Replace button functionality
- [ ] Update BOM item's itemCode on replacement
- [ ] Track replacement in activity/history
- [ ] Remove replaced items from affected list

### Phase 17.6: Polish
- [ ] Add loading states and skeletons
- [ ] Add empty states
- [ ] Error handling
- [ ] Test end-to-end workflow

---

## Success Criteria

Phase 17 is complete when:

- [ ] Running Changes page exists at `/data/running-changes`
- [ ] CSV upload parses all columns correctly
- [ ] Running changes table shows all imported data with search/filter
- [ ] Stats cards show: Total, Active, Upcoming counts
- [ ] BOM Explorer shows alert when project has affected parts
- [ ] Affected parts panel shows all matches with go-live status
- [ ] "After DTx" warning shows when go-live is after project DTx
- [ ] Replace button updates BOM item's itemCode immediately
- [ ] Activity/history captures replacement action
- [ ] Replaced parts no longer show as affected

---

## Future Enhancements (Not in Phase 17)

- Email notifications when new running changes affect your projects
- Bulk replace all affected parts at once
- Running change approval workflow
- Integration with external change management systems
- Historical tracking of all replacements made
- Dashboard widget showing running changes affecting your projects
