import * as XLSX from 'xlsx';
import { Timestamp } from 'firebase/firestore';
import { 
  ParsedSpec, 
  ParseError,
  SpecValidationResult,
  SpecHeader, 
  SpecTimeline, 
  SpecCategory, 
  SpecOption,
  ColourOption,
  ColourPart,
  SPEC_CATEGORIES,
  BIKE_TYPES,
  COLOUR_PARTS 
} from '@/types/spec';
import { createSpec } from './specService';

// ============================================
// EXCEL SPEC SHEET PARSING
// ============================================

/**
 * Parse an Excel spec sheet file
 */
export async function parseSpecSheet(file: File): Promise<ParsedSpec> {
  const errors: ParseError[] = [];
  const warnings: string[] = [];
  
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Get the first sheet (main spec sheet)
    const mainSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(mainSheet, { header: 1 }) as unknown[][];
    
    // Parse header section
    const header = parseHeader(data, errors, warnings);
    
    // Parse timeline section
    const timeline = parseTimeline(data, errors, warnings);
    
    // Parse categories
    const categories = parseCategories(data, errors, warnings);
    
    // Parse colour options (might be in a separate sheet)
    let colourOptions: ColourOption[] = [];
    const colourSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('colour') || name.toLowerCase().includes('color')
    );
    
    if (colourSheetName) {
      const colourSheet = workbook.Sheets[colourSheetName];
      const colourData = XLSX.utils.sheet_to_json(colourSheet, { header: 1 }) as unknown[][];
      colourOptions = parseColourOptions(colourData, errors, warnings);
    }
    
    return {
      header,
      timeline,
      categories,
      colourOptions,
      sourceFilename: file.name,
      parseErrors: errors,
      parseWarnings: warnings,
    };
    
  } catch (error) {
    errors.push({
      message: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });
    
    return {
      header: { projectName: '', bikeType: '' },
      timeline: {},
      categories: [],
      colourOptions: [],
      sourceFilename: file.name,
      parseErrors: errors,
      parseWarnings: warnings,
    };
  }
}

/**
 * Parse header section from spec sheet
 */
function parseHeader(
  data: unknown[][], 
  errors: ParseError[], 
  warnings: string[]
): Partial<SpecHeader> {
  const header: Partial<SpecHeader> = {};
  
  // Look for header fields in the first 20 rows
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    
    const label = String(row[0]).toLowerCase().trim();
    const value = row[1] ? String(row[1]).trim() : '';
    
    if (label.includes('project') && label.includes('name')) {
      header.projectName = value;
    } else if (label.includes('product family')) {
      header.productFamily = value;
    } else if (label.includes('model year') || label.includes('my')) {
      header.modelYear = value;
    } else if (label.includes('product category')) {
      header.productCategory = value;
    } else if (label.includes('product class')) {
      header.productClass = value;
    } else if (label.includes('product line')) {
      header.productLine = value;
    } else if (label.includes('product type') || label.includes('bike type')) {
      // Try to match to known bike types
      const bikeType = findBikeType(value);
      if (bikeType) {
        header.bikeType = bikeType;
      } else if (value) {
        header.bikeType = value;
        warnings.push(`Unknown bike type: "${value}" - mappings may not be available`);
      }
    } else if (label.includes('component colour') || label.includes('color')) {
      header.componentColour = value;
    } else if (label.includes('frame material')) {
      header.frameMaterial = value;
    }
  }
  
  // Validate required fields
  if (!header.projectName) {
    errors.push({
      field: 'projectName',
      message: 'Project name is required',
      severity: 'error',
    });
  }
  
  if (!header.bikeType) {
    errors.push({
      field: 'bikeType',
      message: 'Bike type is required for spec mapping',
      severity: 'error',
    });
  }
  
  return header;
}

/**
 * Find matching bike type from value
 */
function findBikeType(value: string): string | null {
  const normalizedValue = value.toLowerCase().trim();
  
  for (const bikeType of BIKE_TYPES) {
    if (normalizedValue.includes(bikeType.toLowerCase())) {
      return bikeType;
    }
  }
  
  // Check for common variations
  if (normalizedValue.includes('mtb') || normalizedValue.includes('mountain')) {
    return 'Mountain';
  }
  if (normalizedValue.includes('electric') || normalizedValue.includes('e-')) {
    return 'E-Bike';
  }
  if (normalizedValue.includes('urban') || normalizedValue.includes('commuter')) {
    return 'City';
  }
  
  return null;
}

