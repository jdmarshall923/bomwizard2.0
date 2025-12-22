'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Page header skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}

// Stats cards skeleton
export function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-[var(--bg-secondary)]">
          <CardContent className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="border border-[var(--border-default)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex bg-[var(--bg-tertiary)] p-3 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex p-3 gap-4 border-t border-[var(--border-subtle)]">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Tree view skeleton
export function TreeSkeleton({ items = 8 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => {
        const isGroup = i % 3 === 0;
        const indent = isGroup ? 0 : Math.min((i % 3) * 16, 32);
        
        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg',
              isGroup && 'bg-[var(--bg-tertiary)]'
            )}
            style={{ paddingLeft: `${8 + indent}px` }}
          >
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className={cn('h-4', isGroup ? 'w-32' : 'w-24')} />
            <Skeleton className="h-4 flex-1 max-w-xs" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
        );
      })}
    </div>
  );
}

// Kanban skeleton
export function KanbanSkeleton({ columns = 5, cardsPerColumn = 3 }: { columns?: number; cardsPerColumn?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, colIndex) => (
        <div key={colIndex} className="flex-shrink-0 w-72">
          {/* Column header */}
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          
          {/* Cards */}
          <div className="space-y-3">
            {Array.from({ length: Math.max(1, cardsPerColumn - colIndex % 2) }).map((_, cardIndex) => (
              <Card key={cardIndex} className="bg-[var(--bg-secondary)]">
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ type = 'bar' }: { type?: 'bar' | 'line' | 'pie' }) {
  if (type === 'pie') {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="h-48 w-48 rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex items-end gap-3 h-48">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton 
              className="w-full" 
              style={{ height: `${30 + Math.random() * 70}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

// Card list skeleton
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-[var(--bg-secondary)]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Drawer skeleton
export function DrawerSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </div>
  );
}

// Full page loading skeleton
export function FullPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton />
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}

// BOM Control Panel skeleton
export function BomControlPanelSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Skeleton className="h-7 w-48 mb-1" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      
      {/* Main panels */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left panel */}
        <div className="col-span-4">
          <Card className="h-full">
            <CardContent className="p-4">
              <TreeSkeleton items={10} />
            </CardContent>
          </Card>
        </div>
        
        {/* Right panel */}
        <div className="col-span-8">
          <Card className="h-full">
            <CardContent className="p-4">
              <div className="space-y-4">
                <StatsCardsSkeleton count={4} />
                <TableSkeleton rows={6} columns={5} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Transfer bar */}
      <div className="mt-4">
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-36" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


