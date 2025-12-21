'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { NewPart, OrderStatus } from '@/types/newPart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ZoomIn, 
  ZoomOut, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Package,
  Factory,
  Link2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  Ship,
  Plane,
  Maximize2,
  Minimize2,
  Move
} from 'lucide-react';
import { 
  format, 
  differenceInDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth
} from 'date-fns';

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'multi-year';

// Zoom scale factors - how many pixels per day at each zoom level
const ZOOM_SCALES: Record<ZoomLevel, number> = {
  day: 40,         // 40px per day - most zoomed in
  week: 12,        // 12px per day
  month: 4,        // 4px per day
  quarter: 1.5,    // 1.5px per day (~45px per month)
  year: 0.5,       // 0.5px per day (~15px per month, ~180px per year)
  'multi-year': 0.15, // 0.15px per day (~55px per year) - can see 5+ years
};

const ZOOM_ORDER: ZoomLevel[] = ['day', 'week', 'month', 'quarter', 'year', 'multi-year'];

const ZOOM_LABELS: Record<ZoomLevel, string> = {
  day: 'Days',
  week: 'Weeks',
  month: 'Months',
  quarter: 'Quarters',
  year: 'Year',
  'multi-year': 'Years',
};

interface GateMarker {
  key: string;
  name: string;
  date: Date;
}

interface UnifiedGanttProps {
  parts: NewPart[];
  gateMarkers: GateMarker[];
  onPartClick?: (part: NewPart) => void;
  onToggleOrderTogether?: (partId: string, value: boolean) => void;
  // Optional: external selection control
  selectedPartIds?: Set<string>;
  showAllByDefault?: boolean;
  compact?: boolean; // Smaller height for hero display
  // Collapse/expand for split view
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  // Group parts by BOM group for scale
  groupByBomGroup?: boolean;
}

const STATUS_COLORS: Record<OrderStatus | 'none', { bg: string; text: string }> = {
  none: { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-tertiary)]' },
  not_ordered: { bg: 'bg-[var(--text-tertiary)]', text: 'text-[var(--text-tertiary)]' },
  ordered: { bg: 'bg-[var(--accent-blue)]', text: 'text-[var(--accent-blue)]' },
  in_transit: { bg: 'bg-[var(--accent-orange)]', text: 'text-[var(--accent-orange)]' },
  received: { bg: 'bg-[var(--accent-green)]', text: 'text-[var(--accent-green)]' },
};

