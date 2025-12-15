import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BomVersion } from '@/types';

export function useVersions(projectId: string | null) {
  if (!projectId) {
    return { versions: [], loading: false, error: null };
  }

  const [snapshot, loading, error] = useCollection(
    query(
      collection(db, `projects/${projectId}/versions`),
      orderBy('versionNumber', 'desc')
    )
  );

  const versions: BomVersion[] = snapshot?.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as BomVersion[] || [];

  return {
    versions,
    loading,
    error,
  };
}

