'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Legend,
} from 'recharts';
import { CostTrendPoint } from '@/lib/bom/costAnalysisService';
import { TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostTrendChartProps {
  data: CostTrendPoint[];
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(1)}K`;
  }
  return `£${value.toFixed(0)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type ViewMode = 'total' | 'breakdown';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: CostTrendPoint & { 
      dateStr: string; 
      materialCostVal: number;
      landingCostVal: number;
      labourCostVal: number;
    };
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const prevData = payload[0].payload as unknown as { prevCost?: number };
  const change = prevData.prevCost 
    ? data.totalCost - prevData.prevCost 
    : null;
  const changePercent = prevData.prevCost && prevData.prevCost > 0
    ? (change! / prevData.prevCost) * 100
    : null;

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs">v{data.versionNumber}</Badge>
        <span className="text-xs text-[var(--text-secondary)]">
          {formatFullDate(data.date)}
        </span>
      </div>
      
      {data.versionName && (
        <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
          {data.versionName}
        </p>
      )}
      
      <div className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <span className="text-xs text-[var(--text-secondary)]">Total Cost</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">
            £{data.totalCost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-xs text-blue-400">Material</span>
          <span className="text-xs text-[var(--text-primary)]">
            £{data.materialCost.toLocaleString()}
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-xs text-orange-400">Landing</span>
          <span className="text-xs text-[var(--text-primary)]">
            £{data.landingCost.toLocaleString()}
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-xs text-emerald-400">Labour</span>
          <span className="text-xs text-[var(--text-primary)]">
            £{data.labourCost.toLocaleString()}
          </span>
        </div>
        
        {change !== null && (
          <>
            <div className="border-t border-[var(--border-subtle)] mt-2 pt-2">
              <div className="flex items-center gap-1">
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-emerald-400" />
                )}
                <span className={cn(
                  'text-xs font-medium',
                  change >= 0 ? 'text-red-400' : 'text-emerald-400'
                )}>
                  {change >= 0 ? '+' : ''}£{change.toLocaleString()} ({changePercent?.toFixed(1)}%)
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">vs previous version</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CostTrendChart({ data, isLoading = false }: CostTrendChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  
  if (isLoading) {
    return (
      <Card className="border-[var(--border-subtle)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cost Trend
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
            <TrendingUp className="h-5 w-5" />
            Cost Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex flex-col items-center justify-center text-center">
            <Layers className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
            <p className="text-[var(--text-secondary)] mb-2">No version history yet</p>
            <p className="text-sm text-[var(--text-tertiary)] max-w-sm">
              Create versions to track cost changes over time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend
  const firstCost = data[0]?.totalCost || 0;
  const lastCost = data[data.length - 1]?.totalCost || 0;
  const totalChange = lastCost - firstCost;
  const totalChangePercent = firstCost > 0 ? (totalChange / firstCost) * 100 : 0;

  // Add previous cost for tooltips
  const chartData = data.map((point, index) => ({
    ...point,
    dateStr: formatDate(point.date),
    prevCost: index > 0 ? data[index - 1].totalCost : null,
    materialCostVal: point.materialCost,
    landingCostVal: point.landingCost,
    labourCostVal: point.labourCost,
  }));

  return (
    <Card className="border-[var(--border-subtle)]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cost Trend
            </CardTitle>
            <CardDescription className="mt-1">
              Cost evolution across {data.length} version{data.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Overall Change Badge */}
            {data.length > 1 && (
              <div className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                totalChange >= 0 
                  ? 'bg-red-500/20 text-red-400' 
                  : 'bg-emerald-500/20 text-emerald-400'
              )}>
                {totalChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange)} ({totalChangePercent.toFixed(1)}%)
              </div>
            )}
            
            {/* View Toggle */}
            <div className="flex rounded-lg overflow-hidden border border-[var(--border-subtle)]">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'rounded-none h-7 px-3 text-xs',
                  viewMode === 'total' && 'bg-[var(--bg-tertiary)]'
                )}
                onClick={() => setViewMode('total')}
              >
                Total
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'rounded-none h-7 px-3 text-xs',
                  viewMode === 'breakdown' && 'bg-[var(--bg-tertiary)]'
                )}
                onClick={() => setViewMode('breakdown')}
              >
                Breakdown
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="materialGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="landingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="labourGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border-subtle)" 
              vertical={false}
            />
            <XAxis 
              dataKey="dateStr" 
              stroke="var(--text-tertiary)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              stroke="var(--text-tertiary)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {viewMode === 'total' ? (
              <Area
                type="monotone"
                dataKey="totalCost"
                stroke="var(--accent-blue)"
                strokeWidth={2}
                fill="url(#totalGradient)"
                dot={{ 
                  r: 4, 
                  fill: 'var(--bg-primary)', 
                  stroke: 'var(--accent-blue)', 
                  strokeWidth: 2 
                }}
                activeDot={{ 
                  r: 6, 
                  fill: 'var(--accent-blue)', 
                  stroke: 'var(--bg-primary)', 
                  strokeWidth: 2 
                }}
              />
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="materialCostVal"
                  name="Material"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="url(#materialGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="landingCostVal"
                  name="Landing"
                  stackId="1"
                  stroke="#F97316"
                  fill="url(#landingGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="labourCostVal"
                  name="Labour"
                  stackId="1"
                  stroke="#10B981"
                  fill="url(#labourGradient)"
                />
                <Legend 
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-[var(--text-secondary)]">{value}</span>
                  )}
                />
              </>
            )}
            
            {/* Reference line at first cost */}
            {viewMode === 'total' && data.length > 1 && (
              <ReferenceLine 
                y={firstCost} 
                stroke="var(--text-tertiary)" 
                strokeDasharray="3 3"
                label={{
                  value: 'Initial',
                  position: 'right',
                  fill: 'var(--text-tertiary)',
                  fontSize: 10,
                }}
              />
            )}
            
            {data.length > 5 && (
              <Brush 
                dataKey="dateStr" 
                height={30} 
                stroke="var(--border-default)"
                fill="var(--bg-secondary)"
                travellerWidth={10}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

