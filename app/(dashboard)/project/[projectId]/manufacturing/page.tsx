'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ManufacturingLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manufacturing Log</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Track labour costs for manufactured items
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manufacturing Costs</CardTitle>
          <CardDescription>
            Track and manage manufacturing labour costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)]">
            Manufacturing cost tracking will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

