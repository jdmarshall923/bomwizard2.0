# BOM Workflow - Revised Architecture

## Overview

This document outlines the core workflow for BOM Wizard based on how Infor data is actually structured. The key insight is that **BOM structure and pricing are separate data sources**, and **BOMs contain multiple configuration groups** that users must select from.

---

## Key Concepts

### 1. Infor Data Structure

Infor exports data across **multiple files**, each with a specific purpose:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     INFOR DATA SOURCES                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────┐    BOM Structure                                  │
│   │ Infor_BOM.csv   │ ─► Hierarchy, groups, items, quantities           │
│   └─────────────────┘    NO PRICING DATA                                │
│                                                                         │
│   ┌─────────────────┐    Item Master                                    │
│   │ SLItems.csv     │ ─► Item details, buyer, weight, PMT code          │
│   └─────────────────┘    (Purchased vs Manufactured)                    │
│                                                                         │
│   ┌─────────────────┐    Vendor Master                                  │
│   │ SLVendors.csv   │ ─► Vendor codes, names, notes                     │
│   └─────────────────┘                                                   │
│                                                                         │
│   ┌─────────────────────┐    Pricing Data                               │
│   │ VendorContractPrices│ ─► Unit prices, MOQ, lead times,              │
│   │ .csv                │    landing %, currency, status                │
│   └─────────────────────┘                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. BOM Groups = Configuration Options

A single template BOM contains **multiple configuration groups** for different product variants:

```
TEMPLATE BOM (from Infor)
│
├── GRP-FRAME-A01 (Main Frame Assembly)           ← Standard
├── GRP-FRAME-A02 (Main Frame Assembly - Premium) ← Premium option
│
├── GRP-SEAT-A01 (Seat Post Assembly)             ← Standard seat
├── GRP-SEAT-A02 (Saddle Assembly)                ← Extended seat
│
├── GRP-HBAR-A01 (Handlebar Assembly)             ← 4-speed
├── GRP-HBAR-A02 (Handlebar Assembly - Flat)      ← 12-speed
│
├── GRP-CRANK-A01 (Crankset Assembly)             
├── GRP-CRANK-A02 (Crankset Assembly - Compact)   
│
└── ... (30+ group options)
```

**Project spec might require:**
- GRP-FRAME-A02 (Premium frame)
- GRP-SEAT-A01 (Standard seat) - 30% of builds
- GRP-SEAT-A02 (Extended seat) - 70% of builds
- GRP-HBAR-A02 (12-speed)

### 3. BOM Item Types

Items in the BOM have different types and sources:

| Type | Prefix | Description | Example |
|------|--------|-------------|---------|
| **Group Assembly** | `GRP-` | Top-level assembly grouping | `GRP-FRAME-A01` |
| **Purchased Part** | `B` | Bought from vendor | `B101032` |
| **Manufactured Part** | `G` | Made in-house (sub-assembly) | `G100001` |
| **Check Item** | `CHECK-` | Quality/assembly checkpoint | `CHECK-GRP-FRAME-A01` |
| **Substitute Group** | `SUB-` | Alternative parts option | `SUB-GRP-SEAT-A01-3` |

### 4. BOM Hierarchy (Levels)

BOMs have a hierarchical structure with levels:

```
Level 0: GRP-FRAME-A01 (Top Assembly)
  Level 1: B101032 (Part)
  Level 1: B163714 (Part)
  Level 1: G100001 (Sub-assembly)
    Level 2: B200001 (Part in sub-assembly)
    Level 2: B200002 (Part in sub-assembly)
    Level 2: G100002 (Sub-sub-assembly)
      Level 3: B200008 (Deep nested part)
```

---

