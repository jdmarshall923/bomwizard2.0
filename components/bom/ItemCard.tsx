'use client';

import { BomItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Boxes, 
  PoundSterling,
  Sparkles,
  AlertCircle,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: BomItem;
  onClick?: () => void;
  selected?: boolean;
}

export function ItemCard({ item, onClick, selected }: ItemCardProps) {
  // Complete B code = B + exactly 6 numbers (e.g., B123456)
  // Placeholder = starts with B but doesn't have complete 6-digit code
  const startsWithB = item.itemCode?.startsWith('B');
  const isCompleteBCode = /^B\d{6}$/.test(item.itemCode || '');
  const isPlaceholder = startsWithB && !isCompleteBCode;
  const unitCost = item.materialCost + item.landingCost + item.labourCost;

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover-lift',
        'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]',
        'hover:border-[var(--accent-blue)]/50',
        selected && 'border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]/30',
        item.partCategory === 'new_part' && 'border-l-2 border-l-[var(--accent-blue)]',
        isPlaceholder && 'border-l-2 border-l-[var(--accent-orange)]'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Package className={cn(
              'h-5 w-5',
              item.partCategory === 'new_part' 
                ? 'text-[var(--accent-blue)]' 
                : isPlaceholder
                  ? 'text-[var(--accent-orange)]'
                  : 'text-[var(--text-tertiary)]'
            )} />
            <CardTitle className={cn(
              'text-base font-mono',
              item.partCategory === 'new_part' && 'text-[var(--accent-blue)]',
              isPlaceholder && 'text-[var(--accent-orange)]'
            )}>
              {item.itemCode}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {item.partCategory === 'new_part' && (
              <Badge className="bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border-[var(--accent-blue)]/30 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                New
              </Badge>
            )}
            {isPlaceholder && (
              <Badge className="bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] border-[var(--accent-orange)]/30 text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Placeholder
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
          {item.itemDescription}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Boxes className="h-3.5 w-3.5" />
          <span>{item.assemblyCode}</span>
          <span className="text-[var(--border-default)]">•</span>
          <span>Level {item.level}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[var(--text-tertiary)]" />
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">Quantity</div>
              <div className="font-medium">{item.quantity}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PoundSterling className="h-4 w-4 text-[var(--accent-green)]" />
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">Extended</div>
              <div className={cn(
                'font-medium',
                item.extendedCost > 100 ? 'text-[var(--accent-green)]' : 'text-[var(--text-primary)]'
              )}>
                £{item.extendedCost?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>
          </div>
        </div>

        {item.costSource && (
          <div className="flex justify-end">
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs',
                item.costSource === 'contract' && 'border-[var(--accent-green)] text-[var(--accent-green)]',
                item.costSource === 'quote' && 'border-[var(--accent-blue)] text-[var(--accent-blue)]',
                item.costSource === 'estimate' && 'border-[var(--accent-orange)] text-[var(--accent-orange)]'
              )}
            >
              {item.costSource}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
