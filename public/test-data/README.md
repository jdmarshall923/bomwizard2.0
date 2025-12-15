# Test Data Files

This directory contains sample CSV files for testing the import functionality.

## Files

### `sample-bom.csv`
Standard BOM format with all fields included:
- Assembly Code
- Item Code
- Item Description
- Quantity
- Level
- Material Cost
- Landing Cost
- Labour Cost
- Part Category

**Use this for:** Testing the standard import flow with all fields mapped.

### `sample-bom-infor-format.csv`
Infor-style format that requires column mapping:
- Item Code
- Description
- Qty
- Assembly
- Unit Cost
- Category

**Use this for:** Testing the column mapping and template functionality.

## Usage

1. Navigate to a project's Import page: `/project/[projectId]/import`
2. Upload one of these CSV files
3. Use the "Infor" format file to test column mapping
4. Use the standard format to test direct import

## Expected Results

After importing either file, you should see:
- 15 BOM items created
- 3 assemblies (GMF-0130-A02, GFF-0128-A01, BCO-AU-08)
- Items created in the global `items` collection
- A version snapshot created (if option enabled)
- Import history recorded

