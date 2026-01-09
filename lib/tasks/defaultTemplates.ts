import { Timestamp } from 'firebase/firestore';
import {
  TaskGroupTemplate,
  CustomFieldSchema,
  TaskGroupView,
} from '@/types/task';

/**
 * Phase 15: Default Task Group Templates
 * 
 * System-provided templates for common task group configurations.
 * These are stored in code (not Firestore) and always available.
 */

// ============================================
// SYSTEM TEMPLATES
// ============================================

/**
 * Basic Tasks Template
 * Simple task tracking with just the default fields
 */
export const BASIC_TASKS_TEMPLATE: TaskGroupTemplate = {
  id: 'system-basic',
  organizationId: 'system',
  name: 'Basic Tasks',
  description: 'Simple task tracking with just the default fields',
  icon: '📋',
  color: undefined,
  defaultView: 'kanban',
  kanbanGroupBy: 'status',
  customFields: [],
  defaultTasks: [],
  isSystem: true,
  createdAt: Timestamp.fromDate(new Date('2024-01-01')),
  updatedAt: Timestamp.fromDate(new Date('2024-01-01')),
};

/**
 * Tasks with Priority Template
 * When you need to prioritize work
 */
export const PRIORITY_TASKS_TEMPLATE: TaskGroupTemplate = {
  id: 'system-priority',
  organizationId: 'system',
  name: 'Tasks with Priority',
  description: 'When you need to prioritize work',
  icon: '🎯',
  color: undefined,
  defaultView: 'kanban',
  kanbanGroupBy: 'status',
  customFields: [
    {
      id: 'priority',
      name: 'Priority',
      type: 'select',
      required: false,
      options: [
        { id: 'low', name: 'Low', color: 'gray' },
        { id: 'medium', name: 'Medium', color: 'blue' },
        { id: 'high', name: 'High', color: 'orange' },
        { id: 'urgent', name: 'Urgent', color: 'red' },
      ],
      position: 0,
      showInKanban: true,
      showInTable: true,
    },
  ],
  defaultTasks: [],
  isSystem: true,
  createdAt: Timestamp.fromDate(new Date('2024-01-01')),
  updatedAt: Timestamp.fromDate(new Date('2024-01-01')),
};

/**
 * Checklist Template
 * Simple checklist view - great for gate reviews
 */
export const CHECKLIST_TEMPLATE: TaskGroupTemplate = {
  id: 'system-checklist',
  organizationId: 'system',
  name: 'Checklist',
  description: 'Simple checklist view - great for gate reviews',
  icon: '✅',
  color: undefined,
  defaultView: 'list',
  kanbanGroupBy: 'status',
  customFields: [],
  defaultTasks: [],
  isSystem: true,
  createdAt: Timestamp.fromDate(new Date('2024-01-01')),
  updatedAt: Timestamp.fromDate(new Date('2024-01-01')),
};

/**
 * Sprint Planning Template
 * For sprint-based project management
 */
export const SPRINT_PLANNING_TEMPLATE: TaskGroupTemplate = {
  id: 'system-sprint',
  organizationId: 'system',
  name: 'Sprint Planning',
  description: 'For sprint-based project management',
  icon: '🏃',
  color: undefined,
  defaultView: 'kanban',
  kanbanGroupBy: 'status',
  customFields: [
    {
      id: 'story-points',
      name: 'Story Points',
      type: 'select',
      required: false,
      options: [
        { id: '1', name: '1', color: 'green' },
        { id: '2', name: '2', color: 'green' },
        { id: '3', name: '3', color: 'blue' },
        { id: '5', name: '5', color: 'blue' },
        { id: '8', name: '8', color: 'orange' },
        { id: '13', name: '13', color: 'red' },
      ],
      position: 0,
      showInKanban: true,
      showInTable: true,
    },
    {
      id: 'type',
      name: 'Type',
      type: 'select',
      required: false,
      options: [
        { id: 'feature', name: 'Feature', color: 'blue' },
        { id: 'bug', name: 'Bug', color: 'red' },
        { id: 'chore', name: 'Chore', color: 'gray' },
        { id: 'research', name: 'Research', color: 'purple' },
      ],
      position: 1,
      showInKanban: true,
      showInTable: true,
    },
  ],
  defaultTasks: [],
  isSystem: true,
  createdAt: Timestamp.fromDate(new Date('2024-01-01')),
  updatedAt: Timestamp.fromDate(new Date('2024-01-01')),
};

/**
 * Gate Review Checklist Template
 * For PACE gate reviews with pre-populated tasks
 */
