'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSpec } from '@/lib/hooks/useSpec';
import { SpecApplyWizard } from '@/components/spec/SpecApplyWizard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AppliedMapping } from '@/types/spec';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function SpecApplyPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const { spec, loading, error } = useSpec(projectId, 'current-user');
  
  const handleApply = async (mappings: AppliedMapping[]) => {
    // TODO: Implement actual BOM application
    // This would:
    // 1. Add groups to Working BOM via transferService
    // 2. Save mappings to learning database
    // 3. Update spec status
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate
    toast.success(`Applied ${mappings.length} mappings to BOM`);
  };
  
  const handleCancel = () => {
    router.push(`/project/${projectId}/spec`);
  };
  
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  if (error || !spec) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertCircle className="text-red-500" size={24} />
            <div>
              <p className="font-medium text-red-700">
                {error ? 'Error loading spec' : 'No spec found'}
              </p>
              <p className="text-sm text-red-600">
                {error?.message || 'Create a spec first before applying to BOM'}
              </p>
            </div>
            <Button onClick={handleCancel} variant="outline" className="ml-auto">
              <ArrowLeft size={16} className="mr-1.5" />
              Back to Spec
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Check if spec is in a state that can be applied
  if (spec.status !== 'accepted' && spec.status !== 'draft') {
    return (
      <div className="p-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertCircle className="text-amber-500" size={24} />
            <div>
              <p className="font-medium text-amber-700">
                Cannot Apply Spec
              </p>
              <p className="text-sm text-amber-600">
                Spec must be accepted or in draft status to apply to BOM.
                Current status: {spec.status}
              </p>
            </div>
            <Button onClick={handleCancel} variant="outline" className="ml-auto">
              <ArrowLeft size={16} className="mr-1.5" />
              Back to Spec
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <SpecApplyWizard
        spec={spec}
        onApply={handleApply}
        onCancel={handleCancel}
      />
    </div>
  );
}