## Revised Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BOM WIZARD WORKFLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   PATH A: From Template                   PATH B: New/Custom Build      │
│   ─────────────────────                   ────────────────────────      │
│                                                                         │
│   ┌─────────────────┐                     ┌─────────────────┐          │
│   │  IMPORT FILES   │                     │ CREATE NEW BOM  │          │
│   │  • BOM Structure│                     │ (Enhanced Edit  │          │
│   │  • Vendor Prices│                     │  Capabilities)  │          │
│   └────────┬────────┘                     └────────┬────────┘          │
│            │                                       │                    │
│            ▼                                       ▼                    │
│   ┌─────────────────┐                     ┌─────────────────┐          │
│   │ TEMPLATE BOM    │ ◄── Full structure  │ OPTIONAL:       │          │
│   │ (All Groups)    │     with all config │ Import/Carry    │          │
│   └────────┬────────┘     options         │ Over Items      │ ◄── Can  │
│            │                              │ from existing   │    still │
│            ▼                              │ BOM             │    bring │
│   ┌─────────────────┐                     └────────┬────────┘    items │
│   │ SELECT GROUPS   │ ◄── Choose which             │                   │
│   │ & CONFIGURATION │     groups to                │                   │
│   │                 │     include                  │                   │
│   │ ☑ GRP-FRAME-A02 │                              │                   │
│   │ ☑ GRP-SEAT-A02  │                              │                   │
│   │ ☐ GRP-SEAT-A01  │                              │                   │
│   │ ☑ GRP-HBAR-A02  │                              │                   │
│   └────────┬────────┘                              │                    │
│            │                                       │                    │
│            ▼                                       ▼                    │
│   ┌─────────────────────────────────────────────────────┐              │
│   │              WORKING BOM BUILDER                     │              │
│   │                                                      │              │
│   │  • Selected groups with items                        │              │
│   │  • Add new items (placeholder B-codes)               │              │
│   │  • Create new groups                                 │              │
│   │  • Set quantities and splits                         │              │
│   │  • Match items to vendor prices                      │              │
│   └────────────────────────┬────────────────────────────┘              │
│                            │                                            │
│                            ▼                                            │
│   ┌─────────────────────────────────────────────────────┐              │
│   │              COST & ANALYZE                          │              │
│   │                                                      │              │
│   │  • Apply vendor contract prices                      │              │
│   │  • Add landing costs (from %)                        │              │
│   │  • Add labour costs (manufacturing log)              │              │
│   │  • Track versions and changes                        │              │
│   │  • Compare to template baseline                      │              │
│   └─────────────────────────────────────────────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### BOM Group (Configuration Option)

```typescript
interface BomGroup {
  id: string;
  groupCode: string;           // e.g., "GRP-SEAT-A01"
  description: string;         // e.g., "Seat Post Assembly"
  groupType: 'assembly' | 'option' | 'variant';
  category?: string;           // e.g., "Seating", "Drivetrain"
  isStandard: boolean;         // Is this the default option?
  
  // Metadata from import
  itemCount: number;           // Number of items in this group
  maxLevel: number;            // Deepest nesting level
  
  // For the template
  importId?: string;
  importedAt?: Timestamp;
}
```

### Template BOM Item (Imported Structure)

```typescript
interface TemplateBomItem {
  id: string;
  
  // Hierarchy
  level: number;               // 0, 1, 2, 3, 4...
  groupCode: string;           // Parent group (GRP-xxx)
  parentItemCode?: string;     // For nested items
  sequence: number;            // Order within parent
  
  // Item details
  itemCode: string;            // B-code, G-code, etc.
  itemDescription: string;
  itemType: 'group' | 'material' | 'manufactured' | 'check' | 'substitute' | 'other';
  source: 'purchased' | 'manufactured';
  
  // Quantities
  quantity: number;
  unitOfMeasure: string;       // EA, KG, M, etc.
  per: 'unit' | 'lot';
  
  // Reference data
  altGroup?: number;           // Alternate group number
  altGroupRank?: number;       // Rank within alternates
  revision?: string;
  
  // Import metadata
  importId: string;
  importedAt: Timestamp;
  rawRowData?: Record<string, any>;  // Original CSV row
}
```

### Working BOM Item (Project-Specific)

