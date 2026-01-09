# Phase 15: Task & Project Management System

**Status**: ✅ Implemented  
**Estimated Duration**: 3-4 weeks  
**Dependencies**: Phase 10.15 (PACE Gates)  
**Completed**: January 2026

---

## Overview

A hierarchical task and project management system inspired by Notion. Provides visibility from Portfolio level (all projects by PACE gate) down to individual tasks linked to parts. Four levels of hierarchy:

```
PORTFOLIO    →  See all projects, where they are in PACE gates
    ↓
MY TASKS     →  Personal todo list across all projects  
    ↓
PROJECT      →  Task groups with Kanban/Table/List views
    ↓
TASK         →  Individual task linked to parts/gates
```

---

## System Hierarchy

### Level 1: Portfolio Overview
**Route**: `/` or `/portfolio`  
**Purpose**: See ALL projects at a glance, organized by PACE gate status

- View all projects with their current PACE gate
- Multiple views: Timeline, Kanban (by gate), Table
- Drill down into any project
- See which projects need attention (overdue tasks, at-risk gates)

### Level 2: My Tasks  
**Route**: `/tasks`  
**Purpose**: Personal task list aggregated from ALL projects

- See your tasks across every project in one place
- Grouped by: Today, This Week, Later, Done Recently
- Filter by project, status, due date
- Quick-add task (select project first)

### Level 3: Project Tasks
**Route**: `/project/[id]/tasks`  
**Purpose**: Full task management for ONE project

- Multiple Task Groups (like Notion databases)
- Each group has its own view: Kanban, Table, or List
- Create custom fields per group
- Link tasks to parts and gates

### Level 4: Task Detail
**Route**: Modal/Drawer  
**Purpose**: Individual task editing

- All default fields + custom fields
- Link to BOM items / New Parts
- Subtasks / checklists
- Assignees (users + external people)

---

## Routes

| Route | Level | Description |
|-------|-------|-------------|
| `/portfolio` | Portfolio | All projects by PACE gate |
| `/tasks` | My Tasks | Cross-project personal task list |
| `/project/[projectId]/overview` | Project | Project gates + task summary |
| `/project/[projectId]/tasks` | Project | Task groups for this project |
| `/project/[projectId]/tasks/[groupId]` | Project | Single task group full-page |
| `/settings/task-templates` | Settings | Manage task group templates |

**Note**: Root route `/` redirects to `/projects` (unchanged). Portfolio is at `/portfolio`.

---

## Navigation Structure

### Global Sidebar Updates

Add Portfolio and My Tasks to `components/layout/GlobalSidebar.tsx`:

```typescript
import { LayoutDashboard, CheckSquare } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Portfolio', href: '/portfolio', icon: LayoutDashboard },  // NEW
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'My Tasks', href: '/tasks', icon: CheckSquare },  // NEW
  { name: 'Specs', href: '/specs', icon: ClipboardList },
  // ... rest of navigation
];
```

### Project Sidebar Updates

Add Tasks to `components/layout/ProjectSidebar.tsx`:

```typescript
import { CheckSquare } from 'lucide-react';

const projectNavigation = [
  { name: 'Overview', href: '/project/[projectId]/overview', icon: Target },
  { name: 'Spec', href: '/project/[projectId]/spec', icon: ClipboardList },
  { name: 'Tasks', href: '/project/[projectId]/tasks', icon: CheckSquare },  // NEW
  { name: 'BOM Explorer', href: '/project/[projectId]/bom', icon: FileText },
  // ... rest of navigation
];
```

---

## Data Model

