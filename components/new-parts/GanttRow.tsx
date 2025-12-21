'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PartOrder, OrderStatus, FreightType } from '@/types';
import { FreightToggle } from './FreightToggle';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Circle,
  Package,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GanttRowProps {
  order: PartOrder;
  timelineStart: Date;
  timelineEnd: Date;
  onToggleFreight: (orderId: string, newType: FreightType) => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onSelect?: (order: PartOrder) => void;
}

const STATUS_CONFIG: Record<OrderStatus, { icon: typeof Circle; color: string; bgColor: string; label: string }> = {
  not_ordered: { 
    icon: Circle, 
    color: 'text-[var(--text-tertiary)]', 
    bgColor: 'bg-[var(--bg-tertiary)]',
    label: 'Not Ordered' 
  },
  ordered: { 
    icon: Clock, 
    color: 'text-[var(--accent-blue)]', 
    bgColor: 'bg-[var(--accent-blue)]',
    label: 'Ordered' 
  },
  in_transit: { 
    icon: Package, 
    color: 'text-[var(--accent-orange)]', 
    bgColor: 'bg-[var(--accent-orange)]',
    label: 'In Transit' 
  },
  received: { 
    icon: CheckCircle2, 
    color: 'text-[var(--accent-green)]', 
    bgColor: 'bg-[var(--accent-green)]',
    label: 'Received' 
  },
};

