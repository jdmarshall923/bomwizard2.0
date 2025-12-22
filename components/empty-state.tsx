'use client';

import { LucideIcon, FileBox, Package, Users, FileText, Folder, Upload, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: {
    container: 'py-6',
    icon: 'h-10 w-10',
    iconContainer: 'w-16 h-16',
    title: 'text-base',
    description: 'text-sm max-w-xs',
  },
  md: {
    container: 'py-12',
    icon: 'h-12 w-12',
    iconContainer: 'w-20 h-20',
    title: 'text-lg',
    description: 'text-sm max-w-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'h-16 w-16',
    iconContainer: 'w-24 h-24',
    title: 'text-xl',
    description: 'text-base max-w-md',
  },
};

export function EmptyState({
  icon: Icon = FileBox,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const config = sizeConfig[size];
  const ActionIcon = action?.icon;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      config.container,
      className
    )}>
      <div className={cn(
        'rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4',
        config.iconContainer
      )}>
        <Icon className={cn('text-[var(--text-tertiary)]', config.icon)} />
      </div>
      
      <h3 className={cn('font-medium text-[var(--text-primary)] mb-2', config.title)}>
        {title}
      </h3>
      
      <p className={cn('text-[var(--text-secondary)] mb-6', config.description)}>
        {description}
      </p>
      
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="border-[var(--border-default)]"
            >
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              onClick={action.onClick}
              className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
            >
              {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function NoProjectsEmpty({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <EmptyState
      icon={Folder}
      title="No projects yet"
      description="Create your first project to start managing your Bill of Materials."
      action={{
        label: 'Create Project',
        onClick: onCreateProject,
      }}
      size="lg"
    />
  );
}

export function NoBomItemsEmpty({ onImport }: { onImport: () => void }) {
  return (
    <EmptyState
      icon={Package}
      title="No BOM items"
      description="Import your BOM data from Infor to get started with cost analysis and tracking."
      action={{
        label: 'Import BOM',
        onClick: onImport,
        icon: Upload,
      }}
      size="lg"
    />
  );
}

export function NoVersionsEmpty({ onCreateVersion }: { onCreateVersion?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No versions yet"
      description="Version snapshots will appear here as you make changes to your BOM."
      action={onCreateVersion ? {
        label: 'Create Version',
        onClick: onCreateVersion,
      } : undefined}
      size="md"
    />
  );
}

export function NoVendorsEmpty({ onAddVendor }: { onAddVendor?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No vendors"
      description="Add vendors to track pricing and lead times for your components."
      action={onAddVendor ? {
        label: 'Add Vendor',
        onClick: onAddVendor,
      } : undefined}
      size="md"
    />
  );
}

export function NoSearchResultsEmpty({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <EmptyState
      icon={FileBox}
      title="No results found"
      description="Try adjusting your search terms or filters to find what you're looking for."
      action={{
        label: 'Clear Filters',
        onClick: onClearFilters,
      }}
      size="sm"
    />
  );
}

export function NoDataEmpty() {
  return (
    <EmptyState
      icon={FileBox}
      title="No data available"
      description="There's no data to display at the moment."
      size="sm"
    />
  );
}


