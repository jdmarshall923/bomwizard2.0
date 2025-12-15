'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VersionHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Version History</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Track all changes with visual diffs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Version Timeline</CardTitle>
          <CardDescription>
            View and compare different versions of the BOM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)]">
            Version timeline and comparison tools will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

