'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { NewPart } from '@/types/newPart';
import { Project, GATE_METADATA, GateKey } from '@/types/project';
import { UNASSIGNED_GROUP_CODE } from '@/types/bom';
import { checkEarlyOrder } from '@/lib/bom/newPartService';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Expand,
  Filter,
  Package,
} from 'lucide-react';

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter' | 'year';
type TimelineFilter = 'all' | 'at-risk' | 'late' | string;

interface TimelineTabProps {
  parts: NewPart[];
  project: Project | null;
  groups: { code: string; description?: string }[];
  onPartClick: (part: NewPart) => void;
  onFullscreen?: () => void;
  className?: string;
}

interface GroupedTimelineParts {
  key: string;
  label: string;
  isEarlyOrder?: boolean;
  parts: NewPart[];
  atRiskCount: number;
  lateCount: number;
  isExpanded: boolean;
}

// Fixed row heights for alignment
const GROUP_ROW_HEIGHT = 36;
const PART_ROW_HEIGHT = 28;
const HEADER_HEIGHT = 56;

// Gate colors
const GATE_COLORS: Record<GateKey, string> = {
  briefed: '#6366f1',
  dti: '#8b5cf6',
  da: '#ec4899',
  dtx: '#f97316',
  sprint: '#10b981',
  dtl: '#06b6d4',
  massProduction: '#22c55e',
  dtc: '#64748b',
};

