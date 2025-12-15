'use client';

import { useProjects } from '@/lib/hooks/useProjects';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export function ProjectSwitcher({ currentProjectId }: { currentProjectId?: string }) {
  const { projects } = useProjects();
  const router = useRouter();

  const handleChange = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  return (
    <Select value={currentProjectId} onValueChange={handleChange}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Select project" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name} ({project.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

