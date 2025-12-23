import { Timestamp } from 'firebase/firestore';
import { 
  Spec, 
  SpecCategory,
  SpecOption,
  SpecComparison, 
  SelectionChange, 
  ColourChange,
  ColourPartChange,
  BomImpact,
  GroupImpact,
  NewPartImpact,
  FieldChange,
  ParsedSpec 
} from '@/types/spec';
import { getSpecById, getSpecHistory } from './specService';
import { getSuggestedGroups } from './specMappingService';

// ============================================
// SPEC VERSION COMPARISON
// ============================================

/**
 * Compare two spec versions and calculate BOM impact
 */
export async function compareSpecs(
  projectId: string,
  specId: string, 
  fromVersion: number, 
  toVersion: number
): Promise<SpecComparison> {
  // Get the spec and its history
  const spec = await getSpecById(projectId, specId);
  if (!spec) {
    throw new Error('Spec not found');
  }
  
  const history = await getSpecHistory(projectId, specId);
  
  // Build snapshots of each version by replaying changes
  // For now, use current spec for comparison (simplified implementation)
  const fromSpec = spec; // Would be reconstructed from history
  const toSpec = spec;   // Current spec
  
  // Compare headers
  const headerChanges = compareHeaders(fromSpec, toSpec);
  
  // Compare timelines
  const timelineChanges = compareTimelines(fromSpec, toSpec);
  
  // Compare selections (most important!)
  const selectionChanges = await compareSelections(fromSpec, toSpec);
  
  // Compare colours
  const colourChanges = compareColours(fromSpec, toSpec);
  
  // Calculate BOM impact
  const bomImpact = await calculateBomImpact(spec.header.bikeType, selectionChanges, colourChanges);
  
  return {
    specId,
    fromVersion,
    toVersion,
    headerChanges,
    timelineChanges,
    selectionChanges,
    colourChanges,
    bomImpact,
    generatedAt: Timestamp.now(),
  };
}

/**
 * Compare an imported spec to the current spec
 */
export async function compareImportedSpec(
  projectId: string, 
  importedSpec: ParsedSpec
): Promise<SpecComparison | null> {
  const currentSpec = await getSpecById(projectId, ''); // Get current spec
  
  if (!currentSpec) {
    // No existing spec to compare against
    return null;
  }
  
  // Build a pseudo-spec from the parsed data for comparison
  const importedAsSpec: Spec = {
    id: 'imported',
    projectId,
    status: 'draft',
    version: 0,
    header: {
      projectName: importedSpec.header.projectName || '',
      bikeType: importedSpec.header.bikeType || '',
      ...importedSpec.header,
    },
    timeline: importedSpec.timeline,
    categories: importedSpec.categories,
    colourOptions: importedSpec.colourOptions,
    createdAt: Timestamp.now(),
    createdBy: '',
    updatedAt: Timestamp.now(),
    updatedBy: '',
  };
  
  // Compare headers
  const headerChanges = compareHeaders(currentSpec, importedAsSpec);
  
  // Compare timelines
  const timelineChanges = compareTimelines(currentSpec, importedAsSpec);
  
  // Compare selections
  const selectionChanges = await compareSelections(currentSpec, importedAsSpec);
  
  // Compare colours
  const colourChanges = compareColours(currentSpec, importedAsSpec);
  
  // Calculate BOM impact
  const bomImpact = await calculateBomImpact(
    importedAsSpec.header.bikeType || currentSpec.header.bikeType,
    selectionChanges,
    colourChanges
  );
  
  return {
    specId: currentSpec.id,
    fromVersion: currentSpec.version,
    toVersion: currentSpec.version + 1,
    headerChanges,
    timelineChanges,
    selectionChanges,
    colourChanges,
    bomImpact,
    generatedAt: Timestamp.now(),
  };
}

// ============================================
// COMPARISON HELPERS
// ============================================

/**
 * Compare spec headers
 */
function compareHeaders(fromSpec: Spec, toSpec: Spec): FieldChange[] {
  const changes: FieldChange[] = [];
  
  const headerFields = [
    'projectName', 'productFamily', 'modelYear', 'productCategory',
    'productClass', 'productLine', 'productType', 'bikeType',
    'componentColour', 'frameMaterial'
  ] as const;
  
  for (const field of headerFields) {
    const oldValue = fromSpec.header[field];
    const newValue = toSpec.header[field];
    
    if (oldValue !== newValue) {
      changes.push({
        field: `header.${field}`,
        oldValue,
        newValue,
      });
    }
  }
  
  return changes;
}