### Task
```typescript
interface Task {
  id: string;
  projectId: string;
  
  // ─── TASK TYPE & CONTEXT ───
  taskType: 'project' | 'cell';    // Project-level or cell-level (from Phase 14)
  taskGroupId?: string;             // Required for project tasks, null for cell tasks
  
  // ─── CELL-LEVEL TASK FIELDS (Phase 14 compatibility) ───
  // These fields are populated when taskType === 'cell'
  itemId?: string;                  // BOM item ID (for cell tasks)
  itemCode?: string;                // Denormalized item code
  itemDescription?: string;         // Denormalized item description
  field?: string;                   // Field name (e.g., 'materialCost')
  fieldDisplayName?: string;        // Human-readable field name
  threadId?: string;                // Comment thread ID (if from comment)
  commentId?: string;               // Comment ID (if from comment)
  
  // ─── DEFAULT FIELDS (always present) ───
  title: string;                   // Task name - required
  description?: string;            // Markdown supported
  status: 'todo' | 'in_progress' | 'done' | 'pending' | 'completed' | 'cancelled';
  dueDate?: Timestamp;
  assignees: TaskAssignee[];       // Users + external people (replaces single assigneeId)
  linkedItems: LinkedItem[];       // BOM items / New Parts (for project tasks)
  
  // ─── LEGACY ASSIGNEE (Phase 14 compatibility) ───
  // For backward compatibility during migration
  assigneeId?: string;             // Single assignee (migrate to assignees[])
  assigneeName?: string;
  assigneeEmail?: string;
  assignedBy?: string;              // Legacy field
  assignedByName?: string;
  assignedAt?: Timestamp;
  priority?: 'low' | 'normal' | 'high' | 'urgent';  // Legacy from Phase 14
  
  // ─── OPTIONAL ───
  subtasks?: Subtask[];
  linkedGate?: {
    gateId: string;                // 'da', 'dtx', 'sprint', etc.
    gateName: string;
  };
  
  // ─── CUSTOM FIELD VALUES ───
  customFieldValues: Record<string, any>;  // fieldId -> value
  
  // ─── META ───
  position: number;                // For ordering within column/group
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  completedAt?: Timestamp;
  completedBy?: string;
  completedByName?: string;
  completionNote?: string;
  isOverdue?: boolean;             // Legacy from Phase 14
}

interface TaskAssignee {
  type: 'user' | 'external';
  userId?: string;                 // For account users
  externalId?: string;             // For external people
  name: string;                    // Denormalized for display
  email?: string;
  avatarUrl?: string;
}

interface LinkedItem {
  type: 'bomItem' | 'newPart';
  id: string;
  itemCode: string;                // Denormalized: "Bxxx001"
  description: string;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Timestamp;
  position: number;
}
```

### TaskGroup
```typescript
interface TaskGroup {
  id: string;
  projectId: string;
  name: string;                    // "General", "Sprint Prep", "DA Checklist"
  description?: string;
  icon?: string;                   // Emoji: "📋", "🎯", "✅"
  color?: string;
  
  // View preferences
  defaultView: 'kanban' | 'table' | 'list';
  kanbanGroupBy: string;           // Property to group by (default: 'status')
  
  // Template reference (if created from template)
  templateId?: string;
  
  // Custom fields schema (in addition to default fields)
  customFields: CustomFieldSchema[];
  
  // Ordering
  position: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

interface CustomFieldSchema {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'person';
  required?: boolean;
  options?: SelectOption[];        // For select/multi_select
  numberFormat?: 'number' | 'currency' | 'percent';
  position: number;
  showInKanban?: boolean;
  showInTable?: boolean;
}

interface SelectOption {
  id: string;
  name: string;
  color: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';
}
```

### ExternalPerson
```typescript
// People who can be assigned to tasks but don't have accounts
// Remembered organization-wide and suggested based on recent usage
interface ExternalPerson {
  id: string;
  organizationId: string;          // Shared across all projects
  name: string;
  email?: string;
  department?: string;             // "Engineering", "Procurement", etc.
  notes?: string;
  createdAt: Timestamp;
  lastUsedAt: Timestamp;           // For sorting suggestions
}
```

### TaskGroupTemplate
```typescript
interface TaskGroupTemplate {
  id: string;
  organizationId: string;          // Or 'system' for defaults
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultView: 'kanban' | 'table' | 'list';
  kanbanGroupBy: string;
  customFields: CustomFieldSchema[];
  defaultTasks?: {                 // Pre-populated tasks
    title: string;
    subtasks?: { title: string }[];
  }[];
  isSystem: boolean;               // true for built-in templates
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Default Fields vs Custom Fields

### Default Fields (Always Present on Every Task)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | text | Yes | Task name |
| Description | text | No | Markdown supported |
| Status | select | Yes | To Do, In Progress, Done |
| Due Date | date | No | When task is due |
| Assignees | person[] | No | Users + external people |
| Linked Items | relation[] | No | BOM items / New Parts |

### Custom Field Types (Add to Task Groups as Needed)
| Type | Example Use | Storage |
|------|-------------|---------|
| text | Notes, PO Number | string |
| number | Hours, Cost | number |
| select | Priority, Category | string (option id) |
| multi_select | Tags, Labels | string[] (option ids) |
| date | Start Date, Reminder | Timestamp |
| checkbox | Urgent, Approved | boolean |
| url | Drawing Link, Document | string |
| person | Reviewer, Approver | TaskAssignee |

---

## System Default Templates

### 1. Basic Tasks
```
Icon: 📋
View: Kanban
Custom Fields: none
Description: Simple task tracking with just the default fields
```

### 2. Tasks with Priority  
```
Icon: 🎯
View: Kanban
Custom Fields:
  - Priority (select: Low, Medium, High, Urgent)
