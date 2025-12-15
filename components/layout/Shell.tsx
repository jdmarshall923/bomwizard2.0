'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { GlobalSidebar } from './GlobalSidebar';
import { ProjectSidebar } from './ProjectSidebar';
import { ProjectHeader } from './ProjectHeader';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const isProjectRoute = pathname?.startsWith('/project/');

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {isProjectRoute ? <ProjectSidebar /> : <GlobalSidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        {isProjectRoute && <ProjectHeader />}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

