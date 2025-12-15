'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { ColumnMappings, TARGET_FIELDS, autoDetectMappings, validateMappings } from '@/lib/import/columnMapper';

interface ColumnMapperProps {
  sourceColumns: string[];
  mappings: ColumnMappings;
  onMappingChange: (mappings: ColumnMappings) => void;
}

export function ColumnMapper({ sourceColumns, mappings, onMappingChange }: ColumnMapperProps) {
  // Auto-detect on mount if no mappings exist
  useEffect(() => {
    if (Object.keys(mappings).length === 0 && sourceColumns.length > 0) {
      const autoMappings = autoDetectMappings(sourceColumns);
      onMappingChange(autoMappings);
    }
  }, [sourceColumns, mappings, onMappingChange]);

  const handleFieldMapping = (targetField: string, sourceColumn: string) => {
    // Handle the "none" selection - remove the mapping
    if (sourceColumn === '__none__') {
      const newMappings = { ...mappings };
      delete newMappings[targetField];
      onMappingChange(newMappings);
      return;
    }
    
    const currentMapping = mappings[targetField];
    onMappingChange({
      ...mappings,
      [targetField]: {
        source: sourceColumn,
        transform: currentMapping?.transform || getDefaultTransform(targetField),
      },
    });
  };

  const handleTransformChange = (targetField: string, transform: string) => {
    onMappingChange({
      ...mappings,
      [targetField]: {
        ...mappings[targetField],
        transform: transform === 'none' ? null : (transform as any),
      },
    });
  };

  const handleAutoDetect = () => {
    const autoMappings = autoDetectMappings(sourceColumns, mappings);
    onMappingChange(autoMappings);
  };

  const getDefaultTransform = (field: string): ColumnMappings[string]['transform'] => {
    if (['quantity', 'level', 'materialCost', 'landingCost', 'labourCost'].includes(field)) {
      return 'parseFloat';
    }
    if (['itemCode', 'assemblyCode'].includes(field)) {
      return 'uppercase';
    }
    return 'trim';
  };

  const validation = validateMappings(mappings);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Column Mapping</CardTitle>
            <CardDescription>Map CSV columns to BOM fields</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoDetect}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Auto-detect
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!validation.valid && (
          <div className="p-3 text-sm text-[var(--accent-orange)] bg-[var(--accent-orange)]/10 rounded-md border border-[var(--accent-orange)]/20">
            <p className="font-medium mb-1">Missing required fields:</p>
            <ul className="list-disc list-inside">
              {validation.missing.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-3">
          {TARGET_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-4">
              <label className="w-40 text-sm font-medium">
                {field.label}
                {field.required && <span className="text-[var(--accent-red)] ml-1">*</span>}
              </label>
              <Select
                value={mappings[field.key]?.source || ''}
                onValueChange={(value) => handleFieldMapping(field.key, value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {sourceColumns
                    .filter((col) => col && col.trim() !== '')
                    .map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {mappings[field.key]?.source && (
                <Select
                  value={mappings[field.key]?.transform || 'none'}
                  onValueChange={(value) => handleTransformChange(field.key, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="trim">Trim</SelectItem>
                    <SelectItem value="uppercase">Uppercase</SelectItem>
                    <SelectItem value="parseInt">Parse Int</SelectItem>
                    <SelectItem value="parseFloat">Parse Float</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

