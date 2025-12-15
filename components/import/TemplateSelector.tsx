'use client';

import { ImportTemplate } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Star } from 'lucide-react';

interface TemplateSelectorProps {
  templates: ImportTemplate[];
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string | null) => void;
  onNewTemplate: () => void;
  sourceType?: ImportTemplate['sourceType'];
}

export function TemplateSelector({
  templates,
  selectedTemplateId,
  onTemplateSelect,
  onNewTemplate,
  sourceType,
}: TemplateSelectorProps) {
  // Filter templates by source type if provided
  const filteredTemplates = sourceType
    ? templates.filter((t) => t.sourceType === sourceType)
    : templates;

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Template</CardTitle>
        <CardDescription>
          Select a saved template or create a new one
          {sourceType && (
            <Badge variant="outline" className="ml-2">
              {sourceType}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredTemplates.length > 0 ? (
          <Select
            value={selectedTemplateId || ''}
            onValueChange={(value) => onTemplateSelect(value || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">-- No template --</SelectItem>
              {filteredTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    {template.isDefault && <Star className="h-3 w-3 fill-yellow-500" />}
                    <span>{template.name}</span>
                    {template.description && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        - {template.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="p-4 text-center text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-md">
            No templates found. Create your first template to get started.
          </div>
        )}
        <Button variant="outline" onClick={onNewTemplate} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Create New Template
        </Button>
        {selectedTemplate && (
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-md">
            <p className="text-xs text-[var(--text-secondary)] mb-1">Selected template:</p>
            <p className="text-sm font-medium">{selectedTemplate.name}</p>
            {selectedTemplate.description && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {selectedTemplate.description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

