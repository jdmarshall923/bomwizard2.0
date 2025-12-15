'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CostByAssemblyProps {
  data: { assembly: string; cost: number }[];
}

export function CostByAssembly({ data }: CostByAssemblyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by Assembly</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="assembly" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cost" fill="var(--accent-blue)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

