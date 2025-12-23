'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  SuggestedMapping, 
  SpecGroupMapping,
  MappingStats 
} from '@/types/spec';
import { 
  getSuggestedGroups,
  saveMapping,
  confirmMapping,
  getAllMappings,
  getMappingsByBikeType,
  getLowConfidenceMappings,
  getMappingStats,
  updateMapping 
} from '@/lib/spec/specMappingService';

interface UseSpecMappingReturn {
  suggestions: SuggestedMapping | null;
  confidence: number;
  loading: boolean;
  error: Error | null;
  saveMapping: (groups: string[]) => Promise<void>;
  confirmSuggestions: () => Promise<void>;
}

/**
 * Hook to get and manage spec-to-group mapping for a single option
 */
export function useSpecMapping(
  bikeType: string,
  category: string, 
  optionValue: string,
  userId: string,
  context?: { category: string; optionValue: string }[]
): UseSpecMappingReturn {
  const [suggestions, setSuggestions] = useState<SuggestedMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!bikeType || !category || !optionValue) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSuggestedGroups(bikeType, category, optionValue, context);
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch suggestions'));
    } finally {
      setLoading(false);
    }
  }, [bikeType, category, optionValue, context]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const saveMappingFn = useCallback(async (groups: string[]) => {
    try {
      await saveMapping(bikeType, category, optionValue, groups, userId);
      await fetchSuggestions(); // Refetch to update state
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to save mapping');
    }
  }, [bikeType, category, optionValue, userId, fetchSuggestions]);

  const confirmSuggestions = useCallback(async () => {
    if (!suggestions || suggestions.groupCodes.length === 0) {
      throw new Error('No suggestions to confirm');
    }

    try {
      await saveMapping(bikeType, category, optionValue, suggestions.groupCodes, userId);
      await fetchSuggestions();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to confirm mapping');
    }
  }, [suggestions, bikeType, category, optionValue, userId, fetchSuggestions]);

  return {
    suggestions,
    confidence: suggestions?.confidence || 0,
    loading,
    error,
    saveMapping: saveMappingFn,
    confirmSuggestions,
  };
}

interface UseSpecMappingsReturn {
  mappings: SpecGroupMapping[];
  loading: boolean;
  error: Error | null;
  lowConfidence: SpecGroupMapping[];
  stats: MappingStats | null;
  refetch: () => Promise<void>;
  updateMappingGroups: (mappingId: string, groupCodes: string[]) => Promise<void>;
}

/**
 * Hook to manage spec mappings (for admin page)
 */
export function useSpecMappings(
  filters?: { bikeType?: string; category?: string }
): UseSpecMappingsReturn {
  const [mappings, setMappings] = useState<SpecGroupMapping[]>([]);
  const [lowConfidence, setLowConfidence] = useState<SpecGroupMapping[]>([]);
  const [stats, setStats] = useState<MappingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [allMappings, lowConfMappings, mappingStats] = await Promise.all([
        getAllMappings(filters),
        getLowConfidenceMappings(),
        getMappingStats(),
      ]);
      
      setMappings(allMappings);
      setLowConfidence(lowConfMappings);
      setStats(mappingStats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch mappings'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const updateMappingGroups = useCallback(async (mappingId: string, groupCodes: string[]) => {
    try {
      await updateMapping(mappingId, { groupCodes });
      await fetchMappings();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update mapping');
    }
  }, [fetchMappings]);

  return {
    mappings,
    loading,
    error,
    lowConfidence,
    stats,
    refetch: fetchMappings,
    updateMappingGroups,
  };
}

interface UseBikeTypeMappingsReturn {
  mappings: SpecGroupMapping[];
  loading: boolean;
  error: Error | null;
  getMappingForOption: (category: string, option: string) => SpecGroupMapping | undefined;
}

/**
 * Hook to get all mappings for a specific bike type
 */
export function useBikeTypeMappings(bikeType: string): UseBikeTypeMappingsReturn {
  const [mappings, setMappings] = useState<SpecGroupMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMappings = useCallback(async () => {
    if (!bikeType) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getMappingsByBikeType(bikeType);
      setMappings(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch mappings'));
    } finally {
      setLoading(false);
    }
  }, [bikeType]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const getMappingForOption = useCallback((category: string, option: string) => {
    return mappings.find(m => m.category === category && m.optionValue === option);
  }, [mappings]);

  return {
    mappings,
    loading,
    error,
    getMappingForOption,
  };
}

