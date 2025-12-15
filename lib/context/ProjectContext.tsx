'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project } from '@/types';
import { getDocument } from '@/lib/firebase/firestore';

interface ProjectContextType {
  project: Project | null;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      setLoading(true);
      getDocument<Project>('projects', projectId)
        .then((data) => {
          setProject(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error loading project:', error);
          setProject(null);
          setLoading(false);
        });
    } else {
      setProject(null);
    }
  }, [projectId]);

  return (
    <ProjectContext.Provider value={{ project, projectId, setProjectId, loading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

