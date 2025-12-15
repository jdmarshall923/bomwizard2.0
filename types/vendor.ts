import { Timestamp } from 'firebase/firestore';

export interface Vendor {
  id: string;
  code: string;
  name: string;
  country?: string;
  currency: string;
  landingRate?: number; // Percentage (0-1)
  isActive: boolean;
  contactEmail?: string;
  createdAt: Timestamp;
}

export interface ContractPrice {
  id: string;
  vendorId: string;
  vendorName: string; // Denormalized
  itemId: string;
  itemCode: string; // Denormalized
  price: number;
  currency: string;
  effectiveFrom?: Timestamp;
  effectiveTo?: Timestamp;
  createdAt: Timestamp;
}

export interface LandingRate {
  id: string;
  country: string;
  rate: number; // e.g., 0.15 = 15%
  effectiveFrom?: Timestamp;
  effectiveTo?: Timestamp;
  createdAt: Timestamp;
}