// Get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function TimelineTab({
  parts,
  project,
  groups,
  onPartClick,
  onFullscreen,
  className,
}: TimelineTabProps) {
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Sync vertical scroll between panels
  const handleLeftScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleRightScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Sync vertical scroll with left panel
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    // Sync horizontal scroll with header
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Calculate date range for timeline - support up to 5 years
  const dateRange = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setMonth(start.getMonth() - 2);
    
    let end = new Date(today);
    if (zoom === 'year') {
      end.setFullYear(end.getFullYear() + 5);
    } else if (zoom === 'quarter') {
      end.setFullYear(end.getFullYear() + 3);
    } else {
      end.setMonth(end.getMonth() + 18);
    }

    // Extend if gates are further out
    if (project?.gates) {
      Object.values(project.gates).forEach((gate) => {
        if (gate?.date) {
          const gateDate = gate.date.toDate();
          if (gateDate > end) {
            end = new Date(gateDate);
            end.setMonth(end.getMonth() + 3);
          }
        }
      });
    }

    // Also check part dates
    parts.forEach((part) => {
      if (part.productionTargetDate) {
        const partDate = part.productionTargetDate.toDate();
        if (partDate > end) {
          end = new Date(partDate);
          end.setMonth(end.getMonth() + 3);
        }
      }
    });

    return { start, end };
  }, [project?.gates, parts, zoom]);

  // Calculate pixels per day based on zoom
  const pixelsPerDay = useMemo(() => {
    switch (zoom) {
      case 'day': return 40;
      case 'week': return 8;
      case 'month': return 2;
      case 'quarter': return 0.7;
      case 'year': return 0.15;
      default: return 2;
    }
  }, [zoom]);

  // Total width of timeline
  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const timelineWidth = Math.max(totalDays * pixelsPerDay, 800);

  // Calculate early order parts
  const earlyOrderParts = useMemo(() => {
    if (!project) return [];
    return parts.filter((part) => {
      const check = checkEarlyOrder(part, project);
      return check.needsEarlyOrder;
    });
  }, [parts, project]);

  // Filter and group parts
  const groupedParts = useMemo(() => {
    let filteredParts = parts;

    if (filter === 'at-risk') {
      filteredParts = filteredParts.filter((p) => 
        (!p.sprintPoNumber && p.sprintTargetDate) || 
        (!p.productionPoNumber && p.productionTargetDate)
      );
    } else if (filter === 'late') {
      filteredParts = filteredParts.filter((p) => p.sprintPoLate || p.productionPoLate);
    } else if (filter !== 'all' && !filter.startsWith('at-') && !filter.startsWith('late')) {
      filteredParts = filteredParts.filter((p) => p.groupCode === filter);
    }

    const grouped = new Map<string, NewPart[]>();
    filteredParts.forEach((part) => {
      const key = part.groupCode || UNASSIGNED_GROUP_CODE;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(part);
    });

    const result: GroupedTimelineParts[] = [];

    if (earlyOrderParts.length > 0 && filter === 'all') {
      result.push({
        key: '__EARLY_ORDER__',
        label: 'Early Orders',
        isEarlyOrder: true,
        parts: earlyOrderParts,
        atRiskCount: earlyOrderParts.length,
        lateCount: 0,
        isExpanded: !collapsedGroups.has('__EARLY_ORDER__'),
      });
    }

    Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([key, groupParts]) => {
        const atRiskCount = groupParts.filter((p) => 
          (!p.sprintPoNumber && p.sprintTargetDate) || 
          (!p.productionPoNumber && p.productionTargetDate)
        ).length;
        const lateCount = groupParts.filter((p) => p.sprintPoLate || p.productionPoLate).length;

        result.push({
          key,
          label: key === UNASSIGNED_GROUP_CODE ? 'Unassigned' : key,
          parts: groupParts,
          atRiskCount,
          lateCount,
          isExpanded: !collapsedGroups.has(key),
        });
      });

    return result;
  }, [parts, filter, collapsedGroups, earlyOrderParts]);

  // Toggle group expansion
  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Get x position for a date
  const getDatePosition = useCallback((date: Date | { toDate: () => Date }) => {
    const d = date instanceof Date ? date : date.toDate();
    const days = (d.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return days * pixelsPerDay;
  }, [dateRange.start, pixelsPerDay]);

  // Navigate timeline
  const scrollToToday = useCallback(() => {
    const todayPos = getDatePosition(new Date());
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollLeft = Math.max(0, todayPos - 300);
    }
  }, [getDatePosition]);

  const scrollBy = (direction: 'prev' | 'next') => {
    if (!rightPanelRef.current) return;
    const amount = zoom === 'day' ? 200 : zoom === 'week' ? 300 : zoom === 'month' ? 400 : 500;
    rightPanelRef.current.scrollLeft += (direction === 'next' ? 1 : -1) * amount;
  };

  // Scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(scrollToToday, 100);
    return () => clearTimeout(timer);
  }, [scrollToToday]);

  // Generate time markers based on zoom level
  const timeMarkers = useMemo(() => {
    const markers: { label: string; x: number; isMinor?: boolean }[] = [];
    const current = new Date(dateRange.start);

    switch (zoom) {
      case 'day':
        current.setHours(0, 0, 0, 0);
        while (current < dateRange.end) {
          markers.push({
            label: current.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            x: getDatePosition(current),
            isMinor: current.getDay() !== 1,
          });
          current.setDate(current.getDate() + 1);
        }
        break;

      case 'week':
        current.setDate(current.getDate() - current.getDay() + 1);
        while (current < dateRange.end) {
          const weekNum = getWeekNumber(current);
          markers.push({
            label: `W${weekNum} (${current.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`,
            x: getDatePosition(current),
          });
          current.setDate(current.getDate() + 7);
        }
        break;

      case 'month':
        current.setDate(1);
        current.setMonth(current.getMonth() + 1);
        while (current < dateRange.end) {
          markers.push({
            label: current.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
            x: getDatePosition(current),
          });
          current.setMonth(current.getMonth() + 1);
        }
        break;

      case 'quarter':
        current.setDate(1);
        current.setMonth(Math.floor(current.getMonth() / 3) * 3 + 3);
        while (current < dateRange.end) {
          const quarter = Math.floor(current.getMonth() / 3) + 1;
          markers.push({
            label: `Q${quarter} ${current.getFullYear()}`,
            x: getDatePosition(current),
          });
          current.setMonth(current.getMonth() + 3);
        }
        break;

      case 'year':
        current.setDate(1);
        current.setMonth(0);
        current.setFullYear(current.getFullYear() + 1);
        while (current < dateRange.end) {
          markers.push({
            label: current.getFullYear().toString(),
            x: getDatePosition(current),
          });
          current.setFullYear(current.getFullYear() + 1);
        }
        break;
    }

    return markers;
  }, [dateRange, zoom, getDatePosition]);

  // Calculate today position
  const todayPosition = getDatePosition(new Date());

  // Build flat row list for perfect alignment
  // Include unique key combining group + part id to handle parts appearing in multiple groups (e.g., Early Orders + regular group)
  const rows = useMemo(() => {
    const rowList: { type: 'group' | 'part'; group?: GroupedTimelineParts; part?: NewPart; key: string }[] = [];
    
    groupedParts.forEach((group) => {
      rowList.push({ type: 'group', group, key: `group-${group.key}` });
      if (group.isExpanded) {
        group.parts.forEach((part) => {
          rowList.push({ type: 'part', part, group, key: `${group.key}-${part.id}` });
        });
      }
    });

    return rowList;
  }, [groupedParts]);

  // Get gates from project
  const gates = useMemo(() => {
    if (!project?.gates) return [];
    return Object.entries(project.gates)
      .filter(([_, gate]) => gate?.date)
      .map(([key, gate]) => ({
        key: key as GateKey,
        date: gate.date!,
        meta: GATE_METADATA.find((g) => g.key === key),
      }));
  }, [project?.gates]);

  return (
    <div className={cn('flex flex-col h-full bg-[var(--bg-primary)]', className)}>
      {/* Controls */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
        {/* Zoom */}
        <Select value={zoom} onValueChange={(v) => setZoom(v as ZoomLevel)}>
          <SelectTrigger className="w-28 h-8 text-xs bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="quarter">Quarter</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollBy('prev')}
            className="h-8 w-8 p-0 border-[var(--border-subtle)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToToday}
            className="h-8 px-3 text-xs border-[var(--border-subtle)]"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollBy('next')}
            className="h-8 w-8 p-0 border-[var(--border-subtle)]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="h-4 w-4 text-[var(--text-tertiary)]" />
          <Select value={filter} onValueChange={(v) => setFilter(v as TimelineFilter)}>
            <SelectTrigger className="w-32 h-8 text-xs bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parts</SelectItem>
              <SelectItem value="at-risk">At Risk</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gates indicator */}
        <div className="hidden lg:flex items-center gap-1 ml-2 px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-tertiary)] mr-1">Gates:</span>
          {(['briefed', 'dti', 'da', 'dtx', 'sprint', 'dtl', 'massProduction', 'dtc'] as GateKey[]).map((gateKey) => {
            const hasDate = project?.gates?.[gateKey]?.date;
            const meta = GATE_METADATA.find((g) => g.key === gateKey);
            return (
              <TooltipProvider key={gateKey}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="w-2 h-2 rounded-full cursor-help"
                      style={{
                        backgroundColor: hasDate ? GATE_COLORS[gateKey] : 'var(--bg-tertiary)',
                        border: hasDate ? 'none' : '1px solid var(--border-subtle)',
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <div className="font-medium">{meta?.name}</div>
                    <div className="text-[var(--text-tertiary)]">
                      {hasDate 
                        ? project?.gates?.[gateKey]?.date?.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'No date set'
                      }
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Fullscreen */}
        {onFullscreen && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFullscreen}
            className="h-8 gap-1.5 border-[var(--border-subtle)]"
          >
            <Expand className="h-3.5 w-3.5" />
            Fullscreen
          </Button>
        )}
      </div>

      {/* Timeline Header - Fixed */}
      <div className="flex border-b border-[var(--border-subtle)]" style={{ height: HEADER_HEIGHT }}>
        {/* Left header - empty for part names column */}
        <div className="w-56 flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]" />
        
        {/* Right header - scrollable time markers (synced with main content) */}
        <div 
          ref={headerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden bg-[var(--bg-secondary)]"
          style={{ scrollbarWidth: 'none' }}
        >
          <div 
            className="h-full relative"
            style={{ width: timelineWidth }}
          >
            {/* Time markers */}
            {timeMarkers.map((marker, idx) => (
              <div
                key={idx}
                className={cn(
                  "absolute top-0 flex items-center text-xs border-l",
                  marker.isMinor 
                    ? "h-5 text-[var(--text-quaternary)] border-[var(--border-subtle)]/50" 
                    : "h-7 text-[var(--text-tertiary)] border-[var(--border-subtle)]"
                )}
                style={{ left: marker.x }}
              >
                <span className="px-2 whitespace-nowrap">{marker.label}</span>
              </div>
            ))}

            {/* Gate markers in header */}
            {gates.map(({ key, date, meta }) => {
              const x = getDatePosition(date);
              return (
                <TooltipProvider key={key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute bottom-0 flex items-center px-2 text-xs font-medium rounded-t cursor-pointer whitespace-nowrap"
                        style={{
                          left: x - 24,
                          height: 24,
                          backgroundColor: `${GATE_COLORS[key]}20`,
                          color: GATE_COLORS[key],
                          borderTop: `2px solid ${GATE_COLORS[key]}`,
                        }}
                      >
                        {meta?.name || key}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div className="font-semibold">{meta?.fullName}</div>
                        <div className="text-[var(--text-secondary)]">
                          {date.toDate().toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Synchronized scrolling */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel - Part names (synced vertical scroll) */}
        <div 
          ref={leftPanelRef}
          className="w-56 flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 overflow-y-auto overflow-x-hidden"
          onScroll={handleLeftScroll}
          style={{ scrollbarWidth: 'none' }} // Hide scrollbar, sync with right
        >
          {rows.map((row) => (
            row.type === 'group' ? (
              <button
                key={row.key}
                onClick={() => toggleGroup(row.group!.key)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 text-left hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border-subtle)]',
                  row.group!.isEarlyOrder && 'bg-[var(--accent-orange)]/5 border-l-2 border-l-[var(--accent-orange)]'
                )}
                style={{ height: GROUP_ROW_HEIGHT }}
              >
                {row.group!.isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
                )}
                {row.group!.isEarlyOrder ? (
                  <AlertTriangle className="h-4 w-4 text-[var(--accent-orange)] flex-shrink-0" />
                ) : (
                  <Package className="h-4 w-4 text-[var(--accent-blue)] flex-shrink-0" />
                )}
                <span className={cn(
                  'flex-1 truncate text-sm font-medium',
                  row.group!.isEarlyOrder && 'text-[var(--accent-orange)]'
                )}>
                  {row.group!.label}
                </span>
                <Badge className="h-5 px-1.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                  {row.group!.parts.length}
                </Badge>
              </button>
            ) : (
              <button
                key={row.key}
                onClick={() => onPartClick(row.part!)}
                className="flex items-center gap-2 w-full px-3 pl-10 text-left hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border-subtle)]/50"
                style={{ height: PART_ROW_HEIGHT }}
              >
                <span className="flex-1 truncate text-xs font-mono text-[var(--accent-blue)]">
                  {row.part!.placeholderCode}
                </span>
              </button>
            )
          ))}
        </div>

        {/* Right Panel - Gantt chart (horizontal + vertical scroll) */}
        <div 
          ref={rightPanelRef}
          className="flex-1 overflow-auto"
          onScroll={handleRightScroll}
        >
          <div style={{ width: timelineWidth, minHeight: '100%' }} className="relative">
            {/* Today line */}
            <div
              className="absolute w-0.5 bg-[var(--accent-blue)] z-10 pointer-events-none"
              style={{ left: todayPosition, top: 0, bottom: 0 }}
            >
              <div className="sticky top-0 -ml-3 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--accent-blue)] text-white whitespace-nowrap">
                Today
              </div>
            </div>

            {/* Gate vertical lines */}
            {gates.map(({ key, date }) => {
              const x = getDatePosition(date);
              return (
                <div
                  key={`${key}-line`}
                  className="absolute w-px pointer-events-none"
                  style={{
                    left: x,
                    top: 0,
                    bottom: 0,
                    backgroundColor: GATE_COLORS[key],
                    opacity: 0.4,
                  }}
                />
              );
            })}

            {/* Rows */}
            {rows.map((row) => (
              row.type === 'group' ? (
                <div 
                  key={row.key} 
                  className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/20"
                  style={{ height: GROUP_ROW_HEIGHT }}
                />
              ) : (
                <div
                  key={row.key}
                  className="border-b border-[var(--border-subtle)]/50 relative group hover:bg-[var(--bg-tertiary)]/30"
                  style={{ height: PART_ROW_HEIGHT }}
                >
                  {/* No dates message */}
                  {!row.part!.sprintTargetDate && !row.part!.productionTargetDate && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)]"
                      style={{ left: Math.max(todayPosition + 20, 20) }}
                      onClick={() => onPartClick(row.part!)}
                    >
                      <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-subtle)] whitespace-nowrap">
                        No dates set
                      </span>
                    </div>
                  )}
                  
                  {/* Sprint bar */}
                  {row.part!.sprintTargetDate && (
                    <GanttBar
                      part={row.part!}
                      type="sprint"
                      startDate={dateRange.start}
                      pixelsPerDay={pixelsPerDay}
                      rowHeight={PART_ROW_HEIGHT}
                      onClick={() => onPartClick(row.part!)}
                    />
                  )}
                  
                  {/* Production bar - offset if sprint also exists */}
                  {row.part!.productionTargetDate && (
                    <GanttBar
                      part={row.part!}
                      type="production"
                      startDate={dateRange.start}
                      pixelsPerDay={pixelsPerDay}
                      rowHeight={PART_ROW_HEIGHT}
                      offset={row.part!.sprintTargetDate ? 12 : 0}
                      onClick={() => onPartClick(row.part!)}
                    />
                  )}
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Gantt Bar Component
interface GanttBarProps {
  part: NewPart;
  type: 'sprint' | 'production';
  startDate: Date;
  pixelsPerDay: number;
  rowHeight: number;
  offset?: number;
  onClick: () => void;
}

function GanttBar({ part, type, startDate, pixelsPerDay, rowHeight, offset = 0, onClick }: GanttBarProps) {
  const targetDate = type === 'sprint' ? part.sprintTargetDate : part.productionTargetDate;
  const isLate = type === 'sprint' ? part.sprintPoLate : part.productionPoLate;
  const hasOrder = type === 'sprint' ? part.sprintPoNumber : part.productionPoNumber;

  if (!targetDate) return null;

  const target = targetDate.toDate();
  
  // Calculate lead time
  const freightDays = part.freightType === 'air' ? (part.airFreightDays || 5) : (part.seaFreightDays || 35);
  const parsedLeadWeeks = part.productionLeadTimeWeeks ? parseInt(part.productionLeadTimeWeeks, 10) : NaN;
  const baseLead = part.baseLeadTimeDays ?? (!isNaN(parsedLeadWeeks) ? parsedLeadWeeks * 7 : 30);
  const totalLeadDays = baseLead + freightDays;

  // Calculate start position (order date = target - lead time)
  const orderDate = new Date(target);
  orderDate.setDate(orderDate.getDate() - totalLeadDays);
  
  const startX = Math.max(0, (orderDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) * pixelsPerDay);
  const endX = (target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) * pixelsPerDay;
  const width = Math.max(endX - startX, 8);

  // Calculate freight portion
  const freightWidth = Math.max(freightDays * pixelsPerDay, 4);
  const orderWidth = Math.max(width - freightWidth, 4);

  const barHeight = Math.min(rowHeight - 6 - offset, 12);
  const barTop = 3 + offset;

  const barColor = isLate 
    ? 'var(--accent-red)' 
    : hasOrder 
      ? 'var(--accent-green)' 
      : type === 'sprint' 
        ? '#10b981'
        : '#06b6d4';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            className="absolute flex cursor-pointer hover:opacity-80 transition-opacity"
            style={{ 
              left: startX, 
              top: barTop,
              height: barHeight,
            }}
          >
            {/* Order/manufacturing portion */}
            <div
              className="h-full rounded-l"
              style={{
                width: orderWidth,
                backgroundColor: barColor,
                opacity: hasOrder ? 1 : 0.6,
              }}
            />
            {/* Freight portion */}
            <div
              className="h-full rounded-r"
              style={{
                width: freightWidth,
                backgroundColor: barColor,
                opacity: hasOrder ? 0.5 : 0.3,
              }}
            />
            {/* Late indicator */}
            {isLate && (
              <div className="absolute -right-3 top-1/2 -translate-y-1/2">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-red)] flex items-center justify-center">
                  <span className="text-[6px] text-white font-bold">!</span>
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] p-2">
          <div className="space-y-1 text-xs">
            <div className="font-semibold">{part.placeholderCode}</div>
            <div className="text-[var(--text-secondary)]">{type === 'sprint' ? 'Sprint' : 'Production'} Order</div>
            <div className="grid grid-cols-2 gap-x-4 text-[var(--text-tertiary)]">
              <span>Lead Time:</span>
              <span>{baseLead}d + {freightDays}d freight</span>
              <span>Target:</span>
              <span>{target.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              {hasOrder && (
                <>
                  <span>PO:</span>
                  <span className="font-mono">{type === 'sprint' ? part.sprintPoNumber : part.productionPoNumber}</span>
                </>
              )}
            </div>
            {isLate && (
              <div className="text-[var(--accent-red)] font-medium">⚠️ Late</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