```typescript
interface WorkingBomItem {
  id: string;
  
  // Hierarchy
  level: number;
  groupCode: string;
  parentItemCode?: string;
  sequence: number;
  
  // Item details
  itemCode: string;
  itemDescription: string;
  itemType: 'group' | 'material' | 'manufactured' | 'check' | 'substitute' | 'other';
  source: 'purchased' | 'manufactured';
  isPlaceholder: boolean;      // New item with placeholder code
  
  // Quantities
  quantity: number;
  unitOfMeasure: string;
  
  // Costs (editable)
  materialCost: number;
  landingCost: number;
  labourCost: number;
  extendedCost: number;        // qty * (material + landing + labour)
  
  // Cost source tracking
  costSource: 'placeholder' | 'estimate' | 'quote' | 'contract';
  vendorContractPriceId?: string;
  quoteId?: string;
  
  // Vendor contract details (from match)
  vendorCode?: string;
  vendorName?: string;
  currency?: string;
  moq?: number;                // Minimum order quantity
  leadTimeDays?: number;
  landingPct?: number;         // Landing percentage
  contractStatus?: 'active' | 'expired' | 'pending';
  effectiveDate?: Timestamp;
  expiryDate?: Timestamp;
  
  // Template reference
  templateItemId?: string;
  isFromTemplate: boolean;
  isAddedItem: boolean;        // Added after template selection
  
  // Change tracking
  hasCostChange: boolean;
  hasQuantityChange: boolean;
  originalQuantity?: number;
  
  // Metadata
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Project Group Selection

```typescript
interface ProjectGroupSelection {
  id: string;
  projectId: string;
  groupCode: string;
  isSelected: boolean;
  
  // Split/mix tracking
  splitPercentage?: number;    // e.g., 70 for 70%
  splitNote?: string;          // e.g., "70% extended, 30% standard"
  
  // Selection metadata
  selectedAt: Timestamp;
  selectedBy: string;
}
```

### Vendor Contract Price (Reference Data)

```typescript
interface VendorContractPrice {
  id: string;
  
  // Keys
  vendorCode: string;
  vendorName: string;
  itemCode: string;            // B-code to match
  
  // Price details
  unitPrice: number;
  currency: string;            // GBP, EUR, USD, JPY
  moq: number;                 // Minimum order quantity
  leadTimeDays: number;
  
  // Landing
  landingPct?: number;         // Landing percentage
  shipFromCountry?: string;
  
  // Contract validity
  status: 'active' | 'expired' | 'pending';
  effectiveDate: Timestamp;
  expiryDate: Timestamp;
  
  // Additional
  drawingNumber?: string;
  description?: string;
  weightKg?: number;
  notes?: string;
  
  // Import metadata
  importId: string;
  importedAt: Timestamp;
}
```

---

## Collections Structure

```
Firestore Collections:

// Project-level
projects/{projectId}/
  ├── templateBom/{itemId}           ← Imported template items (all groups)
  ├── bomItems/{itemId}              ← Working BOM items (selected groups)
  ├── groupSelections/{selectionId}  ← Which groups are selected
  ├── versions/{versionId}           ← Version snapshots
  └── importHistory/{importId}       ← Import records

// Global reference data
vendorContractPrices/{priceId}       ← Pricing from VendorContractPrices.csv
vendors/{vendorId}                    ← Vendor master from SLVendors.csv
items/{itemId}                        ← Item master from SLItems.csv
globalTemplates/{templateId}/
  └── items/{itemId}                  ← Saved templates for reuse
```

---

## User Workflows

### Workflow 1: Import Template & Select Groups

```
1. Create new project
2. Go to Import → Upload Files
   - Upload BOM structure file (Infor_BOM.csv)
   - Optionally upload Vendor Prices (VendorContractPrices.csv)
3. Map columns, preview data
4. Import creates Template BOM with all groups
5. Navigate to "Select Configuration"
   - See all available groups with descriptions
   - Check groups to include in this project
   - Set split percentages if needed (30/70)
