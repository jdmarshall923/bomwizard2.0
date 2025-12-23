'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Spec, 
  SpecCategory, 
  ColourOption,
  SpecChange 
} from '@/types/spec';
import { 
  getSpec, 
  getSpecById,
  updateSpec as updateSpecService,
  submitSpec as submitSpecService,
  acceptSpec as acceptSpecService,
  rejectSpec as rejectSpecService,
  getSpecHistory,
  validateSpec 
} from '@/lib/spec/specService';

interface UseSpecReturn {
  spec: Spec | null;
  loading: boolean;
  error: Error | null;
  updateSpec: (data: Partial<Spec>) => Promise<void>;
  submitSpec: () => Promise<void>;
  acceptSpec: () => Promise<void>;
  rejectSpec: (reason: string) => Promise<void>;
  validate: () => { isValid: boolean; errors: string[] };
  refetch: () => Promise<void>;
}

/**
 * Hook to manage a project's spec
 */
export function useSpec(projectId: string, userId: string): UseSpecReturn {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSpec = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSpec(projectId);
      setSpec(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch spec'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSpec();
  }, [fetchSpec]);

  const updateSpec = useCallback(async (data: Partial<Spec>) => {
    if (!spec) throw new Error('No spec loaded');

    try {
      await updateSpecService(projectId, spec.id, data, userId);
      await fetchSpec(); // Refetch to get updated data
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update spec');
    }
  }, [spec, projectId, userId, fetchSpec]);

  const submitSpec = useCallback(async () => {
    if (!spec) throw new Error('No spec loaded');

    try {
      await submitSpecService(projectId, spec.id, userId);
      await fetchSpec();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to submit spec');
    }
  }, [spec, projectId, userId, fetchSpec]);

  const acceptSpec = useCallback(async () => {
    if (!spec) throw new Error('No spec loaded');

    try {
      await acceptSpecService(projectId, spec.id, userId);
      await fetchSpec();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to accept spec');
    }
  }, [spec, projectId, userId, fetchSpec]);

  const rejectSpec = useCallback(async (reason: string) => {
    if (!spec) throw new Error('No spec loaded');

    try {
      await rejectSpecService(projectId, spec.id, userId, reason);
      await fetchSpec();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to reject spec');
    }
  }, [spec, projectId, userId, fetchSpec]);

  const validate = useCallback(() => {
    if (!spec) return { isValid: false, errors: ['No spec loaded'] };
    return validateSpec(spec);
  }, [spec]);

  return {
    spec,
    loading,
    error,
    updateSpec,
    submitSpec,
    acceptSpec,
    rejectSpec,
    validate,
    refetch: fetchSpec,
  };
}

interface UseSpecHistoryReturn {
  history: SpecChange[];
  loading: boolean;
  error: Error | null;
  revertTo: (version: number) => Promise<void>;
}

/**
 * Hook to get spec version history
 */
export function useSpecHistory(
  projectId: string, 
  specId: string,
  userId: string
): UseSpecHistoryReturn {
  const [history, setHistory] = useState<SpecChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!projectId || !specId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSpecHistory(projectId, specId);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch history'));
    } finally {
      setLoading(false);
    }
  }, [projectId, specId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const revertTo = useCallback(async (version: number) => {
    // Implementation would revert to a specific version
    // For now, just refetch
    await fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    revertTo,
  };
}