/**
 * Parse timeline section from spec sheet
 */
function parseTimeline(
  data: unknown[][], 
  errors: ParseError[], 
  warnings: string[]
): Partial<SpecTimeline> {
  const timeline: Partial<SpecTimeline> = {};
  
  // Look for timeline fields
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    
    const label = String(row[0]).toLowerCase().trim();
    const value = row[1];
    
    if (label.includes('date available') || label.includes('tp date')) {
      timeline.dateAvailableInTp = String(value);
    } else if (label.includes('ordering open')) {
      timeline.orderingOpenWeek = String(value);
    } else if (label.includes('ordering close')) {
      timeline.orderingCloseWeek = String(value);
    } else if (label.includes('sprint') && label.includes('week')) {
      timeline.sprintRunWeek = String(value);
    } else if (label.includes('production') && label.includes('week')) {
      timeline.productionWeek = String(value);
    } else if (label.includes('total qty') || label.includes('total quantity')) {
      const qty = parseInt(String(value), 10);
      if (!isNaN(qty)) {
        timeline.totalQty = qty;
      }
    } else if (label.includes('pbom') || label.includes('code name')) {
      timeline.pbomCodeName = String(value);
    } else if (label.includes('business case')) {
      timeline.businessCaseLink = String(value);
    } else if (label.includes('colours available') || label.includes('colors available')) {
      const num = parseInt(String(value), 10);
      if (!isNaN(num)) {
        timeline.numColoursAvailable = num;
      }
    }
  }
  
  return timeline;
}

/**
 * Parse category selections from spec sheet
 */
function parseCategories(
  data: unknown[][], 
  errors: ParseError[], 
  warnings: string[]
): SpecCategory[] {
  const categories: SpecCategory[] = [];
  
  // Look for category sections
  let currentCategory: string | null = null;
  let currentOptions: SpecOption[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 1) continue;
    
    const firstCell = String(row[0]).toUpperCase().trim();
    
    // Check if this is a category header
    const matchedCategory = SPEC_CATEGORIES.find(cat => 
      firstCell === cat || firstCell.includes(cat)
    );
    
    if (matchedCategory) {
      // Save previous category if exists
      if (currentCategory && currentOptions.length > 0) {
        categories.push({
          category: currentCategory,
          options: currentOptions,
          mappingStatus: 'unmapped',
        });
      }
      
      currentCategory = matchedCategory;
      currentOptions = [];
      continue;
    }
    
    // If we're in a category, parse options
    if (currentCategory && firstCell && !firstCell.startsWith('#')) {
      const option = parseOption(row, i, warnings);
      if (option) {
        currentOptions.push(option);
      }
    }
  }
  
  // Don't forget the last category
  if (currentCategory && currentOptions.length > 0) {
    categories.push({
      category: currentCategory,
      options: currentOptions,
      mappingStatus: 'unmapped',
    });
  }
  
  // Initialize any missing categories with empty options
  for (const cat of SPEC_CATEGORIES) {
    if (!categories.find(c => c.category === cat)) {
      categories.push({
        category: cat,
        options: [],
        mappingStatus: 'unmapped',
      });
    }
  }
  
  return categories;
}

/**
 * Parse a single option row
 */
function parseOption(row: unknown[], rowIndex: number, warnings: string[]): SpecOption | null {
  if (!row[0]) return null;
  
  const optionName = String(row[0]).trim();
  
  // Skip header rows
  if (optionName.toLowerCase() === 'option' || optionName.toLowerCase() === 'name') {
    return null;
  }
  
  // Parse available (Y/N)
  const availableCell = row[1] ? String(row[1]).toUpperCase().trim() : '';
  const available = availableCell === 'Y' || availableCell === 'YES' || availableCell === 'TRUE';
  
  // Parse selected
  const selectedCell = row[2] ? String(row[2]).toUpperCase().trim() : '';
  const selected = selectedCell === 'Y' || selectedCell === 'YES' || selectedCell === 'TRUE' || selectedCell === 'X';
  
  // Parse default
  const defaultCell = row[3] ? String(row[3]).toUpperCase().trim() : '';
  const isDefault = defaultCell === 'Y' || defaultCell === 'YES' || defaultCell === 'DEFAULT';
  
  // Parse quantities (optional columns)
  let estQtyMin: number | undefined;
  let estQtyMax: number | undefined;
  let estSplit: number | undefined;
  
  if (row[4]) {
    const qtyMin = parseInt(String(row[4]), 10);
    if (!isNaN(qtyMin)) estQtyMin = qtyMin;
  }
  if (row[5]) {
    const qtyMax = parseInt(String(row[5]), 10);
    if (!isNaN(qtyMax)) estQtyMax = qtyMax;
  }
  if (row[6]) {
    const split = parseFloat(String(row[6]));
    if (!isNaN(split)) estSplit = split;
  }
  
  // Parse notes
  const notes = row[7] ? String(row[7]).trim() : undefined;
  
  return {
    optionName,
    available,
    selected,
    isDefault,
    estQtyMin,
    estQtyMax,
    estSplit,
    notes,
    mappingStatus: 'unmapped',
  };
}

