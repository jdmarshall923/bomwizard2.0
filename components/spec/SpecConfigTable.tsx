'use client';

import { useState } from 'react';
import { SpecCategory, SpecOption, MappingStatus } from '@/types/spec';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Check, 
  X,
  Link2,
  LinkOff,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpecConfigTableProps {
  categories: SpecCategory[];
  onCategoryClick?: (category: string) => void;
  onOptionClick?: (category: string, option: string) => void;
  showMappingStatus?: boolean;
  collapsible?: boolean;
}

export function SpecConfigTable({
  categories,
  onCategoryClick,
  onOptionClick,
  showMappingStatus = true,
  collapsible = true,
}: SpecConfigTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.filter(c => c.options.some(o => o.selected)).map(c => c.category))
  );

  const toggleCategory = (category: string) => {
    const next = new Set(expandedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setExpandedCategories(next);
  };

  const getSelectedOptions = (category: SpecCategory): SpecOption[] => {
    return category.options.filter(opt => opt.selected);
  };

  const getMappingStatusBadge = (status: MappingStatus) => {
    const config = {
      unmapped: {
        label: 'Unmapped',
        className: 'bg-slate-100 text-slate-600 border-slate-200',
        Icon: LinkOff,
      },
      partial: {
        label: 'Partial',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        Icon: AlertCircle,
      },
      mapped: {
        label: 'Mapped',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        Icon: Link2,
      },
      has_custom: {
        label: 'Has Custom',
        className: 'bg-purple-100 text-purple-700 border-purple-200',
        Icon: Sparkles,
      },
    };

    const { label, className, Icon } = config[status];
    
    return (
      <Badge variant="outline" className={cn('text-xs', className)}>
        <Icon size={12} className="mr-1" />
        {label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Configuration Options</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {categories.map((category) => {
            const selectedOptions = getSelectedOptions(category);
            const isExpanded = expandedCategories.has(category.category);
            const hasSelections = selectedOptions.length > 0;

            return (
              <Collapsible
                key={category.category}
                open={isExpanded}
                onOpenChange={() => collapsible && toggleCategory(category.category)}
              >
                <CollapsibleTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
                      hasSelections && 'bg-primary/5'
                    )}
                    onClick={() => onCategoryClick?.(category.category)}
                  >
                    <div className="flex items-center gap-3">
                      {collapsible && (
                        isExpanded ? (
                          <ChevronDown size={16} className="text-muted-foreground" />
                        ) : (
                          <ChevronRight size={16} className="text-muted-foreground" />
                        )
                      )}
                      <span className="font-medium">{category.category}</span>
                      {hasSelections && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedOptions.length} selected
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {showMappingStatus && getMappingStatusBadge(category.mappingStatus)}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-3">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[40%]">Option</TableHead>
                          <TableHead className="w-[15%] text-center">Available</TableHead>
                          <TableHead className="w-[15%] text-center">Selected</TableHead>
                          <TableHead className="w-[15%] text-center">Default</TableHead>
                          <TableHead className="w-[15%] text-right">Est. Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {category.options.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                              No options defined for this category
                            </TableCell>
                          </TableRow>
                        ) : (
                          category.options.map((option) => (
                            <TableRow
                              key={option.optionName}
                              className={cn(
                                'cursor-pointer',
                                option.selected && 'bg-primary/5'
                              )}
                              onClick={() => onOptionClick?.(category.category, option.optionName)}
                            >
                              <TableCell className="font-medium">
                                {option.optionName}
                                {option.notes && (
                                  <span className="block text-xs text-muted-foreground mt-0.5">
                                    {option.notes}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {option.available ? (
                                  <Check size={16} className="text-emerald-500 mx-auto" />
                                ) : (
                                  <X size={16} className="text-muted-foreground mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {option.selected ? (
                                  <Check size={16} className="text-primary mx-auto" />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {option.isDefault ? (
                                  <Badge variant="outline" className="text-xs">Default</Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {option.estQtyMin || option.estQtyMax ? (
                                  <>
                                    {option.estQtyMin?.toLocaleString() || '—'}
                                    {' - '}
                                    {option.estQtyMax?.toLocaleString() || '—'}
                                    {option.estSplit && (
                                      <span className="text-muted-foreground ml-1">
                                        ({option.estSplit}%)
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface SpecConfigSummaryProps {
  categories: SpecCategory[];
}

export function SpecConfigSummary({ categories }: SpecConfigSummaryProps) {
  // Get only categories with selected options
  const categoriesWithSelections = categories.filter(c => 
    c.options.some(o => o.selected)
  );

  if (categoriesWithSelections.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No configuration options selected
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Selected Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoriesWithSelections.map((category) => {
            const selected = category.options.filter(o => o.selected);
            
            return (
              <div key={category.category} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {category.category}
                </p>
                <div className="flex flex-wrap gap-1">
                  {selected.map((opt) => (
                    <Badge key={opt.optionName} variant="secondary" className="text-sm">
                      {opt.optionName}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

