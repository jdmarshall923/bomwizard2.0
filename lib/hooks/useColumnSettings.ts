'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  ColumnVisibilitySettings,
  ColumnGroupId,
  ViewPreset,
  COLUMN_GROUPS,
  SYSTEM_PRESETS,
  getDefaultVisibility,
  getVisibleColumns,
  ColumnDefinition,
} from '@/types/settings';
import {
  getEffectiveColumnVisibility,
  saveUserProjectVisibility,
  getUserColumnPreferences,
  getAvailablePresets,
  toggleColumnGroup,
  applyPreset,
  matchesPreset,
  addUserSavedView,
  deleteUserSavedView,
} from '@/lib/services/settingsService';

/**
 * Phase 14: Hook for managing column visibility settings
 * 
 * Provides reactive column visibility state with:
 * - Hierarchical settings (org → project → user)
 * - Toggle chips for column groups
 * - Preset management
 * - Persistence to Firestore
 */

interface UseColumnSettingsOptions {
  projectId: string | null;
  orgId?: string;
  autoSave?: boolean;  // Auto-save changes to user preferences
}

interface UseColumnSettingsReturn {
  // Current visibility state
  visibility: ColumnVisibilitySettings;
  visibleColumns: ColumnDefinition[];
  
  // Group toggles
  isGroupVisible: (groupId: ColumnGroupId) => boolean;
  toggleGroup: (groupId: ColumnGroupId) => void;
  
  // Presets
  presets: ViewPreset[];
  activePreset: ViewPreset | null;
  applyPreset: (preset: ViewPreset) => void;
  saveAsPreset: (name: string, description?: string) => Promise<string>;
  deletePreset: (presetId: string) => Promise<void>;
  
  // Column groups info
  columnGroups: typeof COLUMN_GROUPS;
  
  // Loading/saving state
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  
  // Manual save (if autoSave is false)
  save: () => Promise<void>;
  
  // Reset to defaults
  reset: () => void;
}

export function useColumnSettings({
  projectId,
  orgId,
  autoSave = true,
}: UseColumnSettingsOptions): UseColumnSettingsReturn {
  const { user } = useAuth();
  const userId = user?.uid;
  
  // State
  const [visibility, setVisibility] = useState<ColumnVisibilitySettings>(getDefaultVisibility());
  const [presets, setPresets] = useState<ViewPreset[]>(SYSTEM_PRESETS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      if (!projectId || !userId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Load effective visibility
        const effectiveVisibility = await getEffectiveColumnVisibility(
          projectId,
          userId,
          orgId
        );
        setVisibility(effectiveVisibility);
        
        // Load available presets
        const availablePresets = await getAvailablePresets(userId, orgId);
        setPresets(availablePresets);
      } catch (err) {
        console.error('Failed to load column settings:', err);
        setError(err instanceof Error ? err : new Error('Failed to load settings'));
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSettings();
  }, [projectId, userId, orgId]);
  
  // Visible columns based on current visibility
  const visibleColumns = useMemo(() => {
    return getVisibleColumns(visibility);
  }, [visibility]);
  
  // Find active preset (if current settings match one)
  const activePreset = useMemo(() => {
    return presets.find(p => matchesPreset(visibility, p)) || null;
  }, [visibility, presets]);
  
  // Check if a group is visible
  const isGroupVisible = useCallback((groupId: ColumnGroupId): boolean => {
    return visibility.visibleGroups.includes(groupId);
  }, [visibility.visibleGroups]);
  
  // Toggle a group
  const handleToggleGroup = useCallback((groupId: ColumnGroupId) => {
    setVisibility(prev => {
      const newVisibility = toggleColumnGroup(prev, groupId);
      setHasUnsavedChanges(true);
      return newVisibility;
    });
  }, []);
  
  // Auto-save when visibility changes
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges || !projectId || !userId) {
      return;
    }
    
    // Debounce saves
    const timeoutId = setTimeout(async () => {
      try {
        setIsSaving(true);
        await saveUserProjectVisibility(userId, projectId, visibility);
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('Failed to save column settings:', err);
      } finally {
        setIsSaving(false);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [autoSave, hasUnsavedChanges, projectId, userId, visibility]);
  
  // Apply a preset
  const handleApplyPreset = useCallback((preset: ViewPreset) => {
    setVisibility(applyPreset(preset));
    setHasUnsavedChanges(true);
  }, []);
  
  // Save current settings as a new preset
  const handleSaveAsPreset = useCallback(async (
    name: string,
    description?: string
  ): Promise<string> => {
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const presetId = await addUserSavedView(userId, {
      name,
      description,
      visibility,
    });
    
    // Refresh presets
    const availablePresets = await getAvailablePresets(userId, orgId);
    setPresets(availablePresets);
    
    return presetId;
  }, [userId, orgId, visibility]);
  
  // Delete a preset
  const handleDeletePreset = useCallback(async (presetId: string) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Can't delete system presets
    const preset = presets.find(p => p.id === presetId);
    if (preset?.isSystem) {
      throw new Error('Cannot delete system presets');
    }
    
    await deleteUserSavedView(userId, presetId);
    
    // Refresh presets
    const availablePresets = await getAvailablePresets(userId, orgId);
    setPresets(availablePresets);
  }, [userId, orgId, presets]);
  
  // Manual save
  const handleSave = useCallback(async () => {
    if (!projectId || !userId) {
      return;
    }
    
    setIsSaving(true);
    try {
      await saveUserProjectVisibility(userId, projectId, visibility);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to save column settings:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, userId, visibility]);
  
  // Reset to defaults
  const handleReset = useCallback(() => {
    setVisibility(getDefaultVisibility());
    setHasUnsavedChanges(true);
  }, []);
  
  return {
    visibility,
    visibleColumns,
    isGroupVisible,
    toggleGroup: handleToggleGroup,
    presets,
    activePreset,
    applyPreset: handleApplyPreset,
    saveAsPreset: handleSaveAsPreset,
    deletePreset: handleDeletePreset,
    columnGroups: COLUMN_GROUPS,
    isLoading,
    isSaving,
    error,
    save: handleSave,
    reset: handleReset,
  };
}
