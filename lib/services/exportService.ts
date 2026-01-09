import { BomItem } from '@/types/bom';
import { 
  ColumnDefinition, 
  COLUMN_DEFINITIONS, 
  COLUMN_GROUPS,
  ColumnVisibilitySettings,
  getVisibleColumns,
} from '@/types/settings';

/**
 * Phase 14: Export Service
 * 
 * Export BOM data to XLSX with formatting:
 * - Blue frozen header row
 * - Olive green group rows (level 0/1)
 * - White part rows
 * - Sequence numbers with gaps
 */

// ============================================
// TYPES
// ============================================

interface ExportOptions {
  visibility: ColumnVisibilitySettings;
  filename?: string;
  includeTimestamp?: boolean;
}

interface ExportColumn {
  id: string;
  header: string;
  width: number;
  format?: (value: any, item: BomItem) => string | number;
}

// ============================================
// EXCEL EXPORT
// ============================================

/**
 * Export BOM items to XLSX
 * Uses SheetJS (xlsx) library
 */
export async function exportToExcel(
  items: BomItem[],
  projectName: string,
  options: ExportOptions
): Promise<Blob> {
  // Dynamically import xlsx to avoid SSR issues
  const XLSX = await import('xlsx');
  
  // Get visible columns
  const columns = getVisibleColumns(options.visibility);
  
  // Process items to ensure group rows exist
  const processedItems = processItemsWithGroups(items);
  
  // Build worksheet data
  const wsData: any[][] = [];
  
  // Header row
  const headerRow = columns.map(col => col.shortName || col.displayName);
  wsData.push(headerRow);
  
  // Data rows
  for (const item of processedItems) {
    const row = columns.map(col => formatCellValue(item, col));
    wsData.push(row);
  }
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: Math.ceil((col.width || 100) / 7) }));
  
  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  
  // Apply styles (Note: basic xlsx doesn't support full styling,
  // for full styling use xlsx-style or exceljs)
  // We'll document expected appearance and provide cell metadata
  
  // Add cell metadata for styling (can be used by xlsx-style)
  const cellStyles: Record<string, any> = {};
  
  // Header style
  for (let c = 0; c < columns.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    cellStyles[cellRef] = {
      fill: { fgColor: { rgb: '4472C4' } },  // Blue
      font: { bold: true, color: { rgb: 'FFFFFF' } },
    };
  }
  
  // Data row styles
  for (let r = 0; r < processedItems.length; r++) {
    const item = processedItems[r];
    const isGroupRow = item.itemType === 'group' || item.level === 1 || item.level === 0;
    
    for (let c = 0; c < columns.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: r + 1, c });
      
      if (isGroupRow) {
        cellStyles[cellRef] = {
          fill: { fgColor: { rgb: '808000' } },  // Olive
          font: { bold: true, color: { rgb: 'FFFFFF' } },
        };
      }
    }
  }
  
  // Store styles metadata (for enhanced export)
  (ws as any).__styles = cellStyles;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Draft PBoM');
  
  // Generate filename
  const timestamp = options.includeTimestamp 
    ? `_${new Date().toISOString().split('T')[0]}`
    : '';
  const filename = options.filename || `${projectName}${timestamp}.xlsx`;
  
  // Write to buffer
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

/**
 * Export to CSV (simpler, no styling)
 */
export function exportToCsv(
  items: BomItem[],
  projectName: string,
  options: ExportOptions
): Blob {
  const columns = getVisibleColumns(options.visibility);
  
  // Process items to ensure group rows exist
  const processedItems = processItemsWithGroups(items);
  
  // Build CSV content
  const rows: string[] = [];
  
  // Header
  rows.push(columns.map(col => escapeCSV(col.displayName)).join(','));
  
  // Data
  for (const item of processedItems) {
    const row = columns.map(col => escapeCSV(String(formatCellValue(item, col))));
    rows.push(row.join(','));
  }
  
  const content = rows.join('\n');
  
  return new Blob([content], { type: 'text/csv;charset=utf-8;' });
}

// ============================================
// HELPERS
// ============================================

/**
 * Format a cell value based on column definition
 */
function formatCellValue(item: BomItem, column: ColumnDefinition): string | number {
  const value = (item as any)[column.id];
  
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  switch (column.dataType) {
    case 'currency':
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return '';
      return num; // Return raw number, Excel will format
      
    case 'number':
      const n = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(n)) return '';
      return n;
      
    case 'boolean':
      return value ? 'Yes' : 'No';
      
    default:
      return String(value);
  }
}

/**
 * Escape value for CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Trigger download of blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate sequence numbers with gaps
 * Groups: 100, 200, 300...
 * Parts in group 1: 110, 120, 130...
 * Allows insertion: new part between 110 and 120 → 115
 */
export function generateSequenceNumbers(items: BomItem[]): Map<string, number> {
  const sequences = new Map<string, number>();
  let groupCounter = 0;
  let partCounter = 0;
  let currentGroup = '';
  
  for (const item of items) {
    if (item.itemType === 'group' || item.level === 0) {
      // New group
      groupCounter++;
      partCounter = 0;
      currentGroup = item.groupCode;
      sequences.set(item.id, groupCounter * 100);
    } else {
      // Part in group
      partCounter++;
      const baseSeq = groupCounter * 100;
      sequences.set(item.id, baseSeq + partCounter * 10);
    }
  }
  
  return sequences;
}

