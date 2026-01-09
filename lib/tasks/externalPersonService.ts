import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  ExternalPerson,
  CreateExternalPersonInput,
  ExternalPersonFilters,
  TaskAssignee,
} from '@/types/task';

/**
 * Phase 15: External Person Service
 * 
 * Manages external people who can be assigned to tasks but don't have accounts.
 * Stored organization-wide and suggested based on recent usage.
 */

// ============================================
// COLLECTION PATHS
// ============================================

const getExternalPeopleCollection = (organizationId: string) =>
  collection(db, 'organizations', organizationId, 'externalPeople');

const getExternalPersonRef = (organizationId: string, personId: string) =>
  doc(db, 'organizations', organizationId, 'externalPeople', personId);

// ============================================
// EXTERNAL PERSON CRUD
// ============================================

/**
 * Create a new external person
 */
export async function createExternalPerson(
  input: CreateExternalPersonInput,
  userId: string
): Promise<string> {
  const { organizationId, ...personData } = input;

  // Build object excluding undefined values (Firestore doesn't accept undefined)
  const person: Record<string, unknown> = {
    organizationId,
    name: personData.name,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: userId,
    lastUsedAt: Timestamp.now(),
  };

  // Only add optional fields if they have values
  if (personData.email) person.email = personData.email;
  if (personData.department) person.department = personData.department;
  if (personData.notes) person.notes = personData.notes;

  const docRef = await addDoc(getExternalPeopleCollection(organizationId), person);
  return docRef.id;
}

/**
 * Get an external person by ID
 */
export async function getExternalPerson(
  organizationId: string,
  personId: string
): Promise<ExternalPerson | null> {
  const docRef = getExternalPersonRef(organizationId, personId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() } as ExternalPerson;
}

/**
 * Update an external person
 */
export async function updateExternalPerson(
  organizationId: string,
  personId: string,
  updates: Partial<Pick<ExternalPerson, 'name' | 'email' | 'department' | 'notes'>>
): Promise<void> {
  const personRef = getExternalPersonRef(organizationId, personId);

  // Filter out undefined values (Firestore doesn't accept undefined)
  const cleanedUpdates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanedUpdates[key] = value;
    }
  });

  await updateDoc(personRef, cleanedUpdates);
}

/**
 * Delete an external person
 */
export async function deleteExternalPerson(
  organizationId: string,
  personId: string
): Promise<void> {
  await deleteDoc(getExternalPersonRef(organizationId, personId));
}

/**
 * Update last used timestamp (called when person is assigned to a task)
 */
export async function updateLastUsed(
  organizationId: string,
  personId: string
): Promise<void> {
  const personRef = getExternalPersonRef(organizationId, personId);

  await updateDoc(personRef, {
    lastUsedAt: Timestamp.now(),
  });
}

// ============================================
// EXTERNAL PERSON QUERIES
// ============================================

/**
 * Get external people with filters
 */
export async function getExternalPeople(
  filters: ExternalPersonFilters
): Promise<ExternalPerson[]> {
  const constraints: Parameters<typeof query>[1][] = [
    orderBy('lastUsedAt', 'desc'),
  ];

  if (filters.limit) {
    constraints.push(limit(filters.limit));
  }

  const q = query(
    getExternalPeopleCollection(filters.organizationId),
    ...constraints
  );
  const snapshot = await getDocs(q);

  let people = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ExternalPerson[];

  // Client-side search filter (Firestore doesn't support text search)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    people = people.filter(
      person =>
        person.name.toLowerCase().includes(searchLower) ||
        person.email?.toLowerCase().includes(searchLower) ||
        person.department?.toLowerCase().includes(searchLower)
    );
  }

  return people;
}

/**
 * Search external people by name or email
 */
export async function searchExternalPeople(
  organizationId: string,
  searchTerm: string,
  maxResults: number = 10
): Promise<ExternalPerson[]> {
  return getExternalPeople({
    organizationId,
    search: searchTerm,
    limit: maxResults,
  });
}

/**
 * Get recently used external people (for suggestions)
 */
export async function getRecentExternalPeople(
  organizationId: string,
  maxResults: number = 5
): Promise<ExternalPerson[]> {
  return getExternalPeople({
    organizationId,
    limit: maxResults,
  });
}

/**
 * Get external people by department
 */
export async function getExternalPeopleByDepartment(
  organizationId: string,
  department: string
): Promise<ExternalPerson[]> {
  const q = query(
    getExternalPeopleCollection(organizationId),
    where('department', '==', department),
    orderBy('name', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ExternalPerson[];
}

/**
 * Get unique departments in the organization
 */
export async function getDepartments(organizationId: string): Promise<string[]> {
  const people = await getExternalPeople({ organizationId });
  const departments = new Set<string>();

  for (const person of people) {
    if (person.department) {
      departments.add(person.department);
    }
  }

  return Array.from(departments).sort();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert an ExternalPerson to a TaskAssignee
 */
export function toTaskAssignee(person: ExternalPerson): TaskAssignee {
  return {
    type: 'external',
    externalId: person.id,
    name: person.name,
    email: person.email,
  };
}

/**
 * Check if an external person exists by email
 */
export async function findByEmail(
  organizationId: string,
  email: string
): Promise<ExternalPerson | null> {
  const q = query(
    getExternalPeopleCollection(organizationId),
    where('email', '==', email.toLowerCase()),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ExternalPerson;
}

/**
 * Create or get an external person by email
 * Useful when importing data or bulk assigning
 */
export async function getOrCreateByEmail(
  organizationId: string,
  email: string,
  name: string,
  userId: string,
  department?: string
): Promise<ExternalPerson> {
  const existing = await findByEmail(organizationId, email);

  if (existing) {
    // Update last used timestamp
    await updateLastUsed(organizationId, existing.id);
    return existing;
  }

  const personId = await createExternalPerson(
    {
      organizationId,
      name,
      email: email.toLowerCase(),
      department,
    },
    userId
  );

  return (await getExternalPerson(organizationId, personId))!;
}