6. Click "Create Working BOM"
   - Only selected groups are copied
   - Items matched to vendor prices where available
7. Edit working BOM as needed
```

### Workflow 2: Build BOM from Scratch

**Note:** Even when building a "new" BOM from scratch, you'll typically still need to carry over parts from an existing BOM or template. The distinction of "from scratch" is really about needing **robust editing capabilities** rather than starting with nothing:

- **Bulk add multiple new parts** at once (not one-by-one)
- **Copy/import specific items** from another BOM as a starting point
- **Create new groups and assemblies** freely
- **Extensive editing options** for quantities, hierarchy, and costs

```
1. Create new project
2. Go to BOM Builder
3. Optionally import/carry over items from another BOM
   - Select items to bring over from existing template
   - Or start with an empty BOM
4. Create groups manually
   - Add new group: "GRP-CUSTOM-A01"
   - Set description
5. Add items to groups
   - Bulk add multiple items at once
   - Search existing items (from item master)
   - Create placeholder items (BNEW-001, BNEW-002)
   - Copy items from other BOMs/templates
6. Set quantities and hierarchy
7. Match items to vendor prices
8. Add costs manually or from quotes
```

**Key Editing Features Needed:**
- Multi-select and bulk operations
- Paste from spreadsheet (Excel copy → app paste)
- Quick-add mode for rapid part entry
- Duplicate items/groups functionality
- Drag-and-drop hierarchy editing

### Workflow 3: Add New Items to Existing BOM

```
1. Open Working BOM in BOM Explorer
2. Click "Add Item"
3. Choose:
   - Search existing item (from item master)
   - Create placeholder item (auto-generates BNEW-xxx code)
4. Set parent group, quantity, level
5. Match to vendor price or set placeholder cost
6. Item marked as "Added" (not from template)
```

### Workflow 4: Create New Group

```
1. Open Working BOM
2. Click "Add Group"
3. Enter:
   - Group code (e.g., GRP-CUSTOM-A01)
   - Description
   - Category (optional)
