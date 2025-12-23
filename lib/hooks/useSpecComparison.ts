'use client';

import { useState, useEffect, useCallback } from 'react';
import { SpecComparison } from '@/types/spec';
import { 
  compareSpecs,
  applySpecChanges,
  generateComparisonReport 
} from '@/lib/spec/specComparisonService';

interface UseSpecComparisonReturn {
  comparison: SpecComparison | null;
  loading: boolean;
  error: Error | null;
  applyChanges: (options: ApplyOptions) => Promise<ApplyResult>;
  downloadReport: () => Promise<void>;
}

interface ApplyOptions {
  addGroups: boolean;
  removeGroups: boolean;
  createNewParts: boolean;
}

interface ApplyResult {
  success: boolean;
  groupsAdded: string[];
  groupsRemoved: string[];
  newPartsCreated: number;
  errors: string[];
}

/**
 * Hook to compare two spec versions
 */
export function useSpecComparison(
  projectId: string,
  specId: string, 
  fromVersion: number, 
  toVersion: number
): UseSpecComparisonReturn {
  const [comparison, setComparison] = useState<SpecComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchComparison = useCallback(async () => {
    if (!projectId || !specId || fromVersion === toVersion) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await compareSpecs(projectId, specId, fromVersion, toVersion);
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to compare specs'));
    } finally {
      setLoading(false);
    }
  }, [projectId, specId, fromVersion, toVersion]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const applyChanges = useCallback(async (options: ApplyOptions): Promise<ApplyResult> => {
    if (!comparison) {
      throw new Error('No comparison loaded');
    }

    try {
      const result = await applySpecChanges(projectId, comparison, options);
      return result;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to apply changes');
    }
  }, [comparison, projectId]);

  const downloadReport = useCallback(async () => {
    if (!comparison) {
      throw new Error('No comparison to download');
    }

    try {
      const blob = await generateComparisonReport(comparison);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spec-comparison-v${comparison.fromVersion}-v${comparison.toVersion}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to download report');
    }
  }, [comparison]);

  return {
    comparison,
    loading,
    error,
    applyChanges,
    downloadReport,
  };
}

