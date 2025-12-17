'use client';

import { useState } from 'react';
import { VersionComparison as VersionComparisonType, BomChange, CostDriver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Package,
  Minus,
  Plus,
  Edit,
  DollarSign,
  Truck,
  Users,
  Building2,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { COST_DRIVER_LABELS } from '@/lib/bom/comparisonService';

interface VersionComparisonProps {
  comparison: VersionComparisonType | null;
  isLoading?: boolean;
  onClose?: () => void;
}

const COST_DRIVER_ICONS: Record<CostDriver, React.ReactNode> = {
  quantity_increase: <Plus className="h-4 w-4" />,
  quantity_decrease: <Minus className="h-4 w-4" />,
  material_price_increase: <TrendingUp className="h-4 w-4" />,
  material_price_decrease: <TrendingDown className="h-4 w-4" />,
  landing_rate_change: <Truck className="h-4 w-4" />,
  labour_cost_change: <Users className="h-4 w-4" />,
  vendor_change: <Building2 className="h-4 w-4" />,
  price_source_change: <RefreshCw className="h-4 w-4" />,
  new_item: <Plus className="h-4 w-4" />,
  removed_item: <Minus className="h-4 w-4" />,
  item_replacement: <RefreshCw className="h-4 w-4" />,
  bulk_adjustment: <Edit className="h-4 w-4" />,
  currency_change: <DollarSign className="h-4 w-4" />,
  other: <HelpCircle className="h-4 w-4" />,
};

function formatCurrency(value: number): string {
  const prefix = value >= 0 ? '' : '-';
  return `${prefix}£${Math.abs(value).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatCurrencyWithSign(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}£${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercentage(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

function CostSummaryCard({ comparison }: { comparison: VersionComparisonType }) {
  const { costSummary } = comparison;
  const isIncrease = costSummary.absoluteChange >= 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Cost Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-8">
          {/* Base version */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              v{comparison.baseVersionNumber}
              {comparison.baseVersionName && ` - ${comparison.baseVersionName}`}
            </p>
            <p className="text-2xl font-bold">{formatCurrency(costSummary.baseTotalCost)}</p>
            <p className="text-xs text-muted-foreground">
              {format(comparison.baseVersionDate.toDate(), 'MMM d, yyyy')}
            </p>
          </div>
          
          {/* Arrow and change */}
          <div className="flex flex-col items-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className={cn(
              'mt-2 px-3 py-1 rounded-full text-sm font-medium',
              isIncrease ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
            )}>
              {formatCurrencyWithSign(costSummary.absoluteChange)}
            </div>
            <p className={cn(
              'text-xs mt-1',
              isIncrease ? 'text-red-500' : 'text-green-500'
            )}>
              {formatPercentage(costSummary.percentageChange)}
            </p>
          </div>
          
          {/* Compare version */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              v{comparison.compareVersionNumber}
              {comparison.compareVersionName && ` - ${comparison.compareVersionName}`}
            </p>
            <p className="text-2xl font-bold">{formatCurrency(costSummary.compareTotalCost)}</p>
            <p className="text-xs text-muted-foreground">
              {format(comparison.compareVersionDate.toDate(), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        
        {/* Cost breakdown */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Material</p>
            <p className={cn(
              'font-medium',
              costSummary.materialChange > 0 ? 'text-red-500' : costSummary.materialChange < 0 ? 'text-green-500' : ''
            )}>
              {formatCurrencyWithSign(costSummary.materialChange)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Landing</p>
            <p className={cn(
              'font-medium',
              costSummary.landingChange > 0 ? 'text-red-500' : costSummary.landingChange < 0 ? 'text-green-500' : ''
            )}>
              {formatCurrencyWithSign(costSummary.landingChange)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Labour</p>
            <p className={cn(
              'font-medium',
              costSummary.labourChange > 0 ? 'text-red-500' : costSummary.labourChange < 0 ? 'text-green-500' : ''
            )}>
              {formatCurrencyWithSign(costSummary.labourChange)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CostDriversChart({ comparison }: { comparison: VersionComparisonType }) {
  const { changesByDriver } = comparison;
  const maxImpact = Math.max(...changesByDriver.map(d => Math.abs(d.totalImpact)));
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Cost Drivers</CardTitle>
        <p className="text-sm text-muted-foreground">What caused the cost change?</p>
      </CardHeader>
      <CardContent>
        {changesByDriver.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No changes detected</p>
        ) : (
          <div className="space-y-4">
            {changesByDriver.map((driver) => {
              const isPositive = driver.totalImpact >= 0;
              const barWidth = maxImpact > 0 ? (Math.abs(driver.totalImpact) / maxImpact) * 100 : 0;
              
              return (
                <div key={driver.driver} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'p-1 rounded',
                        isPositive ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                      )}>
                        {COST_DRIVER_ICONS[driver.driver]}
                      </span>
                      <span>{driver.driverLabel}</span>
                      <Badge variant="secondary" className="text-xs">
                        {driver.itemCount} items
                      </Badge>
                    </div>
                    <span className={cn(
                      'font-medium',
                      isPositive ? 'text-red-500' : 'text-green-500'
                    )}>
                      {formatCurrencyWithSign(driver.totalImpact)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isPositive ? 'bg-red-500' : 'bg-green-500'
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {driver.percentOfTotalChange.toFixed(0)}%
                    </span>
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

function TopChangesTable({ 
  title, 
  changes, 
  type 
}: { 
  title: string; 
  changes: BomChange[]; 
  type: 'increase' | 'decrease';
}) {
  const [expanded, setExpanded] = useState(false);
  const displayChanges = expanded ? changes : changes.slice(0, 5);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {type === 'increase' ? (
              <TrendingUp className="h-5 w-5 text-red-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-green-500" />
            )}
            {title}
          </CardTitle>
          <Badge variant="secondary">{changes.length} items</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No {type}s</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayChanges.map((change) => (
                  <TableRow key={change.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{change.itemCode}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {change.itemDescription}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'p-1 rounded',
                          type === 'increase' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                        )}>
                          {COST_DRIVER_ICONS[change.costDriver]}
                        </span>
                        <span className="text-sm">{COST_DRIVER_LABELS[change.costDriver]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        'font-medium',
                        type === 'increase' ? 'text-red-500' : 'text-green-500'
                      )}>
                        {formatCurrencyWithSign(change.costImpact.extendedDelta)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {changes.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show All ({changes.length})
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChangesByAssemblyCard({ comparison }: { comparison: VersionComparisonType }) {
  const { changesByAssembly } = comparison;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Changes by Assembly
        </CardTitle>
      </CardHeader>
      <CardContent>
        {changesByAssembly.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No changes</p>
        ) : (
          <div className="space-y-3">
            {changesByAssembly.slice(0, 8).map((assembly) => {
              const isPositive = assembly.totalImpact >= 0;
              
              return (
                <div key={assembly.groupCode} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {assembly.groupCode}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {assembly.itemCount} items
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-medium',
                      isPositive ? 'text-red-500' : 'text-green-500'
                    )}>
                      {formatCurrencyWithSign(assembly.totalImpact)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({assembly.percentOfTotalChange.toFixed(0)}%)
                    </span>
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

function ItemChangeSummary({ comparison }: { comparison: VersionComparisonType }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Item Changes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-500">{comparison.itemsAdded}</p>
            <p className="text-xs text-muted-foreground">Added</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{comparison.itemsRemoved}</p>
            <p className="text-xs text-muted-foreground">Removed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-500">{comparison.itemsModified}</p>
            <p className="text-xs text-muted-foreground">Modified</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-muted-foreground">{comparison.itemsUnchanged}</p>
            <p className="text-xs text-muted-foreground">Unchanged</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function VersionComparisonView({
  comparison,
  isLoading = false,
  onClose,
}: VersionComparisonProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Select two versions to compare</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Version Comparison</h2>
          <p className="text-sm text-muted-foreground">
            v{comparison.baseVersionNumber} → v{comparison.compareVersionNumber} • {comparison.changesCount} changes
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
      
      {/* Cost Summary */}
      <CostSummaryCard comparison={comparison} />
      
      {/* Item Change Summary */}
      <ItemChangeSummary comparison={comparison} />
      
      {/* Main content */}
      <Tabs defaultValue="drivers" className="w-full">
        <TabsList>
          <TabsTrigger value="drivers">Cost Drivers</TabsTrigger>
          <TabsTrigger value="increases">Top Increases</TabsTrigger>
          <TabsTrigger value="decreases">Top Decreases</TabsTrigger>
          <TabsTrigger value="assembly">By Assembly</TabsTrigger>
        </TabsList>
        
        <TabsContent value="drivers" className="mt-4">
          <CostDriversChart comparison={comparison} />
        </TabsContent>
        
        <TabsContent value="increases" className="mt-4">
          <TopChangesTable
            title="Top Cost Increases"
            changes={comparison.topIncreases}
            type="increase"
          />
        </TabsContent>
        
        <TabsContent value="decreases" className="mt-4">
          <TopChangesTable
            title="Top Cost Decreases"
            changes={comparison.topDecreases}
            type="decrease"
          />
        </TabsContent>
        
        <TabsContent value="assembly" className="mt-4">
          <ChangesByAssemblyCard comparison={comparison} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