4. Add items to new group
5. Group marked as "Custom" (not from template)
```

### Workflow 5: Update Vendor Prices

```
1. Go to Global Data → Vendor Prices
2. Upload new VendorContractPrices.csv
3. System updates/merges prices
4. In project, click "Refresh Prices"
5. Working BOM items re-matched to updated prices
6. Highlights items with price changes
```

---

## Import File Formats

### BOM Structure (Infor_BOM.csv)

| Column | Description | Example |
|--------|-------------|---------|
| Level | Hierarchy depth | 0, 1, 2, 3 |
| Item | Item code | B101032, GRP-FRAME-A01 |
| Description | Item name | Main Frame Assembly |
| Qty Per | Quantity | 4.0 |
| U/M | Unit of measure | EA |
| Per | Unit or Lot | Unit |
| Ref | Reference type | Inventory |
| Type | Material type | Material |
| Source | Purchased/Manufactured | Purchased |
| Stocked | Is stocked | True |
| Alt Group | Alternate group | 1.0 |
| Alt Group Rank | Rank in alternates | 0.0 |
| Revision | Revision number | 01 |
| Seq | Sequence number | 2.0 |

**Group Item Rows:**
```
Group Item: GRP-FRAME-A01,,,,,,,,,,,,,,,,
0,GRP-FRAME-A01,Main Frame Assembly,1.0,EA,,,Material,Manufactured,True,,,01,,,,1.0
```

### Vendor Contract Prices (VendorContractPrices.csv)

| Column | Description | Example |
|--------|-------------|---------|
| VendorCode | Vendor ID | V100001 |
| VendorName | Vendor name | Acme Fasteners Co |
| Currency | Price currency | GBP, EUR, USD |
| BCode | Item code | B114592 |
| DrawingNumber | Drawing ref | 103278-04 |
| Description | Item name | Seat Post |
| UnitPrice | Price per unit | 36.77 |
| MOQ | Min order qty | 10 |
| LeadTimeDays | Lead time | 56 |
| Status | Contract status | Active |
| EffectiveDate | Start date | 28.06.2023 |
| ExpiryDate | End date | 28.08.2026 |
| ShipFromCountry | Origin | Japan |
| LandingPct | Landing % | 5.49 |
| WeightKg | Weight | 3.79 |

### Item Master (SLItems.csv)

| Column | Description | Example |
|--------|-------------|---------|
| Item | Item code | B101032 |
| Description | Item name | Mudguard - Lightweight |
| DrawingNbr | Drawing number | 113456-10 |
| Revision | Revision | 11 |
| Buyer | Buyer email | frank.miller@company.com |
| CommCode | Commodity code | 8787666600 |
| Country | Origin country | Italy |
| PMTCode | P=Purchased, M=Manufactured | M |
| ReasonCode | Status code | PRD |
| UnitWeight | Weight | 2.438 |
| WeightUnits | Units | KG |

### Vendor Master (SLVendors.csv)

| Column | Description | Example |
|--------|-------------|---------|
| VendorCode | Vendor ID | V100001 |
| VendorName | Vendor name | Acme Fasteners Co |
| Notes | Notes | From PPL |

---

## UI Requirements

### BOM Control Panel (Master-Detail Layout)

The main BOM page uses a master-detail layout with Template BOM on the left and Working BOM on the right:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BOM CONTROL PANEL                                 │
├───────────────────────────┬─────────────────────────────────────────────┤
│  TEMPLATE BOM (Reference) │          WORKING BOM (Editable)             │
│  ┌─────────────────────┐  │  ┌─────────────────────────────────────┐   │
│  │ [Search...]         │  │  │ Stats: 156 items | £45,230 | 3 new │   │
│  ├─────────────────────┤  │  ├─────────────────────────────────────┤   │
│  │ ☑ GRP-FRAME-A01     │  │  │ [Tree View] [Table View]           │   │
│  │   ☑ B103985         │  │  │                                     │   │
│  │   ☑ B104001         │  │  │ Working BOM Items...               │   │
│  │   ☑ B104002         │  │  │ (click to edit, inline costs)      │   │
│  │                     │  │  │                                     │   │
│  │ ▣ GRP-SEAT-A01      │  │  │ GRP-FRAME-A01                      │   │
│  │   ☑ B105001         │  │  │   B103985  £12.50  Qty: 4          │   │
│  │   ☐ B105002 (skip)  │  │  │   B104001  £8.75   Qty: 2          │   │
│  │   ☑ B105003         │  │  │ GRP-SEAT-A01                       │   │
│  │                     │  │  │   B105001  £45.00  Qty: 1          │   │
│  │ ☐ GRP-WHEEL-A01     │  │  │   ...                              │   │
│  │   ☐ B106001         │  │  │                                     │   │
│  │   ☐ B106002         │  │  │                                     │   │
│  └─────────────────────┘  │  └─────────────────────────────────────┘   │
├───────────────────────────┴─────────────────────────────────────────────┤
│  [Copy 5 Selected →]        [Clear Selection]        [Apply Prices]     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cascading Checkbox Selection

The Template BOM panel uses a parent-child checkbox pattern with three states:

```
Checkbox States:
  ☑ = All selected    ☐ = None selected    ▣ = Partial (indeterminate)
