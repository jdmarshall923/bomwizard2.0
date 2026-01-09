import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { Project } from '@/types';
import { useState, useEffect } from 'react';

export function useProjects() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Track auth state to avoid permission errors during initial load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  const [snapshot, projectsLoading, error] = useCollection(
    isAuthenticated
      ? query(collection(db, 'projects'), orderBy('createdAt', 'desc'))
      : null
  );

  const projects: Project[] = snapshot?.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Project[] || [];

  return {
    projects,
    loading: !isAuthenticated || projectsLoading,
    error,
  };
}

