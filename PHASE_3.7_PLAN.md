# Phase 3.7: Batch Item Entry

## Overview

Enhance the "Add Item" functionality to support adding **multiple parts in one go**, with the ability to **create a new group inline**, **assign all new items to that group**, and **flag items as "New Parts" that require quotes**. This addresses the workflow where users need to quickly add several new parts that belong together and track them through the design/procurement process.

## Problem Statement

Currently, adding items to a BOM is a one-at-a-time process:
1. Click "Add Item"
2. Fill in details for ONE item
3. Save and close dialog
4. Repeat for each item

When a user needs to add 5-10 new parts (especially when they all belong to a new custom group), this becomes tedious.

**Additionally**, there's no way to flag items as "new parts requiring quotes" at the time of entry. These new parts need to flow into the Quote Log (Phase 7) so they can be tracked through design and procurement.

## Proposed Solution

### Enhanced "Add Items" Dialog

A redesigned dialog that supports:
1. **Batch item entry** - Add multiple items before saving
2. **Inline group creation** - Create a new group without opening a separate dialog
3. **Auto-assignment** - All items added in the session go to the selected/new group
4. **Quick-add mode** - Minimal fields for rapid entry
5. **"Needs Quote" flag** - Mark items as new parts requiring quotes (flows to Quote Log)

---

## UI Design

### Add Items Dialog (Enhanced)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ADD ITEMS                                                     [X]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  TARGET GROUP                                                    │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │ ○ Existing Group      ○ Create New Group                    ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  │                                                                  │   │
│  │  [GRP-FRAME-A01 ▼]       ← (dropdown when "Existing" selected)  │   │
│  │                                                                  │   │
│  │  ─── OR ─────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  New Group Code: [GRP-CUSTOM-A05    ]  ← (when "Create New")    │   │
│  │  Description:    [Custom Assembly    ]                          │   │
│  │  Category:       [Other ▼]                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ITEMS TO ADD (4 items)                                🆕 2 new parts   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ # │ Code      │ Description            │ Qty │NewPart?│ Actions │  │
│  ├───┼───────────┼────────────────────────┼─────┼────────┼─────────┤  │
│  │ 1 │ BNEW-004  │ Custom bracket assembly│ 2   │   ☑    │ [🔍][🗑️]│  │
│  │ 2 │ B103456   │ Hex bolt M8x25        │ 12  │   ☐    │ [🔍][🗑️]│  │
│  │ 3 │ BNEW-005  │ Mounting plate        │ 1   │   ☑    │ [🔍][🗑️]│  │
│  │ 4 │ B104789   │ Washer M8             │ 12  │   ☐    │ [🔍][🗑️]│  │
│  └───┴───────────┴────────────────────────┴─────┴────────┴─────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  QUICK ADD                                                       │   │
│  │  ┌──────────┬────────────────────────┬──────┬─────────┬───────┐ │   │
│  │  │ Code     │ Description            │ Qty  │New Part?│       │ │   │
│  │  │ [      ] │ [                    ] │ [1 ] │   ☑     │[+Add] │ │   │
│  │  └──────────┴────────────────────────┴──────┴─────────┴───────┘ │   │
│  │                                                                  │   │
│  │  ○ Search Existing     ● Create Placeholder (BNEW-xxx)          │   │
│  │  [____________________] 🔍 ← (search input when "Search" mode)  │   │
│  │                                                                  │   │
│  │  💡 "New Part" items will be added to the New Part Tracker for  │   │
│  │     tracking through design and procurement.                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [Cancel]                                      [Save All (4 Items)]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### "New Part" Checkbox Behavior

| Item Type | Default "New Part" | Rationale |
|-----------|-------------------|-----------|
| Placeholder (BNEW-xxx) | ☑ Checked | New parts need design/procurement tracking |
| Existing item (B-code) from search | ☐ Unchecked | Already exists in system |
| User can override | Always | Manual control for special cases |

**Note:** The "New Part" flag is about tracking parts through design and procurement - not just pricing. Even if you find a similar existing part, you might flag a new one if it needs design work.