```

**Selection Rules:**

| Action | Result |
|--------|--------|
| Click unchecked Group (☐→☑) | All child B-codes become checked |
| Click checked Group (☑→☐) | All child B-codes become unchecked |
| Click indeterminate Group (▣→☐) | All child B-codes become unchecked |
| Uncheck a B-code under fully-checked Group | Group becomes indeterminate (▣) |
| Check last unchecked B-code in Group | Group becomes fully checked (☑) |
| Uncheck last checked B-code in Group | Group becomes unchecked (☐) |

**Key Behaviors:**
- Selecting a group auto-selects all B-codes underneath
- You can then uncheck individual B-codes (group shows ▣)
- Groups can be collapsed/expanded independently of selection state
- Collapsed groups still show their checkbox state (☑/☐/▣)
- Selection count shown per group: "GRP-SEAT-A01 (3/5 selected)"

### Group Selection Screen (Pre-Configuration)

For bulk group selection before creating a Working BOM:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SELECT CONFIGURATION GROUPS                                            │
│  Choose which groups to include in your working BOM                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FRAME ASSEMBLIES                                                       │
│  ├─ ☑ GRP-FRAME-A01  Main Frame Assembly           [12 items]          │
│  └─ ☐ GRP-FRAME-A02  Main Frame Assembly - Premium [15 items]          │
│                                                                         │
│  SEATING                                                                │
│  ├─ ☑ GRP-SEAT-A01   Seat Post Assembly            [11 items]  [30%]   │
│  └─ ☑ GRP-SEAT-A02   Saddle Assembly               [14 items]  [70%]   │
│                                                                         │
│  HANDLEBARS                                                             │
│  ├─ ☐ GRP-HBAR-A01   Handlebar Assembly            [5 items]           │
│  └─ ☑ GRP-HBAR-A02   Handlebar Assembly - Flat     [8 items]           │
│                                                                         │
│  DRIVETRAIN                                                             │
│  ├─ ☑ GRP-CRANK-A01  Crankset Assembly             [15 items]          │
│  ├─ ☐ GRP-CRANK-A02  Crankset Assembly - Compact   [11 items]          │
│  ├─ ☑ GRP-PEDAL-A01  Pedal Assembly                [15 items]          │
│  └─ ☑ GRP-CHAIN-A01  Chain Assembly                [9 items]           │
│                                                                         │
│  ... more groups ...                                                    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SUMMARY                                                         │   │
│  │  Selected: 12 groups | 156 items                                │   │
│  │  Excluded: 8 groups | 89 items                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Cancel]                              [Create Working BOM →]           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Add Item Dialog

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ADD ITEM                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ○ Search Existing Item                                                 │
│    [________________________] 🔍                                        │
│    Results:                                                             │
│    • B101032 - Mudguard - Lightweight                                   │
│    • B101045 - Mudguard - Premium                                       │
│                                                                         │
│  ● Create Placeholder Item                                              │
│    Code: [BNEW-001        ] (auto-generated)                           │
│    Description: [________________________]                              │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Add to Group: [GRP-FRAME-A01 ▼]                                       │
│  Quantity: [1.0    ]                                                    │
│  Level: [1 ▼]                                                           │
│                                                                         │
│  [Cancel]                                          [Add Item]           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 3.5: BOM Structure & Groups ✅ COMPLETE

1. **Update Data Models** ✅
   - [x] Add BomGroup interface
   - [x] Update TemplateBomItem for hierarchy
   - [x] Add ProjectGroupSelection
   - [x] Add VendorContractPrice interface

2. **Import Updates** ✅
   - [x] Parse group rows (Group Item: GRP-xxx)
   - [x] Extract groups from BOM structure
   - [x] Handle hierarchy/levels correctly
   - [x] Import VendorContractPrices separately

3. **Group Selection UI** ✅
   - [x] Group selection page/modal
   - [x] Group cards with item counts
   - [x] Category grouping
   - [x] Split percentage input
   - [x] Create Working BOM from selection

4. **Working BOM Builder** ✅
   - [x] Filter by selected groups only
   - [x] Add item dialog (search or placeholder)
   - [x] Add group dialog
   - [x] Hierarchy visualization

5. **Vendor Price Matching** ✅
   - [x] Global vendor prices collection
   - [x] Import VendorContractPrices.csv
   - [x] Price lookup by item code
   - [x] Auto-match items to vendor prices
   - [x] Apply landing percentage

### Phase 4: BOM Control Panel Redesign 🔄 IN PROGRESS

1. **Master-Detail Layout**
   - [ ] Create TemplateBomPanel component (left side)
   - [ ] Create WorkingBomPanel component (right side)
   - [ ] Create BomTransferBar component
   - [ ] Refactor BOM page to split panel layout

2. **Cascading Checkbox Selection**
   - [ ] Add checkbox mode to BomTree component
   - [ ] Implement group-level selection (selects all children)
   - [ ] Support indeterminate state (▣) for partial selection
   - [ ] Selection count per group (e.g., "3/5 selected")

3. **Transfer Mechanism**
   - [ ] "Copy X Selected to Working BOM" button
   - [ ] Duplicate detection (warn if item exists)
   - [ ] Auto-apply vendor pricing on transfer
   - [ ] Clear selection button

### Phase 3.7: Batch Item Entry (Planned)

Enhanced "Add Items" dialog for bulk item entry with new part tracking:

1. **Batch Add Items Dialog**
   - [ ] Add multiple items in single dialog session
   - [ ] Items queue table (view/edit/remove before saving)
   - [ ] Quick-add row for rapid entry
   - [ ] Toggle: Search existing items OR create placeholder

2. **Inline Group Creation**
   - [ ] Create new group in same dialog
   - [ ] Auto-assign all items to selected/new group
   - [ ] Auto-generate group code (GRP-CUSTOM-Axx)

3. **"New Part" Flag**
   - [ ] Checkbox per item to flag for New Part Tracker
   - [ ] Smart defaults (placeholders auto-checked)
   - [ ] Visual badge in BOM Explorer (🆕)
   - [ ] Filter to show new parts

4. **Validation & Save**
   - [ ] Duplicate detection (warn if item exists)
   - [ ] Batch Firestore writes (efficient)
   - [ ] Set `newPartStatus: 'pending'` for flagged items
   - [ ] Success/error feedback

See `PHASE_3.7_PLAN.md` for full specification.

### Phase 5: Advanced Editing Capabilities (Future)

1. **Bulk Operations**
   - [ ] Import/carry over items from another BOM
   - [ ] Paste from spreadsheet (Excel → app)
   - [ ] Multi-select operations (delete, move, copy)

2. **Advanced Editing**
   - [ ] Duplicate items/groups functionality
   - [ ] Drag-and-drop hierarchy editing
   - [ ] Inline editing for quantities and descriptions

### Phase 6: New Items & Placeholders (Future)

1. **Placeholder System**
   - [ ] Auto-generate BNEW-xxx codes
   - [ ] Track placeholder items
   - [ ] Replace placeholder workflow

2. **Item Creation**
   - [ ] Quick-add item form
   - [ ] Add to item master option
   - [ ] Link to quote workflow

---

## Summary

| Concept | Description |
|---------|-------------|
| **Template BOM** | Full imported structure with ALL configuration groups |
| **BOM Groups** | Configuration options (GRP-xxx) for different variants |
| **Group Selection** | User chooses which groups apply to this project |
| **Working BOM** | Selected groups only, with costs and edits |
| **Vendor Prices** | Separate import for pricing data |
| **Placeholders** | New items with auto-generated codes (BNEW-xxx) |
| **BOM Control Panel** | Master-detail layout with template on left, working BOM on right |
| **Cascading Selection** | Select group → all children selected, with indeterminate state |

### Key Insights

1. **A template contains many options; a working BOM is a specific configuration.**

2. **Path A vs Path B distinction:**
   - **Path A (From Template):** Import full template → select groups → minimal editing
   - **Path B (New/Custom Build):** Still may import/carry over items from existing BOMs, but the focus is on **robust editing capabilities** — bulk adding parts, creating custom groups, extensive modifications. "From scratch" doesn't mean starting with nothing; it means needing the freedom to heavily customize.

3. **Master-Detail Workflow:**
   - Template BOM (left) is read-only reference with checkbox selection
   - Working BOM (right) is editable with pricing
   - Checkbox selection enables copying specific items/groups
   - Cascading checkboxes: select group → all children, but can uncheck individuals

---

**Last Updated**: December 2024  
**Status**: Phase 4 Complete, Phase 3.7 Planned - Batch Item Entry