export function GanttRow({
  order,
  timelineStart,
  timelineEnd,
  onToggleFreight,
  onUpdateStatus,
  onSelect,
}: GanttRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const config = STATUS_CONFIG[order.orderStatus];
  const StatusIcon = order.isLate ? AlertTriangle : config.icon;
  
  const totalDays = differenceInDays(timelineEnd, timelineStart);
  
  // Calculate bar positions
  const orderByDate = order.orderByDate?.toDate();
  const requiredByDate = order.requiredByDate?.toDate();
  const actualOrderDate = order.actualOrderDate?.toDate();
  const expectedArrival = order.expectedArrivalDate?.toDate();
  const actualArrival = order.actualArrivalDate?.toDate();
  
  const getPosition = (date: Date | undefined): number => {
    if (!date) return 0;
    const days = differenceInDays(date, timelineStart);
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  };

  // Calculate bar positions based on lead time
  // If no dates are set, calculate from today
  const today = new Date();
  const effectiveOrderDate = actualOrderDate || orderByDate || today;
  
  // Calculate end date based on lead time if not explicitly set
  const calculatedEndDate = new Date(effectiveOrderDate);
  calculatedEndDate.setDate(calculatedEndDate.getDate() + order.effectiveLeadTime);
  
  const effectiveEndDate = actualArrival || expectedArrival || requiredByDate || calculatedEndDate;

  // Calculate bar segments
  const barStart = getPosition(effectiveOrderDate);
  const barEnd = getPosition(effectiveEndDate);
  
  // Calculate bar width as percentage of total timeline, but based on lead time
  // This ensures the bar reflects the actual lead time duration
  const leadTimeWidth = (order.effectiveLeadTime / totalDays) * 100;
  const barWidth = Math.max(leadTimeWidth, Math.max(2, barEnd - barStart));
  
  // Order phase width (before transit)
  const orderWidth = order.baseLeadTimeDays / order.effectiveLeadTime * barWidth;
  const transitWidth = barWidth - orderWidth;

  return (
    <TooltipProvider>
      <div className={cn(
        'group border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]/50 transition-colors',
        order.isLate && 'bg-[var(--accent-red)]/5'
      )}>
        {/* Main Row */}
        <div className="flex items-center h-12">
          {/* Left section: Part info */}
          <div className="w-64 flex-shrink-0 flex items-center gap-2 px-3 border-r border-[var(--border-subtle)]">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 hover:bg-[var(--bg-tertiary)] rounded"
            >
              <ChevronRight className={cn(
                'h-4 w-4 text-[var(--text-tertiary)] transition-transform',
                isExpanded && 'rotate-90'
              )} />
            </button>
            
            <div className={cn(
              'p-1 rounded',
              order.isLate ? 'bg-[var(--accent-red)]/20' : config.bgColor + '/20'
            )}>
              <StatusIcon className={cn(
                'h-4 w-4',
                order.isLate ? 'text-[var(--accent-red)]' : config.color
              )} />
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{order.itemCode}</p>
              <p className="text-xs text-[var(--text-tertiary)] truncate">{order.description}</p>
            </div>
            
            <FreightToggle
              freightType={order.freightType}
              seaFreightDays={order.seaFreightDays}
              airFreightDays={order.airFreightDays}
              airFreightPremium={order.airFreightPremium}
              onToggle={(newType) => onToggleFreight(order.id, newType)}
              compact
            />
          </div>
          
          {/* Right section: Timeline bar */}
          <div className="flex-1 h-full relative px-2">
            {/* Today marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent-red)]/50 z-10"
              style={{ left: `${getPosition(new Date())}%` }}
            />
            
            {/* Timeline bar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-6 flex rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-[var(--accent-blue)]/50 transition-all"
                  style={{ 
                    left: `${barStart}%`, 
                    width: `${barWidth}%`,
                    minWidth: '20px'
                  }}
                  onClick={() => onSelect?.(order)}
                >
                  {/* Order phase */}
                  <div 
                    className={cn(
                      'h-full',
                      order.isLate ? 'bg-[var(--accent-red)]' : 'bg-[var(--accent-blue)]'
                    )}
                    style={{ width: `${(orderWidth / barWidth) * 100}%` }}
                  />
                  
                  {/* Transit phase */}
                  <div 
                    className={cn(
                      'h-full',
                      order.orderStatus === 'received' 
                        ? 'bg-[var(--accent-green)]' 
                        : 'bg-[var(--accent-orange)]'
                    )}
                    style={{ width: `${(transitWidth / barWidth) * 100}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] max-w-xs"
              >
                <div className="space-y-1 text-xs">
                  <p className="font-medium">{order.itemCode}</p>
                  <p className="text-[var(--text-secondary)]">{order.description}</p>
                  <div className="pt-1 border-t border-[var(--border-subtle)]">
                    <p>Lead time: {order.effectiveLeadTime} days</p>
                    {orderByDate && <p>Order by: {format(orderByDate, 'MMM d, yyyy')}</p>}
                    {requiredByDate && <p>Required: {format(requiredByDate, 'MMM d, yyyy')}</p>}
                  </div>
                  {order.isLate && (
                    <p className="text-[var(--accent-red)] font-medium">⚠️ Late - order overdue</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
            
            {/* Required by marker */}
            {requiredByDate && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent-green)]"
                style={{ left: `${getPosition(requiredByDate)}%` }}
              />
            )}
          </div>
          
          {/* Actions */}
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                <DropdownMenuItem 
                  onClick={() => onUpdateStatus(order.id, 'ordered')}
                  className="gap-2 cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-[var(--accent-blue)]" />
                  Mark as Ordered
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUpdateStatus(order.id, 'in_transit')}
                  className="gap-2 cursor-pointer"
                >
                  <Package className="h-4 w-4 text-[var(--accent-orange)]" />
                  Mark as In Transit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUpdateStatus(order.id, 'received')}
                  className="gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent-green)]" />
                  Mark as Received
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onUpdateStatus(order.id, 'not_ordered')}
                  className="gap-2 cursor-pointer text-[var(--text-tertiary)]"
                >
                  <Circle className="h-4 w-4" />
                  Reset Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-4 py-3 bg-[var(--bg-tertiary)]/30 border-t border-[var(--border-subtle)]">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-tertiary)] text-xs mb-1">Quantity</p>
                <p>{order.orderQuantity} ({order.quantity} + {order.scrapRate}% scrap)</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] text-xs mb-1">Lead Time</p>
                <p>{order.baseLeadTimeDays}d base + {order.freightType === 'sea' ? order.seaFreightDays : order.airFreightDays}d {order.freightType}</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] text-xs mb-1">Vendor</p>
                <p>{order.vendorName || order.vendorCode || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] text-xs mb-1">Total Cost</p>
                <p>{order.totalCost ? `$${order.totalCost.toLocaleString()}` : order.unitPrice ? `$${(order.unitPrice * order.orderQuantity).toLocaleString()}` : 'N/A'}</p>
              </div>
            </div>
            {order.notes && (
              <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-tertiary)]">Notes: {order.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

