'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CostAnalysisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cost Analysis</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Analyze and visualize BOM costs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Summary</CardTitle>
          <CardDescription>
            Total BOM cost breakdown by material, landing, and labour
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)]">
            Cost analysis dashboard with charts and breakdowns will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

