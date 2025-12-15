'use client';

import { BomChange } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, Edit, Move, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiffViewProps {
  changes: BomChange[];
}

export function DiffView({ changes }: DiffViewProps) {
  const getChangeIcon = (type: BomChange['changeType']) => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-[var(--accent-green)]" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-[var(--accent-red)]" />;
      case 'modified':
        return <Edit className="h-4 w-4 text-[var(--accent-orange)]" />;
      case 'moved':
        return <Move className="h-4 w-4 text-[var(--accent-blue)]" />;
      case 'renamed':
      case 'placeholder_replaced':
        return <Tag className="h-4 w-4 text-[var(--status-new)]" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Changes</CardTitle>
        <CardDescription>View all changes between versions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {changes.map((change) => (
            <div
              key={change.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)]"
            >
              {getChangeIcon(change.changeType)}
              <div className="flex-1">
                <div className="font-medium text-sm">{change.entityCode}</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {change.changeType} - {change.entityType}
                </div>
              </div>
              <div className="text-sm font-medium">
                {change.costImpact >= 0 ? '+' : ''}£{change.costImpact.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