/**
 * Compare spec timelines
 */
function compareTimelines(fromSpec: Spec, toSpec: Spec): FieldChange[] {
  const changes: FieldChange[] = [];
  
  const timelineFields = [
    'dateAvailableInTp', 'orderingOpenWeek', 'orderingCloseWeek',
    'sprintRunWeek', 'productionWeek', 'totalQty', 'pbomCodeName',
    'countriesTabCompleted', 'businessCaseLink', 'numColoursAvailable'
  ] as const;
  
  for (const field of timelineFields) {
    const oldValue = fromSpec.timeline[field];
    const newValue = toSpec.timeline[field];
    
    if (oldValue !== newValue) {
      changes.push({
        field: `timeline.${field}`,
        oldValue,
        newValue,
      });
    }
  }
  
  return changes;
}

/**
 * Compare spec category selections
 */
async function compareSelections(
  fromSpec: Spec, 
  toSpec: Spec
): Promise<SelectionChange[]> {
  const changes: SelectionChange[] = [];
  
  // Build maps of selected options for each category
  const fromSelections = buildSelectionMap(fromSpec.categories);
  const toSelections = buildSelectionMap(toSpec.categories);
  
  // Get all categories from both specs
  const allCategories = new Set([
    ...Object.keys(fromSelections),
    ...Object.keys(toSelections),
  ]);
  
  for (const category of allCategories) {
    const fromOptions = fromSelections[category] || [];
    const toOptions = toSelections[category] || [];
    
    // Check for added options
    const addedOptions = toOptions.filter(opt => !fromOptions.includes(opt));
    
    // Check for removed options
    const removedOptions = fromOptions.filter(opt => !toOptions.includes(opt));
    
    if (addedOptions.length > 0 || removedOptions.length > 0) {
      // Determine change type
      let changeType: SelectionChange['changeType'];
      if (fromOptions.length === 0 && toOptions.length > 0) {
        changeType = 'added';
      } else if (fromOptions.length > 0 && toOptions.length === 0) {
        changeType = 'removed';
      } else {
        changeType = 'modified';
      }
      
      changes.push({
        category,
        changeType,
        oldOption: fromOptions.length === 1 ? fromOptions[0] : undefined,
        newOption: toOptions.length === 1 ? toOptions[0] : undefined,
        addedOptions: addedOptions.length > 0 ? addedOptions : undefined,
        removedOptions: removedOptions.length > 0 ? removedOptions : undefined,
        groupsToAdd: [], // Will be populated by BOM impact calculation
        groupsToRemove: [], // Will be populated by BOM impact calculation
      });
    }
  }
  
  return changes;
}

/**
 * Build a map of selected options per category
 */
