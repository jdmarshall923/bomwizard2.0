# Phase 2: Import System - Implementation Guide

## Overview

Phase 2 focuses on building the complete import wizard system that allows users to upload CSV files, map columns, and import BOM data into Firestore.

## Goals

1. Enable users to upload CSV files to Firebase Storage
2. Parse CSV files with PapaParse
3. Create and manage import templates
4. Map CSV columns to BOM fields
5. Preview transformed data before import
6. Import data in batches to Firestore
7. Track import history

## Architecture

```
User Uploads CSV
    ↓
File Stored in Firebase Storage
    ↓
Parse CSV with PapaParse
    ↓
Select/Create Template
    ↓
Map Columns to BOM Fields
    ↓
Preview Transformed Data
    ↓
Validate Data
    ↓
Batch Write to Firestore
    ↓
Create Version Snapshot
    ↓
Record Import History
```

## Implementation Steps

### Step 1: File Upload Component

**File**: `components/import/FileUpload.tsx`

**Features to implement:**
- Drag & drop file upload
- File type validation (.csv only)
- File size limits
- Upload progress indicator
- Error handling
- Preview file name

**Firebase Storage Path**: `imports/{userId}/{timestamp}-{filename}`

### Step 2: CSV Parser

**File**: `lib/import/csvParser.ts`

**Functions needed:**
```typescript
export async function parseCSV(file: File, options: {
  skipRows?: number;
  delimiter?: string;
}): Promise<{ data: any[]; errors: ParseError[] }>

export function detectDelimiter(firstLine: string): string
export function detectHeaders(data: string[]): string[]
```

**Dependencies**: `papaparse`

### Step 3: Template Management

**File**: `lib/import/templateManager.ts`

**Functions needed:**
```typescript
export async function getTemplates(userId: string): Promise<ImportTemplate[]>
export async function createTemplate(template: Omit<ImportTemplate, 'id'>): Promise<string>
export async function updateTemplate(id: string, updates: Partial<ImportTemplate>): Promise<void>
export async function deleteTemplate(id: string): Promise<void>
export async function getDefaultTemplate(sourceType: string): Promise<ImportTemplate | null>
```

**Firestore Collection**: `importTemplates`

### Step 4: Column Mapper Component

**File**: `components/import/ColumnMapper.tsx`

**Features:**
- Auto-detect column mappings (fuzzy match)
- Manual mapping dropdowns
- Transform options per field
- Preview of mapped data
- Save as template option

**Target Fields:**
- `itemCode` (required)
- `itemDescription` (required)
- `quantity` (required)
- `assemblyCode` (required)
- `level` (optional, default: 1)
- `materialCost` (optional)
- `landingCost` (optional)
- `labourCost` (optional)

### Step 5: Import Processor

**File**: `lib/import/importProcessor.ts`

**Functions needed:**
```typescript
export async function processImport(
  projectId: string,
  data: any[],
  mappings: ColumnMappings,
  options: ImportOptions
): Promise<ImportResult>

export async function validateBomData(data: any[]): Promise<ValidationResult>

export async function batchWriteBomItems(
  projectId: string,
  items: BomItem[]
): Promise<{ success: number; errors: ImportError[] }>
```

**Key considerations:**
- Batch writes (max 500 per batch)
- Transaction support for atomicity
- Error handling per row
- Duplicate detection
- Create items in global `items` collection if new

### Step 6: Import History

**File**: `lib/import/importHistory.ts`

**Functions needed:**
```typescript
export async function recordImport(history: Omit<ImportHistory, 'id'>): Promise<string>
export async function getImportHistory(projectId: string): Promise<ImportHistory[]>
```

**Firestore Collection**: `projects/{projectId}/importHistory`

### Step 7: Import Wizard Page

**File**: `app/(dashboard)/project/[projectId]/import/page.tsx`

**Flow:**
1. File upload step
2. Template selection step
3. Column mapping step (if new template)
4. Preview step
5. Validation step
6. Import options step
7. Confirmation & import step
8. Results step

**Use a stepper component or multi-step form**

## Data Flow

### Import Template Structure

```typescript
{
  name: "Infor BOM Standard",
  sourceType: "infor_bom",
  columnMappings: {
    sourceColumns: ["Item Code", "Description", "Qty", "Assembly"],
    mappings: {
      itemCode: { source: "Item Code", transform: "uppercase" },
      itemDescription: { source: "Description", transform: null },
      quantity: { source: "Qty", transform: "parseFloat" },
      assemblyCode: { source: "Assembly", transform: "uppercase" }
    },
    skipRows: 1,
    delimiter: ","
  }
}
```

### Import Process

1. **Upload**: File → Firebase Storage
2. **Parse**: Storage → Parse CSV → Raw data array
3. **Map**: Raw data + Template → Mapped data
4. **Transform**: Apply transforms (uppercase, parseFloat, etc.)
5. **Validate**: Check required fields, duplicates, data types
6. **Prepare**: Convert to BomItem format
7. **Batch Write**: Write to Firestore in batches
8. **Create Version**: Call Cloud Function to create snapshot
9. **Record History**: Save import history record

## Error Handling

- **File Errors**: Invalid format, too large, corrupted
- **Parse Errors**: Malformed CSV, encoding issues
- **Mapping Errors**: Missing required fields, invalid mappings
- **Validation Errors**: Invalid data types, missing values
- **Write Errors**: Firestore errors, quota exceeded
- **Network Errors**: Connection issues, timeouts

Show errors clearly at each step with actionable messages.

## Testing Checklist

- [ ] Upload valid CSV file
- [ ] Upload invalid file types (should reject)
- [ ] Upload file that's too large (should reject)
- [ ] Parse CSV with different delimiters
- [ ] Auto-detect column mappings
- [ ] Manual column mapping
- [ ] Save new template
- [ ] Use existing template
- [ ] Preview transformed data
- [ ] Validate data before import
- [ ] Import with errors (some rows fail)
- [ ] Import successfully creates version
- [ ] Import history is recorded
- [ ] Handle network errors gracefully

## Dependencies to Install

```bash
npm install papaparse @types/papaparse
```

## Next Steps After Phase 2

Once Phase 2 is complete:
1. Test with real CSV data
2. Refine template management UI
3. Add more transform options if needed
4. Optimize batch write performance
5. Add import scheduling (future)

---

**Ready to start Phase 2!** 🚀

