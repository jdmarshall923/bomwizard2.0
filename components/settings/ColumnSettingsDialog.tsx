'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Columns3,
  Building2,
  FolderOpen,
  User,
  Save,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ColumnGroupId,
  ColumnGroup,
  ColumnDefinition,
  COLUMN_GROUPS,
  COLUMN_DEFINITIONS,
  ColumnVisibilitySettings,
  getDefaultVisibility,
} from '@/types/settings';

/**
 * Phase 14: Column Settings Dialog
 * 
 * Admin dialog for configuring column visibility defaults
 * at organization, project, or user level.
 */

interface ColumnSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Current settings
  currentVisibility: ColumnVisibilitySettings;
  
  // Context
  level: 'organization' | 'project' | 'user';
  entityName?: string;  // e.g., "Acme Corp" or "Mountain Bike 2026"
  
  // Callbacks
  onSave: (visibility: ColumnVisibilitySettings) => Promise<void>;
}

export function ColumnSettingsDialog({
  open,
  onOpenChange,
  currentVisibility,
  level,
  entityName,
  onSave,
}: ColumnSettingsDialogProps) {
  const [visibility, setVisibility] = useState<ColumnVisibilitySettings>(currentVisibility);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ColumnGroupId>('core');
  
  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setVisibility(currentVisibility);
    }
  }, [open, currentVisibility]);
  
  // Toggle a group
  const toggleGroup = (groupId: ColumnGroupId) => {
    const group = COLUMN_GROUPS.find(g => g.id === groupId);
    if (group?.alwaysVisible) return;
    
    const isVisible = visibility.visibleGroups.includes(groupId);
    setVisibility({
      ...visibility,
      visibleGroups: isVisible
        ? visibility.visibleGroups.filter(g => g !== groupId)
        : [...visibility.visibleGroups, groupId],
    });
  };
  
  // Toggle a specific column
  const toggleColumn = (columnId: string) => {
    const hiddenColumns = visibility.hiddenColumns || [];
    const isHidden = hiddenColumns.includes(columnId);
    
    setVisibility({
      ...visibility,
      hiddenColumns: isHidden
        ? hiddenColumns.filter(c => c !== columnId)
        : [...hiddenColumns, columnId],
    });
  };
  
  // Reset to defaults
  const handleReset = () => {
    setVisibility(getDefaultVisibility());
  };
  
  // Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(visibility);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save column settings:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Get level icon
  const LevelIcon = level === 'organization' ? Building2 
    : level === 'project' ? FolderOpen 
    : User;
  
  // Get level description
  const levelDescription = {
    organization: 'These settings apply to all projects in this organization.',
    project: 'These settings apply to this project only.',
    user: 'These settings are your personal preferences.',
  }[level];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="h-5 w-5" />
            Column Settings
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <LevelIcon className="h-4 w-4" />
            {entityName && <span className="font-medium">{entityName}</span>}
            <span className="text-[var(--text-tertiary)]">•</span>
            <span>{levelDescription}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {/* Column Groups Toggle */}
          <div className="mb-4">
            <Label className="text-sm font-medium mb-2 block">
              Default Visible Groups
            </Label>
            <div className="flex flex-wrap gap-2">
              {COLUMN_GROUPS.map((group) => {
                const isVisible = visibility.visibleGroups.includes(group.id);
                const isDisabled = group.alwaysVisible;
                
                return (
                  <button
                    key={group.id}
                    onClick={() => toggleGroup(group.id)}
                    disabled={isDisabled}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      isVisible
                        ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
                      !isDisabled && 'hover:opacity-80',
                      isDisabled && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {group.displayName}
                    {isDisabled && ' (required)'}
                  </button>
                );
              })}
            </div>
          </div>
          
          <Separator className="my-4" />
          
          {/* Column Details by Group */}
          <div className="mb-2">
            <Label className="text-sm font-medium block">
              Column Details
            </Label>
            <p className="text-xs text-[var(--text-tertiary)]">
              Toggle individual columns within visible groups
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ColumnGroupId)}>
            <TabsList className="mb-4">
              {COLUMN_GROUPS.map((group) => (
                <TabsTrigger 
                  key={group.id} 
                  value={group.id}
                  className="text-xs"
                >
                  {group.displayName}
                  <Badge 
                    variant="secondary" 
                    className="ml-1 text-[10px] px-1"
                  >
                    {group.columns.length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <ScrollArea className="h-48">
              {COLUMN_GROUPS.map((group) => (
                <TabsContent key={group.id} value={group.id} className="mt-0">
                  <div className="space-y-2">
                    {group.columns.map((columnId) => {
                      const column = COLUMN_DEFINITIONS[columnId];
                      if (!column) return null;
                      
                      const isGroupVisible = visibility.visibleGroups.includes(group.id);
                      const isHidden = visibility.hiddenColumns?.includes(columnId);
                      const isEnabled = isGroupVisible && !isHidden;
                      
                      return (
                        <div
                          key={columnId}
                          className={cn(
                            'flex items-center justify-between p-2 rounded border',
                            isEnabled
                              ? 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'
                              : 'border-transparent bg-[var(--bg-tertiary)] opacity-60'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={columnId}
                              checked={isEnabled}
                              onCheckedChange={() => {
                                if (!isGroupVisible) {
                                  // Enable the group first
                                  toggleGroup(group.id);
                                } else {
                                  toggleColumn(columnId);
                                }
                              }}
                            />
                            <div>
                              <Label 
                                htmlFor={columnId}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {column.displayName}
                              </Label>
                              {column.ccmHeader && (
                                <p className="text-xs text-[var(--text-tertiary)]">
                                  CCM: {column.ccmHeader}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {column.dataType}
                            </Badge>
                            {column.editable && (
                              <Badge className="text-xs bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/30">
                                Editable
                              </Badge>
                            )}
                            {column.calculated && (
                              <Badge className="text-xs bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)]">
                                Calculated
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        </div>
        
        <DialogFooter className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
