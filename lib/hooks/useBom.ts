'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BomItem, Assembly, TemplateBomItem } from '@/types';
import { useMemo, useCallback, useState } from 'react';

export interface BomFilters {
  searchTerm: string;
  showNewParts: boolean;
  showPlaceholders: boolean;
  showCostChanges: boolean;
  showAddedItems: boolean;
  showNewPartTracking: boolean; // Phase 3.7: Filter for isNewPart items
  assemblyCode: string | null;
  costSource: string | null;
}

export interface BomStats {
  totalItems: number;
  totalAssemblies: number;
  totalCost: number;
  materialCost: number;
  landingCost: number;
  labourCost: number;
  newPartsCount: number;
  placeholdersCount: number;
  addedItemsCount: number;
  costChangesCount: number;
  newPartTrackingCount: number; // Phase 3.7: Count of items with isNewPart flag
}

export interface TemplateBomStats {
  totalItems: number;
  totalAssemblies: number;
  totalCost: number;
  materialCost: number;
  landingCost: number;
  labourCost: number;
}

export function useBom(projectId: string | null, versionId?: string | null) {
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Partial<BomItem>>>({});
  
  const bomCollectionPath = projectId 
    ? (versionId
        ? `projects/${projectId}/versions/${versionId}/bomItems`
        : `projects/${projectId}/bomItems`)
    : null;

  const assembliesCollectionPath = projectId ? `projects/${projectId}/assemblies` : null;

  // Fetch BOM items - only create query if we have a valid path
  const [bomSnapshot, bomLoading, bomError] = useCollection(
    bomCollectionPath
      ? query(
          collection(db, bomCollectionPath),
          orderBy('assemblyCode', 'asc'),
          orderBy('level', 'asc'),
          orderBy('sequence', 'asc')
        )
      : null
  );

  // Fetch assemblies - only create query if we have a valid path
  const [assembliesSnapshot, assembliesLoading, assembliesError] = useCollection(
    assembliesCollectionPath
      ? query(
          collection(db, assembliesCollectionPath),
          orderBy('code', 'asc')
        )
      : null
  );

  // Parse BOM items with optimistic updates applied
  const bomItems: BomItem[] = useMemo(() => {
    if (!bomSnapshot) return [];
    
    const items = bomSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BomItem[];

    // Apply optimistic updates
    return items.map(item => ({
      ...item,
      ...optimisticUpdates[item.id],
    }));
  }, [bomSnapshot, optimisticUpdates]);

  // Parse assemblies
  const assemblies: Assembly[] = useMemo(() => {
    if (!assembliesSnapshot) return [];
    return assembliesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Assembly[];
  }, [assembliesSnapshot]);

  // Get unique assembly codes from BOM items
  const getAssemblyCodes = useCallback((): string[] => {
    const codes = new Set(bomItems.map(item => item.assemblyCode));
    return Array.from(codes).sort();
  }, [bomItems]);

  // Calculate stats
  const stats: BomStats | null = useMemo(() => {
    if (!bomItems.length) return null;

    const assemblyCodes = new Set(bomItems.map(item => item.assemblyCode));
    
    return {
      totalItems: bomItems.length,
      totalAssemblies: assemblyCodes.size,
      totalCost: bomItems.reduce((sum, item) => sum + (item.extendedCost || 0), 0),
      materialCost: bomItems.reduce((sum, item) => sum + ((item.materialCost || 0) * (item.quantity || 0)), 0),
      landingCost: bomItems.reduce((sum, item) => sum + ((item.landingCost || 0) * (item.quantity || 0)), 0),
      labourCost: bomItems.reduce((sum, item) => sum + ((item.labourCost || 0) * (item.quantity || 0)), 0),
      newPartsCount: bomItems.filter(item => item.partCategory === 'new_part').length,
      placeholdersCount: bomItems.filter(item => {
        // Complete B code = B + exactly 6 numbers (e.g., B123456)
        // Placeholder = starts with B but doesn't have complete 6-digit code
        const startsWithB = item.itemCode?.startsWith('B');
        const isCompleteBCode = /^B\d{6}$/.test(item.itemCode || '');
        return startsWithB && !isCompleteBCode;
      }).length,
      addedItemsCount: bomItems.filter(item => item.isAddedItem).length,
      costChangesCount: bomItems.filter(item => item.hasCostChange).length,
      newPartTrackingCount: bomItems.filter(item => item.isNewPart).length,
    };
  }, [bomItems]);

  // Filter items based on filters
  const filterItems = useCallback((filters: BomFilters): BomItem[] => {
    return bomItems.filter(item => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          item.itemCode?.toLowerCase().includes(searchLower) ||
          item.itemDescription?.toLowerCase().includes(searchLower) ||
          item.assemblyCode?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // New parts filter
      if (filters.showNewParts && item.partCategory !== 'new_part') {
        return false;
      }

      // Placeholders filter (B-codes without complete 6-digit code)
      // Complete B code = B + exactly 6 numbers (e.g., B123456)
      // Placeholder = starts with B but doesn't have complete 6-digit code
      if (filters.showPlaceholders) {
        const startsWithB = item.itemCode?.startsWith('B');
        const isCompleteBCode = /^B\d{6}$/.test(item.itemCode || '');
        const isPlaceholder = startsWithB && !isCompleteBCode;
        if (!isPlaceholder) return false;
      }

      // Added items filter (items added after template)
      if (filters.showAddedItems && !item.isAddedItem) {
        return false;
      }

      // Cost changes filter
      if (filters.showCostChanges && !item.hasCostChange) {
        return false;
      }

      // New Part Tracking filter (Phase 3.7)
      if (filters.showNewPartTracking && !item.isNewPart) {
        return false;
      }

      // Assembly filter
      if (filters.assemblyCode && item.assemblyCode !== filters.assemblyCode) {
        return false;
      }

      // Cost source filter
      if (filters.costSource && item.costSource !== filters.costSource) {
        return false;
      }

      return true;
    });
  }, [bomItems]);

  // Update BOM item with optimistic update
  const updateBomItem = useCallback(async (
    itemId: string, 
    updates: Partial<BomItem>
  ): Promise<void> => {
    if (!bomCollectionPath) {
      throw new Error('No project selected');
    }

    // Apply optimistic update immediately
    setOptimisticUpdates(prev => ({
      ...prev,
      [itemId]: updates,
    }));

    try {
      const docRef = doc(db, bomCollectionPath, itemId);
      
      // Calculate new extended cost if costs are being updated
      const currentItem = bomItems.find(item => item.id === itemId);
      if (currentItem) {
        const quantity = updates.quantity ?? currentItem.quantity;
        const materialCost = updates.materialCost ?? currentItem.materialCost;
        const landingCost = updates.landingCost ?? currentItem.landingCost;
        const labourCost = updates.labourCost ?? currentItem.labourCost;
        
        const extendedCost = quantity * (materialCost + landingCost + labourCost);
        
        await updateDoc(docRef, {
          ...updates,
          extendedCost,
          updatedAt: Timestamp.now(),
        });
      }

      // Clear optimistic update after successful save
      setOptimisticUpdates(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      throw error;
    }
  }, [bomCollectionPath, bomItems]);

  // Delete BOM item
  const deleteBomItem = useCallback(async (itemId: string): Promise<void> => {
    if (!bomCollectionPath) {
      throw new Error('No project selected');
    }

    const docRef = doc(db, bomCollectionPath, itemId);
    await deleteDoc(docRef);
  }, [bomCollectionPath]);

  return {
    bomItems,
    assemblies,
    loading: bomLoading || assembliesLoading,
    error: bomError || assembliesError,
    updateBomItem,
    deleteBomItem,
    stats,
    filterItems,
    getAssemblyCodes,
  };
}

