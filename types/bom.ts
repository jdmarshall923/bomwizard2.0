import { Timestamp } from 'firebase/firestore';

export interface Assembly {
  id: string;
  code: string; // e.g., "GMF-0130-A02"
  description: string;
  assemblyType: 'standard' | 'bco'; // bco = country compliance
  weighting: number; // Product mix % (0-1)
  isActive: boolean;
  createdAt: Timestamp;
}

export interface Item {
  id: string;
  code: string; // e.g., "B103985"
  description: string;
  drawingNumber?: string;
  revision?: string;
  isManufactured: boolean;
  isPlaceholder: boolean; // Bxxxx style codes
  buyer?: string;
  weightKg?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BomItem {
  id: string;
  assemblyId: string;
  assemblyCode: string; // Denormalized for queries
  itemId: string;
  itemCode: string; // Denormalized for queries
  itemDescription: string; // Denormalized for display
  level: number; // Hierarchy level (1, 2, 3...)
  quantity: number;
  sequence?: number;
  partCategory: 'new_part' | 'existing_part';
  // Costs embedded for this version
  materialCost: number;
  landingCost: number;
  labourCost: number;
  extendedCost: number; // qty * (material + landing + labour)
  vendorId?: string;
  costSource?: 'contract' | 'quote' | 'estimate';
  isIncomplete?: boolean; // Flag for items imported with missing required fields
}

export interface BomVersion {
  id: string;
  versionNumber: number;
  snapshotDate: Timestamp;
  changeNote?: string;
  totalCost: number;
  materialCost: number;
  landingCost: number;
  labourCost: number;
  itemCount: number;
  assemblyCount: number;
  createdBy: string;
  importId?: string;
}

export interface BomChange {
  id: string;
  changeType: 'added' | 'removed' | 'modified' | 'moved' | 'renamed' | 'placeholder_replaced';
  entityType: 'item' | 'assembly';
  entityCode: string;
  assemblyCode?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  costImpact: number;
  createdAt: Timestamp;
}

export interface ManufacturingCost {
  id: string;
  itemId: string;
  itemCode: string; // Denormalized
  operationType: string; // assembly, brazing, welding, etc.
  factoryCode: string; // AFAC, BFAC, CFAC, etc.
  estimatedTimeMinutes?: number;
  actualTimeMinutes?: number;
  labourRatePerHour: number;
  costSource: 'estimated' | 'actual';
  effectiveDate: Timestamp;
  createdAt: Timestamp;
}