### Key UI Elements

#### 1. Target Group Section
- **Radio toggle**: Choose between existing group or create new
- **Existing group dropdown**: Select from available groups
- **New group fields**: Code, Description, Category (only visible when "Create New" selected)
- Auto-generates next `GRP-CUSTOM-Axx` code

#### 2. Items List
- Table showing all items queued for addition
- Columns: #, Code, Description, Qty, **New Part?**, Actions
- **New Part? column**: Checkbox to flag item for design/procurement tracking
- Actions: Search/Edit (🔍), Remove (🗑️)
- Shows count of items: "ITEMS TO ADD (4 items)"
- Shows new part count badge: "🆕 2 new parts"

#### 3. Quick Add Row
- Inline form at bottom for rapid item entry
- Toggle: Search Existing vs Create Placeholder
- When "Search": Shows search input with results dropdown
- When "Placeholder": Auto-generates BNEW-xxx code
- Enter description and quantity
- **"New Part" checkbox** - defaults checked for placeholders
- Click "+ Add" or press Enter to add to list
- Helper text: "New Parts will be added to the New Part Tracker"

#### 4. Footer
- Cancel: Closes without saving
- Save All: Creates group (if new) and all items in one batch

---

## Workflow Scenarios

### Scenario 1: Add Multiple Items to Existing Group

1. Open "Add Items" dialog
2. Select "Existing Group" → Choose `GRP-FRAME-A01`
3. Quick add items:
   - Enter code `B103456`, description auto-fills from search, qty `4` → Add
   - Enter `BNEW-xxx`, description "Custom bracket", qty `2` → Add
   - Search `B104`, select result, qty `8` → Add
4. Review list (3 items)
5. Click "Save All (3 Items)"
6. All items added to `GRP-FRAME-A01`

### Scenario 2: Create New Group with Items

1. Open "Add Items" dialog
2. Select "Create New Group"
3. Enter group details:
   - Code: `GRP-CUSTOM-A05` (auto-generated)
   - Description: "Accessory Kit Assembly"
   - Category: "Accessories"
4. Quick add items:
   - Add 5 placeholder items for new parts
5. Click "Save All (5 Items)"
6. Group created, all 5 items added to it

### Scenario 3: Mixed Entry (Search + Placeholder)

1. Open dialog, select existing group
2. Switch to "Search Existing" mode
   - Type `B104`, select from results → Add
3. Switch to "Create Placeholder" mode
   - Description: "New custom part", qty: 1 → Add (gets BNEW-006)
4. Back to search mode
   - Add more existing parts
5. Save all

---

---

## New Part Tracker Integration (Prepares for Phase 7)

### Overview

When items are marked as "New Part", they will be flagged on the `BomItem` and (in Phase 7) automatically added to the **New Part Tracker**. This creates a seamless workflow to track new parts through their entire lifecycle: **design → engineering → procurement → final part assignment**.

The New Part Tracker is NOT just for quotes - it's for tracking all new parts that need to go through the design and procurement process before they have a final B-code and pricing.

