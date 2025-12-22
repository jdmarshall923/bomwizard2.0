/**
 * PPL Import Service - Phase 10.5
 * 
 * Handles importing parts from PPL (Project Parts List) Excel spreadsheets.
 * Supports column auto-detection, create/update logic, and bulk processing.
 */

import { Timestamp } from 'firebase/firestore';
import { NewPart, PplImportResult, PplColumnMapping, NEW_PART_DEFAULTS } from '@/types/newPart';
import { UNASSIGNED_GROUP_CODE } from '@/types/bom';
import { createNewPart, updateNewPart, getNewParts } from '@/lib/bom/newPartService';

/**
 * Standard PPL column mappings
 * Maps PPL Excel column headers to NewPart fields
 */
export const PPL_COLUMN_MAPPINGS: PplColumnMapping[] = [
  // Identification
  { pplColumn: 'B or Q Code', newPartField: 'placeholderCode' },
  { pplColumn: 'B Code', newPartField: 'placeholderCode' },
  { pplColumn: 'Part Code', newPartField: 'placeholderCode' },
  { pplColumn: 'Item Code', newPartField: 'placeholderCode' },
  { pplColumn: 'Description', newPartField: 'description' },
  { pplColumn: 'Part Description', newPartField: 'description' },
  { pplColumn: 'Item Description', newPartField: 'description' },
  { pplColumn: 'Category', newPartField: 'category' },
  { pplColumn: 'Group', newPartField: 'groupCode' },
  { pplColumn: 'Group Code', newPartField: 'groupCode' },
  { pplColumn: 'BOM Group', newPartField: 'groupCode' },
  
  // Drawing & Design
  { pplColumn: 'Drawing Number incl. Variant', newPartField: 'drawingNumber' },
  { pplColumn: 'Drawing Number', newPartField: 'drawingNumber' },
  { pplColumn: 'Drawing No', newPartField: 'drawingNumber' },
  { pplColumn: 'PDM revision', newPartField: 'drawingRevision' },
  { pplColumn: 'PDM Rev', newPartField: 'drawingRevision' },
  { pplColumn: 'Drawing Revision', newPartField: 'drawingRevision' },
  { pplColumn: 'PDF Revision', newPartField: 'pdfRevision' },
  
  // Vendor & Sourcing
  { pplColumn: 'Supplier Selected for Production Parts', newPartField: 'vendorName' },
  { pplColumn: 'Supplier', newPartField: 'vendorName' },
  { pplColumn: 'Vendor', newPartField: 'vendorName' },
  { pplColumn: 'Vendor Name', newPartField: 'vendorName' },
  { pplColumn: 'Vendor Code', newPartField: 'vendorCode' },
  { pplColumn: 'OEM Part Number', newPartField: 'oemPartNumber' },
  { pplColumn: 'Supplier Model Ref', newPartField: 'oemPartNumber' },
  { pplColumn: 'Country of Origin', newPartField: 'countryOfOrigin' },
  { pplColumn: 'Factory Location', newPartField: 'factoryLocation' },
  { pplColumn: 'Unit 1 Factory', newPartField: 'factoryLocation' },
  
  // Pricing
  { pplColumn: 'Part Cost', newPartField: 'quotedPrice', transform: parseFloat },
  { pplColumn: 'Price', newPartField: 'quotedPrice', transform: parseFloat },
  { pplColumn: 'Unit Price', newPartField: 'quotedPrice', transform: parseFloat },
  { pplColumn: 'Currency', newPartField: 'currency' },
  { pplColumn: 'Estimate or Quote', newPartField: 'costSource', transform: (v) => {
    const lower = v.toLowerCase();
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('quote')) return 'quote';
    if (lower.includes('estimate')) return 'estimate';
    return 'placeholder';
  }},
  
  // Lead Times
  { pplColumn: 'Production Leadtime Incl. Shipping (weeks)', newPartField: 'productionLeadTimeWeeks' },
  { pplColumn: 'Production Lead Time', newPartField: 'productionLeadTimeWeeks' },
  { pplColumn: 'Lead Time (weeks)', newPartField: 'productionLeadTimeWeeks' },
  { pplColumn: 'Base Lead Time (days)', newPartField: 'baseLeadTimeDays', transform: parseInt },
  
  // Quantities
  { pplColumn: 'BOM Qty', newPartField: 'quantity', transform: parseInt },
  { pplColumn: 'Quantity', newPartField: 'quantity', transform: parseInt },
  { pplColumn: 'Qty', newPartField: 'quantity', transform: parseInt },
  { pplColumn: 'Sprint qty', newPartField: 'sprintQuantity', transform: parseInt },
  { pplColumn: 'Sprint Quantity', newPartField: 'sprintQuantity', transform: parseInt },
  { pplColumn: 'Single Production run qty', newPartField: 'massProductionQuantity', transform: parseInt },
  { pplColumn: 'Mass Prod Qty', newPartField: 'massProductionQuantity', transform: parseInt },
  { pplColumn: 'Production Qty', newPartField: 'massProductionQuantity', transform: parseInt },
  { pplColumn: 'P&A forecast/Warranty', newPartField: 'paForecast', transform: parseInt },
  { pplColumn: 'P&A Forecast', newPartField: 'paForecast', transform: parseInt },
  { pplColumn: 'Scrap rate', newPartField: 'scrapRate', transform: (v) => parseFloat(v) / 100 },
  { pplColumn: 'Scrap %', newPartField: 'scrapRate', transform: (v) => parseFloat(v) / 100 },
  
  // Sprint Order
  { pplColumn: 'Sprint Stock in plant TARGET DATE', newPartField: 'sprintTargetDate', transform: parseDate },
  { pplColumn: 'Sprint Target Date', newPartField: 'sprintTargetDate', transform: parseDate },
  { pplColumn: 'Sprint PO number', newPartField: 'sprintPoNumber' },
  { pplColumn: 'Sprint PO', newPartField: 'sprintPoNumber' },
  { pplColumn: 'Sprint PO due date', newPartField: 'sprintPoDate', transform: parseDate },
  { pplColumn: 'Sprint Received', newPartField: 'sprintReceived', transform: parseBoolean },
  { pplColumn: 'Sprint Qty Received', newPartField: 'sprintReceivedQty', transform: parseInt },
  
  // Production Order
  { pplColumn: 'Production Run MRD TARGET DATE', newPartField: 'productionTargetDate', transform: parseDate },
  { pplColumn: 'Production Target Date', newPartField: 'productionTargetDate', transform: parseDate },
  { pplColumn: 'MRD Target', newPartField: 'productionTargetDate', transform: parseDate },
  { pplColumn: 'Production PO number', newPartField: 'productionPoNumber' },
  { pplColumn: 'Production PO', newPartField: 'productionPoNumber' },
  { pplColumn: 'Production PO due date', newPartField: 'productionPoDate', transform: parseDate },
  { pplColumn: 'Is PO late? For production', newPartField: 'productionPoLate', transform: parseBoolean },
  { pplColumn: 'Production Late', newPartField: 'productionPoLate', transform: parseBoolean },
  { pplColumn: 'Received?', newPartField: 'productionReceived', transform: parseBoolean },
  { pplColumn: 'Production Received', newPartField: 'productionReceived', transform: parseBoolean },
  { pplColumn: 'Qty Outstanding', newPartField: 'productionQtyOutstanding', transform: parseInt },
  { pplColumn: 'Production Qty Received', newPartField: 'productionReceivedQty', transform: parseInt },
  
  // Comments
  { pplColumn: 'Comments', newPartField: 'comments' },
  { pplColumn: 'Notes', newPartField: 'comments' },
  { pplColumn: 'Tooling Commitment', newPartField: 'toolingCommitment' },
  { pplColumn: 'Tooling', newPartField: 'toolingCommitment' },
  
  // Assignments
  { pplColumn: 'Project Coordinator', newPartField: 'projectCoordinator' },
  { pplColumn: 'Coordinator', newPartField: 'projectCoordinator' },
  { pplColumn: 'Buyer', newPartField: 'buyer' },
  { pplColumn: 'SQE', newPartField: 'sqe' },
  { pplColumn: 'Design Engineer', newPartField: 'designEngineer' },
  { pplColumn: 'Designer', newPartField: 'designEngineer' },
  
  // Flags
  { pplColumn: 'Color Touchpoint', newPartField: 'isColorTouchpoint', transform: parseBoolean },
  { pplColumn: 'Is OEM Part', newPartField: 'isOemPart', transform: parseBoolean },
  { pplColumn: 'OEM', newPartField: 'isOemPart', transform: parseBoolean },
  { pplColumn: 'New Supplier', newPartField: 'isNewSupplier', transform: parseBoolean },
  { pplColumn: 'Order Together', newPartField: 'orderTogether', transform: parseBoolean },
];

