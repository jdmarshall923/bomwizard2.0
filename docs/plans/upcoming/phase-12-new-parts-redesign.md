# Phase 12: New Parts Page Redesign

## Overview

Complete redesign of the New Parts page to remove visual clutter and center the experience around the **two key elements**: the **parts table** and the **timeline/Gantt chart**. All existing functionality will be preserved but presented in a cleaner, more focused interface.

## Current Problems

1. **Too many stats cards** - 6 stat cards (Total Parts, In Progress, Completed, This Week, Critical, Awaiting Start) take significant vertical space
2. **Redundant progress bar** - The "Pipeline Overview" bar duplicates information already visible in the timeline
3. **Tab-based separation** - Forces users to switch between "Tracker" and "Timeline" views when both are needed together
4. **Overwhelming filter bar** - Search, priority filter, missing info filter, and view toggle all compete for attention
5. **Visual hierarchy is flat** - Everything feels equally important, nothing stands out as the primary interface

## Design Goals

1. **Table as primary interface** - The table is where users edit data; it should be front and center
2. **Timeline as visual context** - The Gantt shows the "big picture" and should always be visible
3. **Minimal chrome** - Reduce stats, badges, and decorative elements
4. **Progressive disclosure** - Show essential info by default, reveal details on demand
5. **No tabs** - Unified view showing table + timeline together
6. **Streamlined actions** - Keep actions but make them contextual and less cluttered

---

## New Layout: Split View Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR (compact)                                                         │
│ ┌───────────────────────┐  ┌────────────────┐  ┌──────────────────────────┐ │
│ │ New Parts             │  │ 🔍 Search...   │  │ + Add Part │ ⚡ Sync BOM │ │
│ │ 24 parts • 5 critical │  └────────────────┘  └──────────────────────────┘ │
│ └───────────────────────┘                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ GANTT TIMELINE (Hero - ~40% height, collapsible)                            │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  Part       │  Jan    Feb    Mar    Apr    May    Jun    Jul    Aug     │ │
│ │  ───────────│────────────────────────────|──────────────────────────────│ │
│ │  BNEW-001   │  █████████████░░░░░░░░░░░░░|░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │
│ │  BNEW-002   │     ████████████░░░░░░░░░░░|░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │
│ │  BNEW-003   │           ████████████░░░░░|░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │
│ │             │                       TODAY |                              │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                              [ ^ Collapse ] │
├─────────────────────────────────────────────────────────────────────────────┤
│ PARTS TABLE (Primary - ~60% height, scrollable)                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  Filter: [All ▾] [Priority ▾] [⚠ Missing Info]     View: [Table] [Kanban]│
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │  ☐ │ Code      │ Description      │ Status   │ Vendor    │ Lead │ Frt │ │
│ │  ──│───────────│──────────────────│──────────│───────────│──────│─────│ │
│ │  ☐ │ BNEW-001  │ Main bracket...  │ 🟢 Proc  │ VendorX   │ 45d  │ 🚢  │ │
│ │  ☐ │ BNEW-002  │ Mount plate...   │ 🟡 Eng   │ —         │ —    │ ✈️  │ │
│ │  ☐ │ BNEW-003  │ Cover panel...   │ 🔴 Design│ Add...    │ —    │ 🚢  │ │
│ │  ...                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Changes

### 1. Compact Header Bar (New: `NewPartsHeader.tsx`)

**Remove:**
- Large title with description paragraph
- Separate action buttons section

**New Design:**
```tsx
// Single row, left-aligned title with inline metrics + right-aligned actions
<div className="flex items-center justify-between py-4">
  <div>
    <h1 className="text-xl font-semibold">New Parts</h1>
    <span className="text-sm text-muted">
      {stats.total} parts • {stats.byPriority.critical} critical
    </span>
  </div>
  
  <div className="flex items-center gap-3">
    <SearchInput /> {/* Prominent search */}
    <Button variant="outline" size="sm">⚡ Sync BOM</Button>
    <Button size="sm">+ Add Part</Button>
  </div>
</div>
```

