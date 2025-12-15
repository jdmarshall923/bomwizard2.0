'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BomItem, Assembly } from '@/types';
import { useMemo, useCallback, useState } from 'react';

export interface BomFilters {
  searchTerm: string;
  showNewParts: boolean;
  showPlaceholders: boolean;
  showCostChanges: boolean;
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
      placeholdersCount: bomItems.filter(item => item.itemCode?.startsWith('B') && /^B\d/.test(item.itemCode)).length,
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

      // Placeholders filter (Bxxxx style codes)
      if (filters.showPlaceholders) {
        const isPlaceholder = item.itemCode?.startsWith('B') && /^B\d/.test(item.itemCode);
        if (!isPlaceholder) return false;
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

  return {
    bomItems,
    assemblies,
    loading: bomLoading || assembliesLoading,
    error: bomError || assembliesError,
    updateBomItem,
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