/**
 * Parse a date string into a Timestamp
 */
function parseDate(value: string): Timestamp | undefined {
  if (!value) return undefined;
  
  // Try various date formats
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return Timestamp.fromDate(date);
  }
  
  // Try DD/MM/YYYY format
  const parts = value.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) {
      return Timestamp.fromDate(parsed);
    }
  }
  
  return undefined;
}

/**
 * Parse a boolean value from various string formats
 */
function parseBoolean(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'yes' || lower === 'true' || lower === '1' || lower === 'y' || lower === 'x';
}

/**
 * Auto-detect column mappings from header row
 */
export function detectColumnMappings(headers: string[]): Map<number, PplColumnMapping> {
  const mappings = new Map<number, PplColumnMapping>();
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.trim();
    
    // Find matching mapping (case-insensitive)
    const mapping = PPL_COLUMN_MAPPINGS.find(
      (m) => m.pplColumn.toLowerCase() === normalizedHeader.toLowerCase()
    );
    
    if (mapping) {
      // Only use first match for each field to avoid duplicates
      const existingMapping = Array.from(mappings.values()).find(
        (m) => m.newPartField === mapping.newPartField
      );
      if (!existingMapping) {
        mappings.set(index, mapping);
      }
    }
  });
  
  return mappings;
}