// Hook to get a single BOM item
export function useBomItem(projectId: string | null, itemId: string | null) {
  const { bomItems, loading, error } = useBom(projectId);
  
  const item = useMemo(() => {
    if (!itemId) return null;
    return bomItems.find(i => i.id === itemId) || null;
  }, [bomItems, itemId]);

  return { item, loading, error };
}

// Hook to get items grouped by assembly
export function useBomGroupedByAssembly(projectId: string | null, versionId?: string | null) {
  const { bomItems, loading, error, assemblies } = useBom(projectId, versionId);
  
  const grouped = useMemo(() => {
    const groups: Record<string, { assembly: Assembly | null; items: BomItem[] }> = {};
    
    bomItems.forEach(item => {
      if (!groups[item.assemblyCode]) {
        const assembly = assemblies.find(a => a.code === item.assemblyCode) || null;
        groups[item.assemblyCode] = { assembly, items: [] };
      }
      groups[item.assemblyCode].items.push(item);
    });

    return groups;
  }, [bomItems, assemblies]);

  return { grouped, loading, error, assemblies };
}

/**
 * Hook to fetch Template BOM data (read-only)
 */
export function useTemplateBom(projectId: string | null) {
  const templateCollectionPath = projectId 
    ? `projects/${projectId}/templateBom`
    : null;

  // Fetch template BOM items - use simpler ordering to avoid index issues
  // Sort client-side instead of requiring a composite index
  const [templateSnapshot, loading, error] = useCollection(
    templateCollectionPath
      ? collection(db, templateCollectionPath)
      : null
  );

  // Parse and sort template items client-side
  const templateItems: TemplateBomItem[] = useMemo(() => {
    if (!templateSnapshot) return [];
    const items = templateSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TemplateBomItem[];
    
    // Sort client-side: by groupCode, then level, then sequence
    return items.sort((a, b) => {
      // First by groupCode
      const groupCompare = (a.groupCode || '').localeCompare(b.groupCode || '');
      if (groupCompare !== 0) return groupCompare;
      
      // Then by level
      const levelCompare = (a.level || 0) - (b.level || 0);
      if (levelCompare !== 0) return levelCompare;
      
      // Then by sequence
      return (a.sequence || 0) - (b.sequence || 0);
    });
  }, [templateSnapshot]);

  // Get unique group codes
  const getAssemblyCodes = useCallback((): string[] => {
    const codes = new Set(templateItems.map(item => item.groupCode || item.assemblyCode));
    return Array.from(codes).filter(Boolean).sort();
  }, [templateItems]);

  // Calculate stats
  const stats: TemplateBomStats | null = useMemo(() => {
    if (!templateItems.length) return null;

    const groupCodes = new Set(templateItems.map(item => item.groupCode || item.assemblyCode));
    
    return {
      totalItems: templateItems.length,
      totalAssemblies: groupCodes.size,
      totalCost: templateItems.reduce((sum, item) => sum + (item.originalExtendedCost || 0), 0),
      materialCost: templateItems.reduce((sum, item) => sum + ((item.originalMaterialCost || 0) * (item.quantity || 0)), 0),
      landingCost: templateItems.reduce((sum, item) => sum + ((item.originalLandingCost || 0) * (item.quantity || 0)), 0),
      labourCost: templateItems.reduce((sum, item) => sum + ((item.originalLabourCost || 0) * (item.quantity || 0)), 0),
    };
  }, [templateItems]);

  // Filter items
  const filterItems = useCallback((filters: Partial<BomFilters>): TemplateBomItem[] => {
    return templateItems.filter(item => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          item.itemCode?.toLowerCase().includes(searchLower) ||
          item.itemDescription?.toLowerCase().includes(searchLower) ||
          (item.groupCode || item.assemblyCode)?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // New parts filter
      if (filters.showNewParts && item.partCategory !== 'new_part') {
        return false;
      }

      // Placeholders filter (B-codes without complete 6-digit code)
      // Complete B code = B + exactly 6 numbers (e.g., B123456)
      // Placeholder = starts with B but doesn't have complete 6-digit code
      if (filters.showPlaceholders) {
        const startsWithB = item.itemCode?.startsWith('B');
        const isCompleteBCode = /^B\d{6}$/.test(item.itemCode || '');
        const isPlaceholder = startsWithB && !isCompleteBCode;
        if (!isPlaceholder) return false;
      }

      // Assembly/Group filter
      if (filters.assemblyCode) {
        const itemGroup = item.groupCode || item.assemblyCode;
        if (itemGroup !== filters.assemblyCode) {
          return false;
        }
      }

      return true;
    });
  }, [templateItems]);

  return {
    templateItems,
    loading,
    error,
    stats,
    filterItems,
    getAssemblyCodes,
    hasTemplate: templateItems.length > 0,
  };
}

