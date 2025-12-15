'use client';

import { Assembly } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Boxes, 
  Settings,
  Globe,
  BarChart3,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssemblyCardProps {
  assembly: Assembly;
  itemCount?: number;
  totalCost?: number;
  onClick?: () => void;
  selected?: boolean;
}

export function AssemblyCard({ 
  assembly, 
  itemCount = 0, 
  totalCost = 0,
  onClick,
  selected,
}: AssemblyCardProps) {
  const weightingPercent = assembly.weighting * 100;

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover-lift',
        'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]',
        'hover:border-[var(--accent-blue)]/50',
        selected && 'border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]/30',
        assembly.assemblyType === 'bco' && 'border-l-2 border-l-[var(--accent-orange)]'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-[var(--accent-blue)]" />
            <CardTitle className="text-base">{assembly.code}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {assembly.assemblyType === 'bco' ? (
              <Badge className="bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] border-[var(--accent-orange)]/30 text-xs">
                <Globe className="h-3 w-3 mr-1" />
                BCO
              </Badge>
            ) : (
              <Badge className="bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border-[var(--accent-blue)]/30 text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Standard
              </Badge>
            )}
            {assembly.isActive ? (
              <Badge variant="outline" className="border-[var(--accent-green)] text-[var(--accent-green)] text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-[var(--text-tertiary)] text-[var(--text-tertiary)] text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
          {assembly.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <div>
            <div className="text-xs text-[var(--text-tertiary)]">Items</div>
            <div className="font-medium">{itemCount}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-tertiary)]">Total Cost</div>
            <div className="font-medium text-[var(--accent-green)]">
              £{totalCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Weighting */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-tertiary)] flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Product Mix
            </span>
            <span className="font-medium">{weightingPercent.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue-light)] rounded-full transition-all"
              style={{ width: `${Math.min(weightingPercent, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
