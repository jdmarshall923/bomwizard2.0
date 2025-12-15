'use client';

import { Project } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
      onClick={() => router.push(`/project/${project.id}`)}
    >
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <CardDescription>{project.code}</CardDescription>
      </CardHeader>
      <CardContent>
        {project.description && (
          <p className="text-sm text-[var(--text-secondary)]">{project.description}</p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded ${
              project.status === 'active'
                ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]'
                : project.status === 'archived'
                ? 'bg-[var(--text-tertiary)]/20 text-[var(--text-tertiary)]'
                : 'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]'
            }`}
          >
            {project.status}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

