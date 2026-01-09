import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ExternalPerson, TaskAssignee } from '@/types/task';
import { useMemo, useState, useCallback } from 'react';

/**
 * Phase 15: useExternalPeople Hook
 * 
 * Hook for fetching and searching external people.
 * Used in the AssigneePicker component.
 */

interface UseExternalPeopleOptions {
  organizationId: string;
  maxResults?: number;
}

interface UseExternalPeopleResult {
  externalPeople: ExternalPerson[];
  loading: boolean;
  error: Error | undefined;
  search: (term: string) => void;
  searchResults: ExternalPerson[];
  isSearching: boolean;
}

export function useExternalPeople(options: UseExternalPeopleOptions): UseExternalPeopleResult {
  const { organizationId, maxResults = 50 } = options;
  const [searchTerm, setSearchTerm] = useState('');

  const [snapshot, loading, error] = useCollection(
    query(
      collection(db, 'organizations', organizationId, 'externalPeople'),
      orderBy('lastUsedAt', 'desc'),
      limit(maxResults)
    )
  );

  const externalPeople: ExternalPerson[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ExternalPerson[];
  }, [snapshot]);

  // Client-side search (Firestore doesn't support text search)
  const searchResults = useMemo(() => {
    if (!searchTerm) return externalPeople;

    const searchLower = searchTerm.toLowerCase();
    return externalPeople.filter(
      person =>
        person.name.toLowerCase().includes(searchLower) ||
        person.email?.toLowerCase().includes(searchLower) ||
        person.department?.toLowerCase().includes(searchLower)
    );
  }, [externalPeople, searchTerm]);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  return {
    externalPeople,
    loading,
    error,
    search,
    searchResults,
    isSearching: searchTerm.length > 0,
  };
}

/**
 * Hook for getting recently used external people
 */
interface UseRecentExternalPeopleOptions {
  organizationId: string;
  maxResults?: number;
}

export function useRecentExternalPeople(options: UseRecentExternalPeopleOptions) {
  const { organizationId, maxResults = 5 } = options;

  const [snapshot, loading, error] = useCollection(
    query(
      collection(db, 'organizations', organizationId, 'externalPeople'),
      orderBy('lastUsedAt', 'desc'),
      limit(maxResults)
    )
  );

  const recentPeople: ExternalPerson[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ExternalPerson[];
  }, [snapshot]);

  return {
    recentPeople,
    loading,
    error,
  };
}

/**
 * Hook for getting unique departments
 */
export function useDepartments(options: { organizationId: string }) {
  const { externalPeople, loading, error } = useExternalPeople(options);

  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    for (const person of externalPeople) {
      if (person.department) {
        deptSet.add(person.department);
      }
    }
    return Array.from(deptSet).sort();
  }, [externalPeople]);

  return {
    departments,
    loading,
    error,
  };
}

/**
 * Convert external person to TaskAssignee
 */
export function externalPersonToAssignee(person: ExternalPerson): TaskAssignee {
  return {
    type: 'external',
    externalId: person.id,
    name: person.name,
    email: person.email,
  };
}
