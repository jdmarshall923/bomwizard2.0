// Re-export all types from individual modules
export * from './project';
export * from './bom';
export * from './quote';
export * from './vendor';
export * from './import';
export * from './newPart';
export * from './spec';

// Phase 14: Draft PBoM, Excel-Like Table & Collaboration
export * from './changes';
export * from './settings';
export * from './activity';

// Phase 14: Comments - export everything except task-related types (moved to unified task.ts)
export type { ThreadStatus } from './comments';
export type { CommentThread } from './comments';
export type { CellComment } from './comments';
export type { CommentMention } from './comments';
export type { CellTask } from './comments';  // Keep legacy CellTask for backward compatibility
export type { MentionableUser } from './comments';
export type { CreateThreadInput } from './comments';
export type { AddCommentInput } from './comments';
export type { ThreadFilters } from './comments';
// Legacy task types renamed to avoid conflicts with unified Phase 15 task types
export type { TaskStatus as LegacyCellTaskStatus } from './comments';
export type { TaskPriority as LegacyCellTaskPriority } from './comments';
export type { CreateTaskInput as LegacyCreateTaskInput } from './comments';
export type { TaskFilters as LegacyCellTaskFilters } from './comments';

// Phase 15: Task & Project Management System (unified task types)
export * from './task';

// Phase 17: Running Changes Management
export * from './runningChange';
