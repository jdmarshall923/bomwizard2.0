'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSpec } from '@/lib/hooks/useSpec';
import { useSpecComparison } from '@/lib/hooks/useSpecComparison';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  GitCompare, 
  ArrowLeft,
  ArrowRight,
  Download,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function SpecComparePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const { spec, loading } = useSpec(projectId, 'current-user');
  const [fromVersion, setFromVersion] = useState(1);
  const [toVersion, setToVersion] = useState(spec?.version || 1);
  
  const { comparison, loading: comparingLoading, downloadReport } = useSpecComparison(
    projectId,
    spec?.id || '',
    fromVersion,
    toVersion
  );
  
  const handleBack = () => {
    router.push(`/project/${projectId}/spec`);
  };
  
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  if (!spec) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p>No spec found to compare</p>
            <Button onClick={handleBack} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
            <ArrowLeft size={16} className="mr-1" />
            Back to Spec
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare size={24} />
            Compare Spec Versions
          </h1>
        </div>
        <Button variant="outline" onClick={downloadReport}>
          <Download size={16} className="mr-1.5" />
          Download Report
        </Button>
      </div>
      
      {/* Version selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From Version</label>
              <Select 
                value={fromVersion.toString()} 
                onValueChange={(v) => setFromVersion(parseInt(v))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: spec.version }, (_, i) => i + 1).map(v => (
                    <SelectItem key={v} value={v.toString()}>
                      Version {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <ArrowRight size={20} className="text-muted-foreground mt-5" />
            
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To Version</label>
              <Select 
                value={toVersion.toString()} 
                onValueChange={(v) => setToVersion(parseInt(v))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: spec.version }, (_, i) => i + 1).map(v => (
                    <SelectItem key={v} value={v.toString()}>
                      Version {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Comparison results */}
      {comparingLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : comparison ? (
        <div className="space-y-6">
          {/* BOM Impact Summary */}
          <Card>
            <CardHeader>
              <CardTitle>BOM Impact Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <Plus size={20} className="mx-auto mb-2 text-emerald-500" />
                  <p className="text-2xl font-bold text-emerald-700">
                    {comparison.bomImpact.groupsToAdd}
                  </p>
                  <p className="text-sm text-emerald-600">Groups to Add</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <Minus size={20} className="mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold text-red-700">
                    {comparison.bomImpact.groupsToRemove}
                  </p>
                  <p className="text-sm text-red-600">Groups to Remove</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {comparison.bomImpact.partsAffected}
                  </p>
                  <p className="text-sm text-blue-600">Parts Affected</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {comparison.bomImpact.newPartsNeeded}
                  </p>
                  <p className="text-sm text-purple-600">New Parts Needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Selection Changes */}
          {comparison.selectionChanges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Selection Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comparison.selectionChanges.map((change, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{change.category}</span>
                        <Badge variant={
                          change.changeType === 'added' ? 'default' : 
                          change.changeType === 'removed' ? 'destructive' : 
                          'secondary'
                        }>
                          {change.changeType}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {change.removedOptions && change.removedOptions.length > 0 && (
                          <div>
                            <p className="text-muted-foreground mb-1">Removed:</p>
                            <div className="flex flex-wrap gap-1">
                              {change.removedOptions.map(opt => (
                                <Badge key={opt} variant="outline" className="bg-red-50 text-red-700">
                                  {opt}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {change.addedOptions && change.addedOptions.length > 0 && (
                          <div>
                            <p className="text-muted-foreground mb-1">Added:</p>
                            <div className="flex flex-wrap gap-1">
                              {change.addedOptions.map(opt => (
                                <Badge key={opt} variant="outline" className="bg-emerald-50 text-emerald-700">
                                  {opt}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {(change.groupsToAdd.length > 0 || change.groupsToRemove.length > 0) && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-xs">
                          {change.groupsToRemove.length > 0 && (
                            <div>
                              <p className="text-muted-foreground">Groups to remove:</p>
                              <p className="font-mono">{change.groupsToRemove.join(', ')}</p>
                            </div>
                          )}
                          {change.groupsToAdd.length > 0 && (
                            <div>
                              <p className="text-muted-foreground">Groups to add:</p>
                              <p className="font-mono">{change.groupsToAdd.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Unmapped warnings */}
          {comparison.bomImpact.hasUnmappedOptions && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-700 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Unmapped Options
                </CardTitle>
                <CardDescription className="text-amber-600">
                  These options don't have group mappings yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {comparison.bomImpact.unmappedOptions.map((opt, i) => (
                    <Badge key={i} variant="outline" className="bg-white border-amber-300 text-amber-700">
                      {opt.category}: {opt.option}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <GitCompare size={48} className="mx-auto mb-4 opacity-50" />
            <p>Select two different versions to compare</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