### New Part Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     NEW PART LIFECYCLE                                   │
│                                                                         │
│  BNEW-004 "Custom bracket assembly"                                     │
│                                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────┐ │
│  │  Added   │ → │  Design  │ → │Engineering│ → │Procurement│ → │Complete│ │
│  │          │   │          │   │          │   │          │   │       │ │
│  │ BNEW-004 │   │ Drawing  │   │ Approved │   │ Quoted   │   │B107234│ │
│  │ created  │   │ created  │   │ for mfg  │   │ Ordered  │   │ Final │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └───────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 3.7: Batch Add Items                                             │
│                                                                         │
│  User adds items with "New Part" ☑                                      │
│       │                                                                 │
│       ▼                                                                 │
│  BomItem created with:                                                  │
│    - isNewPart: true                                                    │
│    - newPartStatus: 'pending'                                           │
│    - costSource: 'placeholder'                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    │ (Phase 7 - Future)
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: New Part Tracker                                               │
│                                                                         │
│  Cloud Function triggers on BomItem create:                             │
│    IF isNewPart === true AND newPartTrackerId === null                  │
│    THEN auto-create NewPart tracking document                           │
│                                                                         │
│       ▼                                                                 │
│  NewPart created in: projects/{projectId}/newParts/{newPartId}          │
│    - bomItemId: reference back to BomItem                               │
│    - placeholderCode: "BNEW-004"                                        │
│    - description: "Custom bracket assembly"                             │
│    - status: "added"                                                    │
│    - requestedDate: now                                                 │
│                                                                         │
│       ▼                                                                 │
│  New Part Tracker Kanban Board:                                         │
│  ┌─────────┬─────────┬───────────┬───────────┬──────────┐              │
│  │  Added  │ Design  │Engineering│Procurement│ Complete │              │
│  ├─────────┼─────────┼───────────┼───────────┼──────────┤              │
│  │BNEW-004 │         │           │           │          │              │
│  │BNEW-005 │         │           │           │          │              │
│  │BNEW-006 │         │           │           │          │              │
│  └─────────┴─────────┴───────────┴───────────┴──────────┘              │
│                                                                         │
│  When complete → BomItem updated:                                       │
│    - itemCode: "B107234" (final code assigned)                          │
│    - materialCost: £12.50 (from procurement)                            │
│    - costSource: 'contract' or 'quote'                                  │
│    - isPlaceholder: false                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### BomItem Field Additions

Add these fields to `BomItem` interface in `types/bom.ts`:

```typescript
// Add to BomItem interface
export interface BomItem {
  // ... existing fields ...
  
  // New Part tracking (Phase 3.7 - set during batch add)
  isNewPart: boolean;              // Flag: needs to go through design/procurement
  newPartStatus?: NewPartStatus;   // Current status in new part workflow
  newPartTrackerId?: string;       // Link to NewPart document (set by Phase 7)
  newPartAddedAt?: Timestamp;      // When flagged as new part
  finalItemCode?: string;          // Final B-code when part is complete
  
  // ... rest of existing fields ...
}

// New Part status - tracks through design and procurement lifecycle
export type NewPartStatus = 
  | 'pending'        // Flagged as new part but not yet in tracker
  | 'added'          // In tracker, initial state
  | 'design'         // In design phase (drawings, specs)
  | 'engineering'    // Engineering review/approval
  | 'procurement'    // Getting quotes, ordering
  | 'complete'       // Final part code assigned, pricing confirmed
  | 'on_hold'        // Paused
  | 'cancelled';     // No longer needed
```

### NewPart Interface (For Phase 7)

```typescript
// types/newPart.ts - Prepare interface now for Phase 7

export interface NewPart {
  id: string;
  projectId: string;
  
  // BOM Item reference
  bomItemId: string;
  placeholderCode: string;    // Original placeholder (BNEW-004)
  description: string;        // Part description
  groupCode: string;          // Which BOM group
  quantity: number;           // Quantity from BOM
  
  // Status tracking
  status: NewPartStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Request details
  requestedBy: string;        // User who flagged it
  requestedAt: Timestamp;
  requestNotes?: string;
  
  // Design phase
  designStatus?: 'not_started' | 'in_progress' | 'complete';
  drawingNumber?: string;
  drawingRevision?: string;
  designNotes?: string;
  designCompletedAt?: Timestamp;
  
  // Engineering phase
  engineeringStatus?: 'not_started' | 'in_progress' | 'approved' | 'rejected';
  engineeringNotes?: string;
  engineeringApprovedBy?: string;
  engineeringApprovedAt?: Timestamp;
  
  // Procurement phase
  procurementStatus?: 'not_started' | 'rfq_sent' | 'quoted' | 'ordered' | 'received';
  vendorCode?: string;
  vendorName?: string;
  quotedPrice?: number;
  quotedCurrency?: string;
  quotedMoq?: number;
  quotedLeadTimeDays?: number;
  poNumber?: string;
  procurementNotes?: string;
  
  // Completion
  finalItemCode?: string;     // Final B-code (e.g., B107234)
  finalUnitPrice?: number;
  landingPct?: number;
  completedAt?: Timestamp;
  completedBy?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Stored in: projects/{projectId}/newParts/{newPartId}
```

