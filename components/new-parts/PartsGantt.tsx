'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GanttChartData, PartOrder, FreightType, OrderStatus } from '@/types';
import { GanttRow } from './GanttRow';
import { GanttLegend } from './GanttLegend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ZoomIn, 
  ZoomOut, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
  Factory,
  AlertTriangle
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  differenceInDays
} from 'date-fns';

type ZoomLevel = 'day' | 'week' | 'month';

interface PartsGanttProps {
  ganttData: GanttChartData;
  onToggleFreight: (orderId: string, newType: FreightType) => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onSelectOrder?: (order: PartOrder) => void;
}

export function PartsGantt({
  ganttData,
  onToggleFreight,
  onUpdateStatus,
  onSelectOrder,
}: PartsGanttProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [viewStart, setViewStart] = useState(ganttData.timelineStart);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { sprintOrders, massProductionOrders, gateMarkers, timelineStart, timelineEnd } = ganttData;
  
  // Count late orders
  const lateSprintCount = sprintOrders.filter(o => o.isLate).length;
  const lateMassProdCount = massProductionOrders.filter(o => o.isLate).length;

  // Calculate timeline headers based on zoom level
  const timelineHeaders = useMemo(() => {
    const interval = { start: timelineStart, end: timelineEnd };
    
    switch (zoomLevel) {
      case 'day':
        return eachDayOfInterval(interval).map(date => ({
          date,
          label: format(date, 'd'),
          subLabel: format(date, 'EEE'),
        }));
      case 'week':
        return eachWeekOfInterval(interval).map(date => ({
          date,
          label: format(date, 'MMM d'),
          subLabel: `Week ${format(date, 'w')}`,
        }));
      case 'month':
        return eachMonthOfInterval(interval).map(date => ({
          date,
          label: format(date, 'MMM'),
          subLabel: format(date, 'yyyy'),
        }));
    }
  }, [timelineStart, timelineEnd, zoomLevel]);

  // Calculate gate marker positions
  const gatePositions = useMemo(() => {
    const totalDays = differenceInDays(timelineEnd, timelineStart);
    return gateMarkers.map(marker => ({
      ...marker,
      position: (differenceInDays(marker.date, timelineStart) / totalDays) * 100,
    }));
  }, [gateMarkers, timelineStart, timelineEnd]);

  // Today position
  const todayPosition = useMemo(() => {
    const totalDays = differenceInDays(timelineEnd, timelineStart);
    return (differenceInDays(new Date(), timelineStart) / totalDays) * 100;
  }, [timelineStart, timelineEnd]);

  const handleZoomIn = () => {
    if (zoomLevel === 'month') setZoomLevel('week');
    else if (zoomLevel === 'week') setZoomLevel('day');
  };

  const handleZoomOut = () => {
    if (zoomLevel === 'day') setZoomLevel('week');
    else if (zoomLevel === 'week') setZoomLevel('month');
  };

  const scrollToToday = () => {
    if (timelineRef.current) {
      const container = timelineRef.current;
      const todayPos = (todayPosition / 100) * container.scrollWidth;
      container.scrollLeft = todayPos - container.clientWidth / 2;
    }
  };

  // Scroll to today on mount
  useEffect(() => {
    scrollToToday();
  }, []);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoomLevel === 'month'}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-[var(--text-secondary)] min-w-16 text-center capitalize">
            {zoomLevel}
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoomLevel === 'day'}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-[var(--border-subtle)] mx-2" />
          <Button variant="outline" size="sm" onClick={scrollToToday}>
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
        
        <GanttLegend compact />
      </div>

      {/* Main Gantt Chart */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm overflow-hidden">
        {/* Timeline Header */}
        <div className="flex border-b border-[var(--border-subtle)]">
          {/* Empty space for part info column */}
          <div className="w-64 flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30 p-2">
            <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Parts</span>
          </div>
          
          {/* Timeline headers */}
          <div 
            ref={timelineRef}
            className="flex-1 overflow-x-auto relative"
          >
            <div className="relative min-w-[1200px] h-12">
              {/* Gate markers */}
              {gatePositions.map(gate => (
                <div
                  key={gate.key}
                  className="absolute top-0 bottom-0 flex flex-col items-center z-20"
                  style={{ left: `${gate.position}%` }}
                >
                  <div className="h-full w-0.5 bg-[var(--accent-green)]" />
                  <span className="absolute -top-0 px-1 py-0.5 text-[10px] font-medium bg-[var(--accent-green)] text-white rounded-b whitespace-nowrap">
                    {gate.name}
                  </span>
                </div>
              ))}
              
              {/* Today marker */}
              <div
                className="absolute top-0 bottom-0 flex flex-col items-center z-10"
                style={{ left: `${todayPosition}%` }}
              >
                <div className="h-full w-0.5 bg-[var(--accent-red)]" />
                <span className="absolute -top-0 px-1 py-0.5 text-[10px] font-medium bg-[var(--accent-red)] text-white rounded-b">
                  Today
                </span>
              </div>
              
              {/* Header labels */}
              <div className="flex h-full">
                {timelineHeaders.map((header, i) => (
                  <div
                    key={i}
                    className="flex-1 border-r border-[var(--border-subtle)] flex flex-col items-center justify-center min-w-[40px]"
                  >
                    <span className="text-xs font-medium">{header.label}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{header.subLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Actions column */}
          <div className="w-10 flex-shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30" />
        </div>

        {/* Sprint Orders Section */}
        {sprintOrders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-subtle)]">
              <Package className="h-4 w-4 text-[var(--accent-blue)]" />
              <span className="text-sm font-medium">Sprint Orders</span>
              <span className="text-xs text-[var(--text-tertiary)]">({sprintOrders.length})</span>
              {lateSprintCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-[var(--accent-red)] ml-2">
                  <AlertTriangle className="h-3 w-3" />
                  {lateSprintCount} late
                </span>
              )}
            </div>
            <div>
              {sprintOrders.map(order => (
                <GanttRow
                  key={order.id}
                  order={order}
                  timelineStart={timelineStart}
                  timelineEnd={timelineEnd}
                  onToggleFreight={onToggleFreight}
                  onUpdateStatus={onUpdateStatus}
                  onSelect={onSelectOrder}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mass Production Orders Section */}
        {massProductionOrders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-subtle)]">
              <Factory className="h-4 w-4 text-[var(--accent-orange)]" />
              <span className="text-sm font-medium">Mass Production Orders</span>
              <span className="text-xs text-[var(--text-tertiary)]">({massProductionOrders.length})</span>
              {lateMassProdCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-[var(--accent-red)] ml-2">
                  <AlertTriangle className="h-3 w-3" />
                  {lateMassProdCount} late
                </span>
              )}
            </div>
            <div>
              {massProductionOrders.map(order => (
                <GanttRow
                  key={order.id}
                  order={order}
                  timelineStart={timelineStart}
                  timelineEnd={timelineEnd}
                  onToggleFreight={onToggleFreight}
                  onUpdateStatus={onUpdateStatus}
                  onSelect={onSelectOrder}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sprintOrders.length === 0 && massProductionOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
            <h3 className="text-lg font-medium mb-2">No Part Orders Yet</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md">
              Create part orders to track them on the Gantt timeline. Orders can be created from New Parts or added manually.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

