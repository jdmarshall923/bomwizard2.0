'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProject } from '@/lib/context/ProjectContext';
import { useSpec } from '@/lib/hooks/useSpec';
import { SpecOverview } from '@/components/spec/SpecOverview';
import { SpecImporter } from '@/components/spec/SpecImporter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileSpreadsheet, 
  Plus, 
  Upload,
  ClipboardList 
} from 'lucide-react';
import { toast } from 'sonner';

export default function SpecPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const { project } = useProject();
  const { spec, loading, error, submitSpec, refetch } = useSpec(projectId, 'current-user'); // TODO: Get actual user ID
  
  const [showImporter, setShowImporter] = useState(false);
  
  const handleEdit = () => {
    router.push(`/project/${projectId}/spec/edit`);
  };
  
  const handleImport = () => {
    setShowImporter(true);
  };
  
  const handleSubmit = async () => {
    try {
      await submitSpec();
      toast.success('Spec submitted for review');
    } catch (err) {
      toast.error('Failed to submit spec');
    }
  };
  
  const handleCompare = () => {
    router.push(`/project/${projectId}/spec/compare`);
  };
  
  const handleHistory = () => {
    router.push(`/project/${projectId}/spec/history`);
  };
  
  const handleExport = async () => {
    // TODO: Implement export
    toast.info('Export feature coming soon');
  };
  
  const handleApplyToBom = () => {
    router.push(`/project/${projectId}/spec/apply`);
  };
  
  const handleImportComplete = (specId: string) => {
    setShowImporter(false);
    refetch();
    toast.success('Spec imported successfully');
  };
  
  const handleCreateNew = () => {
    router.push(`/project/${projectId}/spec/edit`);
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Error loading spec: {error.message}</p>
            <Button onClick={refetch} variant="outline" className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // No spec exists - show empty state
  if (!spec) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList size={64} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-semibold mb-2">No Spec Sheet Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create a new spec or import one from an Excel file to define the configuration for this project.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button onClick={handleCreateNew} variant="outline">
                <Plus size={16} className="mr-1.5" />
                Create New Spec
              </Button>
              <Button onClick={handleImport}>
                <Upload size={16} className="mr-1.5" />
                Import from Excel
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {showImporter && (
          <SpecImporter
            projectId={projectId}
            onImportComplete={handleImportComplete}
            onCancel={() => setShowImporter(false)}
          />
        )}
      </div>
    );
  }
  
  // Show spec overview
  return (
    <div className="p-6">
      <SpecOverview
        spec={spec}
        onEdit={handleEdit}
        onImport={handleImport}
        onSubmit={handleSubmit}
        onCompare={handleCompare}
        onHistory={handleHistory}
        onExport={handleExport}
        onApplyToBom={handleApplyToBom}
      />
      
      {showImporter && (
        <SpecImporter
          projectId={projectId}
          onImportComplete={handleImportComplete}
          onCancel={() => setShowImporter(false)}
        />
      )}
    </div>
  );
}