/**
 * Parse a row of data using column mappings
 */
export function parseRow(
  row: string[],
  mappings: Map<number, PplColumnMapping>
): Partial<NewPart> {
  const data: Partial<NewPart> = {};
  
  mappings.forEach((mapping, index) => {
    const value = row[index]?.trim();
    if (!value) return;
    
    // Apply transform if present, otherwise use value directly
    const transformedValue = mapping.transform ? mapping.transform(value) : value;
    
    // Type-safe assignment
    (data as any)[mapping.newPartField] = transformedValue;
  });
  
  return data;
}

/**
 * Preview PPL import - analyze file without importing
 */
export interface PplImportPreview {
  totalRows: number;
  newParts: number;
  existingParts: number;
  unassignedParts: number;
  detectedColumns: string[];
  unmappedColumns: string[];
  sampleData: Array<{
    placeholderCode: string;
    description: string;
    groupCode?: string;
    action: 'create' | 'update';
  }>;
  errors: Array<{ row: number; error: string }>;
}

export async function previewPplImport(
  projectId: string,
  headers: string[],
  rows: string[][]
): Promise<PplImportPreview> {
  // Get existing parts for matching
  const existingParts = await getNewParts(projectId);
  const existingCodes = new Set(existingParts.map((p) => p.placeholderCode.toLowerCase()));
  
  // Detect column mappings
  const mappings = detectColumnMappings(headers);
  const detectedColumns = Array.from(mappings.values()).map((m) => m.pplColumn);
  const unmappedColumns = headers.filter(
    (h) => !detectedColumns.some((d) => d.toLowerCase() === h.toLowerCase())
  );
  
  let newCount = 0;
  let existingCount = 0;
  let unassignedCount = 0;
  const sampleData: PplImportPreview['sampleData'] = [];
  const errors: PplImportPreview['errors'] = [];
  
  rows.forEach((row, index) => {
    try {
      const parsed = parseRow(row, mappings);
      
      if (!parsed.placeholderCode) {
        errors.push({ row: index + 2, error: 'Missing part code' });
        return;
      }
      
      const isExisting = existingCodes.has(parsed.placeholderCode.toLowerCase());
      if (isExisting) {
        existingCount++;
      } else {
        newCount++;
      }
      
      if (!parsed.groupCode || parsed.groupCode === UNASSIGNED_GROUP_CODE) {
        unassignedCount++;
      }
      
      // Add to sample (first 10)
      if (sampleData.length < 10) {
        sampleData.push({
          placeholderCode: parsed.placeholderCode,
          description: parsed.description || '',
          groupCode: parsed.groupCode,
          action: isExisting ? 'update' : 'create',
        });
      }
    } catch (err) {
      errors.push({ row: index + 2, error: (err as Error).message });
    }
  });
  
  return {
    totalRows: rows.length,
    newParts: newCount,
    existingParts: existingCount,
    unassignedParts: unassignedCount,
    detectedColumns,
    unmappedColumns,
    sampleData,
    errors,
  };
}