/**
 * Hook to compare Working BOM against Template BOM
 */
export function useBomComparison(projectId: string | null) {
  const { bomItems, loading: workingLoading, error: workingError, stats: workingStats } = useBom(projectId);
  const { templateItems, loading: templateLoading, error: templateError, stats: templateStats } = useTemplateBom(projectId);

  // Create comparison data
  const comparison = useMemo(() => {
    if (!bomItems.length || !templateItems.length) return null;

    // Map template items by itemCode for lookup
    const templateMap = new Map<string, TemplateBomItem>();
    templateItems.forEach(item => {
      const key = `${item.assemblyCode}-${item.itemCode}`;
      templateMap.set(key, item);
    });

    // Compare each working item against template
    const itemsWithChanges = bomItems.filter(item => {
      if (item.isAddedItem) return true;
      if (item.hasCostChange) return true;
      if (item.hasQuantityChange) return true;
      return false;
    });

    // Items added after template
    const addedItems = bomItems.filter(item => item.isAddedItem);

    // Items with cost changes
    const costChangedItems = bomItems.filter(item => item.hasCostChange);

    // Items with quantity changes
    const quantityChangedItems = bomItems.filter(item => item.hasQuantityChange);

    // Calculate cost difference
    const templateTotalCost = templateStats?.totalCost || 0;
    const workingTotalCost = workingStats?.totalCost || 0;
    const costDifference = workingTotalCost - templateTotalCost;
    const costDifferencePercent = templateTotalCost > 0 
      ? (costDifference / templateTotalCost) * 100 
      : 0;

    return {
      addedItems,
      costChangedItems,
      quantityChangedItems,
      totalChanges: itemsWithChanges.length,
      costDifference,
      costDifferencePercent,
      templateItemCount: templateItems.length,
      workingItemCount: bomItems.length,
    };
  }, [bomItems, templateItems, templateStats, workingStats]);

  return {
    comparison,
    loading: workingLoading || templateLoading,
    error: workingError || templateError,
    hasTemplate: templateItems.length > 0,
    hasWorkingBom: bomItems.length > 0,
  };
}