// ============================================
// FULL CCM EXPORT
// ============================================

/**
 * Export with all 29 CCM columns in official order
 * Uses styled export with formatting
 */
export async function exportFullCCM(
  items: BomItem[],
  projectName: string
): Promise<Blob> {
  // Use all columns
  const fullVisibility: ColumnVisibilitySettings = {
    visibleGroups: COLUMN_GROUPS.map(g => g.id),
  };
  
  // Use styled export for consistent formatting
  return exportWithStyles(items, projectName, {
    visibility: fullVisibility,
    includeTimestamp: true,
  });
}

// ============================================
// STYLED EXPORT (using exceljs if available)
// ============================================

/**
 * Process items to ensure group rows exist
 * Creates synthetic group rows if needed
 */
function processItemsWithGroups(items: BomItem[]): BomItem[] {
  // Get unique groups and their items
  const groupMap = new Map<string, { groupItem: BomItem | null; children: BomItem[] }>();
  
  items.forEach(item => {
    const groupCode = item.assemblyCode || item.groupCode || '';
    if (!groupCode) return;
    
    if (!groupMap.has(groupCode)) {
      groupMap.set(groupCode, { groupItem: null, children: [] });
    }
    
    const group = groupMap.get(groupCode)!;
    
    // Check if this item IS the group row (level 0 or 1, or itemType === 'group')
    if (item.itemType === 'group' || item.level === 0 || item.level === 1) {
      group.groupItem = item;
    } else {
      group.children.push(item);
    }
  });
  
  // Build the result list with group rows
  const result: BomItem[] = [];
  
  // Sort groups alphabetically
  const sortedGroups = Array.from(groupMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  
  for (const [groupCode, group] of sortedGroups) {
    // Add or create the group header row
    if (group.groupItem) {
      result.push(group.groupItem);
    } else if (group.children.length > 0) {
      // Create a synthetic group row
      const firstChild = group.children[0];
      result.push({
        id: `group-${groupCode}`,
        itemCode: groupCode,
        itemDescription: `${groupCode} Assembly`,
        assemblyCode: groupCode,
        groupCode: groupCode,
        level: 1,
        quantity: 1,
        itemType: 'group',
        materialCost: 0,
        landingCost: 0,
        labourCost: 0,
        extendedCost: 0,
      } as BomItem);
    }
    
    // Add children sorted by sequence/level
    const sortedChildren = [...group.children].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return (a.sequence || 0) - (b.sequence || 0);
    });
    
    result.push(...sortedChildren);
  }
  
  return result;
}

/**
 * Export with full Excel styling
 * Requires exceljs package: npm install exceljs
 * 
 * Formatting:
 * - Headers: Blue background with white bold text
 * - Level 1 parts (groups/assemblies): Olive green background with white bold text  
 * - New parts: Bright yellow background
 * - Regular parts: White background
 */
export async function exportWithStyles(
  items: BomItem[],
  projectName: string,
  options: ExportOptions
): Promise<Blob> {
  try {
    // Try to use exceljs for full styling
    const ExcelJS = await import('exceljs');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Draft PBoM');
    
    const columns = getVisibleColumns(options.visibility);
    
    // Process items to ensure group rows exist
    const processedItems = processItemsWithGroups(items);
    
    // Set up columns
    worksheet.columns = columns.map(col => ({
      header: col.shortName || col.displayName,
      key: col.id,
      width: Math.ceil((col.width || 100) / 7),
    }));
    
    // Style header row - Blue background with white bold text
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },  // Blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;
    
    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF2F5496' } },
        bottom: { style: 'thin', color: { argb: 'FF2F5496' } },
        left: { style: 'thin', color: { argb: 'FF2F5496' } },
        right: { style: 'thin', color: { argb: 'FF2F5496' } },
      };
    });
    
    // Add data rows with conditional formatting
    for (const item of processedItems) {
      const rowData: Record<string, any> = {};
      for (const col of columns) {
        rowData[col.id] = formatCellValue(item, col);
      }
      
      const row = worksheet.addRow(rowData);
      
      // Determine row styling based on item properties
      // Group rows are level 1 or itemType === 'group'
      const isGroupRow = item.itemType === 'group' || item.level === 1 || item.level === 0;
      const isNewPart = item.isNewPart === true && !isGroupRow;
      
      // Add borders to all cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
        cell.alignment = { vertical: 'middle' };
      });
      
      // Style Group rows (level 1 assemblies) - Olive green
      if (isGroupRow) {
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF808000' },  // Olive green
        };
        row.height = 22;
      }
      // Style New Parts - Bright yellow
      else if (isNewPart) {
        row.font = { bold: false };
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' },  // Bright yellow
        };
      }
      // Regular parts - White background (default, no fill needed)
    }
    
    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    
    // Auto-filter on header row
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    return new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  } catch (error) {
    // Fall back to basic xlsx export
    console.warn('exceljs not available, using basic export:', error);
    return exportToExcel(items, projectName, options);
  }
}
