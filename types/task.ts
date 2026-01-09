import { Timestamp } from 'firebase/firestore';

/**
 * Phase 15: Task & Project Management System
 * 
 * Unified task system that supports both:
 * - Project-level tasks (from task groups, Kanban boards)
 * - Cell-level tasks (from Phase 14 cell comments)
 */

// ============================================
// TASK STATUS & PRIORITY
// ============================================

/**
 * Task status values
 * Unified status that works for both project and cell tasks
 */
export type TaskStatus = 'todo' | 'in_progress' | 'done';

/**
 * Legacy status values for Phase 14 compatibility
 * These are mapped to the new status values during migration
 */
export type LegacyTaskStatus = 'pending' | 'completed' | 'cancelled';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Task type discriminator
 */
export type TaskType = 'project' | 'cell';

// ============================================
// TASK ASSIGNEE
// ============================================

/**
 * Task assignee - can be a user with an account or an external person
 */
export interface TaskAssignee {
  type: 'user' | 'external';
  userId?: string;         // For account users (Firebase Auth UID)
  externalId?: string;     // For external people (from organizations collection)
  name: string;            // Denormalized for display
  email?: string;
  avatarUrl?: string;
}

// ============================================
// LINKED ITEMS
// ============================================

/**
 * Item linked to a task (BOM item or New Part)
 */
export interface LinkedItem {
  type: 'bomItem' | 'newPart';
  id: string;
  itemCode: string;        // Denormalized: "Bxxx001"
  description: string;     // Denormalized for display
}

/**
 * PACE gate linked to a task
 */
export interface LinkedGate {
  gateId: string;          // 'briefed', 'dti', 'da', 'dtx', 'sprint', 'dtl', 'massProduction', 'dtc'
  gateName: string;        // Human-readable name
}

// ============================================
// SUBTASKS
// ============================================

/**
 * Subtask / checklist item within a task
 */
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Timestamp;
  completedBy?: string;
  position: number;
}

// ============================================
// UNIFIED TASK
// ============================================

/**
 * Unified Task interface
 * Supports both project-level tasks (from task groups) and cell-level tasks (from Phase 14)
 */
export interface Task {
  id: string;
  projectId: string;
  
  // ─── TASK TYPE & CONTEXT ───
  taskType: TaskType;              // 'project' or 'cell'
  taskGroupId?: string;            // Required for project tasks, null for cell tasks
  
  // ─── CELL-LEVEL TASK FIELDS (Phase 14 compatibility) ───
  // Populated when taskType === 'cell'
  itemId?: string;                 // BOM item ID
  itemCode?: string;               // Denormalized item code
  itemDescription?: string;        // Denormalized item description
  field?: string;                  // Field name (e.g., 'materialCost')
  fieldDisplayName?: string;       // Human-readable field name
  threadId?: string;               // Comment thread ID
  commentId?: string;              // Comment ID
  
  // ─── DEFAULT FIELDS ───
  title: string;                   // Task name - required
  description?: string;            // Markdown supported
  status: TaskStatus;              // 'todo', 'in_progress', 'done'
  priority?: TaskPriority;         // 'low', 'normal', 'high', 'urgent'
  dueDate?: Timestamp;
  assignees: TaskAssignee[];       // Users + external people
  linkedItems: LinkedItem[];       // BOM items / New Parts
  linkedGate?: LinkedGate;         // PACE gate link
  
  // ─── SUBTASKS ───
  subtasks?: Subtask[];
  
  // ─── CUSTOM FIELD VALUES ───
  customFieldValues?: Record<string, unknown>;  // fieldId -> value
  
  // ─── ORDERING ───
  position: number;                // For ordering within column/group
  
  // ─── AUDIT ───
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  createdByName?: string;
  
  // ─── COMPLETION ───
  completedAt?: Timestamp;
  completedBy?: string;
  completedByName?: string;
  completionNote?: string;
  