Description: When you need to prioritize work
```

### 3. Checklist
```
Icon: ✅
View: List
Custom Fields: none
Description: Simple checklist view - great for gate reviews
```

Users can create their own templates with any custom fields needed.

---

## Firestore Structure

```
/organizations/{orgId}
  /externalPeople/{personId}        # Remembered external assignees
  /taskTemplates/{templateId}       # User-created templates

/projects/{projectId}
  /taskGroups/{groupId}             # Task groups (like Notion databases)
  /tasks/{taskId}                   # Unified tasks (both cell-level and project-level)

# Note: Phase 14 cell-level tasks will be migrated/merged into this unified task system
# System default templates stored in code (defaultTemplates.ts)
```

---

## Firestore Security Rules

Add to `firestore.rules`:

```javascript
// Task Groups
match /projects/{projectId}/taskGroups/{groupId} {
  allow read: if isProjectMember(projectId);
  allow create, update: if isProjectMember(projectId);
  allow delete: if isProjectOwner(projectId);
}

// Unified Tasks (Phase 15 - supports both project-level and cell-level tasks)
match /projects/{projectId}/tasks/{taskId} {
  allow read: if isProjectMember(projectId);
  allow create: if isProjectMember(projectId);
  // Project members can update, assignees can update their own tasks
  allow update: if isAuthenticated() && (
    isProjectMember(projectId) ||
    request.auth.uid in resource.data.assignees[].userId ||
    resource.data.assigneeId == request.auth.uid  // Legacy support during migration
  );
  allow delete: if isProjectMember(projectId);
}

// External People (organization-wide)
match /organizations/{orgId}/externalPeople/{personId} {
  allow read: if isOrganizationMember(orgId);
  allow create, update: if isOrganizationMember(orgId);
  allow delete: if isOrganizationAdmin(orgId);
}

// Task Templates (organization-wide)
match /organizations/{orgId}/taskTemplates/{templateId} {
  allow read: if isOrganizationMember(orgId);
  allow create, update: if isOrganizationMember(orgId);
  allow delete: if isOrganizationMember(orgId);
}
```

---

## Firestore Indexes

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "tasks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "projectId", "order": "ASCENDING" },
    { "fieldPath": "taskGroupId", "order": "ASCENDING" },
    { "fieldPath": "position", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "tasks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "assignees", "arrayConfig": "CONTAINS" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "dueDate", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "taskGroups",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "projectId", "order": "ASCENDING" },
    { "fieldPath": "position", "order": "ASCENDING" }
  ]
}
```

---

## Implementation Tasks

### Phase 15.1: Foundation & Data Model
- [ ] Create `types/task.ts` with unified Task interface (supports both cell and project tasks)
- [ ] **MIGRATION**: Merge Phase 14 cell-level tasks into unified system
  - Update `lib/services/taskService.ts` to use unified Task interface
  - Create migration script to convert existing CellTask → Task (taskType: 'cell')
  - Migrate single assigneeId → assignees[] array
  - Update status values: 'pending'/'in_progress'/'completed' → 'todo'/'in_progress'/'done'
  - Test that existing cell comment → task creation still works
- [ ] Create Firestore security rules for unified task collection
- [ ] Create `lib/tasks/taskService.ts` - Unified Task CRUD (replaces old taskService)
- [ ] Create `lib/tasks/taskGroupService.ts` - Task group CRUD
- [ ] Create `lib/tasks/externalPersonService.ts` - External assignees
- [ ] Create `lib/tasks/defaultTemplates.ts` - System templates
- [ ] Create `lib/hooks/useTasks.ts` - Real-time tasks hook (supports filtering by taskType)
- [ ] Create `lib/hooks/useTaskGroups.ts` - Real-time groups hook
- [ ] Create `lib/hooks/useMyTasks.ts` - Cross-project tasks hook (includes both types)