### Visual Indicators in BOM Explorer

Items flagged as "New Part" should be visually distinct:

```
Working BOM Tree View:
├── GRP-CUSTOM-A05 (Custom Assembly)
│   ├── BNEW-004  Custom bracket assembly   Qty: 2   🆕 New Part (Design)
│   ├── B103456   Hex bolt M8x25           Qty: 12  £0.45 (contract)
│   ├── BNEW-005  Mounting plate           Qty: 1   🆕 New Part (Added)
│   └── B104789   Washer M8                Qty: 12  £0.12 (contract)
```

**Visual treatments:**
- 🆕 "New Part" badge with status
- Color-coded by status:
  - Orange: Added/Pending
  - Blue: Design/Engineering
  - Purple: Procurement
  - Green: Complete
- Click badge to open New Part Tracker detail
- Filter option: "Show New Parts"

---

## Technical Implementation

### Component Structure

```
components/bom/
├── BatchAddItemsDialog.tsx    ← New main component
├── BatchItemsTable.tsx        ← Items list with actions
├── QuickAddRow.tsx            ← Inline add form
├── GroupSelector.tsx          ← Existing/New group toggle
└── ItemSearchInput.tsx        ← Search with results dropdown
```

### State Management

```typescript
interface BatchAddState {
  // Group selection
  groupMode: 'existing' | 'new';
  selectedGroupCode: string;
  
  // New group details (when groupMode === 'new')
  newGroup: {
    code: string;
    description: string;
    category: string;
  };
  
  // Items queue
  items: BatchItem[];
  
  // Quick add form
  quickAdd: {
    mode: 'search' | 'placeholder';
    searchQuery: string;
    searchResults: Item[];
    code: string;
    description: string;
    quantity: number;
    isNewPart: boolean;     // Default true for placeholders
  };
}

interface BatchItem {
  tempId: string;          // Temporary ID for list management
  code: string;
  description: string;
  quantity: number;
  isPlaceholder: boolean;
  isNewPart: boolean;      // Flag for New Part Tracker
  sourceItem?: Item;       // Reference if from search
}
```

### API / Service Layer

```typescript
// lib/bom/batchAddService.ts

interface BatchAddResult {
  success: boolean;
  groupCreated?: BomGroup;
  itemsCreated: number;
  errors: Array<{ code: string; error: string }>;
}

async function batchAddItems(
  projectId: string,
  groupMode: 'existing' | 'new',
  groupDetails: {
    existingGroupCode?: string;
    newGroup?: { code: string; description: string; category: string };
  },
  items: BatchItem[]
): Promise<BatchAddResult> {
  // 1. If new group, create it first
  // 2. Validate all items (check duplicates)
  // 3. Batch write all items to Firestore
  // 4. Return result with counts
}
```

### Database Operations

```typescript
// Batch write implementation
async function executeBatchAdd(
  projectId: string,
  groupCode: string,
  items: BatchItem[],
  existingItems: BomItem[]
): Promise<void> {
  const batch = writeBatch(db);
  const bomItemsRef = collection(db, `projects/${projectId}/bomItems`);
  
  // Calculate starting sequence
  const groupItems = existingItems.filter(i => i.groupCode === groupCode);
  let sequence = groupItems.length > 0 
    ? Math.max(...groupItems.map(i => i.sequence)) + 1 
    : 1;
  
  for (const item of items) {
    const docRef = doc(bomItemsRef);
    const bomItem: Omit<BomItem, 'id'> = {
      itemCode: item.code,
      itemDescription: item.description,
      quantity: item.quantity,
      groupCode,
      sequence: sequence++,
      level: 1,
      isPlaceholder: item.isPlaceholder,
      isAddedItem: true,
      isFromTemplate: false,
      // ... other fields
    };
    batch.set(docRef, bomItem);
  }
  
  await batch.commit();
}
```

---

## Props & Interfaces

