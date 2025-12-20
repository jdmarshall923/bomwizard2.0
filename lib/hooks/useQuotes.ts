import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Quote } from '@/types';

export function useQuotes(projectId: string | null, status?: Quote['status']) {
  if (!projectId) {
    return { quotes: [], loading: false, error: null };
  }

  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  if (status) {
    constraints.unshift(where('status', '==', status));
  }

  const [snapshot, loading, error] = useCollection(
    query(collection(db, `projects/${projectId}/quotes`), ...constraints)
  );

  const quotes: Quote[] = snapshot?.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Quote[] || [];

  return {
    quotes,
    loading,
    error,
  };
}
