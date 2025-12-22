'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { CostDriverSummary } from '@/lib/bom/costAnalysisService';
import { COST_DRIVER_LABELS } from '@/lib/bom/comparisonService';
import { Activity, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostDriversChartProps {
  data: CostDriverSummary[];
  totalChange: number | null;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `£${(value / 1000).toFixed(1)}K`;
  }
  return `£${value.toFixed(0)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: CostDriverSummary & { fill: string; shortLabel: string };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isPositive = data.totalImpact >= 0;
  
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-red-400" />
        ) : (
          <TrendingDown className="h-4 w-4 text-emerald-400" />
        )}
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {data.label}
        </span>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="text-xs text-[var(--text-secondary)]">Impact</span>
          <span className={cn(
            'text-sm font-bold',
            isPositive ? 'text-red-400' : 'text-emerald-400'
          )}>
            {isPositive ? '+' : ''}£{data.totalImpact.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="flex justify-between gap-6">
          <span className="text-xs text-[var(--text-secondary)]">Items Affected</span>
          <span className="text-xs text-[var(--text-primary)]">
            {data.itemCount}
          </span>
        </div>
        
        <div className="flex justify-between gap-6">
          <span className="text-xs text-[var(--text-secondary)]">% of Total Change</span>
          <span className="text-xs text-[var(--text-primary)]">
            {data.percentOfChange.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Truncate long labels
function truncateLabel(label: string, maxLength: number = 15): string {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 2) + '...';
}

export function CostDriversChart({ 
  data, 
  totalChange,
  isLoading = false 
}: CostDriversChartProps) {
  if (isLoading) {
    return (
      <Card className="border-[var(--border-subtle)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cost Drivers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-pulse text-[var(--text-secondary)]">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card className="border-[var(--border-subtle)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cost Drivers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex flex-col items-center justify-center text-center">
            <BarChart3 className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
            <p className="text-[var(--text-secondary)] mb-2">No cost changes detected</p>
            <p className="text-sm text-[var(--text-tertiary)] max-w-sm">
              Create multiple versions to see what's driving cost changes
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data with colors and short labels
  const chartData = data.map((item) => ({
    ...item,
    shortLabel: truncateLabel(item.label),
    fill: item.totalImpact >= 0 ? '#EF4444' : '#10B981',
    // Make values absolute for bar display, track sign separately
    displayValue: Math.abs(item.totalImpact),
  }));

  // Sort by absolute impact
  chartData.sort((a, b) => Math.abs(b.totalImpact) - Math.abs(a.totalImpact));

  // Calculate summary stats
  const increases = data.filter(d => d.totalImpact > 0);
  const decreases = data.filter(d => d.totalImpact < 0);
  const totalIncreases = increases.reduce((sum, d) => sum + d.totalImpact, 0);
  const totalDecreases = decreases.reduce((sum, d) => sum + d.totalImpact, 0);

  return (
    <Card className="border-[var(--border-subtle)]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Cost Drivers
            </CardTitle>
            <CardDescription className="mt-1">
              What's driving cost changes across versions
            </CardDescription>
          </div>
          
          {/* Summary Stats */}
          {totalChange !== null && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-[var(--text-secondary)]">Net Change</p>
                <p className={cn(
                  'text-lg font-bold',
                  totalChange >= 0 ? 'text-red-400' : 'text-emerald-400'
                )}>
                  {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange)}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Impact Summary */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-red-400" />
              <span className="text-xs text-red-400">Increases</span>
            </div>
            <p className="text-lg font-bold text-red-400">
              +{formatCurrency(totalIncreases)}
            </p>
            <p className="text-[10px] text-red-400/70">
              {increases.length} driver{increases.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex-1 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-emerald-400">Decreases</span>
            </div>
            <p className="text-lg font-bold text-emerald-400">
              {formatCurrency(totalDecreases)}
            </p>
            <p className="text-[10px] text-emerald-400/70">
              {decreases.length} driver{decreases.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Horizontal Bar Chart */}
        <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 40)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border-subtle)" 
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              type="number" 
              tickFormatter={(value) => formatCurrency(value)}
              stroke="var(--text-tertiary)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="shortLabel" 
              width={120}
              stroke="var(--text-tertiary)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="var(--border-default)" />
            <Bar 
              dataKey="totalImpact" 
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Driver Details */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Driver Details
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {chartData.slice(0, 6).map((driver, index) => (
              <div 
                key={driver.driver}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)]"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-8 rounded-full"
                    style={{ backgroundColor: driver.fill }}
                  />
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      {driver.label}
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {driver.itemCount} item{driver.itemCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'text-sm font-bold',
                    driver.totalImpact >= 0 ? 'text-red-400' : 'text-emerald-400'
                  )}>
                    {driver.totalImpact >= 0 ? '+' : ''}{formatCurrency(driver.totalImpact)}
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    {driver.percentOfChange.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



