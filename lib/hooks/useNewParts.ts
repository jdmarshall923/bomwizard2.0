'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NewPart, NewPartStats, NewPartStatus } from '@/types/newPart';
import { UNASSIGNED_GROUP_CODE } from '@/types/bom';
import {
  subscribeToNewParts,
  updateNewPartStatus,
  updateNewPart,
  completeNewPart,
  deleteNewPart,
  calculateNewPartStats,
  KANBAN_COLUMNS,
} from '@/lib/bom/newPartService';

interface UseNewPartsOptions {
  projectId: string;
}

interface UseNewPartsReturn {
  // Data
  newParts: NewPart[];
  partsByStatus: Record<NewPartStatus, NewPart[]>;
  stats: NewPartStats;
  columns: typeof KANBAN_COLUMNS;

  // State
  isLoading: boolean;
  error: Error | null;
  selectedPart: NewPart | null;

  // Actions
  setSelectedPart: (part: NewPart | null) => void;
  moveToStatus: (partId: string, newStatus: NewPartStatus) => Promise<void>;
  updatePartDetails: (partId: string, data: Partial<NewPart>) => Promise<void>;
  completePart: (
    partId: string,
    finalItemCode: string,
    finalUnitPrice: number,
    landingPct: number,
    completedBy: string
  ) => Promise<void>;
  deletePart: (partId: string) => Promise<void>;
  refresh: () => void;

  // Filters
  filterPriority: string | null;
  setFilterPriority: (priority: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredParts: NewPart[];
}

export function useNewParts({ projectId }: UseNewPartsOptions): UseNewPartsReturn {
  const [newParts, setNewParts] = useState<NewPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedPart, setSelectedPart] = useState<NewPart | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to real-time updates
  useEffect(() => {
    if (!projectId) {
      setNewParts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToNewParts(
      projectId,
      (parts) => {
        setNewParts(parts);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId, refreshKey]);

  // Group parts by status for Kanban
  const partsByStatus = useMemo(() => {
    const grouped: Record<NewPartStatus, NewPart[]> = {
      pending: [],
      added: [],
      design: [],
      engineering: [],
      procurement: [],
      complete: [],
      on_hold: [],
      cancelled: [],
    };

    newParts.forEach((part) => {
      if (grouped[part.status]) {
        grouped[part.status].push(part);
      }
    });

    return grouped;
  }, [newParts]);

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateNewPartStats(newParts);
  }, [newParts]);

  // Filter parts
  const filteredParts = useMemo(() => {
    let filtered = newParts;

    if (filterPriority) {
      filtered = filtered.filter((part) => part.priority === filterPriority);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (part) =>
          part.placeholderCode.toLowerCase().includes(query) ||
          part.description.toLowerCase().includes(query) ||
          (part.groupCode || '').toLowerCase().includes(query) ||
          (part.vendorName || '').toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [newParts, filterPriority, searchQuery]);

  // Move part to a new status
  const moveToStatus = useCallback(
    async (partId: string, newStatus: NewPartStatus) => {
      try {
        await updateNewPartStatus(projectId, partId, newStatus);
      } catch (err) {
        console.error('Error moving part:', err);
        throw err;
      }
    },
    [projectId]
  );

  // Update part details
  const updatePartDetails = useCallback(
    async (partId: string, data: Partial<NewPart>) => {
      try {
        await updateNewPart(projectId, partId, data);
        // Update selected part if it's the one being edited
        if (selectedPart?.id === partId) {
          setSelectedPart((prev) => (prev ? { ...prev, ...data } : null));
        }
      } catch (err) {
        console.error('Error updating part:', err);
        throw err;
      }
    },
    [projectId, selectedPart]
  );

  // Complete part with final B-code
  const completePart = useCallback(
    async (
      partId: string,
      finalItemCode: string,
      finalUnitPrice: number,
      landingPct: number,
      completedBy: string
    ) => {
      try {
        await completeNewPart(
          projectId,
          partId,
          finalItemCode,
          finalUnitPrice,
          landingPct,
          completedBy
        );
        setSelectedPart(null);
      } catch (err) {
        console.error('Error completing part:', err);
        throw err;
      }
    },
    [projectId]
  );

  // Delete part
  const deletePart = useCallback(
    async (partId: string) => {
      try {
        await deleteNewPart(projectId, partId);
        if (selectedPart?.id === partId) {
          setSelectedPart(null);
        }
      } catch (err) {
        console.error('Error deleting part:', err);
        throw err;
      }
    },
    [projectId, selectedPart]
  );

  // Manual refresh
  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    // Data
    newParts,
    partsByStatus,
    stats,
    columns: KANBAN_COLUMNS,

    // State
    isLoading,
    error,
    selectedPart,

    // Actions
    setSelectedPart,
    moveToStatus,
    updatePartDetails,
    completePart,
    deletePart,
    refresh,

    // Filters
    filterPriority,
    setFilterPriority,
    searchQuery,
    setSearchQuery,
    filteredParts,
  };
}