/**
 * Parse colour options from colour sheet
 */
function parseColourOptions(
  data: unknown[][], 
  errors: ParseError[], 
  warnings: string[]
): ColourOption[] {
  const colourOptions: ColourOption[] = [];
  
  // Find the header row
  let headerRowIndex = -1;
  let partNameCol = 0;
  let colourCols: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    // Look for header row with "PART" or "COMPONENT"
    const firstCell = String(row[0] || '').toUpperCase().trim();
    if (firstCell.includes('PART') || firstCell.includes('COMPONENT')) {
      headerRowIndex = i;
      
      // Find colour option columns (Option 1, Option 2, etc.)
      for (let j = 1; j < row.length; j++) {
        const cell = String(row[j] || '').toUpperCase().trim();
        if (cell.includes('OPTION') || cell.includes('COLOUR') || cell.includes('COLOR')) {
          colourCols.push(j);
        }
      }
      break;
    }
  }
  
  if (headerRowIndex === -1 || colourCols.length === 0) {
    warnings.push('Could not find colour options header row');
    return colourOptions;
  }
  
  // Initialize colour options
  for (let i = 0; i < colourCols.length; i++) {
    colourOptions.push({
      optionNumber: i + 1,
      parts: [],
    });
  }
  
  // Parse part rows
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    
    const partName = String(row[0]).trim().toUpperCase();
    if (!partName) continue;
    
    // Check if this is a known part
    const isKnownPart = COLOUR_PARTS.some(p => partName.includes(p));
    if (!isKnownPart) {
      // Still include but warn
      warnings.push(`Unknown colour part: "${partName}"`);
    }
    
    // Parse colour for each option
    for (let j = 0; j < colourCols.length; j++) {
      const colIndex = colourCols[j];
      const colourValue = row[colIndex] ? String(row[colIndex]).trim() : undefined;
      
      // Check for custom indicators
      const isCustom = colourValue ? 
        colourValue.toLowerCase().includes('custom') || 
        colourValue.toLowerCase().includes('tbc') ||
        colourValue.toLowerCase().includes('special') : false;
      
      const part: ColourPart = {
        partName,
        colour: colourValue || undefined,
        isCustom,
      };
      
      colourOptions[j].parts.push(part);
    }
  }
  
  return colourOptions;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate a parsed spec
 */
export function validateParsedSpec(parsed: ParsedSpec): SpecValidationResult {
  const errors: ParseError[] = [...parsed.parseErrors];
  const warnings: ParseError[] = parsed.parseWarnings.map(w => ({
    message: w,
    severity: 'warning' as const,
  }));
  
  // Check for bike type
  const hasBikeType = !!parsed.header.bikeType;
  if (!hasBikeType) {
    errors.push({
      field: 'bikeType',
      message: 'Bike type is required for spec mapping',
      severity: 'error',
    });
  }
  
  // Check for selected options
  const hasSelectedOptions = parsed.categories.some(cat => 
    cat.options.some(opt => opt.selected)
  );
  if (!hasSelectedOptions) {
    warnings.push({
      message: 'No options are selected in the spec',
      severity: 'warning',
    });
  }
  
  // Check for unknown categories
  const unknownCategories = parsed.categories
    .filter(cat => !SPEC_CATEGORIES.includes(cat.category as typeof SPEC_CATEGORIES[number]))
    .map(cat => cat.category);
  
  // Check for unknown options (can't validate without a reference list)
  const unknownOptions: string[] = [];
  
  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    warnings,
    hasBikeType,
    hasSelectedOptions,
    unknownCategories,
    unknownOptions,
  };
}

// ============================================
// CREATE SPEC FROM IMPORT
// ============================================

/**
 * Create a new spec from parsed import data
 */
