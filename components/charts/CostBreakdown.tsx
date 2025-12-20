'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CostBreakdownProps {
  materialCost: number;
  landingCost: number;
  labourCost: number;
  overheadCost: number;
}

export function CostBreakdown({
  materialCost,
  landingCost,
  labourCost,
  overheadCost,
}: CostBreakdownProps) {
  const data = [
    { name: 'Material', value: materialCost, color: 'var(--accent-blue)' },
    { name: 'Landing', value: landingCost, color: 'var(--accent-orange)' },
    { name: 'Labour', value: labourCost, color: 'var(--accent-green)' },
    { name: 'Overhead', value: overheadCost, color: 'var(--text-tertiary)' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