function buildSelectionMap(categories: SpecCategory[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  
  for (const category of categories) {
    const selected = category.options
      .filter(opt => opt.selected)
      .map(opt => opt.optionName);
    
    if (selected.length > 0) {
      map[category.category] = selected;
    }
  }
  
  return map;
}

/**
 * Compare colour options
 */
function compareColours(fromSpec: Spec, toSpec: Spec): ColourChange[] {
  const changes: ColourChange[] = [];
  
  const maxOptions = Math.max(fromSpec.colourOptions.length, toSpec.colourOptions.length);
  
  for (let i = 0; i < maxOptions; i++) {
    const fromOption = fromSpec.colourOptions[i];
    const toOption = toSpec.colourOptions[i];
    
    if (!fromOption && toOption) {
      // New colour option added
      changes.push({
        optionNumber: i + 1,
        changeType: 'added',
        partChanges: toOption.parts.map(part => ({
          partName: part.partName,
          field: 'all',
          newValue: `${part.colour} / ${part.finish}`,
          isNowCustom: part.isCustom,
        })),
      });
    } else if (fromOption && !toOption) {
      // Colour option removed
      changes.push({
        optionNumber: i + 1,
        changeType: 'removed',
        partChanges: fromOption.parts.map(part => ({
          partName: part.partName,
          field: 'all',
          oldValue: `${part.colour} / ${part.finish}`,
          isNowCustom: false,
        })),
      });
    } else if (fromOption && toOption) {
      // Check for changes in parts
      const partChanges = compareColourParts(fromOption.parts, toOption.parts);
      
      if (partChanges.length > 0) {
        changes.push({
          optionNumber: i + 1,
          changeType: 'modified',
          partChanges,
        });
      }
    }
  }
  
  return changes;
}

/**
 * Compare colour parts between two colour options
 */
function compareColourParts(
  fromParts: Spec['colourOptions'][0]['parts'],
  toParts: Spec['colourOptions'][0]['parts']
): ColourPartChange[] {
  const changes: ColourPartChange[] = [];
  
  // Build maps by part name
  const fromMap = new Map(fromParts.map(p => [p.partName, p]));
  const toMap = new Map(toParts.map(p => [p.partName, p]));
  
  // Check all parts
  const allPartNames = new Set([...fromMap.keys(), ...toMap.keys()]);
  
  for (const partName of allPartNames) {
    const fromPart = fromMap.get(partName);
    const toPart = toMap.get(partName);
    
    if (fromPart && toPart) {
      // Compare fields
      if (fromPart.colour !== toPart.colour) {
        changes.push({
          partName,
          field: 'colour',
          oldValue: fromPart.colour,
          newValue: toPart.colour,
          isNowCustom: toPart.isCustom,
        });
      }
      if (fromPart.finish !== toPart.finish) {
        changes.push({
          partName,
          field: 'finish',
          oldValue: fromPart.finish,
          newValue: toPart.finish,
          isNowCustom: toPart.isCustom,
        });
      }
      if (fromPart.decal !== toPart.decal) {
        changes.push({
          partName,
          field: 'decal',
          oldValue: fromPart.decal,
          newValue: toPart.decal,
          isNowCustom: toPart.isCustom,
        });
      }
    }
  }
  
  return changes;
}

// ============================================
// BOM IMPACT CALCULATION
// ============================================

/**
 * Calculate BOM impact from spec changes
 */
async function calculateBomImpact(
  bikeType: string,
  selectionChanges: SelectionChange[],
  colourChanges: ColourChange[]
): Promise<BomImpact> {
  const addGroups: GroupImpact[] = [];
  const removeGroups: GroupImpact[] = [];
  const newPartsRequired: NewPartImpact[] = [];
  const unmappedOptions: { category: string; option: string }[] = [];
  
  // Process selection changes
  for (const change of selectionChanges) {
    // Get groups for removed options
    if (change.removedOptions) {
      for (const option of change.removedOptions) {
        const mapping = await getSuggestedGroups(bikeType, change.category, option);
        
        if (mapping && mapping.groupCodes.length > 0) {
          for (const groupCode of mapping.groupCodes) {
            removeGroups.push({
              groupCode,
              groupName: groupCode, // Would need to look up actual name
              partCount: 0, // Would need to count parts in group
              reason: `Removed ${change.category}: ${option}`,
              confidence: getConfidenceLevel(mapping.confidence),
            });
          }
          
          // Update the change with group info
          change.groupsToRemove = mapping.groupCodes;
        } else {
          unmappedOptions.push({ category: change.category, option });
        }
      }
    }
    
    // Get groups for added options
    if (change.addedOptions) {
      for (const option of change.addedOptions) {
        const mapping = await getSuggestedGroups(bikeType, change.category, option);
        
        if (mapping && mapping.groupCodes.length > 0) {
          for (const groupCode of mapping.groupCodes) {
            addGroups.push({
              groupCode,
              groupName: groupCode, // Would need to look up actual name
              partCount: 0, // Would need to count parts in group
              reason: `Added ${change.category}: ${option}`,
              confidence: getConfidenceLevel(mapping.confidence),
            });
          }
          
          // Update the change with group info
          change.groupsToAdd = mapping.groupCodes;
        } else {
          unmappedOptions.push({ category: change.category, option });
        }
      }
    }
  }
  
  // Process colour changes for custom parts
  for (const colourChange of colourChanges) {
    for (const partChange of colourChange.partChanges) {
      if (partChange.isNowCustom) {
        newPartsRequired.push({
          reason: `Custom ${partChange.field} for ${partChange.partName}`,
          category: 'COLOUR',
          suggestedDescription: `${partChange.partName} - ${partChange.newValue}`,
        });
      }
    }
  }
  
  // Calculate summary counts
  const partsAffected = addGroups.reduce((sum, g) => sum + g.partCount, 0) +
                        removeGroups.reduce((sum, g) => sum + g.partCount, 0);
  
  return {
    groupsToAdd: addGroups.length,
    groupsToRemove: removeGroups.length,
    partsAffected,
    newPartsNeeded: newPartsRequired.length,
    addGroups,
    removeGroups,
    newPartsRequired,
    hasUnmappedOptions: unmappedOptions.length > 0,
    unmappedOptions,
  };
}

/**
 * Convert confidence score to level
 */
function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' | 'unknown' {
  if (score >= 85) return 'high';
  if (score >= 60) return 'medium';
  if (score > 0) return 'low';
  return 'unknown';
}

