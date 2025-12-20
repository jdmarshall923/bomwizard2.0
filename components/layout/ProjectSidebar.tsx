'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  FileText,
  TrendingUp,
  Clock,
  Download,
  Package,
  Building2,
  FileCheck,
  Factory,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const projectNavigation = [
  { name: 'Dashboard', href: '/project/[projectId]', icon: BarChart3 },
  { name: 'BOM Explorer', href: '/project/[projectId]/bom', icon: FileText },
  { name: 'Cost Analysis', href: '/project/[projectId]/costs', icon: TrendingUp },
  { name: 'Version History', href: '/project/[projectId]/versions', icon: Clock },
  { name: 'Import Data', href: '/project/[projectId]/import', icon: Download },
];

const trackingNavigation = [
  { name: 'New Parts', href: '/project/[projectId]/new-parts', icon: Sparkles },
  { name: 'Quote Log', href: '/project/[projectId]/quotes', icon: FileCheck },
  { name: 'Manufacturing Log', href: '/project/[projectId]/manufacturing', icon: Factory },
];

const masterDataNavigation = [
  { name: 'SLItems', href: '/data/sl-items', icon: Package },
  { name: 'SLVendors', href: '/data/sl-vendors', icon: Building2 },
];

const SIDEBAR_STORAGE_KEY = 'bom-wizard-sidebar-collapsed';

export function ProjectSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.projectId as string;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getHref = (href: string) => {
    return href.replace('[projectId]', projectId || '');
  };

  const isActive = (href: string) => {
    const fullHref = getHref(href);
    return pathname === fullHref || pathname.startsWith(fullHref + '/');
  };

  const isExpanded = !isCollapsed || isHovered;

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col glass border-r border-[var(--border-subtle)] transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        onMouseEnter={(e) => e.stopPropagation()}
        className="absolute -right-3 top-16 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-lg hover:bg-[var(--bg-tertiary)] transition-colors pointer-events-auto"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        )}
      </button>

      {/* Header */}
      <div className="flex h-16 items-center border-b border-[var(--border-subtle)] px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-blue-light)] flex items-center justify-center shadow-lg glow-blue">
            <span className="text-white font-bold text-sm">BOM</span>
          </div>
          {isExpanded && (
            <span className="font-bold text-lg gradient-text whitespace-nowrap sidebar-text-fade-in">BOM Wizard</span>
          )}
        </div>
      </div>

      {/* Back to Projects */}
      <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
        <Link
          href="/projects"
          className={cn(
            'flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors',
            isExpanded ? 'justify-start' : 'justify-center'
          )}
          title={isCollapsed ? 'Back to Projects' : undefined}
        >
          <ArrowLeft className="h-4 w-4 flex-shrink-0" />
          {isExpanded && <span className="whitespace-nowrap sidebar-text-fade-in">Back to Projects</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {isExpanded && (
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] sidebar-text-fade-in">
            Project
          </div>
        )}
        {projectNavigation.map((item) => (
          <Link
            key={item.name}
            href={getHref(item.href)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-smooth hover-lift',
              isExpanded ? 'justify-start' : 'justify-center',
              isActive(item.href)
                ? 'bg-gradient-to-r from-[var(--accent-blue)]/20 to-[var(--accent-blue-light)]/20 text-[var(--text-primary)] border-l-2 border-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            )}
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {isExpanded && <span className="whitespace-nowrap sidebar-text-fade-in">{item.name}</span>}
          </Link>
        ))}

        {isExpanded && (
          <div className="px-3 py-2 mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] sidebar-text-fade-in">
            Tracking
          </div>
        )}
        {trackingNavigation.map((item) => (
          <Link
            key={item.name}
            href={getHref(item.href)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-smooth hover-lift',
              isExpanded ? 'justify-start' : 'justify-center',
              isActive(item.href)
                ? 'bg-gradient-to-r from-[var(--accent-blue)]/20 to-[var(--accent-blue-light)]/20 text-[var(--text-primary)] border-l-2 border-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            )}
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {isExpanded && <span className="whitespace-nowrap sidebar-text-fade-in">{item.name}</span>}
          </Link>
        ))}

        {isExpanded && (
          <div className="px-3 py-2 mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] sidebar-text-fade-in">
            Master Data
          </div>
        )}
        {masterDataNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-smooth hover-lift',
              isExpanded ? 'justify-start' : 'justify-center',
              pathname === item.href
                ? 'bg-gradient-to-r from-[var(--accent-blue)]/20 to-[var(--accent-blue-light)]/20 text-[var(--text-primary)] border-l-2 border-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            )}
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {isExpanded && <span className="whitespace-nowrap sidebar-text-fade-in">{item.name}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}

