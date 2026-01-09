'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Check, 
  ChevronDown, 
  Columns3, 
  Save, 
  Trash2,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnGroupId, ViewPreset, COLUMN_GROUPS } from '@/types/settings';

/**
 * Phase 14: Column Group Toggle Component
 * 
 * Displays toggle chips for column group visibility
 * with preset selector and save functionality.
 */

interface ColumnGroupToggleProps {
  // Current visibility state
  visibleGroups: ColumnGroupId[];
  onToggleGroup: (groupId: ColumnGroupId) => void;
  
  // Presets
  presets?: ViewPreset[];
  activePreset?: ViewPreset | null;
  onApplyPreset?: (preset: ViewPreset) => void;
  onSaveAsPreset?: (name: string, description?: string) => Promise<string>;
  onDeletePreset?: (presetId: string) => Promise<void>;
  
  // Reset
  onReset?: () => void;
  
  // State
  isLoading?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
}

export function ColumnGroupToggle({
  visibleGroups,
  onToggleGroup,
  presets = [],
  activePreset,
  onApplyPreset,
  onSaveAsPreset,
  onDeletePreset,
  onReset,
  isLoading = false,
  isSaving = false,
  disabled = false,
}: ColumnGroupToggleProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  
  // Handle save preset
  const handleSavePreset = async () => {
    if (!newPresetName.trim() || !onSaveAsPreset) return;
    
    setIsSavingPreset(true);
    try {
      await onSaveAsPreset(newPresetName.trim(), newPresetDescription.trim() || undefined);
      setSaveDialogOpen(false);
      setNewPresetName('');
      setNewPresetDescription('');
    } catch (error) {
      console.error('Failed to save preset:', error);
    } finally {
      setIsSavingPreset(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Column groups toggle chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {COLUMN_GROUPS.map((group) => {
          const isVisible = visibleGroups.includes(group.id);
          const isDisabled = disabled || group.alwaysVisible;
          
          return (
            <button
              key={group.id}
              onClick={() => !isDisabled && onToggleGroup(group.id)}
              disabled={isDisabled}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                'border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--accent-blue)]',
                isVisible
                  ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]',
                isDisabled && 'opacity-60 cursor-not-allowed',
                group.alwaysVisible && 'cursor-default'
              )}
              title={group.description}
            >
              {isVisible && <Check className="h-3.5 w-3.5" />}
              {group.displayName}
            </button>
          );
        })}
      </div>
      
      {/* Separator */}
      <div className="h-6 w-px bg-[var(--border-subtle)] mx-1" />
      
      {/* Presets dropdown */}
      {presets.length > 0 && onApplyPreset && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={disabled}
            >
              <Columns3 className="h-4 w-4" />
              {activePreset ? activePreset.name : 'Views'}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Column Presets</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* System presets */}
            {presets.filter(p => p.isSystem).map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                className="flex items-center justify-between"
              >
                <div>
                  <span>{preset.name}</span>
                  {preset.description && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {preset.description}
                    </p>
                  )}
                </div>
                {activePreset?.id === preset.id && (
                  <Check className="h-4 w-4 text-[var(--accent-blue)]" />
                )}
              </DropdownMenuItem>
            ))}
            
            {/* User saved views */}
            {presets.filter(p => !p.isSystem).length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-[var(--text-tertiary)]">
                  Saved Views
                </DropdownMenuLabel>
                {presets.filter(p => !p.isSystem).map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    className="flex items-center justify-between group"
                  >
                    <button
                      onClick={() => onApplyPreset(preset)}
                      className="flex-1 text-left"
                    >
                      {preset.name}
                    </button>
                    <div className="flex items-center gap-1">
                      {activePreset?.id === preset.id && (
                        <Check className="h-4 w-4 text-[var(--accent-blue)]" />
                      )}
                      {onDeletePreset && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePreset(preset.id);
                          }}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:text-[var(--accent-red)] transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            
            {/* Save current as preset */}
            {onSaveAsPreset && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save current view...
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      {/* Reset button */}
      {onReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="gap-1.5"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      )}
      
      {/* Saving indicator */}
      {isSaving && (
        <Badge variant="secondary" className="gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </Badge>
      )}
      
      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Column View</DialogTitle>
            <DialogDescription>
              Save your current column configuration as a preset for quick access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Name</Label>
              <Input
                id="preset-name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="My Custom View"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preset-description">Description (optional)</Label>
              <Textarea
                id="preset-description"
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                placeholder="Description of what this view is for..."
                rows={2}
              />
            </div>
            
            {/* Preview of visible groups */}
            <div className="space-y-2">
              <Label className="text-sm text-[var(--text-tertiary)]">
                Visible column groups:
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {visibleGroups.map((groupId) => {
                  const group = COLUMN_GROUPS.find(g => g.id === groupId);
                  return group ? (
                    <Badge key={groupId} variant="secondary">
                      {group.displayName}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={isSavingPreset}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreset}
              disabled={!newPresetName.trim() || isSavingPreset}
            >
              {isSavingPreset ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save View
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