// ============================================
// APPLY SPEC CHANGES TO BOM
// ============================================

/**
 * Apply changes from a spec comparison to the BOM
 */
export async function applySpecChanges(
  projectId: string, 
  comparison: SpecComparison, 
  options: {
    addGroups: boolean;
    removeGroups: boolean;
    createNewParts: boolean;
  }
): Promise<{
  success: boolean;
  groupsAdded: string[];
  groupsRemoved: string[];
  newPartsCreated: number;
  errors: string[];
}> {
  const result = {
    success: true,
    groupsAdded: [] as string[],
    groupsRemoved: [] as string[],
    newPartsCreated: 0,
    errors: [] as string[],
  };
  
  try {
    // Add groups
    if (options.addGroups) {
      for (const group of comparison.bomImpact.addGroups) {
        result.groupsAdded.push(group.groupCode);
        // Actual transfer would happen via transferService
      }
    }
    
    // Remove groups
    if (options.removeGroups) {
      for (const group of comparison.bomImpact.removeGroups) {
        result.groupsRemoved.push(group.groupCode);
        // Actual removal would happen via bomGroupService
      }
    }
    
    // Create new parts
    if (options.createNewParts) {
      for (const newPart of comparison.bomImpact.newPartsRequired) {
        result.newPartsCreated++;
        // Actual creation would happen via newPartService
      }
    }
    
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }
  
  return result;
}

// ============================================
// COMPARISON REPORT GENERATION
// ============================================

/**
 * Generate a downloadable comparison report
 */
export async function generateComparisonReport(
  comparison: SpecComparison
): Promise<Blob> {
  // Generate a markdown or HTML report
  const lines: string[] = [
    '# Spec Comparison Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `From Version: ${comparison.fromVersion} → To Version: ${comparison.toVersion}`,
    '',
    '## Header Changes',
    '',
  ];
  
  if (comparison.headerChanges.length === 0) {
    lines.push('No header changes.');
  } else {
    for (const change of comparison.headerChanges) {
      lines.push(`- **${change.field}**: ${change.oldValue || '(empty)'} → ${change.newValue || '(empty)'}`);
    }
  }
  
  lines.push('', '## Selection Changes', '');
  
  if (comparison.selectionChanges.length === 0) {
    lines.push('No selection changes.');
  } else {
    for (const change of comparison.selectionChanges) {
      lines.push(`### ${change.category}`);
      lines.push(`- Change Type: ${change.changeType}`);
      
      if (change.removedOptions?.length) {
        lines.push(`- Removed: ${change.removedOptions.join(', ')}`);
      }
      if (change.addedOptions?.length) {
        lines.push(`- Added: ${change.addedOptions.join(', ')}`);
      }
      if (change.groupsToRemove.length) {
        lines.push(`- Groups to Remove: ${change.groupsToRemove.join(', ')}`);
      }
      if (change.groupsToAdd.length) {
        lines.push(`- Groups to Add: ${change.groupsToAdd.join(', ')}`);
      }
      lines.push('');
    }
  }
  
  lines.push('## BOM Impact Summary', '');
  lines.push(`- Groups to Add: ${comparison.bomImpact.groupsToAdd}`);
  lines.push(`- Groups to Remove: ${comparison.bomImpact.groupsToRemove}`);
  lines.push(`- Parts Affected: ${comparison.bomImpact.partsAffected}`);
  lines.push(`- New Parts Needed: ${comparison.bomImpact.newPartsNeeded}`);
  
  if (comparison.bomImpact.hasUnmappedOptions) {
    lines.push('', '### ⚠️ Unmapped Options');
    for (const unmapped of comparison.bomImpact.unmappedOptions) {
      lines.push(`- ${unmapped.category}: ${unmapped.option}`);
    }
  }
  
  const content = lines.join('\n');
  return new Blob([content], { type: 'text/markdown' });
}

