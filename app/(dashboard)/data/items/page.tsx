'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ItemsMasterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Items Master</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Manage global items database
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            View and manage all items across all projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)]">
            Items master table with search, filters, and CRUD operations will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

