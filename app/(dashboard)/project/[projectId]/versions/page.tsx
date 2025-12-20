'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VersionTimeline } from '@/components/bom/VersionTimeline';
import { CreateVersionDialog } from '@/components/bom/CreateVersionDialog';
import { VersionComparisonView } from '@/components/bom/VersionComparison';
import { DateRangeComparisonView } from '@/components/bom/DateRangeComparison';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBom } from '@/lib/hooks/useBom';
import { 
  getVersions, 
  createVersion as createVersionSnapshot,
  getLatestVersion,
} from '@/lib/bom/versionService';
import { compareVersions, compareDateRange } from '@/lib/bom/comparisonService';
import type { BomVersion, VersionComparison, DateRangeComparison } from '@/types';
import { 
  History,
  GitCompare,
  Calendar,
  ArrowLeft,
  AlertCircle,
  Plus,
} from 'lucide-react';

export default function VersionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params?.projectId as string;
  const { user } = useAuth();

  // State
  const [versions, setVersions] = useState<BomVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  
  // Comparison state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [versionComparison, setVersionComparison] = useState<VersionComparison | null>(null);
  const [dateRangeComparison, setDateRangeComparison] = useState<DateRangeComparison | null>(null);
  const [comparingVersions, setComparingVersions] = useState(false);
  const [comparingDateRange, setComparingDateRange] = useState(false);

  // Get BOM stats for create version dialog
  const { stats } = useBom(projectId);

  // Active tab from URL or default
  const activeTab = searchParams.get('tab') || 'timeline';

  // Load versions
  useEffect(() => {
    async function loadVersions() {
      if (!projectId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await getVersions(projectId);
        setVersions(data);
      } catch (err) {
        console.error('Failed to load versions:', err);
        setError('Failed to load version history');
      } finally {
        setLoading(false);
      }
    }
    
    loadVersions();
  }, [projectId]);

  // Handle version selection for comparison
  const handleVersionSelect = useCallback((versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      }
      if (prev.length >= 2) {
        // Replace the oldest selection
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  }, []);

  // Compare two versions
  const handleCompareVersions = useCallback(async (baseId: string, compareId: string) => {
    setComparingVersions(true);
    setVersionComparison(null);
    
    try {
      const comparison = await compareVersions(projectId, baseId, compareId);
      setVersionComparison(comparison);
      
      // Switch to comparison tab
      router.push(`/project/${projectId}/versions?tab=compare`);
    } catch (err) {
      console.error('Failed to compare versions:', err);
      alert('Unable to compare the selected versions');
    } finally {
      setComparingVersions(false);
    }
  }, [projectId, router]);

  // Compare date range
  const handleDateRangeCompare = useCallback(async (startDate: Date, endDate: Date) => {
    setComparingDateRange(true);
    setDateRangeComparison(null);
    
    try {
      const comparison = await compareDateRange(projectId, startDate, endDate);
      setDateRangeComparison(comparison);
    } catch (err) {
      console.error('Failed to compare date range:', err);
      alert(err instanceof Error ? err.message : 'Unable to compare the selected date range');
    } finally {
      setComparingDateRange(false);
    }
  }, [projectId]);

  // Create manual version
  const handleCreateVersion = useCallback(async (name?: string, description?: string) => {
    if (!user) return;
    
    try {
      const result = await createVersionSnapshot(projectId, {
        trigger: 'manual',
        versionName: name,
        description,
        userId: user.uid,
        userName: user.displayName || user.email || undefined,
      });
      
      if (result.success) {
        // Refresh versions list
        const data = await getVersions(projectId);
        setVersions(data);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to create version:', err);
      alert(err instanceof Error ? err.message : 'Failed to create version');
      throw err;
    }
  }, [projectId, user]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    router.push(`/project/${projectId}/versions?tab=${value}`);
  };

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
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">Error Loading Versions</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                {error}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
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
              <History className="h-6 w-6" />
              Version Control
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Track BOM changes over time and analyze cost drivers
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateVersionOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Version
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Compare Versions
          </TabsTrigger>
          <TabsTrigger value="daterange" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VersionTimeline
                versions={versions}
                isLoading={loading}
                onCreateVersion={() => setIsCreateVersionOpen(true)}
                onCompareVersions={handleCompareVersions}
                onVersionSelect={comparisonMode ? handleVersionSelect : undefined}
                selectedVersions={selectedVersions}
                comparisonMode={comparisonMode}
              />
            </div>
            
            <div className="space-y-6">
              {/* Quick Actions Card */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        setComparisonMode(!comparisonMode);
                        setSelectedVersions([]);
                      }}
                    >
                      <GitCompare className="h-4 w-4 mr-2" />
                      {comparisonMode ? 'Exit Comparison Mode' : 'Compare Two Versions'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleTabChange('daterange')}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Compare Date Range
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Card */}
              {versions.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-3">Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Versions</span>
                        <span className="font-medium">{versions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Latest Version</span>
                        <span className="font-medium">v{versions[0]?.versionNumber}</span>
                      </div>
                      {versions[0]?.summary && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Current Cost</span>
                            <span className="font-medium">
                              £{versions[0].summary.totalExtendedCost.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Items</span>
                            <span className="font-medium">{versions[0].summary.totalItems}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          {comparingVersions ? (
            <div className="space-y-6">
              <Skeleton className="h-40 w-full" />
              <div className="grid grid-cols-2 gap-6">
                <Skeleton className="h-60 w-full" />
                <Skeleton className="h-60 w-full" />
              </div>
            </div>
          ) : versionComparison ? (
            <VersionComparisonView
              comparison={versionComparison}
              onClose={() => setVersionComparison(null)}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <GitCompare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Compare Versions</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Select two versions from the timeline to see what changed between them,
                  including cost drivers and detailed breakdowns.
                </p>
                <Button onClick={() => {
                  setComparisonMode(true);
                  handleTabChange('timeline');
                }}>
                  <GitCompare className="h-4 w-4 mr-2" />
                  Select Versions to Compare
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="daterange" className="mt-6">
          <DateRangeComparisonView
            comparison={dateRangeComparison}
            isLoading={comparingDateRange}
            onDateRangeChange={handleDateRangeCompare}
          />
        </TabsContent>
      </Tabs>

      {/* Create Version Dialog */}
      <CreateVersionDialog
        open={isCreateVersionOpen}
        onOpenChange={setIsCreateVersionOpen}
        onCreateVersion={handleCreateVersion}
        currentItemCount={stats?.totalItems || 0}
        currentTotalCost={stats?.totalCost || 0}
      />
    </div>
  );
}
