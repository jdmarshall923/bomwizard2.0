'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingRatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Landing Rates</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Manage landing rates by country
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Landing Rates</CardTitle>
          <CardDescription>
            Configure landing rates for different countries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)]">
            Landing rates management table will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

