/**
 * Column mapping utilities for auto-detecting and mapping CSV columns to BOM fields
 */

export interface ColumnMapping {
  source: string;
  transform?: 'parseInt' | 'parseFloat' | 'trim' | 'uppercase' | null;
}

export interface ColumnMappings {
  [targetField: string]: ColumnMapping;
}

export const TARGET_FIELDS = [
  { key: 'itemCode', label: 'Item Code', required: true },
  { key: 'itemDescription', label: 'Item Description', required: true },
  { key: 'quantity', label: 'Quantity', required: true },
  { key: 'level', label: 'Level', required: true }, // Level determines hierarchy
  { key: 'assemblyCode', label: 'Assembly Code (Optional)', required: false }, // Auto-calculated from level if not provided
  { key: 'materialCost', label: 'Material Cost', required: false },
  { key: 'landingCost', label: 'Landing Cost', required: false },
  { key: 'labourCost', label: 'Labour Cost', required: false },
  { key: 'partCategory', label: 'Part Category', required: false },
] as const;

/**
 * Auto-detect column mappings using fuzzy matching
 */
export function autoDetectMappings(
  sourceColumns: string[],
  existingMappings?: ColumnMappings
): ColumnMappings {
  const mappings: ColumnMappings = existingMappings || {};

  // Common column name variations
  const fieldVariations: Record<string, string[]> = {
    itemCode: ['item code', 'itemcode', 'part code', 'partcode', 'code', 'item', 'part'],
    itemDescription: [
      'item description',
      'description',
      'desc',
      'name',
      'part description',
      'part name',
    ],
    quantity: ['quantity', 'qty', 'qty.', 'amount', 'count'],
    assemblyCode: [
      'assembly code',
      'assembly',
      'assemblycode',
      'g-code',
      'gcode',
      'group',
      'group code',
    ],
    level: ['level', 'lvl', 'depth', 'hierarchy'],
    materialCost: [
      'material cost',
      'material',
      'cost',
      'unit cost',
      'price',
      'materialcost',
    ],
    landingCost: [
      'landing cost',
      'landing',
      'landingcost',
      'landing rate',
      'shipping cost',
    ],
    labourCost: [
      'labour cost',
      'labor cost',
      'labour',
      'labor',
      'labourcost',
      'laborcost',
      'wage',
    ],
    partCategory: [
      'part category',
      'category',
      'type',
      'partcategory',
      'part type',
      'status',
    ],
  };

  // Normalize column names for matching
  const normalize = (str: string): string => {
    return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  };

  // Find best match for each target field
  TARGET_FIELDS.forEach((field) => {
    // Skip if already mapped
    if (mappings[field.key]) return;

    const variations = fieldVariations[field.key] || [];
    let bestMatch: string | null = null;
    let bestScore = 0;

    sourceColumns.forEach((sourceCol) => {
      const normalizedSource = normalize(sourceCol);
      
      // Exact match
      if (variations.some((v) => normalize(v) === normalizedSource)) {
        bestMatch = sourceCol;
        bestScore = 1;
        return;
      }

      // Partial match
      variations.forEach((variation) => {
        const normalizedVar = normalize(variation);
        if (normalizedSource.includes(normalizedVar) || normalizedVar.includes(normalizedSource)) {
          const score = Math.min(normalizedSource.length, normalizedVar.length) / 
                       Math.max(normalizedSource.length, normalizedVar.length);
          if (score > bestScore && score > 0.5) {
            bestMatch = sourceCol;
            bestScore = score;
          }
        }
      });
    });

    if (bestMatch) {
      mappings[field.key] = {
        source: bestMatch,
        transform: getDefaultTransform(field.key),
      };
    }
  });

  return mappings;
}

/**
 * Get default transform for a field
 */
function getDefaultTransform(fieldKey: string): ColumnMapping['transform'] {
  switch (fieldKey) {
    case 'quantity':
    case 'level':
    case 'materialCost':
    case 'landingCost':
    case 'labourCost':
      return 'parseFloat';
    case 'itemCode':
    case 'assemblyCode':
      return 'uppercase';
    case 'itemDescription':
      return 'trim';
    default:
      return null;
  }
}

/**
 * Apply transform to a value
 */
export function applyTransform(
  value: any,
  transform?: ColumnMapping['transform']
): any {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  const stringValue = String(value).trim();

  switch (transform) {
    case 'parseInt':
      return parseInt(stringValue, 10) || 0;
    case 'parseFloat':
      return parseFloat(stringValue) || 0;
    case 'uppercase':
      return stringValue.toUpperCase();
    case 'trim':
      return stringValue.trim();
    default:
      return stringValue;
  }
}

/**
 * Transform data using mappings
 */
export function transformData(
  data: any[],
  mappings: ColumnMappings
): any[] {
  return data.map((row) => {
    const transformed: any = {};

    Object.entries(mappings).forEach(([targetField, mapping]) => {
      const sourceValue = row[mapping.source];
      transformed[targetField] = applyTransform(sourceValue, mapping.transform);
    });

    return transformed;
  });
}

/**
 * Validate that required fields are mapped
 */
export function validateMappings(mappings: ColumnMappings): {
  valid: boolean;
  missing: string[];
} {
  const required = TARGET_FIELDS.filter((f) => f.required).map((f) => f.key);
  const missing = required.filter((key) => !mappings[key] || !mappings[key].source);

  return {
    valid: missing.length === 0,
    missing: missing.map((key) => {
      const field = TARGET_FIELDS.find((f) => f.key === key);
      return field?.label || key;
    }),
  };
}

