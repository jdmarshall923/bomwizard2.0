'use client';

import { BomChange } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChangeCardProps {
  change: BomChange;
}

export function ChangeCard({ change }: ChangeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{change.entityCode}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-[var(--text-tertiary)]">Type:</span>
            <span className="ml-2 capitalize">{change.changeType}</span>
          </div>
          <div>
            <span className="text-[var(--text-tertiary)]">Cost Impact:</span>
            <span className="ml-2 font-medium">
              {change.costImpact >= 0 ? '+' : ''}£{change.costImpact.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