### BatchAddItemsDialog Props

```typescript
interface BatchAddItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  groups: BomGroup[];
  existingItems: BomItem[];
  onItemsAdded: (items: BomItem[], newGroup?: BomGroup) => void;
}
```

### Events / Callbacks

| Event | Description |
|-------|-------------|
| `onItemsAdded` | Called after successful batch save with created items |
| `onGroupCreated` | Optional: Called if a new group was created |
| `onCancel` | Called when dialog is cancelled |

---

## Validation Rules

### Group Validation
- New group code must be unique
- Group code must match pattern `GRP-xxx-xxx`
- Description required (min 3 chars)

### Item Validation
- Code required and unique within batch
- Code must not already exist in BOM (duplicate check)
- Description required
- Quantity > 0

### Error Handling
- Show inline errors for each invalid item
- Prevent save if any validation fails
- Show summary of errors before save

---

## User Experience Enhancements

### 1. Keyboard Shortcuts
- `Enter` in quick add → Add item to list
- `Ctrl/Cmd + Enter` → Save all
- `Escape` → Cancel/Close

### 2. Auto-Focus Flow
- Dialog opens → Focus on group selector
- After adding item → Focus back to quick add code field
- Smooth flow for rapid entry

### 3. Placeholder Code Generation
- Auto-increment: `BNEW-001`, `BNEW-002`, etc.
- Considers both existing items AND items in current batch
- Shows preview: "Will be assigned: BNEW-007"

### 4. Duplicate Warning
- Real-time check as items are added
- Warning badge: "⚠️ B103456 already in BOM"
- Option to skip or replace

### 5. Undo in List
- Remove item from list before save
- No confirmation needed (not yet saved)

---

## Tasks Breakdown

### Task 1: Type Updates
- [ ] Add `isNewPart`, `newPartStatus`, `newPartTrackerId`, `newPartAddedAt` to `BomItem` interface
- [ ] Create `NewPartStatus` type
- [ ] Create `NewPart` interface (for Phase 7 preparation)
- [ ] Export new types

### Task 2: Create Core Dialog Component
- [ ] `BatchAddItemsDialog.tsx` with modal structure
- [ ] State management for group mode and items queue
- [ ] Dialog layout with sections

### Task 3: Group Selector Component
- [ ] Radio toggle (Existing / New)
- [ ] Existing group dropdown
- [ ] New group inline form
- [ ] Auto-generate group code

### Task 4: Items Table Component
- [ ] Display queued items with "New Part?" column
- [ ] Checkbox for each item's new part flag
- [ ] Remove item action
- [ ] Edit item action (opens inline or sub-dialog)
- [ ] Counter badge showing "X new parts"

### Task 5: Quick Add Row
- [ ] Mode toggle (Search / Placeholder)
- [ ] Search input with debounced API call
- [ ] Search results dropdown
- [ ] Placeholder code auto-generation
- [ ] "New Part" checkbox with smart defaults (checked for placeholders)
- [ ] Add button / Enter key handling

### Task 6: Batch Service
- [ ] `batchAddService.ts` with validation
- [ ] Duplicate detection
- [ ] Batch Firestore writes
- [ ] Set `newPartStatus: 'pending'` for flagged items
- [ ] Error handling and rollback

### Task 7: Visual Indicators
- [ ] Add new part status badges to BomTree component
- [ ] Add new part status badges to BomTable component
- [ ] Add filter for "New Parts" items
- [ ] Update stats cards to show new part count

### Task 8: Integration
- [ ] Replace/augment existing "Add Item" button
- [ ] Wire up to BOM page
- [ ] Update useBom hook if needed
- [ ] Test with real data

### Task 9: Polish
- [ ] Loading states during save
- [ ] Success/error notifications
- [ ] Keyboard shortcuts
- [ ] Accessibility (ARIA labels)
- [ ] Help tooltip explaining New Part Tracker workflow

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| Existing `AddItemDialog` | Reference for item creation logic |
| Existing `AddGroupDialog` | Reference for group creation logic |
| `useBom` hook | Access to existing items for duplicate check |
| `useTemplateBom` hook | For searching existing items |
| Firebase batch writes | Efficient multi-document writes |