export const GATE_REVIEW_TEMPLATE: TaskGroupTemplate = {
  id: 'system-gate-review',
  organizationId: 'system',
  name: 'Gate Review Checklist',
  description: 'Pre-populated checklist for PACE gate reviews',
  icon: '🚦',
  color: undefined,
  defaultView: 'list',
  kanbanGroupBy: 'status',
  customFields: [
    {
      id: 'gate',
      name: 'Gate',
      type: 'select',
      required: false,
      options: [
        { id: 'briefed', name: 'Briefed', color: 'gray' },
        { id: 'dti', name: 'DTi', color: 'blue' },
        { id: 'da', name: 'DA', color: 'blue' },
        { id: 'dtx', name: 'DTx', color: 'purple' },
        { id: 'sprint', name: 'Sprint', color: 'green' },
        { id: 'dtl', name: 'DTL', color: 'orange' },
        { id: 'mass-production', name: 'Mass Production', color: 'red' },
        { id: 'dtc', name: 'DTC', color: 'pink' },
      ],
      position: 0,
      showInKanban: true,
      showInTable: true,
    },
  ],
  defaultTasks: [
    { title: 'Complete BOM review' },
    { title: 'Verify costing information' },
    { title: 'Check vendor quotes' },
    { title: 'Review engineering changes' },
    { title: 'Sign off on specifications' },
  ],
  isSystem: true,
  createdAt: Timestamp.fromDate(new Date('2024-01-01')),
  updatedAt: Timestamp.fromDate(new Date('2024-01-01')),
};

/**
 * Procurement Tasks Template
 * For procurement and vendor management
 */
export const PROCUREMENT_TEMPLATE: TaskGroupTemplate = {
  id: 'system-procurement',
  organizationId: 'system',
  name: 'Procurement Tasks',
  description: 'For procurement and vendor management',
  icon: '📦',
  color: undefined,
  defaultView: 'table',
  kanbanGroupBy: 'status',
  customFields: [
    {
      id: 'vendor',
      name: 'Vendor',
      type: 'text',
      required: false,
      position: 0,
      showInKanban: true,
      showInTable: true,
    },
    {
      id: 'po-number',
      name: 'PO Number',
      type: 'text',
      required: false,
      position: 1,
      showInKanban: false,
      showInTable: true,
    },
    {
      id: 'estimated-cost',
      name: 'Estimated Cost',
      type: 'number',
      required: false,
      numberFormat: 'currency',
      position: 2,
      showInKanban: false,
      showInTable: true,
    },
    {
      id: 'required-date',
      name: 'Required Date',
      type: 'date',
      required: false,
      position: 3,
      showInKanban: true,
      showInTable: true,
    },
  ],
  defaultTasks: [],
  isSystem: true,
  createdAt: Timestamp.fromDate(new Date('2024-01-01')),
  updatedAt: Timestamp.fromDate(new Date('2024-01-01')),
};

// ============================================
// TEMPLATE REGISTRY
// ============================================

/**
 * All system templates
 */
export const SYSTEM_TEMPLATES: TaskGroupTemplate[] = [
  BASIC_TASKS_TEMPLATE,
  PRIORITY_TASKS_TEMPLATE,
  CHECKLIST_TEMPLATE,
  SPRINT_PLANNING_TEMPLATE,
  GATE_REVIEW_TEMPLATE,
  PROCUREMENT_TEMPLATE,
];

/**
 * Get a system template by ID
 */
export function getSystemTemplate(templateId: string): TaskGroupTemplate | undefined {
  return SYSTEM_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get all system templates
 */
export function getSystemTemplates(): TaskGroupTemplate[] {
  return SYSTEM_TEMPLATES;
}

/**
 * Check if a template is a system template
 */
export function isSystemTemplate(templateId: string): boolean {
  return templateId.startsWith('system-');
}

// ============================================
// TEMPLATE APPLICATION
// ============================================

/**
 * Apply a template to create a new task group configuration
 * Returns the data needed to create a new TaskGroup
 */
export function applyTemplate(template: TaskGroupTemplate): {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultView: TaskGroupView;
  kanbanGroupBy: string;
  customFields: CustomFieldSchema[];
  templateId: string;
} {
  return {
    name: template.name,
    description: template.description,
    icon: template.icon,
    color: template.color,
    defaultView: template.defaultView,
    kanbanGroupBy: template.kanbanGroupBy,
    customFields: template.customFields.map(field => ({
      ...field,
      id: crypto.randomUUID(), // Generate new IDs for the fields
    })),
    templateId: template.id,
  };
}

/**
 * Get default tasks from a template
 * Returns task inputs ready to be created
 */
export function getTemplateDefaultTasks(
  template: TaskGroupTemplate
): Array<{ title: string; description?: string; subtasks?: { title: string }[] }> {
  return template.defaultTasks || [];
}

// ============================================
// TEMPLATE ICONS
// ============================================

/**
 * Suggested icons for task groups
 */
export const TASK_GROUP_ICONS = [
  '📋', // Basic tasks
  '🎯', // Priority/Goals
  '✅', // Checklist
  '🏃', // Sprint
  '🚦', // Gate review
  '📦', // Procurement
  '🔧', // Engineering
  '💡', // Ideas
  '🐛', // Bugs
  '📝', // Notes
  '📊', // Reports
  '🎨', // Design
  '🔍', // Review
  '⚙️', // Settings/Config
  '📅', // Schedule
  '👥', // Team
];

/**
 * Suggested colors for task groups
 */
export const TASK_GROUP_COLORS = [
  { name: 'Gray', value: '#6B7280' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
];
