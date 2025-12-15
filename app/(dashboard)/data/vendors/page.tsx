'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VendorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendors</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Manage vendor information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
          <CardDescription>
            View and manage vendor master data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)]">
            Vendors table with CRUD operations will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

