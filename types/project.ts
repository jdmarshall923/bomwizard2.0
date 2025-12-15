import { Timestamp } from 'firebase/firestore';

export interface Project {
  id: string;
  code: string; // e.g., "PROJ-2024-001"
  name: string; // e.g., "New Product Line 2024"
  description?: string;
  status: 'active' | 'archived' | 'draft';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // User UID
  metadata?: {
    targetCost?: number;
    gate?: string;
    [key: string]: any;
  };
}

