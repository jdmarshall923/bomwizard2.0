'use client';

import { useState } from 'react';
import { BomVersion, VersionTrigger } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  History,
  Plus,
  GitCompare,
  TrendingUp,
  TrendingDown,
  FileUp,
  Edit3,
  RefreshCw,
  Clock,
  ArrowRight,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface VersionTimelineProps {
  versions: BomVersion[];
  isLoading?: boolean;
  onCreateVersion?: () => void;
  onCompareVersions?: (baseId: string, compareId: string) => void;
  onViewVersion?: (versionId: string) => void;
  selectedVersions?: string[];
  onVersionSelect?: (versionId: string) => void;
  comparisonMode?: boolean;
}

const TRIGGER_ICONS: Record<VersionTrigger, React.ReactNode> = {
  import: <FileUp className="h-4 w-4" />,
  manual: <Edit3 className="h-4 w-4" />,
  price_update: <TrendingUp className="h-4 w-4" />,
  bulk_edit: <RefreshCw className="h-4 w-4" />,
  transfer: <ArrowRight className="h-4 w-4" />,
  scheduled: <Clock className="h-4 w-4" />,
};

const TRIGGER_LABELS: Record<VersionTrigger, string> = {
  import: 'Import',
  manual: 'Manual Snapshot',
  price_update: 'Price Update',
  bulk_edit: 'Bulk Edit',
  transfer: 'Transfer',
  scheduled: 'Scheduled',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export function VersionTimeline({
  versions,
  isLoading = false,
  onCreateVersion,
  onCompareVersions,
  onViewVersion,
  selectedVersions = [],
  onVersionSelect,
  comparisonMode = false,
}: VersionTimelineProps) {
  const [hoveredVersion, setHoveredVersion] = useState<string | null>(null);

  // Calculate cost change percentage between consecutive versions
  const getCostChangePercent = (version: BomVersion, index: number): number | null => {
    if (index === versions.length - 1) return null; // First version (oldest)
    
    const previousVersion = versions[index + 1];
    if (!previousVersion) return null;
    
    const prevCost = previousVersion.summary.totalExtendedCost;
    const currCost = version.summary.totalExtendedCost;
    
    if (prevCost === 0) return null;
    
    return ((currCost - prevCost) / prevCost) * 100;
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2 && onCompareVersions) {
      // Compare older to newer (base to compare)
      const [first, second] = selectedVersions;
      const firstVersion = versions.find(v => v.id === first);
      const secondVersion = versions.find(v => v.id === second);
      
      if (firstVersion && secondVersion) {
        if (firstVersion.versionNumber < secondVersion.versionNumber) {
          onCompareVersions(first, second);
        } else {
          onCompareVersions(second, first);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
            {versions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {versions.length} versions
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {comparisonMode && selectedVersions.length === 2 && (
              <Button onClick={handleCompare} size="sm">
                <GitCompare className="h-4 w-4 mr-2" />
                Compare Selected
              </Button>
            )}
            {onCreateVersion && (
              <Button onClick={onCreateVersion} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Version
              </Button>
            )}
          </div>
        </div>
        {comparisonMode && (
          <p className="text-sm text-muted-foreground mt-2">
            Select two versions to compare. {selectedVersions.length}/2 selected.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No versions yet</p>
            <p className="text-sm mt-1">
              Versions are created automatically when you import data or make bulk changes.
            </p>
            {onCreateVersion && (
              <Button onClick={onCreateVersion} className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create First Version
              </Button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            
            {/* Version entries */}
            <div className="space-y-6">
              {versions.map((version, index) => {
                const costChangePercent = getCostChangePercent(version, index);
                const isSelected = selectedVersions.includes(version.id);
                const isHovered = hoveredVersion === version.id;
                const isLatest = index === 0;
                
                return (
                  <div
                    key={version.id}
                    className={cn(
                      'relative flex items-start gap-4 pl-2',
                      (comparisonMode || onViewVersion) && 'cursor-pointer',
                      isSelected && 'bg-primary/5 -mx-4 px-6 py-2 rounded-lg'
                    )}
                    onMouseEnter={() => setHoveredVersion(version.id)}
                    onMouseLeave={() => setHoveredVersion(null)}
                    onClick={() => {
                      if (comparisonMode && onVersionSelect) {
                        onVersionSelect(version.id);
                      } else if (onViewVersion) {
                        onViewVersion(version.id);
                      }
                    }}
                  >
                    {/* Timeline node */}
                    <div
                      className={cn(
                        'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background',
                        isLatest && 'border-primary bg-primary text-primary-foreground',
                        isSelected && !isLatest && 'border-primary',
                        !isLatest && !isSelected && 'border-muted-foreground/30'
                      )}
                    >
                      {isSelected ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        TRIGGER_ICONS[version.trigger]
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">
                          v{version.versionNumber}
                          {isLatest && (
                            <Badge variant="default" className="ml-2 text-xs">
                              Current
                            </Badge>
                          )}
                        </span>
                        {version.versionName && (
                          <span className="text-muted-foreground">
                            {version.versionName}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {TRIGGER_LABELS[version.trigger]}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(version.createdAt.toDate(), 'MMM d, yyyy \'at\' h:mm a')}
                        {version.createdByName && (
                          <span className="ml-2">by {version.createdByName}</span>
                        )}
                      </div>
                      
                      {version.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {version.description}
                        </p>
                      )}
                      
                      {/* Stats row */}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-medium">
                                {formatCurrency(version.summary.totalExtendedCost)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div>Material: {formatCurrency(version.summary.totalMaterialCost)}</div>
                                <div>Landing: {formatCurrency(version.summary.totalLandingCost)}</div>
                                <div>Labour: {formatCurrency(version.summary.totalLabourCost)}</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <span className="text-muted-foreground">
                          {version.summary.totalItems} items
                        </span>
                        
                        {costChangePercent !== null && (
                          <span
                            className={cn(
                              'flex items-center gap-1',
                              costChangePercent > 0 && 'text-red-500',
                              costChangePercent < 0 && 'text-green-500',
                              costChangePercent === 0 && 'text-muted-foreground'
                            )}
                          >
                            {costChangePercent > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : costChangePercent < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            {formatPercentage(costChangePercent)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Compare button on hover */}
                    {!comparisonMode && onCompareVersions && isHovered && index < versions.length - 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Compare with previous version
                          const previousVersion = versions[index + 1];
                          if (previousVersion) {
                            onCompareVersions(previousVersion.id, version.id);
                          }
                        }}
                      >
                        <GitCompare className="h-4 w-4 mr-1" />
                        vs prev
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

