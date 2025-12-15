'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function QuoteLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quote Log</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Track quotes for new purchased parts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
          <CardDescription>
            Manage quotes in kanban or table view
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)]">
            Quote management with kanban and table views will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