---

## Success Criteria

1. ✅ User can add 5+ items in a single dialog session
2. ✅ User can create a new group and add items to it in one flow
3. ✅ Auto-generated placeholder codes work correctly
4. ✅ Search existing items works within the dialog
5. ✅ Duplicate detection prevents adding existing items
6. ✅ All items saved in one batch operation (not multiple round-trips)
7. ✅ Dialog provides clear feedback on success/errors
8. ✅ **User can flag items as "New Part"**
9. ✅ **Smart defaults: placeholder items auto-checked as New Part**
10. ✅ **New Part items visible in BOM Explorer with status badge**
11. ✅ **Filter available to show only New Parts**
12. ✅ **Data model ready for Phase 7 New Part Tracker integration**

---

## Estimated Effort

| Task | Estimate |
|------|----------|
| Type Updates (BomItem, Quote) | 1 hour |
| Core Dialog Component | 2-3 hours |
| Group Selector | 1-2 hours |
| Items Table (with Quote column) | 2-3 hours |
| Quick Add Row + Search | 2-3 hours |
| Batch Service (with quote flags) | 2-3 hours |
| Visual Indicators (badges, filters) | 2-3 hours |
| Integration & Testing | 2-3 hours |
| Polish | 1-2 hours |
| **Total** | **15-23 hours** (~2-3 days) |

---

## Future Enhancements (Out of Scope for 3.7)

- Paste from Excel/CSV
- Import from another BOM
- Drag-and-drop hierarchy editing
- Bulk edit quantities
- Templates for common item sets

---

## Phase 7 Integration Notes

Phase 3.7 prepares the data model and UI for Phase 7 (New Part Tracker & Manufacturing Logs). Here's how they connect:

### What Phase 3.7 Provides

| Feature | Phase 3.7 Scope | Phase 7 Uses |
|---------|-----------------|--------------|
| `BomItem.isNewPart` | Set during batch add | Triggers NewPart creation |
| `BomItem.newPartStatus` | Set to 'pending' | Updated through workflow |
| `BomItem.newPartTrackerId` | Field exists (null) | Populated when NewPart created |
| `NewPart` interface | Defined in types | Full CRUD implementation |
| New Part badges in BOM | Visual indicator | Links to tracker detail |
| Filter: New Parts | Shows flagged items | Quick access to tracker |

### What Phase 7 Will Add

- New Part Tracker pages (list, detail, edit)
- Kanban board for tracking: Added → Design → Engineering → Procurement → Complete
- Cloud Function: auto-create NewPart on `isNewPart: true`
- Cloud Function: update BomItem when part is complete (final code, pricing)
- Design tracking (drawing numbers, revisions)
- Engineering approval workflow
- Procurement tracking (quotes, POs, vendors)
- Ability to assign final B-code when complete

### New Part Complete Flow

When a new part completes the design/procurement process:
1. User assigns final item code (e.g., B107234)
2. User enters final pricing from vendor
3. System updates BomItem:
   - `itemCode`: BNEW-004 → B107234
   - `isPlaceholder`: true → false
   - `materialCost`: 0 → £12.50
   - `costSource`: 'placeholder' → 'contract' or 'quote'
   - `newPartStatus`: 'pending' → 'complete'

### Migration Path

No migration needed - Phase 3.7 fields are optional/nullable, so existing BomItems continue to work. Phase 7 Cloud Functions will handle items with `isNewPart: true` and `newPartTrackerId: null`.

---

## Phase 3.75: UI Simplification

**Status**: ✅ **Complete**  
**Completed**: December 2024

### Overview

Simplified the Add Items dialog to be more intuitive and streamlined while maintaining all functionality from Phase 3.7. The UI was redesigned to reduce complexity and improve user experience.

### Key Changes

1. **Single "Add Items" Button**
   - Removed separate "Add Item" and "Batch Add" buttons
   - Consolidated to single "Add Items" button in Working BOM panel
   - Works for both single and multiple item entry

