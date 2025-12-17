'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Chart Components
import { CostSummaryCards } from '@/components/charts/CostSummaryCards';
import { CostTrendChart } from '@/components/charts/CostTrendChart';
import { CostByAssemblyChart } from '@/components/charts/CostByAssemblyChart';
import { CostDriversChart } from '@/components/charts/CostDriversChart';
import { PriceVolatilityChart } from '@/components/charts/PriceVolatilityChart';
import { TopItemsTable } from '@/components/charts/TopItemsTable';

// Hooks and Services
import { useCostAnalysis } from '@/lib/hooks/useCostAnalysis';
import { 
  formatCurrency, 
  formatPercent, 
  formatDate,
} from '@/lib/bom/costAnalysisService';

// Icons
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  Download,
  RefreshCw,
  AlertTriangle,
  History,
  PieChart,
  Activity,
  ArrowLeft,
  Crown,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CostAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch cost analysis data
  const {
    currentCost,
    costByAssembly,
    topCostlyItems,
    bomItems,
    costTrend,
    costDrivers,
    priceVolatility,
    versions,
    latestVersion,
    versionComparison,
    overallChange,
    overallChangePercent,
    placeholderRisk,
    newPartRisk,
    priceConfidence,
    isLoading,
    isLoadingVersions,
    error,
    refresh,
  } = useCostAnalysis(projectId);

  // Handle export
  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    
    try {
      if (format === 'csv') {
        // Export to CSV
        const headers = [
          'Item Code',
          'Description',
          'Assembly',
          'Quantity',
          'Material Cost',
          'Landing Cost',
          'Labour Cost',
          'Unit Cost',
          'Extended Cost',
          'Cost Source',
        ];
        
        const rows = bomItems.map(item => [
          item.itemCode,
          `"${item.itemDescription?.replace(/"/g, '""') || ''}"`,
          item.groupCode || '',
          item.quantity || 0,
          item.materialCost || 0,
          item.landingCost || 0,
          item.labourCost || 0,
          (item.materialCost || 0) + (item.landingCost || 0) + (item.labourCost || 0),
          item.extendedCost || 0,
          item.costSource || 'placeholder',
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cost-analysis-${projectId}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // PDF export would require a library like jsPDF
        alert('PDF export coming soon!');
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [bomItems, projectId]);

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(`/project/${projectId}/bom`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to BOM
          </Button>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">Error Loading Cost Analysis</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                {error}
              </p>
              <Button variant="outline" onClick={() => refresh()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(`/project/${projectId}/bom`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to BOM
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Cost Analysis
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Analyze and visualize BOM costs, trends, and drivers
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refresh()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          
          {/* Export Dropdown */}
          <div className="flex rounded-lg overflow-hidden border border-[var(--border-subtle)]">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-0"
              onClick={() => handleExport('csv')}
              disabled={isExporting || !bomItems.length}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-0 border-l border-[var(--border-subtle)]"
              onClick={() => handleExport('pdf')}
              disabled={isExporting || !bomItems.length}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
          
          <Button 
            variant="default"
            size="sm"
            onClick={() => router.push(`/project/${projectId}/versions`)}
          >
            <History className="h-4 w-4 mr-2" />
            Version History
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <CostSummaryCards
        currentCost={currentCost}
        overallChange={overallChange}
        overallChangePercent={overallChangePercent}
        placeholderRisk={placeholderRisk}
        newPartRisk={newPartRisk}
        priceConfidence={priceConfidence}
        isLoading={isLoading}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="assemblies" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            By Assembly
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Cost Drivers
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Top Items
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Trend */}
            <div className="lg:col-span-2">
              <CostTrendChart 
                data={costTrend} 
                isLoading={isLoadingVersions}
              />
            </div>
            
            {/* Cost by Assembly */}
            <CostByAssemblyChart 
              data={costByAssembly}
              isLoading={isLoading}
            />
            
            {/* Cost Drivers */}
            <CostDriversChart 
              data={costDrivers}
              totalChange={overallChange}
              isLoading={isLoadingVersions}
            />
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Full Width Cost Trend */}
            <CostTrendChart 
              data={costTrend} 
              isLoading={isLoadingVersions}
            />
            
            {/* Price Volatility */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PriceVolatilityChart 
                data={priceVolatility}
                isLoading={isLoadingVersions}
              />
              
              {/* Version Summary Card */}
              <Card className="border-[var(--border-subtle)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Version Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {versions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <History className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                      <p className="text-[var(--text-secondary)] mb-2">No versions yet</p>
                      <p className="text-sm text-[var(--text-tertiary)] max-w-sm mb-4">
                        Create versions to track cost changes over time
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => router.push(`/project/${projectId}/versions`)}
                      >
                        Create Version
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Total Versions</p>
                          <p className="text-2xl font-bold">{versions.length}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Latest</p>
                          <p className="text-2xl font-bold">v{latestVersion?.versionNumber || 0}</p>
                        </div>
                      </div>
                      
                      {/* Recent Versions */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                          Recent Versions
                        </p>
                        {versions.slice(0, 5).map((version) => (
                          <div 
                            key={version.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)]"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">v{version.versionNumber}</Badge>
                              <span className="text-sm text-[var(--text-primary)]">
                                {version.versionName || version.trigger}
                              </span>
                            </div>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {formatDate(version.createdAt.toDate())}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => router.push(`/project/${projectId}/versions`)}
                      >
                        View All Versions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Assemblies Tab */}
        <TabsContent value="assemblies" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <CostByAssemblyChart 
                data={costByAssembly}
                isLoading={isLoading}
              />
            </div>
            
            {/* Assembly Details Table */}
            <div className="lg:col-span-2">
              <Card className="border-[var(--border-subtle)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Assembly Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {costByAssembly.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-[var(--text-secondary)]">No assembly data available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {costByAssembly.map((assembly, index) => (
                        <div 
                          key={assembly.groupCode}
                          className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                              index === 0 && 'bg-amber-500/30 text-amber-400',
                              index === 1 && 'bg-slate-400/30 text-slate-400',
                              index === 2 && 'bg-amber-700/30 text-amber-600',
                              index > 2 && 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                            )}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {assembly.groupCode}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {assembly.itemCount} items
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            {/* Cost Breakdown */}
                            <div className="hidden md:flex items-center gap-4 text-xs">
                              <div className="text-right">
                                <span className="text-[var(--text-tertiary)]">Material: </span>
                                <span className="text-blue-400">£{assembly.materialCost.toLocaleString()}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[var(--text-tertiary)]">Landing: </span>
                                <span className="text-orange-400">£{assembly.landingCost.toLocaleString()}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[var(--text-tertiary)]">Labour: </span>
                                <span className="text-emerald-400">£{assembly.labourCost.toLocaleString()}</span>
                              </div>
                            </div>
                            
                            {/* Total */}
                            <div className="text-right">
                              <p className="text-sm font-bold text-[var(--text-primary)]">
                                £{assembly.totalCost.toLocaleString()}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {assembly.percentOfTotal.toFixed(1)}%
                              </p>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-24 h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[var(--accent-blue)] rounded-full"
                                style={{ width: `${assembly.percentOfTotal}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Cost Drivers Tab */}
        <TabsContent value="drivers" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <CostDriversChart 
                data={costDrivers}
                totalChange={overallChange}
                isLoading={isLoadingVersions}
              />
            </div>
            
            <PriceVolatilityChart 
              data={priceVolatility}
              isLoading={isLoadingVersions}
            />
            
            {/* Driver Explanation Card */}
            <Card className="border-[var(--border-subtle)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Understanding Cost Drivers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  Cost drivers explain why your BOM costs changed between versions.
                </p>
                
                <div className="space-y-2">
                  {[
                    { label: 'Quantity Change', desc: 'Item quantities increased or decreased', icon: '📦' },
                    { label: 'Price Change', desc: 'Material costs went up or down', icon: '💰' },
                    { label: 'Vendor Change', desc: 'Switched to a different supplier', icon: '🏭' },
                    { label: 'New Item', desc: 'Items added to the BOM', icon: '➕' },
                    { label: 'Removed Item', desc: 'Items removed from the BOM', icon: '➖' },
                    { label: 'Landing Rate', desc: 'Import/shipping costs changed', icon: '🚢' },
                  ].map((driver) => (
                    <div 
                      key={driver.label}
                      className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-tertiary)]"
                    >
                      <span className="text-lg">{driver.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{driver.label}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{driver.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push(`/project/${projectId}/versions?tab=compare`)}
                >
                  Compare Versions
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Items Tab */}
        <TabsContent value="items" className="mt-6">
          <TopItemsTable 
            items={topCostlyItems}
            totalCost={currentCost?.totalCost || 0}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
