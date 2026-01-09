'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  Circle, 
  PlayCircle, 
  XCircle, 
  SkipForward,
  Calendar as CalendarIcon,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectGate, GateStatus, GateMeta } from '@/types';
import { Timestamp, deleteField } from 'firebase/firestore';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GateCardProps {
  gate: ProjectGate;
  meta: GateMeta;
  onUpdate: (updates: Partial<ProjectGate>) => void;
  isEditable?: boolean;
}

const STATUS_CONFIG: Record<GateStatus, { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }> = {
  not_started: { 
    icon: Circle, 
    color: 'text-[var(--text-tertiary)]', 
    bgColor: 'bg-[var(--bg-tertiary)]',
    label: 'Not Started' 
  },
  in_progress: { 
    icon: PlayCircle, 
    color: 'text-[var(--accent-blue)]', 
    bgColor: 'bg-[var(--accent-blue)]/20',
    label: 'In Progress' 
  },
  passed: { 
    icon: CheckCircle2, 
    color: 'text-[var(--accent-green)]', 
    bgColor: 'bg-[var(--accent-green)]/20',
    label: 'Passed' 
  },
  failed: { 
    icon: XCircle, 
    color: 'text-[var(--accent-red)]', 
    bgColor: 'bg-[var(--accent-red)]/20',
    label: 'Failed' 
  },
  skipped: { 
    icon: SkipForward, 
    color: 'text-[var(--accent-orange)]', 
    bgColor: 'bg-[var(--accent-orange)]/20',
    label: 'Skipped' 
  },
};

export function GateCard({ gate, meta, onUpdate, isEditable = true }: GateCardProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [notes, setNotes] = useState(gate.notes || '');
  
  const config = STATUS_CONFIG[gate.status];
  const StatusIcon = config.icon;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onUpdate({ date: Timestamp.fromDate(date) });
    }
    setIsCalendarOpen(false);
  };

  const handleStatusChange = (newStatus: GateStatus) => {
    // Use type assertion to allow deleteField() sentinel value
    const updates: Partial<ProjectGate> & { completedAt?: Timestamp | ReturnType<typeof deleteField> } = { 
      status: newStatus 
    };
    if (newStatus === 'passed') {
      updates.completedAt = Timestamp.now();
    } else if (gate.completedAt) {
      // Only send deleteField if there was a completedAt to remove
      updates.completedAt = deleteField() as unknown as Timestamp;
    }
    onUpdate(updates as Partial<ProjectGate>);
  };

  const handleNotesBlur = () => {
    if (notes !== gate.notes) {
      onUpdate({ notes });
    }
  };

  const targetDate = gate.date?.toDate?.();
  const completedDate = gate.completedAt?.toDate?.();

  return (
    <Card className={cn(
      'border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm transition-all duration-300',
      gate.status === 'in_progress' && 'ring-2 ring-[var(--accent-blue)]/50',
      gate.status === 'passed' && 'opacity-80'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', config.bgColor)}>
              <StatusIcon className={cn('h-5 w-5', config.color)} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{meta.name}</CardTitle>
              <p className="text-xs text-[var(--text-tertiary)]">{meta.fullName}</p>
            </div>
          </div>
          
          {isEditable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <span className={cn('text-xs', config.color)}>{config.label}</span>
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status as GateStatus)}
                      className="gap-2 cursor-pointer hover:bg-[var(--bg-tertiary)]"
                    >
                      <Icon className={cn('h-4 w-4', cfg.color)} />
                      <span>{cfg.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--text-secondary)]">{meta.description}</p>
        
        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-tertiary)] w-16">Target:</span>
          {isEditable ? (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 justify-start text-left font-normal flex-1 border-[var(--border-subtle)] bg-[var(--bg-primary)]',
                    !targetDate && 'text-[var(--text-tertiary)]'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, 'MMM d, yyyy') : 'Set target date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[var(--bg-secondary)] border-[var(--border-subtle)]" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          ) : (
            <span className="text-sm text-[var(--text-primary)]">
              {targetDate ? format(targetDate, 'MMM d, yyyy') : 'Not set'}
            </span>
          )}
        </div>

        {/* Completed Date (if passed) */}
        {completedDate && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)] w-16">Passed:</span>
            <span className="text-sm text-[var(--accent-green)]">
              {format(completedDate, 'MMM d, yyyy')}
            </span>
          </div>
        )}
        
        {/* Notes */}
        {isEditable ? (
          <Textarea
            placeholder="Add notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            className="min-h-[60px] text-sm resize-none bg-[var(--bg-primary)] border-[var(--border-subtle)]"
          />
        ) : gate.notes ? (
          <p className="text-sm text-[var(--text-secondary)] italic">{gate.notes}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}



