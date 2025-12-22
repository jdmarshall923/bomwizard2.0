'use client';

import { cn } from '@/lib/utils';
import { FreightType } from '@/types';
import { Ship, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FreightToggleProps {
  freightType: FreightType;
  seaFreightDays: number;
  airFreightDays: number;
  airFreightPremium?: number;
  onToggle: (newType: FreightType) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function FreightToggle({
  freightType,
  seaFreightDays,
  airFreightDays,
  airFreightPremium,
  onToggle,
  disabled = false,
  compact = false,
}: FreightToggleProps) {
  const isSea = freightType === 'sea';
  const daysDifference = seaFreightDays - airFreightDays;

  const handleToggle = () => {
    onToggle(isSea ? 'air' : 'sea');
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleToggle}
              disabled={disabled}
              className={cn(
                'p-1 rounded transition-colors',
                isSea 
                  ? 'text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/20' 
                  : 'text-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/20',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSea ? (
                <Ship className="h-4 w-4" />
              ) : (
                <Plane className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
            <div className="text-center">
              <p className="font-medium">{isSea ? 'Sea Freight' : 'Air Freight'}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {isSea ? seaFreightDays : airFreightDays} days transit
              </p>
              <p className="text-xs text-[var(--accent-blue)] mt-1">
                Click to switch to {isSea ? 'air' : 'sea'}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Sea option */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onToggle('sea')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 border-[var(--border-subtle)]',
          isSea && 'bg-[var(--accent-blue)]/20 border-[var(--accent-blue)] text-[var(--accent-blue)]'
        )}
      >
        <Ship className="h-4 w-4" />
        <span>Sea</span>
        <span className="text-xs opacity-70">{seaFreightDays}d</span>
      </Button>

      {/* Air option */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onToggle('air')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 border-[var(--border-subtle)]',
          !isSea && 'bg-[var(--accent-orange)]/20 border-[var(--accent-orange)] text-[var(--accent-orange)]'
        )}
      >
        <Plane className="h-4 w-4" />
        <span>Air</span>
        <span className="text-xs opacity-70">{airFreightDays}d</span>
      </Button>

      {/* Difference indicator */}
      {daysDifference > 0 && (
        <span className="text-xs text-[var(--text-tertiary)]">
          {!isSea && (
            <span className="text-[var(--accent-green)]">
              -{daysDifference} days
            </span>
          )}
          {airFreightPremium && !isSea && (
            <span className="ml-1 text-[var(--accent-orange)]">
              +${airFreightPremium.toLocaleString()}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

// Icon-only version for table cells
export function FreightIcon({ freightType }: { freightType: FreightType }) {
  return freightType === 'sea' ? (
    <Ship className="h-4 w-4 text-[var(--accent-blue)]" />
  ) : (
    <Plane className="h-4 w-4 text-[var(--accent-orange)]" />
  );
}


