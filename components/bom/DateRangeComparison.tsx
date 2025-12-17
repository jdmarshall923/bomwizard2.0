'use client';

import { useState } from 'react';
import { DateRangeComparison as DateRangeComparisonType, CostDriver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  ArrowRight,
  ChevronRight,
  BarChart3,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { COST_DRIVER_LABELS } from '@/lib/bom/comparisonService';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DateRangeComparisonProps {
  comparison: DateRangeComparisonType | null;
  isLoading?: boolean;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  onVersionClick?: (versionId: string) => void;
}

function formatCurrency(value: number): string {
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatCurrencyWithSign(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}£${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercentage(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

function DateRangePicker({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn(
          'w-[280px] justify-start text-left font-normal',
          !dateRange && 'text-muted-foreground'
        )}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
              </>
            ) : (
              format(dateRange.from, 'LLL dd, y')
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

function CostTrendChart({ comparison }: { comparison: DateRangeComparisonType }) {
  const chartData = comparison.costTrend.map((point) => ({
    date: format(point.date.toDate(), 'MMM d'),
    cost: point.totalCost,
    version: `v${point.versionNumber}`,
    versionName: point.versionName,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Cost Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="font-medium">{data.version}</div>
                        {data.versionName && (
                          <div className="text-xs text-muted-foreground">{data.versionName}</div>
                        )}
                        <div className="text-sm font-medium mt-1">
                          {formatCurrency(data.cost)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function VersionTransitionsList({ comparison, onVersionClick }: { 
  comparison: DateRangeComparisonType;
  onVersionClick?: (versionId: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Changes by Version
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {comparison.versionTransitions.length} version transitions in this period
        </p>
      </CardHeader>
      <CardContent>
        {comparison.versionTransitions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Only one version in this period
          </p>
        ) : (
          <div className="space-y-4">
            {comparison.versionTransitions.map((transition, index) => {
              const isPositive = transition.costChange >= 0;
              
              return (
                <div 
                  key={index}
                  className={cn(
                    'p-4 rounded-lg border bg-muted/30',
                    onVersionClick && 'cursor-pointer hover:bg-muted/50 transition-colors'
                  )}
                  onClick={() => onVersionClick?.(transition.toVersion.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{transition.fromVersion.versionNumber}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">v{transition.toVersion.versionNumber}</Badge>
                      {transition.toVersion.versionName && (
                        <span className="text-sm text-muted-foreground">
                          {transition.toVersion.versionName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'font-medium',
                        isPositive ? 'text-red-500' : 'text-green-500'
                      )}>
                        {formatCurrencyWithSign(transition.costChange)}
                      </span>
                      <span className={cn(
                        'text-sm',
                        isPositive ? 'text-red-500' : 'text-green-500'
                      )}>
                        ({formatPercentage(transition.percentageChange)})
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {transition.summary}
                  </p>
                  
                  {transition.topDrivers.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {transition.topDrivers.slice(0, 3).map((driver, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            driver.impact > 0 ? 'bg-red-500/10' : 'bg-green-500/10'
                          )}
                        >
                          {COST_DRIVER_LABELS[driver.driver]}: {formatCurrencyWithSign(driver.impact)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{format(transition.toVersion.createdAt.toDate(), 'MMM d, yyyy')}</span>
                    <span>{transition.changeCount} changes</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AggregatedDriversCard({ comparison }: { comparison: DateRangeComparisonType }) {
  const { changesByDriver } = comparison;
  const maxImpact = Math.max(...changesByDriver.map(d => Math.abs(d.totalImpact)), 1);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Aggregated Cost Drivers</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total impact across all versions in period
        </p>
      </CardHeader>
      <CardContent>
        {changesByDriver.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No changes</p>
        ) : (
          <div className="space-y-3">
            {changesByDriver.slice(0, 6).map((driver) => {
              const isPositive = driver.totalImpact >= 0;
              const barWidth = (Math.abs(driver.totalImpact) / maxImpact) * 100;
              
              return (
                <div key={driver.driver} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{driver.driverLabel}</span>
                    <span className={cn(
                      'font-medium',
                      isPositive ? 'text-red-500' : 'text-green-500'
                    )}>
                      {formatCurrencyWithSign(driver.totalImpact)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isPositive ? 'bg-red-500' : 'bg-green-500'
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DateRangeComparisonView({
  comparison,
  isLoading = false,
  onDateRangeChange,
  onVersionClick,
}: DateRangeComparisonProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (comparison) {
      return {
        from: comparison.startDate.toDate(),
        to: comparison.endDate.toDate(),
      };
    }
    return {
      from: subDays(new Date(), 30),
      to: new Date(),
    };
  });

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to && onDateRangeChange) {
      onDateRangeChange(range.from, range.to);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-[280px]" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeSelect}
        />
        {onDateRangeChange && dateRange?.from && dateRange?.to && (
          <Button onClick={() => onDateRangeChange(dateRange.from!, dateRange.to!)}>
            Compare
          </Button>
        )}
      </div>

      {!comparison ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Select a date range to see how costs changed over time</p>
            <p className="text-sm">
              Make sure you have created at least one version before the start date.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Period Summary */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {format(comparison.startDate.toDate(), 'MMM d, yyyy')} — {format(comparison.endDate.toDate(), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {comparison.versionsInRange.length} versions in this period
                  </p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Start</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(comparison.startVersion.summary.totalExtendedCost)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {comparison.totalCostChange >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-red-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-green-500" />
                    )}
                    <div className={cn(
                      'text-lg font-bold',
                      comparison.totalCostChange >= 0 ? 'text-red-500' : 'text-green-500'
                    )}>
                      {formatCurrencyWithSign(comparison.totalCostChange)}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">End</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(comparison.endVersion.summary.totalExtendedCost)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Trend Chart */}
          <CostTrendChart comparison={comparison} />

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aggregated Drivers */}
            <AggregatedDriversCard comparison={comparison} />
            
            {/* Assembly Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Impacted Assemblies</CardTitle>
              </CardHeader>
              <CardContent>
                {comparison.changesByAssembly.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No changes</p>
                ) : (
                  <div className="space-y-3">
                    {comparison.changesByAssembly.slice(0, 6).map((assembly) => {
                      const isPositive = assembly.totalImpact >= 0;
                      
                      return (
                        <div key={assembly.groupCode} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {assembly.groupCode}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {assembly.itemCount} items
                            </span>
                          </div>
                          <span className={cn(
                            'font-medium',
                            isPositive ? 'text-red-500' : 'text-green-500'
                          )}>
                            {formatCurrencyWithSign(assembly.totalImpact)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Version Transitions */}
          <VersionTransitionsList 
            comparison={comparison} 
            onVersionClick={onVersionClick}
          />
        </>
      )}
    </div>
  );
}

