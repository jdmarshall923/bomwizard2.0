import { Timestamp } from 'firebase/firestore';
import { NewPartStatus } from './bom';

/**
 * NewPart Interface - Prepared for Phase 7: New Part Tracker
 * 
 * This interface defines the structure for tracking new parts through
 * their design and procurement lifecycle.
 * 
 * Stored in: projects/{projectId}/newParts/{newPartId}
 */
export interface NewPart {
  id: string;
  projectId: string;
  
  // BOM Item reference
  bomItemId: string;
  placeholderCode: string;    // Original placeholder (BNEW-004)
  description: string;        // Part description
  groupCode: string;          // Which BOM group
  quantity: number;           // Quantity from BOM
  
  // Status tracking
  status: NewPartStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Request details
  requestedBy: string;        // User who flagged it
  requestedAt: Timestamp;
  requestNotes?: string;
  
  // Design phase
  designStatus?: 'not_started' | 'in_progress' | 'complete';
  drawingNumber?: string;
  drawingRevision?: string;
  designNotes?: string;
  designCompletedAt?: Timestamp;
  
  // Engineering phase
  engineeringStatus?: 'not_started' | 'in_progress' | 'approved' | 'rejected';
  engineeringNotes?: string;
  engineeringApprovedBy?: string;
  engineeringApprovedAt?: Timestamp;
  
  // Procurement phase
  procurementStatus?: 'not_started' | 'rfq_sent' | 'quoted' | 'ordered' | 'received';
  vendorCode?: string;
  vendorName?: string;
  quotedPrice?: number;
  quotedCurrency?: string;
  quotedMoq?: number;
  quotedLeadTimeDays?: number;
  poNumber?: string;
  procurementNotes?: string;
  
  // Completion
  finalItemCode?: string;     // Final B-code (e.g., B107234)
  finalUnitPrice?: number;
  landingPct?: number;
  completedAt?: Timestamp;
  completedBy?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * NewPart summary for list views
 */
export interface NewPartSummary {
  id: string;
  placeholderCode: string;
  description: string;
  groupCode: string;
  status: NewPartStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedAt: Timestamp;
  finalItemCode?: string;
}

/**
 * Statistics for new parts dashboard
 */
export interface NewPartStats {
  total: number;
  byStatus: Record<NewPartStatus, number>;
  byPriority: Record<'low' | 'medium' | 'high' | 'critical', number>;
  completedThisWeek: number;
  overdue: number;
}