  // ─── LEGACY FIELDS (Phase 14 compatibility) ───
  // For backward compatibility during migration
  assigneeId?: string;             // Single assignee (migrate to assignees[])
  assigneeName?: string;
  assigneeEmail?: string;
  assignedBy?: string;
  assignedByName?: string;
  assignedAt?: Timestamp;
  isOverdue?: boolean;
}

/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
  projectId: string;
  taskType: TaskType;
  taskGroupId?: string;
  
  // Cell task fields
  itemId?: string;
  itemCode?: string;
  itemDescription?: string;
  field?: string;
  fieldDisplayName?: string;
  threadId?: string;
  commentId?: string;
  
  // Default fields
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Timestamp;
  assignees?: TaskAssignee[];
  linkedItems?: LinkedItem[];
  linkedGate?: LinkedGate;
  subtasks?: Subtask[];
  customFieldValues?: Record<string, unknown>;
}

/**
 * Input for updating a task
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Timestamp | null;
  assignees?: TaskAssignee[];
  linkedItems?: LinkedItem[];
  linkedGate?: LinkedGate | null;
  subtasks?: Subtask[];
  customFieldValues?: Record<string, unknown>;
  position?: number;
  completionNote?: string;
}

// ============================================
// TASK GROUP
// ============================================

/**
 * Task Group - like a Notion database
 * Each project can have multiple task groups with different views and custom fields
 */
export interface TaskGroup {
  id: string;
  projectId: string;
  name: string;                    // "General", "Sprint Prep", "DA Checklist"
  description?: string;
  icon?: string;                   // Emoji: "📋", "🎯", "✅"
  color?: string;                  // Accent color
  
  // View preferences
  defaultView: TaskGroupView;
  kanbanGroupBy: string;           // Property to group by (default: 'status')
  
  // Template reference (if created from template)
  templateId?: string;
  
  // Custom fields schema
  customFields: CustomFieldSchema[];
  
  // Ordering
  position: number;
  
  // Task count (denormalized for performance)
  taskCount?: number;
  
  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * Task group view types
 */
export type TaskGroupView = 'kanban' | 'table' | 'list';

/**
 * Input for creating a task group
 */
export interface CreateTaskGroupInput {
  projectId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultView?: TaskGroupView;
  kanbanGroupBy?: string;
  templateId?: string;
  customFields?: CustomFieldSchema[];
}

/**
 * Input for updating a task group
 */
export interface UpdateTaskGroupInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultView?: TaskGroupView;
  kanbanGroupBy?: string;
  customFields?: CustomFieldSchema[];
  position?: number;
}

// ============================================
// CUSTOM FIELDS
// ============================================

/**
 * Custom field types
 */
export type CustomFieldType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'multi_select' 
  | 'date' 
  | 'checkbox' 
  | 'url' 
  | 'person';

/**
 * Number format for number fields
 */
export type NumberFormat = 'number' | 'currency' | 'percent';

/**
 * Select option for select/multi_select fields
 */
export interface SelectOption {
  id: string;
  name: string;
  color: SelectOptionColor;
}

/**
 * Available colors for select options
 */
export type SelectOptionColor = 
  | 'gray' 
  | 'red' 
  | 'orange' 
  | 'yellow' 
  | 'green' 
  | 'blue' 
  | 'purple' 
  | 'pink';

/**
 * Custom field schema definition
 */
export interface CustomFieldSchema {
  id: string;
  name: string;
  type: CustomFieldType;
  required?: boolean;
  options?: SelectOption[];        // For select/multi_select
  numberFormat?: NumberFormat;     // For number fields
  position: number;
  showInKanban?: boolean;
  showInTable?: boolean;
}

// ============================================
// EXTERNAL PERSON
// ============================================

/**
 * External person - can be assigned to tasks but doesn't have an account
 * Stored organization-wide and suggested based on recent usage
 */
export interface ExternalPerson {
  id: string;
  organizationId: string;          // Shared across all projects
  name: string;
  email?: string;
  department?: string;             // "Engineering", "Procurement", etc.
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastUsedAt: Timestamp;           // For sorting suggestions
}

