'use client';

import { Task } from '@/types/task';
import { TaskListItem } from './TaskListItem';
import { cn } from '@/lib/utils';
import { AlertTriangle, Calendar, Clock, CheckCircle2, Circle } from 'lucide-react';

interface GroupedTasks {
  overdue: Task[];
  today: Task[];
  thisWeek: Task[];
  later: Task[];
  completed: Task[];
  noDueDate: Task[];
}

interface MyTasksListProps {
  groupedTasks: GroupedTasks;
  projectNames?: Record<string, string>;
  onTaskClick?: (task: Task) => void;
}

interface TaskSectionProps {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  projectNames?: Record<string, string>;
  onTaskClick?: (task: Task) => void;
  defaultExpanded?: boolean;
  accentColor?: string;
}

function TaskSection({
  title,
  icon,
  tasks,
  projectNames,
  onTaskClick,
  defaultExpanded = true,
  accentColor,
}: TaskSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className={cn('flex items-center gap-2 text-sm font-semibold', accentColor)}>
          {icon}
          {title}
        </span>
        <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            showProject
            projectName={projectNames?.[task.projectId]}
            onTaskClick={() => onTaskClick?.(task)}
          />
        ))}
      </div>
    </div>
  );
}

export function MyTasksList({ groupedTasks, projectNames, onTaskClick }: MyTasksListProps) {
  const hasAnyTasks =
    groupedTasks.overdue.length > 0 ||
    groupedTasks.today.length > 0 ||
    groupedTasks.thisWeek.length > 0 ||
    groupedTasks.later.length > 0 ||
    groupedTasks.noDueDate.length > 0 ||
    groupedTasks.completed.length > 0;

  if (!hasAnyTasks) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-[var(--bg-tertiary)] mb-4">
          <CheckCircle2 className="h-8 w-8 text-[var(--accent-green)]" />
        </div>
        <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
        <p className="text-[var(--text-secondary)] max-w-sm">
          You don't have any tasks assigned to you. Tasks assigned from project task groups or cell comments will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TaskSection
        title="Overdue"
        icon={<AlertTriangle className="h-4 w-4" />}
        tasks={groupedTasks.overdue}
        projectNames={projectNames}
        onTaskClick={onTaskClick}
        accentColor="text-[var(--accent-red)]"
      />

      <TaskSection
        title="Today"
        icon={<Circle className="h-4 w-4" />}
        tasks={groupedTasks.today}
        projectNames={projectNames}
        onTaskClick={onTaskClick}
        accentColor="text-[var(--accent-orange)]"
      />

      <TaskSection
        title="This Week"
        icon={<Calendar className="h-4 w-4" />}
        tasks={groupedTasks.thisWeek}
        projectNames={projectNames}
        onTaskClick={onTaskClick}
      />

      <TaskSection
        title="Later"
        icon={<Clock className="h-4 w-4" />}
        tasks={groupedTasks.later}
        projectNames={projectNames}
        onTaskClick={onTaskClick}
      />

      <TaskSection
        title="No Due Date"
        icon={<Circle className="h-4 w-4" />}
        tasks={groupedTasks.noDueDate}
        projectNames={projectNames}
        onTaskClick={onTaskClick}
        accentColor="text-[var(--text-tertiary)]"
      />

      <TaskSection
        title="Completed Recently"
        icon={<CheckCircle2 className="h-4 w-4" />}
        tasks={groupedTasks.completed}
        projectNames={projectNames}
        onTaskClick={onTaskClick}
        accentColor="text-[var(--accent-green)]"
        defaultExpanded={false}
      />
    </div>
  );
}
