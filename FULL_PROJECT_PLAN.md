# BOM Wizard - Complete Project Plan

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Design System](#design-system)
4. [Data Models](#data-models)
5. [Phase 1: Foundation](#phase-1-foundation---complete-)
6. [Phase 2: Import System](#phase-2-import-system---complete-)
7. [Phase 3: BOM Explorer](#phase-3-bom-explorer---complete-)
8. [Phase 3.7: Batch Item Entry](#phase-37-batch-item-entry---complete-)
9. [Phase 4: BOM Control Panel](#phase-4-bom-control-panel---complete-)
10. [Phase 5: Version Control](#phase-5-version-control---complete-)
11. [Phase 6: Cost Analysis](#phase-6-cost-analysis---complete-)
12. [Phase 7: New Part Tracker](#phase-7-new-part-tracker---complete-)
13. [Phase 8: Polish & Launch](#phase-8-polish--launch---complete-)
14. [Phase 9: AI Integration](#phase-9-ai-integration---planned-)
15. [BOM Workflow](#bom-workflow)
16. [File Structure](#file-structure)

---

## Project Overview

BOM Wizard is a Bill of Materials management system that helps manufacturers:

- **Import** BOM data from Infor and other ERP systems
- **Configure** product variants by selecting assembly groups
- **Cost** items using vendor contract prices with landing rates
- **Track** new parts through design, engineering, and procurement
- **Version** BOMs to track cost changes over time
- **Analyze** costs with interactive charts and insights
- **AI-Assist** users with intelligent group suggestions (Phase 9)

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Template BOM** | Full imported structure with ALL configuration groups |
| **BOM Groups** | Configuration options (GRP-xxx) for different variants |
| **Working BOM** | Selected groups only, with costs and edits |
| **Vendor Prices** | Separate import for pricing data |
| **Placeholders** | New items with auto-generated codes (Bxxx001) |
| **New Part Tracker** | Kanban for tracking parts: Design → Engineering → Procurement → Complete |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **UI Components** | shadcn/ui |
| **Backend** | Firebase (Auth, Firestore, Storage, Functions) |
| **State** | TanStack Query + Zustand |
| **Tables** | TanStack Table |
| **Charts** | Recharts |
| **Forms** | React Hook Form |
| **Toasts** | Sonner |
| **Virtualization** | TanStack Virtual |

---

## Design System

### Colors

```css
--royal-blue: #2563EB
--accent-orange: #F97316
--success-green: #10B981
--danger-red: #EF4444
--warning-amber: #F59E0B
```

### Visual Features

- Glass morphism effects
- Gradient accents (royal blue/orange)
- Smooth hover animations
- Dark theme optimized
- Glow effects on interactive elements

---

## Data Models

### BomItem (Working BOM)

```typescript
interface BomItem {
  id: string;
  itemCode: string;
  itemDescription: string;
  groupCode: string;
  assemblyCode?: string;
  level: number;
  sequence: number;
  quantity: number;
  materialCost: number;
  landingCost: number;
  labourCost: number;
  extendedCost: number;
  costSource: 'placeholder' | 'estimate' | 'quote' | 'contract';
  isPlaceholder: boolean;
  isNewPart: boolean;
  isFromTemplate: boolean;
  isAddedItem: boolean;
  vendorCode?: string;
  vendorName?: string;
  newPartTrackerId?: string;
}
```

### NewPart (New Part Tracker)

```typescript
interface NewPart {
  id: string;
  projectId: string;
  bomItemId: string;
  placeholderCode: string;
  description: string;
  groupCode: string;
  quantity: number;
  status: 'added' | 'design' | 'engineering' | 'procurement' | 'complete';
  priority: 'low' | 'medium' | 'high' | 'critical';
  finalItemCode?: string;
  finalUnitPrice?: number;
  vendorCode?: string;
  vendorName?: string;
}
```

### BomVersion

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
    // ... cost breakdowns
  };
  createdAt: Timestamp;
}
```

---

## Phase 1: Foundation - COMPLETE ✅

**Duration**: Foundation setup

### What Was Built

- ✅ Next.js 16 with App Router and TypeScript
- ✅ Firebase integration (Auth, Firestore, Storage, Functions)
- ✅ Modern dark theme with glass morphism design
- ✅ Complete authentication system (Email + Google)
- ✅ Dynamic navigation system (Global & Project sidebars)
- ✅ Project management (Create, Read, Update, Delete)
- ✅ 30+ component stubs ready for implementation
- ✅ Complete TypeScript interfaces for all data models

### Routes Created

- `/login`, `/register` - Authentication
- `/projects` - Project list and creation
- `/project/[projectId]/*` - All project-scoped pages
- `/data/*` - Global master data pages
- `/settings`, `/integrations` - App configuration

---

## Phase 2: Import System - COMPLETE ✅

**Duration**: ~1 week

### What Was Built

| Component | Description |
|-----------|-------------|
| `FileUpload.tsx` | Drag & drop CSV upload with validation |
| `csvParser.ts` | Parse CSV with PapaParse, auto-detect delimiter |
| `templateManager.ts` | Create/edit/save import templates |
| `ColumnMapper.tsx` | Auto-detect + manual column mappings |
| `ImportPreview.tsx` | Preview raw and transformed data |
| `importProcessor.ts` | Batch write to Firestore (500/batch) |

### Import Flow

```
Upload CSV → Select Template → Map Columns → Preview → Validate → Import → Results
```

### Test Files

- `public/test-data/sample-bom.csv` - Standard format
- `public/test-data/sample-bom-infor-format.csv` - Infor format

---

## Phase 3: BOM Explorer - COMPLETE ✅

**Duration**: ~1 week

### What Was Built

| Component | Description |
|-----------|-------------|
| `BomTree.tsx` | Hierarchical tree view with expand/collapse |
| `BomTable.tsx` | Table view with TanStack Table (sort, paginate) |
| `BomFilters.tsx` | Search, assembly filter, cost source filter, quick toggles |
| `ItemEditDrawer.tsx` | Slide-out panel for editing item details |
| `useBom.ts` | Real-time data hook with filtering and stats |

### Features

- ✅ Tree and Table view toggle
- ✅ Real-time Firestore updates
- ✅ Search by item code, description, assembly
- ✅ Filter: New Parts, Placeholders, Cost Changes
- ✅ Inline editing with optimistic updates
- ✅ Stats cards (Total items, Cost, Assemblies)

---

## Phase 3.7: Batch Item Entry - COMPLETE ✅

**Duration**: ~2-3 days

### What Was Built

Enhanced "Add Items" dialog for bulk entry:

| Feature | Description |
|---------|-------------|
| Batch add | Add multiple items before saving |
| Smart input | Auto-detects search vs placeholder creation |
| Inline group creation | Create new group in same dialog |
| Per-item group | Add items to different groups in one session |
| "New Part" + "Track" flags | Separate checkboxes for categorization |

### UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ADD ITEMS                                               [X]    │
├─────────────────────────────────────────────────────────────────┤
│  [Search B-code or enter description...]                        │
│  Code: [Bxxx001]        Qty [2 ]                               │
│  Add to: [GRP-CUSTOM-A01 v]                                    │
│  [x New Part]  [x Track]                          [+ Add]      │
├─────────────────────────────────────────────────────────────────┤
│  Items to Add (4)                           2 new, 2 tracked    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ GRP-CUSTOM-A01 (New)                                        ││
│  │   Bxxx001  Custom bracket     Qty: 2   @ Track              ││
│  └─────────────────────────────────────────────────────────────┘│
│  [Cancel]                                    [Save 4 Items]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 4: BOM Control Panel - COMPLETE ✅

**Duration**: ~1 week

### What Was Built

Master-detail layout with Template BOM on left, Working BOM on right:

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

### Cascading Checkbox Selection

| State | Icon | Meaning |
|-------|------|---------|
| Checked | ☑ | All items in group selected |
| Unchecked | ☐ | No items selected |
| Indeterminate | ▣ | Some items selected |

### Transfer Logic

1. Check for duplicates
2. Lookup vendor contract prices
3. Calculate landing costs
4. Batch write to Working BOM

---

## Phase 5: Version Control - COMPLETE ✅

**Duration**: ~1 week

### What Was Built

| Component | Description |
|-----------|-------------|
| `versionService.ts` | Version CRUD, date queries |
| `comparisonService.ts` | Diff algorithm, cost driver detection |
| `VersionTimeline.tsx` | Visual timeline of versions |
| `CreateVersionDialog.tsx` | Manual version creation |
| `VersionComparison.tsx` | Compare two versions |
| `DateRangeComparison.tsx` | Compare by date range |

### Version Triggers

- **Manual**: User clicks "Create Version"
- **Import**: Auto-create after CSV import
- **Bulk Operations**: Auto-create when 10+ items affected

### Cost Drivers Tracked

| Driver | Example |
|--------|---------|
| `quantity_increase` | Qty 10 → 15 |
| `material_price_increase` | £5.00 → £5.50 |
| `vendor_change` | Switched to cheaper vendor |
| `new_item` | New bracket added |
| `removed_item` | Fasteners removed |

---

## Phase 6: Cost Analysis - COMPLETE ✅

**Duration**: ~1 week

### What Was Built

| Component | Description |
|-----------|-------------|
| `CostSummaryCards.tsx` | Key metrics at a glance |
| `CostTrendChart.tsx` | Cost evolution over versions |
| `CostByAssemblyChart.tsx` | Donut/Treemap breakdown |
| `CostDriversChart.tsx` | Why costs changed |
| `PriceVolatilityChart.tsx` | Items with price swings |
| `TopItemsTable.tsx` | Pareto analysis (80/20) |

### Dashboard Tabs

1. **Overview**: Trend + Assembly + Drivers charts
2. **Trends**: Full trend chart + Volatility
3. **Assemblies**: Assembly breakdown + table
4. **Cost Drivers**: Drivers chart + explanations
5. **Top Items**: Pareto table

### Key Metrics

| Metric | Formula |
|--------|---------|
| Price Confidence | (Contract + Quote) / Total × 100 |
| Placeholder Risk | Placeholder Cost / Total Cost × 100 |
| Pareto (80%) | Top N items = 80% of cost |

---

## Phase 7: New Part Tracker - COMPLETE ✅

**Duration**: ~1 week

### What Was Built

Kanban board for tracking new parts through lifecycle:

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐
│  Added   │ │  Design  │ │Engineering│ │Procurement│ │ Complete │
├──────────┤ ├──────────┤ ├──────────┤ ├───────────┤ ├──────────┤
│ Bxxx001  │ │ Bxxx004  │ │ Bxxx006  │ │ Bxxx008   │ │ B107234  │
│ Bxxx002  │ │          │ │          │ │           │ │          │
└──────────┘ └──────────┘ └──────────┘ └───────────┘ └──────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| `NewPartKanban.tsx` | Drag-and-drop Kanban board |
| `NewPartCard.tsx` | Card with priority badge, actions |
| `NewPartDetailDrawer.tsx` | Tabbed drawer (Details, Design, Engineering, Procurement) |
| `NewPartStats.tsx` | Stats cards + progress bar |

### Cloud Functions

| Function | Trigger |
|----------|---------|
| `autoCreateNewPart` | BomItem created with `isNewPart: true` |
| `onNewPartComplete` | NewPart status → 'complete' |

### Complete Flow

```
BomItem (isNewPart: true) → NewPart created → Kanban tracking
    → User drags through stages → Complete with final B-code
    → BomItem updated (code, price, costSource)
```

---

## Phase 8: Polish & Launch - COMPLETE ✅

**Duration**: ~1 week

### What Was Built

| Component | Description |
|-----------|-------------|
| `sonner.tsx` | Toast notifications |
| `error-boundary.tsx` | Global error catching with recovery |
| `confirm-dialog.tsx` | Confirmation dialogs (danger, warning, info) |
| `empty-state.tsx` | Consistent empty states |
| `loading-skeletons.tsx` | Loading states for all views |
| `virtualized-list.tsx` | High-performance lists (10k+ items) |
| `providers.tsx` | Centralized React Query + Error Boundary |

### Security Rules Enhanced

- Project membership validation
- Owner-only destructive operations
- Sub-collection rules (BOM items, versions, new parts)
- Validation helpers

### Deployment Ready

- Firebase Hosting configuration
- Next.js static export optimized
- Deployment scripts in package.json

---

## Phase 9: AI Integration - PLANNED 📋

**Duration**: ~3-4 weeks

### Overview

AI-powered assistant using Google Gemini that helps users:

- **Group Suggestions**: "I'm making a 4 speed bike" → suggests groups
- **BOM Questions**: "What's the most expensive assembly?" → analyzes
- **Cost Analysis**: "Why did costs increase?" → explains changes
- **Smart Actions**: "Add B103456 to frame assembly" → executes with confirmation

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                            │
│  ┌─────────────────┐  ┌──────────────────────────────────────────┐ │
│  │  Chat Modal UI  │  │            BOM Pages                     │ │
│  └────────┬────────┘  └──────────────────────────────────────────┘ │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FIREBASE CLOUD FUNCTIONS                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  Chat Handler   │  │ Context Builder │  │   Action Executor   │ │
└───────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────┐
│   GOOGLE GEMINI     │
│   (Vertex AI)       │
└─────────────────────┘
```

### Sub-Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| 9.1 Foundation | 3-4 days | Gemini setup, context builder, Cloud Function |
| 9.2 Chat Modal | 2-3 days | Chat UI, message bubbles, history |
| 9.3 Group Suggestions | 2-3 days | "I'm building a bike" → groups |
| 9.4 BOM Q&A | 3-4 days | Function calling for data queries |
| 9.5 Smart Actions | 2-3 days | AI-triggered actions with confirmation |
| 9.6 Polish | 2-3 days | Caching, error handling, analytics |

### Example Prompts

| Category | Prompt | AI Action |
|----------|--------|-----------|
| Group Selection | "4 speed bike with hydraulic brakes" | Suggests matching groups |
| Cost Analysis | "Why is frame assembly expensive?" | Gets breakdown |
| Comparison | "What changed between v2 and v4?" | Summarizes changes |
| Actions | "Mark B103456 as new part" | Confirms and executes |

---

## BOM Workflow

### Two Paths

```
PATH A: From Template              PATH B: New/Custom Build
─────────────────────              ────────────────────────

Import Infor BOM                   Create New BOM
       │                                  │
       ▼                                  ▼
Template BOM (all groups)          Optionally import items
       │                                  │
       ▼                                  ▼
Select Groups & Config             Create groups, add items
       │                                  │
       └──────────────┬───────────────────┘
                      │
                      ▼
              Working BOM Builder
              (edit, price, track)
                      │
                      ▼
              Cost & Analyze
              (versions, charts)
```

### Import File Formats

| File | Purpose |
|------|---------|
| `Infor_BOM.csv` | BOM structure, hierarchy, quantities |
| `VendorContractPrices.csv` | Pricing, MOQ, lead times, landing % |
| `SLItems.csv` | Item master (optional) |
| `SLVendors.csv` | Vendor master (optional) |

---

## File Structure

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx                      # Dashboard
│   ├── projects/page.tsx             # Project list
│   └── project/[projectId]/
│       ├── page.tsx                  # Project dashboard
│       ├── bom/page.tsx              # BOM Control Panel
│       ├── configure/page.tsx        # Group selection
│       ├── import/page.tsx           # Import wizard
│       ├── versions/page.tsx         # Version history
│       ├── costs/page.tsx            # Cost analysis
│       └── new-parts/page.tsx        # New Part Tracker

components/
├── bom/                              # BOM components
├── charts/                           # Cost analysis charts
├── import/                           # Import wizard components
├── layout/                           # Sidebar, header, shell
├── new-parts/                        # New Part Tracker
├── projects/                         # Project management
├── ui/                               # shadcn/ui components
└── versions/                         # Version control

lib/
├── bom/
│   ├── templateBomService.ts
│   ├── transferService.ts
│   ├── versionService.ts
│   ├── comparisonService.ts
│   ├── costAnalysisService.ts
│   ├── newPartService.ts
│   └── vendorPriceService.ts
├── hooks/
│   ├── useBom.ts
│   ├── useVersions.ts
│   ├── useCostAnalysis.ts
│   └── useNewParts.ts
├── import/
│   ├── csvParser.ts
│   ├── columnMapper.ts
│   ├── importProcessor.ts
│   └── templateManager.ts
└── firebase/
    ├── auth.ts
    ├── config.ts
    ├── firestore.ts
    └── storage.ts

types/
├── bom.ts
├── project.ts
├── vendor.ts
├── newPart.ts
├── quote.ts
└── import.ts

functions/src/
└── index.ts                          # Cloud Functions
```

---

## Status Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | ✅ Complete | Dec 2024 |
| Phase 2: Import System | ✅ Complete | Dec 2024 |
| Phase 3: BOM Explorer | ✅ Complete | Dec 2024 |
| Phase 3.7: Batch Item Entry | ✅ Complete | Dec 2024 |
| Phase 4: BOM Control Panel | ✅ Complete | Dec 2024 |
| Phase 5: Version Control | ✅ Complete | Dec 2024 |
| Phase 6: Cost Analysis | ✅ Complete | Dec 2024 |
| Phase 7: New Part Tracker | ✅ Complete | Dec 2024 |
| Phase 8: Polish & Launch | ✅ Complete | Dec 2024 |
| **Phase 9: Project Management** | 📋 **NEXT** | ~1-2 weeks |
| Phase 10: Parts Order Timeline | 📋 Planned | ~2-3 weeks |
| Phase 11: Final Polish & Deploy | 📋 Planned | ~2 weeks |
| Phase 12: AI Integration | 📋 Future | ~3-4 weeks |

---

## Phase 9: Project Management (PACE Gates) - NEXT 📋

**Route:** `/projects` (enhanced) + `/project/[id]/overview` (new)

### Overview
Add PACE gates to track project milestones and readiness metrics.

### PACE Gates
| Gate | Description |
|------|-------------|
| Briefed | Project briefed |
| DTI | Decision to Initiate |
| DA | Design Approval (pens down) |
| DTX | Decision to Execute |
| Sprint | Sprint MRD (test production) |
| DTL | Decision to Launch |
| Mass Prod | Mass Production start |
| DTC | Decision to Close |

### Tasks
- Extend Project type with gates and metrics
- Create GatesTimeline and GateCard components
- Create Project Overview page with metrics dashboard
- Add gate indicators to projects list

---

## Phase 10: Parts Order Timeline - PLANNED 📋

**Route:** `/project/[id]/parts-timeline` (new page)

### Overview
Interactive Gantt chart for tracking part orders against project gates with freight toggle.

### Features
- Visual Gantt timeline with gate markers
- Sea/Air freight toggle with instant recalculation
- Late warning indicators
- Excel import for part orders

---

## Phase 11: Final Polish & Deploy - PLANNED 📋

- Performance optimization
- Error handling audit
- Security rules audit
- User testing
- Deploy to Firebase Hosting

---

## Phase 12: AI Integration - FUTURE 📋

AI assistant using Google Gemini for:
- Group suggestions based on product description
- BOM questions and analysis
- Cost change explanations
- Smart actions with confirmation

---

**Last Updated**: December 20, 2024

