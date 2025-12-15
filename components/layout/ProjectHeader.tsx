'use client';

import { useParams } from 'next/navigation';
import { useProjects } from '@/lib/hooks/useProjects';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDocument } from '@/lib/firebase/firestore';
import { Project } from '@/types';

export function ProjectHeader() {
  const params = useParams();
  const router = useRouter();
  const currentProjectId = params?.projectId as string;
  const { projects } = useProjects();
  const [project, setProject] = useState<Project | null>(null);

  // Load project data directly if needed
  useEffect(() => {
    if (currentProjectId) {
      getDocument<Project>('projects', currentProjectId)
        .then(setProject)
        .catch(() => setProject(null));
    }
  }, [currentProjectId]);

  const handleProjectChange = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  return (
    <div className="h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Select value={currentProjectId} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {project && (
        <div className="text-sm text-[var(--text-secondary)]">
          {project.description || 'No description'}
        </div>
      )}
    </div>
  );
}

