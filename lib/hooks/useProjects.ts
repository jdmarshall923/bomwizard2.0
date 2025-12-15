import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Project } from '@/types';

export function useProjects() {
  const [snapshot, loading, error] = useCollection(
    query(collection(db, 'projects'), orderBy('createdAt', 'desc'))
  );

  const projects: Project[] = snapshot?.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Project[] || [];

  return {
    projects,
    loading,
    error,
  };
}

