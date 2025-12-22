'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Project } from '@/types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface ProjectContextType {
  project: Project | null;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  loading: boolean;
  refresh: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  // Use real-time listener to always have fresh project data
  useEffect(() => {
    if (!projectId) {
      setProject(null);
      return;
    }

    setLoading(true);
    const projectRef = doc(db, 'projects', projectId);
    
    const unsubscribe = onSnapshot(
      projectRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() } as Project);
        } else {
          setProject(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error loading project:', error);
        setProject(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  // Manual refresh (triggers re-fetch via snapshot)
  const refresh = useCallback(() => {
    // With onSnapshot, data is always fresh, but this can be used to force UI updates
    if (project) {
      setProject({ ...project });
    }
  }, [project]);

  return (
    <ProjectContext.Provider value={{ project, projectId, setProjectId, loading, refresh }}>
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

