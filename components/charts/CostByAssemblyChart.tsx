'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Treemap,
  Sector,
} from 'recharts';
import { AssemblyCost } from '@/lib/bom/costAnalysisService';
import { Layers, PieChartIcon, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostByAssemblyChartProps {
  data: AssemblyCost[];
  isLoading?: boolean;
}

const COLORS = [
  '#2563EB', // Blue
  '#F97316', // Orange
  '#10B981', // Green
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(1)}K`;
  }
  return `£${value.toFixed(0)}`;
}

type ViewMode = 'donut' | 'treemap';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: AssemblyCost & { fill?: string };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: data.fill || COLORS[0] }}
        />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {data.groupCode}
        </span>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="text-xs text-[var(--text-secondary)]">Total Cost</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">
            £{data.totalCost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="flex justify-between gap-6">
          <span className="text-xs text-[var(--text-secondary)]">Items</span>
          <span className="text-xs text-[var(--text-primary)]">
            {data.itemCount}
          </span>
        </div>
        
        <div className="flex justify-between gap-6">
          <span className="text-xs text-[var(--text-secondary)]">% of Total</span>
          <span className="text-xs text-[var(--text-primary)]">
            {data.percentOfTotal.toFixed(1)}%
          </span>
        </div>
        
        <div className="border-t border-[var(--border-subtle)] mt-2 pt-2 space-y-1">
          <div className="flex justify-between gap-6">
            <span className="text-xs text-blue-400">Material</span>
            <span className="text-xs text-[var(--text-primary)]">
              {formatCurrency(data.materialCost)}
            </span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-xs text-orange-400">Landing</span>
            <span className="text-xs text-[var(--text-primary)]">
              {formatCurrency(data.landingCost)}
            </span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-xs text-emerald-400">Labour</span>
            <span className="text-xs text-[var(--text-primary)]">
              {formatCurrency(data.labourCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActiveShapeProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: AssemblyCost;
  percent: number;
  value: number;
}

const renderActiveShape = (props: ActiveShapeProps) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--text-primary)" className="text-lg font-bold">
        {formatCurrency(value)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-secondary)" className="text-xs">
        {payload.groupCode}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
      />
    </g>
  );
};

interface TreemapContentProps {
  root: { name: string; children?: TreemapContentProps[] };
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  name: string;
  value: number;
  fill?: string;
}

const TreemapContent = (props: TreemapContentProps) => {
  const { depth, x, y, width, height, index, name, value } = props;
  
  // Only render content for leaf nodes
  if (depth !== 1) return null;
  
  const showLabel = width > 60 && height > 40;
  const showValue = width > 80 && height > 50;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: COLORS[index % COLORS.length],
          stroke: 'var(--bg-primary)',
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
        rx={4}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showValue ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fill: '#fff',
            fontSize: Math.min(12, width / 8),
            fontWeight: 500,
          }}
        >
          {name}
        </text>
      )}
      {showValue && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fill: 'rgba(255,255,255,0.8)',
            fontSize: Math.min(10, width / 10),
          }}
        >
          {formatCurrency(value)}
        </text>
      )}
    </g>
  );
};

export function CostByAssemblyChart({ data, isLoading = false }: CostByAssemblyChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('donut');
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  
  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  if (isLoading) {
    return (
      <Card className="border-[var(--border-subtle)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Cost by Assembly
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
            <Layers className="h-5 w-5" />
            Cost by Assembly
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex flex-col items-center justify-center text-center">
            <Layers className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
            <p className="text-[var(--text-secondary)] mb-2">No assembly data</p>
            <p className="text-sm text-[var(--text-tertiary)] max-w-sm">
              Add items to your BOM to see cost breakdown by assembly
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data with colors
  const chartData = data.map((item, index) => ({
    ...item,
    name: item.groupCode,
    value: item.totalCost,
    fill: COLORS[index % COLORS.length],
  }));

  // Calculate totals
  const totalCost = data.reduce((sum, d) => sum + d.totalCost, 0);
  const topAssembly = data[0];

  return (
    <Card className="border-[var(--border-subtle)]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Cost by Assembly
            </CardTitle>
            <CardDescription className="mt-1">
              {data.length} assembl{data.length !== 1 ? 'ies' : 'y'} • Total: {formatCurrency(totalCost)}
            </CardDescription>
          </div>
          
          {/* View Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-[var(--border-subtle)]">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-none h-7 px-3 text-xs',
                viewMode === 'donut' && 'bg-[var(--bg-tertiary)]'
              )}
              onClick={() => setViewMode('donut')}
            >
              <PieChartIcon className="h-3.5 w-3.5 mr-1.5" />
              Donut
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-none h-7 px-3 text-xs',
                viewMode === 'treemap' && 'bg-[var(--bg-tertiary)]'
              )}
              onClick={() => setViewMode('treemap')}
            >
              <Grid3X3 className="h-3.5 w-3.5 mr-1.5" />
              Treemap
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'donut' ? (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape as unknown as (props: unknown) => JSX.Element}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <Treemap
              data={chartData}
              dataKey="value"
              aspectRatio={4 / 3}
              stroke="var(--bg-primary)"
              content={<TreemapContent 
                root={{ name: 'root' }}
                depth={0}
                x={0}
                y={0}
                width={0}
                height={0}
                index={0}
                name=""
                value={0}
              />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        )}
        
        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {chartData.slice(0, 8).map((item, index) => (
            <div 
              key={item.groupCode}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg cursor-default transition-colors',
                'hover:bg-[var(--bg-tertiary)]'
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: item.fill }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {item.groupCode}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  {formatCurrency(item.totalCost)} ({item.percentOfTotal.toFixed(1)}%)
                </p>
              </div>
            </div>
          ))}
          {chartData.length > 8 && (
            <div className="flex items-center gap-2 p-2 text-[var(--text-secondary)]">
              <span className="text-xs">+{chartData.length - 8} more</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

