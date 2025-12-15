import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
  DocumentData,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { db } from './config';

// Helper to convert Firestore data to typed objects
export const convertTimestamp = <T extends { [key: string]: any }>(
  data: DocumentData
): T => {
  const converted = { ...data };
  Object.keys(converted).forEach((key) => {
    if (converted[key]?.toDate) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted as T;
};

// Generic CRUD helpers
export const getDocument = async <T>(
  collectionPath: string,
  docId: string
): Promise<T | null> => {
  const docRef = doc(db, collectionPath, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...convertTimestamp(docSnap.data()) } as T;
  }
  return null;
};

export const getDocuments = async <T>(
  collectionPath: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> => {
  const collectionRef = collection(db, collectionPath);
  const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamp(doc.data()),
  })) as T[];
};

// Helper to remove undefined values from object (Firestore doesn't allow undefined)
const removeUndefined = (obj: any): any => {
  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

export const createDocument = async <T extends { [key: string]: any }>(
  collectionPath: string,
  data: Omit<T, 'id'>,
  docId?: string
): Promise<string> => {
  const docRef = docId ? doc(db, collectionPath, docId) : doc(collection(db, collectionPath));
  const cleanedData = removeUndefined({
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  await setDoc(docRef, cleanedData);
  return docRef.id;
};

export const updateDocument = async <T extends { [key: string]: any }>(
  collectionPath: string,
  docId: string,
  data: Partial<T>
): Promise<void> => {
  const docRef = doc(db, collectionPath, docId);
  const cleanedData = removeUndefined({
    ...data,
    updatedAt: Timestamp.now(),
  });
  await updateDoc(docRef, cleanedData);
};

export const deleteDocument = async (
  collectionPath: string,
  docId: string
): Promise<void> => {
  const docRef = doc(db, collectionPath, docId);
  await deleteDoc(docRef);
};

// Collection references for type safety
export const getCollectionRef = (collectionPath: string): CollectionReference => {
  return collection(db, collectionPath);
};

export const getDocumentRef = (collectionPath: string, docId: string): DocumentReference => {
  return doc(db, collectionPath, docId);
};