### 2. Remove Stats Cards (Delete: `NewPartStatsCards`)

**Current:** 6 prominent stat cards at the top
**New:** Minimal inline metrics in header + detailed stats in a collapsible drawer/panel if needed

The key stats (total, critical) appear in the header. If users need more detail, they can:
- See status distribution in the table column filters
- See timeline-based metrics on the Gantt
- Access a "Stats" dropdown/panel for deep analytics

### 3. Remove Pipeline Progress Bar (Delete: `NewPartProgress`)

**Reason:** The Gantt chart and status column in table already communicate progress. This was redundant visual noise.

### 4. Hero Timeline (Enhanced: `UnifiedGantt.tsx`)

**Changes:**
- Always visible (not behind a tab)
- Collapsible to ~100px "mini mode" showing just the timeline header with gate markers
- When collapsed, table gets full height
- Zoom controls remain, but simpler (just +/- icons)
- Legend moves to a tooltip/popover instead of always visible

**Mini Mode (Collapsed):**
```
┌─────────────────────────────────────────────────────────────┐
│  Timeline ▼  │  Jan  Feb  Mar  [TODAY] Apr  May  Sprint │  │
└─────────────────────────────────────────────────────────────┘
```

### 5. Primary Parts Table (Enhanced: `NewPartsTable.tsx`)

**Changes:**
- Always visible (not behind tabs)
- Full inline editing (no drawer needed for common fields)
- Cleaner row design with status badges
- Group headers collapsible
- Multi-select for bulk actions
- Quick actions on row hover (move status, delete)

**Table Columns:**
| Column | Width | Notes |
|--------|-------|-------|
| Checkbox | 40px | For selection |
| Code | 100px | `BNEW-001`, clickable for drawer |
| Description | flex | Truncated, full on hover |
| Status | 100px | Badge with quick-change dropdown |
| Vendor | 120px | Inline editable |
| Lead Time | 80px | Inline editable, shows total |
| Freight | 60px | Toggle: 🚢 / ✈️ |
| Scrap % | 60px | Inline editable |
| Final Code | 100px | Shows B-code when complete |
| Actions | 80px | Row actions menu |

### 6. Simplified Filters (New: `TableFilters.tsx`)

**Current:** Multiple dropdowns + buttons + active filters display
**New:** Compact filter bar with popovers

```tsx
<div className="flex items-center gap-2 mb-2">
  <DropdownFilter 
    label="Status" 
    options={['All', 'Added', 'Design', 'Engineering', 'Procurement', 'Complete']}
  />
  <DropdownFilter 
    label="Priority" 
    options={['All', 'Critical', 'High', 'Medium', 'Low']}
  />
  <Button 
    variant={showMissingOnly ? 'default' : 'ghost'} 
    size="sm"
  >
    ⚠ Missing Info ({missingCount})
  </Button>
  
  <div className="flex-1" />
  
  <ToggleGroup value={viewMode}>
    <ToggleGroupItem value="table">Table</ToggleGroupItem>
    <ToggleGroupItem value="kanban">Kanban</ToggleGroupItem>
  </ToggleGroup>
</div>
```

### 7. Keep Detail Drawer (Simplify: `NewPartDetailDrawer.tsx`)

**Changes:**
- Opens when clicking part code in table
- Reduce tab count (combine Details + Design, combine Engineering + Procurement)
- Focus on fields NOT in the table (notes, drawing info, history)
- Keep Complete Part flow

**New Tabs:**
1. **Overview** - Description, priority, notes, request info, group
2. **Design & Engineering** - Drawing number/rev, design notes, engineering approval
3. **Procurement** - Vendor details, quotes, PO info, completion

### 8. Kanban View (Keep: `NewPartKanban.tsx`)

**Changes:**
- Accessed via Table/Kanban toggle (not separate tab)
- When in Kanban mode, timeline remains visible above
- Simpler card design (less info per card, click for details)

---

## Interaction Flow