### Phase 15.2: Portfolio View
- [ ] Create `/app/(dashboard)/portfolio/page.tsx`
- [ ] Create `components/portfolio/PortfolioTimeline.tsx`
- [ ] Create `components/portfolio/PortfolioKanban.tsx`
- [ ] Create `components/portfolio/PortfolioTable.tsx`
- [ ] Create `components/portfolio/ProjectCard.tsx`
- [ ] Create `components/portfolio/ViewSwitcher.tsx`
- [ ] Implement drill-down navigation to projects
- [ ] Update `components/layout/GlobalSidebar.tsx`:
  - Add `LayoutDashboard` icon import
  - Add Portfolio navigation item after Home, before Projects

### Phase 15.3: My Tasks View
- [ ] Create `/app/(dashboard)/tasks/page.tsx`
- [ ] Create `components/tasks/MyTasksList.tsx`
- [ ] Create `components/tasks/TaskListItem.tsx`
- [ ] Implement date grouping (Today, This Week, Later, Done)
- [ ] Implement cross-project filtering
- [ ] Quick-add task with project selector
- [ ] Update `components/layout/GlobalSidebar.tsx`:
  - Add `CheckSquare` icon import
  - Add My Tasks navigation item after Portfolio, before Projects

### Phase 15.4: Task Group Components
- [ ] Create `components/tasks/TaskGroupCard.tsx`
- [ ] Create `components/tasks/CreateTaskGroupDialog.tsx`
- [ ] Create `components/tasks/TaskGroupSettings.tsx`
- [ ] Create `components/tasks/CustomFieldEditor.tsx`
- [ ] Create `components/tasks/CustomFieldRenderer.tsx`

### Phase 15.5: Task Views (Kanban, Table, List)
- [ ] Create `components/tasks/TaskKanbanView.tsx` - Drag-and-drop board
- [ ] Create `components/tasks/TaskTableView.tsx` - Spreadsheet with inline edit
- [ ] Create `components/tasks/TaskListView.tsx` - Checklist style
- [ ] Create `components/tasks/TaskCard.tsx` - Card for Kanban
- [ ] Create `components/tasks/TaskRow.tsx` - Row for Table
- [ ] Create `components/tasks/TaskChecklistItem.tsx` - Item for List
- [ ] Create `components/tasks/ViewSwitcher.tsx`
- [ ] Implement drag-and-drop between status columns

### Phase 15.6: Task Detail & Editing
- [ ] Create `components/tasks/TaskDetailModal.tsx`
- [ ] Create `components/tasks/TaskQuickAdd.tsx`
- [ ] Create `components/tasks/SubtaskList.tsx`
- [ ] Create `components/tasks/AssigneePicker.tsx`
  - Unified list showing both users (from Firebase Auth) and external people
  - Badge indicators: "User" for account holders, "External" for non-account people
  - Search functionality to filter by name/email
  - "+ Add External Person" button at bottom (opens dialog to create new external person)
  - Recent external people shown first (sorted by lastUsedAt)
- [ ] Create `components/tasks/ItemLinker.tsx` (BOM items / New Parts)
- [ ] Create `components/tasks/GateLinker.tsx`

### Phase 15.7: Project Tasks Page
- [ ] Create `/app/(dashboard)/project/[projectId]/tasks/page.tsx`
- [ ] Create `/app/(dashboard)/project/[projectId]/tasks/[groupId]/page.tsx`
- [ ] Task group grid/list layout
- [ ] Update `components/layout/ProjectSidebar.tsx`:
  - Add `CheckSquare` icon import
  - Add Tasks navigation item after Spec, before BOM Explorer

### Phase 15.8: Integrations
- [ ] Add "Tasks" tab to `NewPartDetailDrawer.tsx` with linked tasks list
- [ ] Add task count badge to `GateCard.tsx` (click to view details)
- [ ] Quick-create task from part detail drawer
- [ ] Quick-create task from gate card
- [ ] Task count badges on parts and gates

### Phase 15.9: Template Management
- [ ] Create `/app/(dashboard)/settings/task-templates/page.tsx`
- [ ] Create `components/tasks/TemplateEditor.tsx`
- [ ] Create `lib/tasks/taskTemplateService.ts`
- [ ] Implement template customization
- [ ] Set default template preference