/**
 * Import options
 */
export interface PplImportOptions {
  createInBom: boolean;      // Create corresponding BOM items
  updateExisting: boolean;   // Update parts that already exist
  overwriteChanges: boolean; // Overwrite manual changes with PPL data
}

/**
 * Import parts from PPL data
 */
export async function importFromPpl(
  projectId: string,
  headers: string[],
  rows: string[][],
  options: PplImportOptions,
  createdBy: string,
  onProgress?: (current: number, total: number) => void
): Promise<PplImportResult> {
  const result: PplImportResult = {
    created: 0,
    updated: 0,
    unassigned: 0,
    errors: [],
  };
  
  // Get existing parts for matching
  const existingParts = await getNewParts(projectId);
  const existingByCode = new Map(
    existingParts.map((p) => [p.placeholderCode.toLowerCase(), p])
  );
  
  // Detect column mappings
  const mappings = detectColumnMappings(headers);
  
  // Process in batches of 50
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    try {
      const parsed = parseRow(row, mappings);
      
      if (!parsed.placeholderCode) {
        result.errors.push({ row: i + 2, error: 'Missing part code' });
        continue;
      }
      
      const existingPart = existingByCode.get(parsed.placeholderCode.toLowerCase());
      
      // Track unassigned
      if (!parsed.groupCode || parsed.groupCode === UNASSIGNED_GROUP_CODE) {
        parsed.groupCode = UNASSIGNED_GROUP_CODE;
        result.unassigned++;
      }
      
      if (existingPart) {
        // Update existing
        if (options.updateExisting) {
          // If not overwriting, only update empty fields
          const updates: Partial<NewPart> = {};
          
          Object.entries(parsed).forEach(([key, value]) => {
            if (value === undefined) return;
            
            if (options.overwriteChanges) {
              (updates as any)[key] = value;
            } else {
              // Only update if existing field is empty/undefined
              const existingValue = (existingPart as any)[key];
              if (existingValue === undefined || existingValue === null || existingValue === '') {
                (updates as any)[key] = value;
              }
            }
          });
          
          if (Object.keys(updates).length > 0) {
            updates.lastPplSync = Timestamp.now();
            await updateNewPart(projectId, existingPart.id, updates);
            result.updated++;
          }
        }
      } else {
        // Create new
        await createNewPart(
          projectId,
          {
            ...NEW_PART_DEFAULTS,
            ...parsed,
            importedFromPpl: true,
            lastPplSync: Timestamp.now(),
          },
          createdBy
        );
        result.created++;
      }
      
      // Report progress
      if (onProgress && (i + 1) % 10 === 0) {
        onProgress(i + 1, rows.length);
      }
    } catch (err) {
      result.errors.push({ row: i + 2, error: (err as Error).message });
    }
    
    // Small delay between batches to avoid rate limiting
    if ((i + 1) % BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  
  // Final progress update
  if (onProgress) {
    onProgress(rows.length, rows.length);
  }
  
  return result;
}

/**
 * Parse CSV content into headers and rows
 */
export function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split('\n').filter((line) => line.trim());
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Simple CSV parsing (handles quoted values)
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };
  
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  
  return { headers, rows };
}