export async function createSpecFromImport(
  projectId: string, 
  parsed: ParsedSpec,
  userId: string
): Promise<string> {
  // Validate first
  const validation = validateParsedSpec(parsed);
  if (!validation.isValid) {
    throw new Error('Parsed spec is not valid: ' + 
      validation.errors.map(e => e.message).join(', '));
  }
  
  // Create the spec
  const spec = await createSpec(
    projectId,
    {
      header: {
        projectName: parsed.header.projectName || 'Imported Spec',
        bikeType: parsed.header.bikeType || 'Unknown',
        ...parsed.header,
      },
      timeline: parsed.timeline,
      categories: parsed.categories,
      colourOptions: parsed.colourOptions,
    },
    userId
  );
  
  return spec.id;
}

// ============================================
// EXPORT SPEC
// ============================================

/**
 * Export a spec to Excel format
 */
export async function exportSpecToExcel(spec: {
  header: SpecHeader;
  timeline: SpecTimeline;
  categories: SpecCategory[];
  colourOptions: ColourOption[];
}): Promise<Blob> {
  const workbook = XLSX.utils.book_new();
  
  // Create main spec sheet
  const mainData: (string | number | boolean | undefined)[][] = [];
  
  // Header section
  mainData.push(['PROJECT SPECIFICATION']);
  mainData.push([]);
  mainData.push(['Project Name', spec.header.projectName]);
  mainData.push(['Bike Type', spec.header.bikeType]);
  mainData.push(['Product Family', spec.header.productFamily]);
  mainData.push(['Model Year', spec.header.modelYear]);
  mainData.push(['Product Category', spec.header.productCategory]);
  mainData.push(['Product Class', spec.header.productClass]);
  mainData.push(['Product Line', spec.header.productLine]);
  mainData.push(['Component Colour', spec.header.componentColour]);
  mainData.push(['Frame Material', spec.header.frameMaterial]);
  mainData.push([]);
  
  // Timeline section
  mainData.push(['TIMELINE']);
  mainData.push(['Date Available in TP', spec.timeline.dateAvailableInTp]);
  mainData.push(['Ordering Open Week', spec.timeline.orderingOpenWeek]);
  mainData.push(['Ordering Close Week', spec.timeline.orderingCloseWeek]);
  mainData.push(['Sprint Run Week', spec.timeline.sprintRunWeek]);
  mainData.push(['Production Week', spec.timeline.productionWeek]);
  mainData.push(['Total Qty', spec.timeline.totalQty]);
  mainData.push(['PBOM Code Name', spec.timeline.pbomCodeName]);
  mainData.push([]);
  
  // Categories section
  mainData.push(['CONFIGURATION OPTIONS']);
  mainData.push(['Category', 'Option', 'Available', 'Selected', 'Default', 'Est Qty Min', 'Est Qty Max', 'Split %', 'Notes']);
  
  for (const category of spec.categories) {
    mainData.push([category.category]);
    for (const option of category.options) {
      mainData.push([
        '',
        option.optionName,
        option.available ? 'Y' : 'N',
        option.selected ? 'Y' : 'N',
        option.isDefault ? 'Y' : 'N',
        option.estQtyMin,
        option.estQtyMax,
        option.estSplit,
        option.notes,
      ]);
    }
    mainData.push([]);
  }
  
  const mainSheet = XLSX.utils.aoa_to_sheet(mainData);
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Spec');
  
  // Create colour options sheet if present
  if (spec.colourOptions.length > 0) {
    const colourData: (string | number | undefined)[][] = [];
    
    // Header row
    const headerRow = ['Part'];
    for (let i = 0; i < spec.colourOptions.length; i++) {
      headerRow.push(`Option ${i + 1}`);
    }
    colourData.push(headerRow);
    
    // Get all unique part names
    const allPartNames = new Set<string>();
    for (const option of spec.colourOptions) {
      for (const part of option.parts) {
        allPartNames.add(part.partName);
      }
    }
    
    // Part rows
    for (const partName of allPartNames) {
      const row: (string | undefined)[] = [partName];
      for (const option of spec.colourOptions) {
        const part = option.parts.find(p => p.partName === partName);
        row.push(part?.colour || '');
      }
      colourData.push(row);
    }
    
    const colourSheet = XLSX.utils.aoa_to_sheet(colourData);
    XLSX.utils.book_append_sheet(workbook, colourSheet, 'Colours');
  }
  
  // Generate the file
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