### Phase 15.10: Polish & Testing
- [ ] Drag-and-drop reordering (tasks, groups)
- [ ] Keyboard shortcuts (n = new task, etc.)
- [ ] Empty states for all views
- [ ] Loading skeletons
- [ ] Mobile responsive layouts
- [ ] Error handling
- [ ] Performance testing with many tasks

---

## Files to Create

```
types/
└── task.ts                         # Task, TaskGroup, etc. interfaces

lib/tasks/
├── taskService.ts                  # Task CRUD
├── taskGroupService.ts             # Task group CRUD
├── taskTemplateService.ts          # Template management
├── externalPersonService.ts        # External assignees
└── defaultTemplates.ts             # System default templates

lib/hooks/
├── useTasks.ts                     # Tasks for a group
├── useTaskGroups.ts                # Task groups for a project
├── useMyTasks.ts                   # Cross-project tasks for user
└── useExternalPeople.ts            # External people suggestions

components/portfolio/
├── PortfolioTimeline.tsx
├── PortfolioKanban.tsx
├── PortfolioTable.tsx
├── ProjectCard.tsx
└── ViewSwitcher.tsx

components/tasks/
├── TaskGroupCard.tsx
├── CreateTaskGroupDialog.tsx
├── TaskGroupSettings.tsx
├── CustomFieldEditor.tsx
├── CustomFieldRenderer.tsx
├── TaskKanbanView.tsx
├── TaskTableView.tsx
├── TaskListView.tsx
├── TaskCard.tsx
├── TaskRow.tsx
├── TaskChecklistItem.tsx
├── TaskDetailModal.tsx
├── TaskQuickAdd.tsx
├── SubtaskList.tsx
├── AssigneePicker.tsx
├── ItemLinker.tsx
├── GateLinker.tsx
├── MyTasksList.tsx
├── TemplateEditor.tsx
├── ViewSwitcher.tsx
└── index.ts

app/(dashboard)/
├── page.tsx                        # Redirects to /projects (unchanged)
├── portfolio/
│   └── page.tsx                    # Portfolio view (all projects by gate)
├── tasks/
│   └── page.tsx                    # My Tasks (cross-project)
├── project/[projectId]/
│   ├── overview/
│   │   └── page.tsx                # Project overview (gates + summary)
│   └── tasks/
│       ├── page.tsx                # Project task groups
│       └── [groupId]/
│           └── page.tsx            # Single group full-page
└── settings/
    └── task-templates/
        └── page.tsx                # Template management (nested route)
```

---

## Success Criteria

Phase 15 is complete when:

### Portfolio Level
- [ ] Portfolio page shows all projects organized by PACE gate
- [ ] Three views work: Timeline, Kanban (by gate), Table
- [ ] Can drill down from portfolio into any project
- [ ] Project cards show task counts and gate status

### My Tasks Level
- [ ] My Tasks page shows tasks from all projects
- [ ] Tasks grouped by: Today, This Week, Later, Done Recently
- [ ] Can filter by project, status, due date
- [ ] Can quick-add task (with project selection)

### Project Level
- [ ] Task groups can be created from templates or blank
- [ ] Each group has its own view preference (Kanban/Table/List)
- [ ] Kanban drag-and-drop changes task status
- [ ] Table view supports inline editing
- [ ] List view works as simple checklist
- [ ] Custom fields can be added per group

### Task Level
- [ ] Default fields work: title, description, status, due date, assignees, linked items
- [ ] Status workflow: To Do → In Progress → Done
- [ ] Can link tasks to BOM items / New Parts
- [ ] Can link tasks to PACE gates
- [ ] Subtasks / checklists work
- [ ] External assignees (non-account users) can be added and remembered

### Integrations
- [ ] Parts show linked tasks in new "Tasks" tab in detail drawer
  - Shows both cell-level tasks (from comments) and project-level tasks
- [ ] Gates show task count badge (click to view details)
- [ ] Can create task from part detail drawer (creates as taskType: 'cell')
- [ ] Can create task from gate card (creates as taskType: 'project')
- [ ] Cell comments can still create tasks (backward compatible)

### Templates
- [ ] System templates available: Basic, With Priority, Checklist
- [ ] Users can create custom templates
- [ ] Templates can have custom fields pre-configured

---

## Future Enhancements (Not in Phase 15)

- Task comments / activity log
- Task notifications / reminders  
- Recurring tasks
- Time tracking
- Task dependencies (blocked by)
- Bulk actions (move, assign, delete multiple)
- Task import/export
- Calendar view
- Mobile app support
- Task search across all projects
