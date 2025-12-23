'use client';

import { ColourOption, ColourPart } from '@/types/spec';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Palette, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpecColourOptionsProps {
  colourOptions: ColourOption[];
  onOptionClick?: (optionNumber: number) => void;
  onPartClick?: (optionNumber: number, partName: string) => void;
}

export function SpecColourOptions({
  colourOptions,
  onOptionClick,
  onPartClick,
}: SpecColourOptionsProps) {
  if (colourOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette size={20} />
            Colour Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Palette size={48} className="mx-auto mb-3 opacity-20" />
            <p>No colour options defined</p>
            <p className="text-sm">Import a spec sheet with colour data or add manually</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasCustomParts = colourOptions.some(opt => 
    opt.parts.some(p => p.isCustom)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette size={20} />
          Colour Options
          <Badge variant="secondary" className="ml-2">
            {colourOptions.length} option{colourOptions.length !== 1 ? 's' : ''}
          </Badge>
          {hasCustomParts && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              <Sparkles size={12} className="mr-1" />
              Has Custom Parts
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={`option-1`} className="w-full">
          <TabsList className="mb-4">
            {colourOptions.map((option) => {
              const customCount = option.parts.filter(p => p.isCustom).length;
              
              return (
                <TabsTrigger
                  key={option.optionNumber}
                  value={`option-${option.optionNumber}`}
                  className="relative"
                  onClick={() => onOptionClick?.(option.optionNumber)}
                >
                  Option {option.optionNumber}
                  {option.estQty && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({typeof option.estQty === 'number' ? option.estQty.toLocaleString() : option.estQty})
                    </span>
                  )}
                  {customCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {customCount}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {colourOptions.map((option) => (
            <TabsContent
              key={option.optionNumber}
              value={`option-${option.optionNumber}`}
            >
              <ColourOptionTable
                parts={option.parts}
                onPartClick={(partName) => onPartClick?.(option.optionNumber, partName)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface ColourOptionTableProps {
  parts: ColourPart[];
  onPartClick?: (partName: string) => void;
}

function ColourOptionTable({ parts, onPartClick }: ColourOptionTableProps) {
  if (parts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No parts defined for this colour option
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30%]">Part</TableHead>
          <TableHead className="w-[25%]">Colour</TableHead>
          <TableHead className="w-[20%]">Finish</TableHead>
          <TableHead className="w-[15%]">Decal</TableHead>
          <TableHead className="w-[10%] text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parts.map((part) => (
          <TableRow
            key={part.partName}
            className={cn(
              'cursor-pointer',
              part.isCustom && 'bg-purple-50/50'
            )}
            onClick={() => onPartClick?.(part.partName)}
          >
            <TableCell className="font-medium">
              {part.partName}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {part.colour ? (
                  <>
                    <ColourSwatch colour={part.colour} />
                    <span>{part.colour}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              {part.finish || <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell>
              {part.decal || <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="text-center">
              {part.isCustom ? (
                <Badge 
                  variant="outline" 
                  className="bg-purple-50 text-purple-700 border-purple-200"
                >
                  <Sparkles size={12} className="mr-1" />
                  Custom
                </Badge>
              ) : part.colour?.toUpperCase() === 'TBC' ? (
                <Badge 
                  variant="outline" 
                  className="bg-amber-50 text-amber-700 border-amber-200"
                >
                  <AlertCircle size={12} className="mr-1" />
                  TBC
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface ColourSwatchProps {
  colour: string;
  size?: number;
}

function ColourSwatch({ colour, size = 16 }: ColourSwatchProps) {
  // Try to determine a CSS colour from the name
  const cssColour = getColourFromName(colour);
  
  if (!cssColour) {
    return null;
  }
  
  return (
    <div
      className="rounded border border-gray-300"
      style={{
        width: size,
        height: size,
        backgroundColor: cssColour,
      }}
    />
  );
}

function getColourFromName(name: string): string | null {
  const normalised = name.toLowerCase().trim();
  
  const colourMap: Record<string, string> = {
    black: '#000000',
    white: '#FFFFFF',
    red: '#DC2626',
    blue: '#2563EB',
    green: '#16A34A',
    yellow: '#EAB308',
    orange: '#EA580C',
    purple: '#9333EA',
    pink: '#EC4899',
    grey: '#6B7280',
    gray: '#6B7280',
    silver: '#A8A29E',
    gold: '#CA8A04',
    bronze: '#92400E',
    matte: '#52525B',
    gloss: '#71717A',
    carbon: '#1C1917',
    navy: '#1E3A8A',
    teal: '#0D9488',
    lime: '#84CC16',
    cyan: '#06B6D4',
  };
  
  // Check for exact match
  if (colourMap[normalised]) {
    return colourMap[normalised];
  }
  
  // Check for partial match
  for (const [key, value] of Object.entries(colourMap)) {
    if (normalised.includes(key)) {
      return value;
    }
  }
  
  return null;
}

