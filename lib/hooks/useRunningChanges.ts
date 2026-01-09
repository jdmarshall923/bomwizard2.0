'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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
 */
export function useRunningChanges(
  options: UseRunningChangesOptions = {}
): UseRunningChangesReturn {
  const { activeOnly = false, realtime = true } = options;
  
  const [runningChanges, setRunningChanges] = useState<RunningChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const changesRef = collection(db, 'runningChanges');
    
    // Build query
    let q;
    if (activeOnly) {
      q = query(changesRef, where('isActive', '==', true));
    } else {
      q = query(changesRef);
    }

    if (realtime) {
      // Real-time subscription
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const changes = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as RunningChange[];
          
          // Sort by go-live date
          changes.sort((a, b) => {
            const dateA = a.estimatedGoLiveDate?.toDate?.() || new Date(0);
            const dateB = b.estimatedGoLiveDate?.toDate?.() || new Date(0);
            return dateA.getTime() - dateB.getTime();
          });
          
          setRunningChanges(changes);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching running changes:', err);
          setError(err as Error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      // One-time fetch
      import('firebase/firestore').then(({ getDocs }) => {
        getDocs(q)
          .then((snapshot) => {
            const changes = snapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data(),
            })) as RunningChange[];
            
            changes.sort((a, b) => {
              const dateA = a.estimatedGoLiveDate?.toDate?.() || new Date(0);
              const dateB = b.estimatedGoLiveDate?.toDate?.() || new Date(0);
              return dateA.getTime() - dateB.getTime();
            });
            
            setRunningChanges(changes);
            setLoading(false);
          })
          .catch((err) => {
            console.error('Error fetching running changes:', err);
            setError(err as Error);
            setLoading(false);
          });
      });
    }
  }, [activeOnly, realtime, refreshCounter]);

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
