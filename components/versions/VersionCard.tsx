'use client';

import { BomVersion } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface VersionCardProps {
  version: BomVersion;
  onClick?: () => void;
}

export function VersionCard({ version, onClick }: VersionCardProps) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors' : ''}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle>Version {version.versionNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-[var(--text-tertiary)]">Snapshot Date:</span>
            <span className="ml-2">
              {version.snapshotDate && format(version.snapshotDate.toDate(), 'PPp')}
            </span>
          </div>
          <div>
            <span className="text-[var(--text-tertiary)]">Total Cost:</span>
            <span className="ml-2 font-medium">£{version.totalCost.toFixed(2)}</span>
          </div>
          {version.changeNote && (
            <div>
              <span className="text-[var(--text-tertiary)]">Note:</span>
              <span className="ml-2">{version.changeNote}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