### Default View
1. User lands on page → sees timeline (40%) + table (60%)
2. Table shows all parts with inline editing
3. Timeline shows all parts with lead time data

### Editing a Part
1. Edit directly in table (vendor, lead time, freight, scrap %)
2. Click code → opens drawer for full details
3. Status changes via dropdown in status column OR drag in Kanban

### Working with Timeline
1. Timeline always visible above table
2. Click a bar → highlights row in table + opens drawer
3. Ctrl+scroll or buttons to zoom
4. Click "Today" to center view
5. Collapse timeline for more table space

### Adding Parts
1. Click "+ Add Part" → dialog (unchanged)
2. Or use "Sync BOM" to import from BOM

---

## Files to Create/Modify

### New Files
- `components/new-parts/NewPartsHeader.tsx` - Compact header with inline metrics
- `components/new-parts/NewPartsTable.tsx` - Primary editable table
- `components/new-parts/TableFilters.tsx` - Compact filter row

### Modified Files
- `app/(dashboard)/project/[projectId]/new-parts/page.tsx` - Complete rewrite of layout
- `components/new-parts/UnifiedGantt.tsx` - Add collapse/expand, mini mode
- `components/new-parts/NewPartKanban.tsx` - Simplify card design
- `components/new-parts/NewPartDetailDrawer.tsx` - Reduce tabs, simplify

### Deleted Files
- `components/new-parts/NewPartStats.tsx` - Replaced by inline metrics
- `components/new-parts/PartSelectionTable.tsx` - Merged into NewPartsTable

---

## Implementation Tasks

### Task 1: Create New Page Layout (~2-3 hours)
- [ ] Rewrite `page.tsx` with split view layout
- [ ] Create `NewPartsHeader.tsx` with compact design
- [ ] Set up responsive layout (timeline collapses on mobile)

### Task 2: Build Primary Table (~3-4 hours)
- [ ] Create `NewPartsTable.tsx` with all columns
- [ ] Implement inline editing for key fields
- [ ] Add row selection and bulk actions
- [ ] Add group headers (collapsible)
- [ ] Create `TableFilters.tsx` component

### Task 3: Enhance Timeline (~2 hours)
- [ ] Add collapse/expand to `UnifiedGantt.tsx`
- [ ] Create mini-mode design
- [ ] Move legend to popover
- [ ] Sync table selection with timeline highlighting

### Task 4: Simplify Drawer (~1-2 hours)
- [ ] Reduce tabs from 4 to 3
- [ ] Combine related fields
- [ ] Remove fields that are now in table

### Task 5: Polish & Test (~1-2 hours)
- [ ] Responsive design (mobile, tablet)
- [ ] Keyboard navigation
- [ ] Loading states
- [ ] Error handling

---

## Visual Design Notes

### Color Palette
Keep existing accent colors but use them more sparingly:
- Blue: Primary actions, links, selected states
- Green: Complete status, success states
- Orange: Warnings, at-risk items
- Red: Critical priority, errors
- Purple: Engineering/production phases

### Typography
- Table: Use smaller font (13px base, 11px secondary)
- Headers: Reduce weight, less prominent
- Monospace for codes only (BNEW-001, B107234)

### Spacing
- Reduce padding in table cells
- Compact filter bar
- Timeline rows slightly shorter (72px instead of 88px)

### Animations
- Smooth collapse/expand for timeline
- Subtle row hover effects
- Inline edit transitions

---

## Success Metrics

After implementation:
1. **Less vertical scroll** - Key info visible without scrolling
2. **Fewer clicks** - Common edits happen in table, not drawer
3. **Clear hierarchy** - Table and timeline are obviously the primary elements
4. **Same functionality** - All existing features still work

---

## Mockup Reference

The new design follows a "dashboard" pattern with:
- **Top bar**: Title + metrics + search + actions
- **Hero section**: Collapsible Gantt timeline 
- **Main section**: Editable data table with filters

This is similar to tools like Linear, Notion databases, or Jira board views where the data table IS the primary interface, with visualizations as secondary context.

