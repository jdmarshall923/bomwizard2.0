'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VersionDetailPage() {
  const params = useParams();
  const versionId = params?.versionId as string;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Version Detail</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          View details and compare versions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Version {versionId}</CardTitle>
          <CardDescription>
            Detailed view and comparison of this version
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)]">
            Version detail and diff view will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

