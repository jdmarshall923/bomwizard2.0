'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectProvider, useProject } from '@/lib/context/ProjectContext';

function ProjectLayoutContent({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { setProjectId } = useProject();

  useEffect(() => {
    if (projectId) {
      setProjectId(projectId);
    }
    return () => setProjectId(null);
  }, [projectId, setProjectId]);

  return <>{children}</>;
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectProvider>
      <ProjectLayoutContent>{children}</ProjectLayoutContent>
    </ProjectProvider>
  );
}

