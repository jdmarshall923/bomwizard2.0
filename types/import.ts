import { Timestamp } from 'firebase/firestore';

export interface ImportTemplate {
  id: string;
  name: string;
  description?: string;
  sourceType: 'infor_bom' | 'spec_sheet' | 'vendor_prices';
  columnMappings: {
    sourceColumns: string[];
    mappings: {
      [targetField: string]: {
        source: string;
        transform?: 'parseInt' | 'parseFloat' | 'trim' | 'uppercase' | null;
      };
    };
    skipRows: number;
    delimiter: string;
  };
  validationRules?: object;
  isDefault: boolean;
  createdAt: Timestamp;
  createdBy: string;
}

export interface ImportHistory {
  id: string;
  projectId: string;
  templateId: string;
  filename: string;
  rowCount: number;
  successCount: number;
  errorCount: number;
  errors?: { row: number; message: string }[];
  importedAt: Timestamp;
  importedBy: string;
  versionId: string; // Links to snapshot created
}

export interface Integration {
  id: string;
  name: string;
  type: 'api' | 'webhook' | 'scheduled_import';
  config: Record<string, any>; // Connection details
  isEnabled: boolean;
  lastSync?: Timestamp;
  createdAt: Timestamp;
}

export interface ApiKey {
  id: string;
  name: string;
  keyHash: string; // Hashed API key
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
    resources: string[]; // Which collections accessible
  };
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}

