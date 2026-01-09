'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, FirestoreError, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { RunningChange, RunningChangeStats } from '@/types/runningChange';
import { calculateRunningChangeStats } from '@/lib/runningChanges/runningChangeService';

interface UseRunningChangesOptions {
  /** Only fetch active changes */
  activeOnly?: boolean;
  /** Enable real-time updates */
  realtime?: boolean;
}

interface UseRunningChangesReturn {
  runningChanges: RunningChange[];
  loading: boolean;
  error: Error | null;
  stats: RunningChangeStats;
  refresh: () => void;
}

/**
 * Hook to fetch and subscribe to running changes
 * Waits for authentication before querying to avoid permission errors
 */
export function useRunningChanges(
  options: UseRunningChangesOptions = {}
): UseRunningChangesReturn {
  const { activeOnly = false, realtime = true } = options;
  
  const [runningChanges, setRunningChanges] = useState<RunningChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (!user) {
        setRunningChanges([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch running changes only when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    const changesRef = collection(db, 'runningChanges');
    
    // Build query
    const q = activeOnly
      ? query(changesRef, where('isActive', '==', true))
      : query(changesRef);

    const sortChanges = (changes: RunningChange[]) => {
      return changes.sort((a, b) => {
        const dateA = a.estimatedGoLiveDate?.toDate?.() || new Date(0);
        const dateB = b.estimatedGoLiveDate?.toDate?.() || new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
    };

    if (realtime) {
      // Real-time subscription
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const changes = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as RunningChange[];
          
          setRunningChanges(sortChanges(changes));
          setLoading(false);
          setError(null);
        },
        (err: FirestoreError) => {
          // Silently handle permission errors
          if (err.code === 'permission-denied') {
            setRunningChanges([]);
            setLoading(false);
            return;
          }
          console.error('Error fetching running changes:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      // One-time fetch
      getDocs(q)
        .then((snapshot) => {
          const changes = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as RunningChange[];
          
          setRunningChanges(sortChanges(changes));
          setLoading(false);
        })
        .catch((err) => {
          if (err.code === 'permission-denied') {
            setRunningChanges([]);
            setLoading(false);
            return;
          }
          console.error('Error fetching running changes:', err);
          setError(err as Error);
          setLoading(false);
        });
    }
  }, [activeOnly, realtime, refreshCounter, isAuthenticated]);

  // Calculate stats from the current data
  const stats = calculateRunningChangeStats(runningChanges);

  return {
    runningChanges,
    loading,
    error,
    stats,
    refresh,
  };
}