2. **Simplified Dialog Layout**
   - Single-column layout instead of multiple sections
   - Smart input field that auto-detects search vs new item creation
   - Editable placeholder codes (Bxxx001 format, was BNEW-001)
   - Per-item group selection (can add to multiple groups in one session)

3. **Separate "New Part" and "Track" Checkboxes**
   - "New Part" checkbox: Sets `partCategory: 'new_part'` (visual styling in BOM)
   - "Track" checkbox: Sets `isNewPart: true` (design/procurement tracking)
   - Smart defaults: Placeholders default both checked, searched items default both unchecked

4. **Improved Item List**
   - Items grouped by target group in the list
   - New groups show "(New)" badge
   - Clear visual indicators for "New Part" and "Track" status
   - Inline group creation with expandable section

5. **Smart Input Behavior**
   - Typing `B1034...` triggers search mode
   - Typing text like `Custom bracket` creates placeholder with auto-generated `Bxxx001`
   - Code field always visible and editable

### UI Design

```
┌─────────────────────────────────────────────────────────────────┐
│  ADD ITEMS                                               [X]    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Search B-code or enter description...]                     ││
│  │                                                             ││
│  │  Code: [Bxxx001]        Qty [2 ]                            ││
│  │  Add to: [GRP-CUSTOM-A01 v]                                 ││
│  │                                                             ││
│  │  [x New Part]  [x Track]                          [+ Add]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                         [+ Create New Group]    │
│                                                                 │
│  Items to Add (4)                           2 new, 2 tracked    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ GRP-CUSTOM-A01 (New)                                        ││
│  │   Bxxx001  * Custom bracket     Qty: 2   @ Track      [x]  ││
│  │   Bxxx002  * Mounting plate     Qty: 1   @ Track      [x]  ││
│  │ GRP-FRAME-A01                                               ││
│  │   B103456    Hex bolt M8x25    Qty: 12               [x]   ││
│  └─────────────────────────────────────────────────────────────┘│
│  [Cancel]                                    [Save 4 Items]     │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Changes

**Files Modified:**
- `lib/bom/batchAddService.ts` - Updated placeholder format to Bxxx001, added isNewPartCategory field, refactored to support per-item group codes
- `components/bom/BatchAddItemsDialog.tsx` - Complete rewrite with simplified UI
- `components/bom/WorkingBomPanel.tsx` - Removed onAddItem prop, consolidated to onAddItems
- `app/(dashboard)/project/[projectId]/bom/page.tsx` - Removed AddItemDialog, consolidated to single dialog

**Placeholder Code Format:**
- Changed from `BNEW-001` to `Bxxx001` format
- Auto-increments: `Bxxx001`, `Bxxx002`, `Bxxx003`, etc.
- Code field is editable for customization

**Batch Item Interface:**
- Added `isNewPartCategory: boolean` - For "New Part" checkbox
- Added `isNewPart: boolean` - For "Track" checkbox (existing)
- Added `groupCode: string` - Per-item group selection

**Batch Add Service:**
- Refactored `batchAddItems()` to accept items with per-item group codes
- Supports creating multiple new groups in one batch
- Groups items by target group before batch write

### User Workflow

1. Click "Add Items" button
2. Type description or B-code in smart input
3. Edit code if needed (defaults to Bxxx001 for new items)
4. Select target group (or create new group inline)
5. Check "New Part" and/or "Track" as needed
6. Click "Add" to add to queue
7. Repeat for multiple items (can change group per item)
8. Review items grouped by target group
9. Click "Save X Items" to batch create

### Benefits

- **Simpler UI**: Less visual clutter, more intuitive flow
- **Faster Entry**: Smart input reduces mode switching
- **Flexible Grouping**: Add items to multiple groups in one session
- **Clear Status**: Separate indicators for "New Part" vs "Track"
- **Editable Codes**: Users can customize placeholder codes

---

**Phase 3.7 Status**: ✅ Complete  
**Phase 3.75 Status**: ✅ Complete  
**Last Updated**: December 2024
