'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSpec } from '@/lib/hooks/useSpec';
import { SpecEditor } from '@/components/spec/SpecEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Spec } from '@/types/spec';

export default function SpecEditPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const { spec, loading, error, updateSpec, submitSpec } = useSpec(projectId, 'current-user');
  
  const handleSave = async (data: Partial<Spec>) => {
    try {
      await updateSpec(data);
      toast.success('Spec saved successfully');
    } catch (err) {
      toast.error('Failed to save spec');
      throw err;
    }
  };
  
  const handleSubmit = async () => {
    try {
      await submitSpec();
      toast.success('Spec submitted for review');
      router.push(`/project/${projectId}/spec`);
    } catch (err) {
      toast.error('Failed to submit spec');
    }
  };
  
  const handleCancel = () => {
    router.push(`/project/${projectId}/spec`);
  };
  
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">Error: {error.message}</p>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <SpecEditor
        spec={spec || undefined}
        onSave={handleSave}
        onSubmit={spec?.status === 'draft' ? handleSubmit : undefined}
        onCancel={handleCancel}
        isNew={!spec}
      />
    </div>
  );
}