/**
 * Input for creating an external person
 */
export interface CreateExternalPersonInput {
  organizationId: string;
  name: string;
  email?: string;
  department?: string;
  notes?: string;
}

// ============================================
// TASK GROUP TEMPLATE
// ============================================

/**
 * Task group template - reusable configuration for task groups
 * Can be system-provided or user-created
 */
export interface TaskGroupTemplate {
  id: string;
  organizationId: string;          // 'system' for built-in templates
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultView: TaskGroupView;
  kanbanGroupBy: string;
  customFields: CustomFieldSchema[];
  defaultTasks?: DefaultTask[];    // Pre-populated tasks
  isSystem: boolean;               // true for built-in templates
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;              // null for system templates
}

/**
 * Default task in a template
 */
export interface DefaultTask {
  title: string;
  description?: string;
  subtasks?: { title: string }[];
}

/**
 * Input for creating a task group template
 */
export interface CreateTemplateInput {
  organizationId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultView?: TaskGroupView;
  kanbanGroupBy?: string;
  customFields?: CustomFieldSchema[];
  defaultTasks?: DefaultTask[];
}

// ============================================
// QUERY FILTERS
// ============================================

/**
 * Filters for querying tasks
 */
export interface TaskFilters {
  projectId?: string;
  taskGroupId?: string;
  taskType?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeUserId?: string;
  hasLinkedGate?: boolean;
  gateId?: string;
  isOverdue?: boolean;
  dueBefore?: Timestamp;
  dueAfter?: Timestamp;
  limit?: number;
}

/**
 * Filters for querying task groups
 */
export interface TaskGroupFilters {
  projectId: string;
  limit?: number;
}

/**
 * Filters for querying external people
 */
export interface ExternalPersonFilters {
  organizationId: string;
  search?: string;
  limit?: number;
}

// ============================================
// TASK COUNTS & STATS
// ============================================

/**
 * Task count by status
 */
export interface TaskStatusCounts {
  todo: number;
  in_progress: number;
  done: number;
  total: number;
}

/**
 * Task group with task counts
 */
export interface TaskGroupWithCounts extends TaskGroup {
  taskCounts: TaskStatusCounts;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Default status for new tasks
 */
export const DEFAULT_TASK_STATUS: TaskStatus = 'todo';

/**
 * Default priority for new tasks
 */
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'normal';

/**
 * Status display labels
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

/**
 * Priority display labels
 */
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

/**
 * Priority colors for UI
 */
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-[var(--text-tertiary)]',
  normal: 'text-[var(--accent-blue)]',
  high: 'text-[var(--accent-orange)]',
  urgent: 'text-[var(--accent-red)]',
};

/**
 * Status colors for UI
 */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-[var(--text-tertiary)]/20 text-[var(--text-tertiary)]',
  in_progress: 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]',
  done: 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]',
};

/**
 * Select option colors for UI
 */
export const SELECT_OPTION_COLORS: Record<SelectOptionColor, { bg: string; text: string }> = {
  gray: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400' },
};

/**
 * Map legacy Phase 14 status to new status
 */
export function mapLegacyStatus(status: string): TaskStatus {
  switch (status) {
    case 'pending':
      return 'todo';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
    case 'done':
      return 'done';
    case 'cancelled':
      return 'done'; // Treat cancelled as done
    default:
      return 'todo';
  }
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return task.dueDate.toMillis() < Date.now();
}

/**
 * Get tasks due today
 */
export function isTaskDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dueTime = task.dueDate.toMillis();
  return dueTime >= today.getTime() && dueTime < tomorrow.getTime();
}

/**
 * Get tasks due this week
 */
export function isTaskDueThisWeek(task: Task): boolean {
  if (!task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
  
  const dueTime = task.dueDate.toMillis();
  return dueTime >= today.getTime() && dueTime < endOfWeek.getTime();
}
