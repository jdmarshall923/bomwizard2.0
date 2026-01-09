'use client';

import { useState, useEffect, useMemo } from 'react';
import { BomItem } from '@/types/bom';
import { RunningChange, AffectedBomItem } from '@/types/runningChange';
import { findAffectedItems, countAffectedItems } from '@/lib/runningChanges/matchingService';
import { useRunningChanges } from './useRunningChanges';

interface UseAffectedPartsOptions {
  /** Project DTx date for "After DTx" warnings */
  projectDtxDate?: Date | null;
}

interface UseAffectedPartsReturn {
  /** List of affected BOM items with their running change details */
  affectedItems: AffectedBomItem[];
  /** Number of affected items (quick count) */
  affectedCount: number;
  /** Whether there are any affected items */
  hasAffectedItems: boolean;
  /** Loading state */
  loading: boolean;
  /** Error if any */
  error: Error | null;
  /** The running changes used for matching */
  runningChanges: RunningChange[];
}

/**
 * Hook to find BOM items affected by running changes
 * 
 * @param bomItems - The BOM items to check against running changes
 * @param options - Options including project DTx date
 */
export function useAffectedParts(
  bomItems: BomItem[],
  options: UseAffectedPartsOptions = {}
): UseAffectedPartsReturn {
  const { projectDtxDate } = options;
  
  // Fetch active running changes
  const { 
    runningChanges, 
    loading: changesLoading, 
    error: changesError 
  } = useRunningChanges({ activeOnly: true, realtime: true });

  // Calculate affected items
  const affectedItems = useMemo(() => {
    if (changesLoading || !bomItems.length || !runningChanges.length) {
      return [];
    }
    
    return findAffectedItems(bomItems, runningChanges, projectDtxDate);
  }, [bomItems, runningChanges, projectDtxDate, changesLoading]);

  // Quick count
  const affectedCount = useMemo(() => {
    if (changesLoading || !bomItems.length || !runningChanges.length) {
      return 0;
    }
    
    return countAffectedItems(bomItems, runningChanges);
  }, [bomItems, runningChanges, changesLoading]);

  return {
    affectedItems,
    affectedCount,
    hasAffectedItems: affectedCount > 0,
    loading: changesLoading,
    error: changesError,
    runningChanges,
  };
}

/**
 * Hook to just check if a project has affected parts (lightweight)
 * Use this when you only need to show a badge/alert
 */
export function useHasAffectedParts(bomItems: BomItem[]): {
  hasAffectedItems: boolean;
  affectedCount: number;
  loading: boolean;
} {
  const { runningChanges, loading } = useRunningChanges({ activeOnly: true, realtime: true });

  const affectedCount = useMemo(() => {
    if (loading || !bomItems.length || !runningChanges.length) {
      return 0;
    }
    
    return countAffectedItems(bomItems, runningChanges);
  }, [bomItems, runningChanges, loading]);

  return {
    hasAffectedItems: affectedCount > 0,
    affectedCount,
    loading,
  };
}
