'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { PriceVolatilityItem } from '@/lib/bom/costAnalysisService';
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceVolatilityChartProps {
  data: PriceVolatilityItem[];
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
    payload: PriceVolatilityItem;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isIncrease = data.absoluteChange >= 0;
  
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-3 shadow-xl">
      <div className="mb-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {data.itemCode}
        </p>
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
          {data.itemDescription}
        </p>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="text-xs text-[var(--text-secondary)]">Original Cost</span>
          <span className="text-xs text-[var(--text-primary)]">
            £{data.originalCost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="flex justify-between gap-6">
          <span className="text-xs text-[var(--text-secondary)]">Current Cost</span>
          <span className="text-xs text-[var(--text-primary)]">
            £{data.currentCost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="flex justify-between gap-6">
          <span className="text-xs text-[var(--text-secondary)]">Change</span>
          <span className={cn(
            'text-xs font-medium',
            isIncrease ? 'text-red-400' : 'text-emerald-400'
          )}>
            {isIncrease ? '+' : ''}£{data.absoluteChange.toLocaleString()} ({data.percentChange.toFixed(1)}%)
          </span>
        </div>
        
        <div className="flex justify-between gap-6">
          <span className="text-xs text-[var(--text-secondary)]">Assembly</span>
          <span className="text-xs text-[var(--text-primary)]">
            {data.groupCode}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PriceVolatilityChart({ data, isLoading = false }: PriceVolatilityChartProps) {
  if (isLoading) {
    return (
      <Card className="border-[var(--border-subtle)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Price Volatility
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
            Price Volatility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex flex-col items-center justify-center text-center">
            <Activity className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
            <p className="text-[var(--text-secondary)] mb-2">No price changes detected</p>
            <p className="text-sm text-[var(--text-tertiary)] max-w-sm">
              Price volatility will appear when items have price changes across versions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by absolute percentage change and take top 10
  const topVolatile = [...data]
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, 10);

  // Prepare chart data
  const chartData = topVolatile.map(item => ({
    ...item,
    name: item.itemCode,
    fill: item.percentChange >= 0 ? '#EF4444' : '#10B981',
  }));

  // Calculate summary stats
  const increases = data.filter(d => d.absoluteChange > 0);
  const decreases = data.filter(d => d.absoluteChange < 0);
  const avgChange = data.reduce((sum, d) => sum + Math.abs(d.percentChange), 0) / data.length;

  return (
    <Card className="border-[var(--border-subtle)]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Price Volatility
            </CardTitle>
            <CardDescription className="mt-1">
              Items with the largest price changes
            </CardDescription>
          </div>
          
          {/* Summary Badge */}
          <Badge 
            variant="outline" 
            className={cn(
              'px-2.5 py-1',
              avgChange > 15 && 'border-red-500/50 text-red-400',
              avgChange > 5 && avgChange <= 15 && 'border-amber-500/50 text-amber-400',
              avgChange <= 5 && 'border-emerald-500/50 text-emerald-400'
            )}
          >
            {avgChange > 15 && <AlertTriangle className="h-3 w-3 mr-1" />}
            Avg: {avgChange.toFixed(1)}% change
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Bar Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border-subtle)" 
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              type="number" 
              tickFormatter={(value) => `${value}%`}
              stroke="var(--text-tertiary)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={55}
              stroke="var(--text-tertiary)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="var(--border-default)" />
            <Bar 
              dataKey="percentChange" 
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

        {/* Item Details List */}
        <ScrollArea className="h-[180px] mt-4">
          <div className="space-y-2">
            {topVolatile.map((item, index) => {
              const isIncrease = item.absoluteChange >= 0;
              return (
                <div 
                  key={item.itemCode}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium',
                      isIncrease ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    )}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {item.itemCode}
                        </p>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {item.groupCode}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {item.itemDescription}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="flex items-center gap-1 justify-end">
                      {isIncrease ? (
                        <TrendingUp className="h-3 w-3 text-red-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-emerald-400" />
                      )}
                      <span className={cn(
                        'text-sm font-bold',
                        isIncrease ? 'text-red-400' : 'text-emerald-400'
                      )}>
                        {isIncrease ? '+' : ''}{item.percentChange.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {isIncrease ? '+' : ''}{formatCurrency(item.absoluteChange)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