export function UnifiedGantt({
  parts,
  gateMarkers,
  onPartClick,
  onToggleOrderTogether,
  selectedPartIds,
  showAllByDefault = true,
  compact = false,
  isCollapsed = false,
  onToggleCollapse,
  groupByBomGroup = false,
}: UnifiedGanttProps) {
  // ALL HOOKS MUST BE DECLARED BEFORE ANY EARLY RETURNS
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });
  const [scrollLeft, setScrollLeft] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  // Filter parts based on selection
  const visibleParts = useMemo(() => {
    if (!selectedPartIds || selectedPartIds.size === 0) {
      return showAllByDefault ? parts : [];
    }
    return parts.filter(p => selectedPartIds.has(p.id));
  }, [parts, selectedPartIds, showAllByDefault]);

  // Handle scroll sync
  const handleScroll = useCallback(() => {
    if (timelineRef.current) {
      setScrollLeft(timelineRef.current.scrollLeft);
    }
  }, []);

  // Calculate timeline bounds - extend to multiple years for navigation
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const today = new Date();
    
    // Start from 1 year ago, end 3 years from now (4 year window)
    const start = startOfMonth(subMonths(today, 12));
    const end = endOfMonth(addMonths(today, 36));
    
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: differenceInDays(end, start),
    };
  }, []);
  
  // Pixel width of the timeline based on zoom level
  const timelineWidth = useMemo(() => {
    return totalDays * ZOOM_SCALES[zoomLevel];
  }, [totalDays, zoomLevel]);

  // Timeline headers - change based on zoom level
  const timelineHeaders = useMemo(() => {
    const interval = { start: timelineStart, end: timelineEnd };
    
    if (zoomLevel === 'day') {
      return eachDayOfInterval(interval).map(date => ({
        date,
        label: format(date, 'd'),
        subLabel: format(date, 'EEE'),
        width: ZOOM_SCALES.day,
      }));
    } else if (zoomLevel === 'week') {
      return eachWeekOfInterval(interval).map(date => ({
        date,
        label: format(date, 'MMM d'),
        subLabel: `Wk ${format(date, 'w')}`,
        width: ZOOM_SCALES.week * 7,
      }));
    } else if (zoomLevel === 'month') {
      return eachMonthOfInterval(interval).map(date => {
        const daysInMonth = differenceInDays(endOfMonth(date), startOfMonth(date)) + 1;
        return {
          date,
          label: format(date, 'MMM'),
          subLabel: format(date, 'yyyy'),
          width: ZOOM_SCALES.month * daysInMonth,
        };
      });
    } else if (zoomLevel === 'quarter') {
      // Show months but with quarter grouping
      return eachMonthOfInterval(interval).map(date => {
        const daysInMonth = differenceInDays(endOfMonth(date), startOfMonth(date)) + 1;
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return {
          date,
          label: format(date, 'MMM'),
          subLabel: `Q${quarter} ${format(date, 'yy')}`,
          width: ZOOM_SCALES.quarter * daysInMonth,
        };
      });
    } else if (zoomLevel === 'year') {
      // Show quarters
      const quarters: { date: Date; label: string; subLabel: string; width: number }[] = [];
      let current = new Date(timelineStart);
      while (current <= timelineEnd) {
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        const quarterStart = new Date(current.getFullYear(), (quarter - 1) * 3, 1);
        const quarterEnd = new Date(current.getFullYear(), quarter * 3, 0);
        const daysInQuarter = differenceInDays(quarterEnd, quarterStart) + 1;
        quarters.push({
          date: quarterStart,
          label: `Q${quarter}`,
          subLabel: format(current, 'yyyy'),
          width: ZOOM_SCALES.year * daysInQuarter,
        });
        current = addMonths(current, 3);
      }
      return quarters;
    } else {
      // multi-year: show years
      const years: { date: Date; label: string; subLabel: string; width: number }[] = [];
      let currentYear = timelineStart.getFullYear();
      const endYear = timelineEnd.getFullYear();
      while (currentYear <= endYear) {
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        const daysInYear = differenceInDays(yearEnd, yearStart) + 1;
        years.push({
          date: yearStart,
          label: String(currentYear),
          subLabel: '',
          width: ZOOM_SCALES['multi-year'] * daysInYear,
        });
        currentYear++;
      }
      return years;
    }
  }, [timelineStart, timelineEnd, zoomLevel]);

  // Get pixel position for a date
  const getPixelPosition = useCallback((date: Date): number => {
    const days = differenceInDays(date, timelineStart);
    return days * ZOOM_SCALES[zoomLevel];
  }, [timelineStart, zoomLevel]);

  // Get percentage position (for absolute positioning within timeline)
  const getPosition = useCallback((date: Date | undefined): number => {
    if (!date) return getPixelPosition(new Date());
    return getPixelPosition(date);
  }, [getPixelPosition]);

  // Gate positions in pixels
  const gatePositions = useMemo(() => {
    return gateMarkers.map(marker => ({
      ...marker,
      position: getPixelPosition(marker.date),
    }));
  }, [gateMarkers, getPixelPosition]);

  // Today position in pixels
  const todayPosition = getPixelPosition(new Date());

  const toggleExpanded = (partId: string) => {
    const newExpanded = new Set(expandedParts);
    if (newExpanded.has(partId)) {
      newExpanded.delete(partId);
    } else {
      newExpanded.add(partId);
    }
    setExpandedParts(newExpanded);
  };

  // Scroll to today
  const scrollToToday = useCallback(() => {
    if (timelineRef.current) {
      const container = timelineRef.current;
      const todayPos = getPixelPosition(new Date());
      container.scrollLeft = todayPos - container.clientWidth / 2;
    }
  }, [getPixelPosition]);

  // Navigate by month
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (timelineRef.current) {
      const container = timelineRef.current;
      const monthPixels = 30 * ZOOM_SCALES[zoomLevel];
      container.scrollLeft += direction === 'next' ? monthPixels : -monthPixels;
    }
  };

  // Zoom functions using ZOOM_ORDER array
  const zoomIn = () => {
    const container = timelineRef.current;
    if (!container) return;
    
    const currentIndex = ZOOM_ORDER.indexOf(zoomLevel);
    if (currentIndex <= 0) return; // Already at max zoom
    
    // Remember center position before zoom
    const centerX = container.scrollLeft + container.clientWidth / 2;
    const centerRatio = centerX / timelineWidth;
    
    const newZoomLevel = ZOOM_ORDER[currentIndex - 1];
    setZoomLevel(newZoomLevel);
    
    // After zoom, scroll to keep the same date centered
    requestAnimationFrame(() => {
      if (container) {
        const newWidth = totalDays * ZOOM_SCALES[newZoomLevel];
        container.scrollLeft = centerRatio * newWidth - container.clientWidth / 2;
      }
    });
  };

  const zoomOut = () => {
    const container = timelineRef.current;
    if (!container) return;
    
    const currentIndex = ZOOM_ORDER.indexOf(zoomLevel);
    if (currentIndex >= ZOOM_ORDER.length - 1) return; // Already at min zoom
    
    const centerX = container.scrollLeft + container.clientWidth / 2;
    const centerRatio = centerX / timelineWidth;
    
    const newZoomLevel = ZOOM_ORDER[currentIndex + 1];
    setZoomLevel(newZoomLevel);
    
    requestAnimationFrame(() => {
      if (container) {
        const newWidth = totalDays * ZOOM_SCALES[newZoomLevel];
        container.scrollLeft = centerRatio * newWidth - container.clientWidth / 2;
      }
    });
  };
  
  const canZoomIn = ZOOM_ORDER.indexOf(zoomLevel) > 0;
  const canZoomOut = ZOOM_ORDER.indexOf(zoomLevel) < ZOOM_ORDER.length - 1;

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }
  }, [zoomLevel]);

  // Mouse drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (timelineRef.current) {
      setIsDragging(true);
      setDragStart({
        x: e.pageX,
        scrollLeft: timelineRef.current.scrollLeft,
      });
      timelineRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;
    const dx = e.pageX - dragStart.x;
    timelineRef.current.scrollLeft = dragStart.scrollLeft - dx;
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (timelineRef.current) {
      timelineRef.current.style.cursor = 'grab';
    }
  }, []);

  // Touch pinch-to-zoom
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setLastTouchDistance(getTouchDistance(e.touches));
    } else if (e.touches.length === 1 && timelineRef.current) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].pageX,
        scrollLeft: timelineRef.current.scrollLeft,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance !== null) {
      const currentDistance = getTouchDistance(e.touches);
      const delta = currentDistance - lastTouchDistance;
      
      if (Math.abs(delta) > 20) {
        if (delta > 0) {
          zoomIn();
        } else {
          zoomOut();
        }
        setLastTouchDistance(currentDistance);
      }
    } else if (e.touches.length === 1 && isDragging && timelineRef.current) {
      const dx = e.touches[0].pageX - dragStart.x;
      timelineRef.current.scrollLeft = dragStart.scrollLeft - dx;
    }
  };

  const handleTouchEnd = () => {
    setLastTouchDistance(null);
    setIsDragging(false);
  };

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    if (timeline) {
      timeline.addEventListener('scroll', handleScroll);
    }
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      if (timeline) {
        timeline.removeEventListener('scroll', handleScroll);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp, handleScroll]);

  // Scroll to today on mount
  useEffect(() => {
    scrollToToday();
  }, [scrollToToday]);

  // Calculate bar for a specific order type (returns pixel values)
  const calculateBar = useCallback((part: NewPart, orderType: 'sprint' | 'mass') => {
    const leadTimeDays = part.quotedLeadTimeDays || 0;
    const freightDays = part.freightType === 'air' 
      ? (part.airFreightDays || 5) 
      : (part.seaFreightDays || 35);
    const totalLeadTime = leadTimeDays + freightDays;
    
    const today = new Date();
    const startDate = orderType === 'sprint' 
      ? part.sprintOrderDate?.toDate() || today
      : part.massProductionOrderDate?.toDate() || addDays(today, 30); // Mass prod typically later
    
    const endDate = addDays(startDate, totalLeadTime);
    
    // Pixel positions
    const barStartPx = getPixelPosition(startDate);
    const barWidthPx = totalLeadTime * ZOOM_SCALES[zoomLevel];
    
    const status = orderType === 'sprint' 
      ? part.sprintOrderStatus 
      : part.massProductionOrderStatus;
    
    return {
      startPx: barStartPx,
      widthPx: Math.max(barWidthPx, 40), // Min 40px width
      leadTimeDays,
      freightDays,
      totalLeadTime,
      status: status || 'not_ordered',
      orderDate: startDate,
      arrivalDate: endDate,
    };
  }, [getPixelPosition, zoomLevel]);

  // Collapsed mini-mode - render collapsed view instead of full gantt
  if (isCollapsed) {
    return (
      <CollapsedGantt 
        gateMarkers={gateMarkers} 
        onExpand={onToggleCollapse} 
        partCount={parts.length}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4" ref={containerRef}>
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={zoomOut} 
                disabled={!canZoomOut}
                className="h-7 w-7 p-0"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-[var(--text-secondary)] min-w-16 text-center px-2">
                {ZOOM_LABELS[zoomLevel]}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={zoomIn} 
                disabled={!canZoomIn}
                className="h-7 w-7 p-0"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="w-px h-6 bg-[var(--border-subtle)]" />
            
            {/* Navigation controls */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')} className="h-8 px-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={scrollToToday} className="h-8">
                <Calendar className="h-4 w-4 mr-1.5" />
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')} className="h-8 px-2">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="w-px h-6 bg-[var(--border-subtle)]" />
            
            {/* Gesture hint */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
              <Move className="h-3.5 w-3.5" />
              <span>Drag to pan</span>
              <span className="mx-1">·</span>
              <span>Ctrl+Scroll to zoom</span>
            </div>
            
            {/* Collapse button */}
            {onToggleCollapse && (
              <>
                <div className="w-px h-6 bg-[var(--border-subtle)]" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className="h-8 px-2"
                  title="Collapse timeline"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="flex h-4 rounded overflow-hidden">
                <div className="w-4 bg-[var(--accent-blue)]" />
                <div className="w-3 bg-teal-500" />
              </div>
              <span className="text-[var(--text-secondary)]">Sprint</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex h-4 rounded overflow-hidden">
                <div className="w-4 bg-purple-500" />
                <div className="w-3 bg-teal-500" />
              </div>
              <span className="text-[var(--text-secondary)]">Mass Prod</span>
            </div>
            <div className="w-px h-4 bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-teal-500 flex items-center justify-center">
                <Ship className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-[var(--text-secondary)]">Sea</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-sky-400 flex items-center justify-center">
                <Plane className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-[var(--text-secondary)]">Air</span>
            </div>
            <div className="w-px h-4 bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-[var(--accent-green)]" />
              <span className="text-[var(--text-secondary)]">Combined Order</span>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm overflow-hidden">
          {/* Timeline Header */}
          <div className="flex border-b border-[var(--border-subtle)]">
            <div className="w-72 flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30 p-2">
              <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Parts</span>
            </div>
            
            <div 
              ref={timelineRef}
              className={cn(
                "flex-1 overflow-x-auto relative select-none",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                className="relative h-12"
                style={{ width: `${timelineWidth}px` }}
              >
                {/* Gate markers */}
                {gatePositions.map(gate => (
                  <div
                    key={gate.key}
                    className="absolute top-0 bottom-0 flex flex-col items-center z-20 pointer-events-none"
                    style={{ left: `${gate.position}px` }}
                  >
                    <div className="h-full w-0.5 bg-[var(--accent-green)]" />
                    <span className="absolute top-0 px-1 py-0.5 text-[10px] font-medium bg-[var(--accent-green)] text-white rounded-b whitespace-nowrap">
                      {gate.name}
                    </span>
                  </div>
                ))}
                
                {/* Today marker */}
                <div
                  className="absolute top-0 bottom-0 flex flex-col items-center z-10 pointer-events-none"
                  style={{ left: `${todayPosition}px` }}
                >
                  <div className="h-full w-0.5 bg-[var(--accent-red)]" />
                  <span className="absolute top-0 px-1 py-0.5 text-[10px] font-medium bg-[var(--accent-red)] text-white rounded-b">
                    Today
                  </span>
                </div>
                
                {/* Header labels */}
                <div className="flex h-full">
                  {timelineHeaders.map((header, i) => (
                    <div
                      key={i}
                      className="border-r border-[var(--border-subtle)] flex flex-col items-center justify-center"
                      style={{ width: `${header.width}px` }}
                    >
                      <span className="text-xs font-medium">{header.label}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">{header.subLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Part Rows - minimum height for visual prominence */}
          {visibleParts.length === 0 ? (
            <div className={cn(
              "flex flex-col items-center justify-center text-center min-h-[300px]",
              compact ? "py-8" : "py-16"
            )}>
              <Package className={cn("text-[var(--text-tertiary)] mb-4", compact ? "h-8 w-8" : "h-12 w-12")} />
              <h3 className={cn("font-medium mb-2", compact ? "text-base" : "text-lg")}>
                {parts.length === 0 ? 'No Parts with Lead Time Data' : 'No Parts Selected'}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md">
                {parts.length === 0 
                  ? 'Add lead time data to your parts in the Table view to see them on the timeline.'
                  : 'Select parts from the table below to display them on the timeline.'}
              </p>
            </div>
          ) : (
            <div className="min-h-[350px]">
              {visibleParts.map(part => {
                const isExpanded = expandedParts.has(part.id);
                const sprintBar = calculateBar(part, 'sprint');
                const massBar = calculateBar(part, 'mass');
                
                return (
                  <div 
                    key={part.id}
                    className={cn(
                      'border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]/30 transition-colors',
                      part.orderTogether && 'bg-[var(--accent-green)]/5'
                    )}
                  >
                    {/* Main Row - taller for bigger bars */}
                    <div className="flex items-center min-h-[88px]">
                      {/* Left section: Part info */}
                      <div className="w-72 flex-shrink-0 flex items-center gap-2 px-3 py-2 border-r border-[var(--border-subtle)]">
                        <button
                          onClick={() => toggleExpanded(part.id)}
                          className="p-0.5 hover:bg-[var(--bg-tertiary)] rounded"
                        >
                          <ChevronRight className={cn(
                            'h-4 w-4 text-[var(--text-tertiary)] transition-transform',
                            isExpanded && 'rotate-90'
                          )} />
                        </button>
                        
                        {/* Combined order indicator */}
                        {part.orderTogether && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Link2 className="h-4 w-4 text-[var(--accent-green)]" />
                            </TooltipTrigger>
                            <TooltipContent>Combined order for Sprint & Mass Prod</TooltipContent>
                          </Tooltip>
                        )}
                        
                        <div 
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => onPartClick?.(part)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-[var(--accent-blue)]">
                              {part.placeholderCode}
                            </span>
                            {!part.quotedLeadTimeDays && (
                              <Badge className="text-[10px] bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]">
                                No lead time
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-tertiary)] truncate">{part.description}</p>
                        </div>
                        
                        {/* Freight indicator */}
                        <Tooltip>
                          <TooltipTrigger>
                            {part.freightType === 'air' ? (
                              <Plane className="h-4 w-4 text-[var(--accent-blue)]" />
                            ) : (
                              <Ship className="h-4 w-4 text-[var(--text-tertiary)]" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            {part.freightType === 'air' ? 'Air freight' : 'Sea freight'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      {/* Right section: Timeline bars - scrolls with header */}
                      <div 
                        className={cn(
                          "flex-1 relative select-none overflow-hidden",
                          isDragging ? "cursor-grabbing" : "cursor-grab"
                        )}
                        onMouseDown={(e) => {
                          // Only start drag if not clicking on a bar (bars handle their own clicks)
                          if ((e.target as HTMLElement).closest('[data-gantt-bar]')) return;
                          handleMouseDown(e);
                        }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <div 
                          className="h-full relative py-2"
                          style={{ 
                            width: `${timelineWidth}px`,
                            transform: `translateX(-${scrollLeft}px)`
                          }}
                        >
                          {/* Today marker (subtle in row) */}
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent-red)]/30 pointer-events-none"
                            style={{ left: `${todayPosition}px` }}
                          />
                          
                          {/* Sprint bar - Two-tone: Production (blue) + Freight (cyan) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                data-gantt-bar
                                className="absolute h-8 flex rounded-md overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/50 transition-all shadow-md pointer-events-auto"
                                style={{ 
                                  left: `${sprintBar.startPx}px`, 
                                  width: `${sprintBar.widthPx}px`,
                                  top: '4px',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPartClick?.(part);
                                }}
                              >
                                {/* Production Phase */}
                                <div 
                                  className={cn(
                                    'h-full flex items-center px-2 text-[11px] font-semibold text-white',
                                    sprintBar.status === 'received' ? 'bg-[var(--accent-green)]' : 
                                    sprintBar.status === 'in_transit' ? 'bg-[var(--accent-orange)]' :
                                    'bg-[var(--accent-blue)]'
                                  )}
                                  style={{ 
                                    width: sprintBar.leadTimeDays > 0 
                                      ? `${(sprintBar.leadTimeDays / sprintBar.totalLeadTime) * 100}%` 
                                      : '30%',
                                    minWidth: '40px'
                                  }}
                                >
                                  <Package className="h-4 w-4 mr-1.5 flex-shrink-0" />
                                  <span className="truncate">{sprintBar.leadTimeDays}d</span>
                                </div>
                                {/* Freight Phase */}
                                <div 
                                  className={cn(
                                    'h-full flex items-center justify-center px-2 text-[11px] font-semibold text-white',
                                    part.freightType === 'air' ? 'bg-sky-400' : 'bg-teal-500'
                                  )}
                                  style={{ flex: 1, minWidth: '30px' }}
                                >
                                  {part.freightType === 'air' ? (
                                    <Plane className="h-3.5 w-3.5 mr-1" />
                                  ) : (
                                    <Ship className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  <span>{sprintBar.freightDays}d</span>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                              <div className="space-y-1 text-xs">
                                <p className="font-medium">Sprint Order</p>
                                <p>Production: {sprintBar.leadTimeDays} days</p>
                                <p>Freight ({part.freightType === 'air' ? 'Air' : 'Sea'}): {sprintBar.freightDays} days</p>
                                <p className="border-t border-[var(--border-subtle)] pt-1 mt-1 font-semibold">Total: {sprintBar.totalLeadTime} days</p>
                                <p className="text-[var(--text-tertiary)]">Order by: {format(sprintBar.orderDate, 'MMM d, yyyy')}</p>
                                <p className="text-[var(--text-tertiary)]">Expected: {format(sprintBar.arrivalDate, 'MMM d, yyyy')}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          
                          {/* Mass Production bar - Two-tone: Production (purple) + Freight (cyan) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                data-gantt-bar
                                className="absolute h-8 flex rounded-md overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/50 transition-all shadow-md pointer-events-auto"
                                style={{ 
                                  left: `${massBar.startPx}px`, 
                                  width: `${massBar.widthPx}px`,
                                  top: '40px',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPartClick?.(part);
                                }}
                              >
                                {/* Production Phase */}
                                <div 
                                  className={cn(
                                    'h-full flex items-center px-2 text-[11px] font-semibold text-white',
                                    massBar.status === 'received' ? 'bg-[var(--accent-green)]' : 
                                    massBar.status === 'in_transit' ? 'bg-[var(--accent-orange)]' :
                                    'bg-purple-500'
                                  )}
                                  style={{ 
                                    width: massBar.leadTimeDays > 0 
                                      ? `${(massBar.leadTimeDays / massBar.totalLeadTime) * 100}%` 
                                      : '30%',
                                    minWidth: '40px'
                                  }}
                                >
                                  <Factory className="h-4 w-4 mr-1.5 flex-shrink-0" />
                                  <span className="truncate">{massBar.leadTimeDays}d</span>
                                </div>
                                {/* Freight Phase */}
                                <div 
                                  className={cn(
                                    'h-full flex items-center justify-center px-2 text-[11px] font-semibold text-white',
                                    part.freightType === 'air' ? 'bg-sky-400' : 'bg-teal-500'
                                  )}
                                  style={{ flex: 1, minWidth: '30px' }}
                                >
                                  {part.freightType === 'air' ? (
                                    <Plane className="h-3.5 w-3.5 mr-1" />
                                  ) : (
                                    <Ship className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  <span>{massBar.freightDays}d</span>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                              <div className="space-y-1 text-xs">
                                <p className="font-medium">Mass Production Order</p>
                                <p>Production: {massBar.leadTimeDays} days</p>
                                <p>Freight ({part.freightType === 'air' ? 'Air' : 'Sea'}): {massBar.freightDays} days</p>
                                <p className="border-t border-[var(--border-subtle)] pt-1 mt-1 font-semibold">Total: {massBar.totalLeadTime} days</p>
                                <p className="text-[var(--text-tertiary)]">Order by: {format(massBar.orderDate, 'MMM d, yyyy')}</p>
                                <p className="text-[var(--text-tertiary)]">Expected: {format(massBar.arrivalDate, 'MMM d, yyyy')}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          
                          {/* Combined order connector */}
                          {part.orderTogether && (
                            <div 
                              className="absolute w-1.5 bg-[var(--accent-green)] rounded-full pointer-events-none shadow-lg"
                              style={{ 
                                left: `${Math.min(sprintBar.startPx, massBar.startPx) + 6}px`,
                                top: '12px',
                                height: '36px'
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-[var(--bg-tertiary)]/30 border-t border-[var(--border-subtle)]">
                        <div className="grid grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-[var(--text-tertiary)] text-xs mb-1">Vendor</p>
                            <p>{part.vendorName || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-[var(--text-tertiary)] text-xs mb-1">Lead Time</p>
                            <p>{part.quotedLeadTimeDays || '-'}d base</p>
                          </div>
                          <div>
                            <p className="text-[var(--text-tertiary)] text-xs mb-1">Freight</p>
                            <p>{part.freightType === 'air' ? `✈️ ${part.airFreightDays || 5}d` : `🚢 ${part.seaFreightDays || 35}d`}</p>
                          </div>
                          <div>
                            <p className="text-[var(--text-tertiary)] text-xs mb-1">Scrap Rate</p>
                            <p>{part.scrapRate || 5}%</p>
                          </div>
                          <div>
                            <p className="text-[var(--text-tertiary)] text-xs mb-1">Combined Order</p>
                            <button
                              onClick={() => onToggleOrderTogether?.(part.id, !part.orderTogether)}
                              className={cn(
                                'flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors',
                                part.orderTogether
                                  ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]'
                                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/80'
                              )}
                            >
                              <Link2 className="h-3 w-3" />
                              {part.orderTogether ? 'Yes - One order for both' : 'No - Separate orders'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
}

// Collapsed mini-mode component
interface CollapsedGanttProps {
  gateMarkers: GateMarker[];
  onExpand?: () => void;
  partCount: number;
}

function CollapsedGantt({ gateMarkers, onExpand, partCount }: CollapsedGanttProps) {
  const today = new Date();
  
  // Find nearest gate
  const nextGate = gateMarkers
    .filter(g => g.date > today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  
  const daysToNextGate = nextGate ? differenceInDays(nextGate.date, today) : null;

  return (
    <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--accent-blue)]" />
            <span className="font-medium text-sm">Timeline</span>
            <Badge className="text-xs bg-[var(--bg-tertiary)]">{partCount} parts</Badge>
          </div>
          
          {/* Gate markers preview */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            {gateMarkers.slice(0, 3).map(gate => (
              <div key={gate.key} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                <span>{gate.name}</span>
                <span className="text-[var(--text-tertiary)]">
                  {format(gate.date, 'MMM d')}
                </span>
              </div>
            ))}
          </div>
          
          {/* Days to next gate */}
          {nextGate && daysToNextGate !== null && (
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
              daysToNextGate < 14 
                ? 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]' 
                : daysToNextGate < 30 
                ? 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]'
                : 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
            )}>
              <Clock className="h-3 w-3" />
              {daysToNextGate}d to {nextGate.name}
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onExpand}
          className="h-8"
        >
          <Maximize2 className="h-4 w-4 mr-1.5" />
          Expand
        </Button>
      </div>
    </Card>
  );
}

