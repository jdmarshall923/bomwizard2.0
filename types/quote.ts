import { Timestamp } from 'firebase/firestore';

export interface Quote {
  id: string;
  itemId?: string; // If item exists
  itemCode: string; // For placeholders not yet in items
  description: string;
  status: 'pending' | 'requested' | 'quoted' | 'approved' | 'rejected';
  buyer?: string;
  vendorId?: string;
  vendorName?: string; // Denormalized
  quotedPrice?: number;
  currency: string;
  estimatedWeightKg?: number;
  drawingNumber?: string;
  revision?: string;
  notes?: string;
  requestedDate?: Timestamp;
  quotedDate?: Timestamp;
  approvedDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

