'use client';

import { BomVersion } from '@/types';
import { Card, CardContent } from '@/components/ui/card';

interface TimelineProps {
  versions: BomVersion[];
  onVersionSelect?: (version: BomVersion) => void;
}

export function Timeline({ versions, onVersionSelect }: TimelineProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {versions.map((version, idx) => (
            <div key={version.id} className="flex items-center">
              <div
                className="h-3 w-3 rounded-full bg-[var(--accent-blue)] cursor-pointer hover:scale-125 transition-transform"
                onClick={() => onVersionSelect?.(version)}
                title={`Version ${version.versionNumber}`}
              />
              {idx < versions.length - 1 && (
                <div className="w-16 h-0.5 bg-[var(--border-subtle)]" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4">
          {versions.map((version) => (
            <div key={version.id} className="text-xs text-[var(--text-secondary)]">
              v{version.versionNumber}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

