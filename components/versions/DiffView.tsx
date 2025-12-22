'use client';

import { BomChange } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, Edit, RefreshCw } from 'lucide-react';
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
      case 'replaced':
        return <RefreshCw className="h-4 w-4 text-[var(--accent-blue)]" />;
      default:
        return null;
    }
  };

  const getChangeColor = (type: BomChange['changeType']) => {
    switch (type) {
      case 'added':
        return 'border-[var(--accent-green)]/30';
      case 'removed':
        return 'border-[var(--accent-red)]/30';
      case 'modified':
        return 'border-[var(--accent-orange)]/30';
      case 'replaced':
        return 'border-[var(--accent-blue)]/30';
      default:
        return 'border-[var(--border-subtle)]';
    }
  };

  if (changes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Changes</CardTitle>
          <CardDescription>No changes between these versions</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Changes ({changes.length})</CardTitle>
        <CardDescription>View all changes between versions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {changes.map((change) => (
            <div
              key={change.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                getChangeColor(change.changeType)
              )}
            >
              {getChangeIcon(change.changeType)}
              <div className="flex-1">
                <div className="font-medium text-sm">{change.itemCode}</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {change.itemDescription}
                </div>
              </div>
              <div className="text-right">
                <div className={cn(
                  "text-sm font-medium",
                  change.costImpact.extendedDelta >= 0 
                    ? 'text-[var(--accent-green)]' 
                    : 'text-[var(--accent-red)]'
                )}>
                  {change.costImpact.extendedDelta >= 0 ? '+' : ''}
                  £{change.costImpact.extendedDelta.toFixed(2)}
                </div>
                <div className="text-xs text-[var(--text-tertiary)] capitalize">
                  {change.changeType}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


