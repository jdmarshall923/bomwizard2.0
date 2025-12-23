'use client';

import { Spec } from '@/types/spec';
import { SpecStatusBadge } from './SpecStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Edit, 
  Upload, 
  Send, 
  GitCompare, 
  History,
  Download,
  MoreHorizontal,
  Bike,
  Calendar,
  Factory,
  Palette
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SpecHeaderProps {
  spec: Spec;
  onEdit?: () => void;
  onImport?: () => void;
  onSubmit?: () => void;
  onCompare?: () => void;
  onHistory?: () => void;
  onExport?: () => void;
}

export function SpecHeader({
  spec,
  onEdit,
  onImport,
  onSubmit,
  onCompare,
  onHistory,
  onExport,
}: SpecHeaderProps) {
  const canEdit = spec.status === 'draft' || spec.status === 'rejected';
  const canSubmit = spec.status === 'draft';
  
  return (
    <Card className="border-0 shadow-none bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left side - Spec info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {spec.header.projectName || 'Untitled Spec'}
              </h1>
              <SpecStatusBadge status={spec.status} size="lg" />
            </div>
            
            {/* Meta info row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {spec.header.bikeType && (
                <div className="flex items-center gap-1.5">
                  <Bike size={16} />
                  <span>{spec.header.bikeType}</span>
                </div>
              )}
              {spec.header.modelYear && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} />
                  <span>MY{spec.header.modelYear}</span>
                </div>
              )}
              {spec.header.productFamily && (
                <div className="flex items-center gap-1.5">
                  <Factory size={16} />
                  <span>{spec.header.productFamily}</span>
                </div>
              )}
              {spec.header.frameMaterial && (
                <div className="flex items-center gap-1.5">
                  <Palette size={16} />
                  <span>{spec.header.frameMaterial}</span>
                </div>
              )}
              <span className="text-muted-foreground/50">•</span>
              <span>Version {spec.version}</span>
            </div>
            
            {/* Rejection reason */}
            {spec.status === 'rejected' && spec.rejectionReason && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>Rejection Reason:</strong> {spec.rejectionReason}
                </p>
              </div>
            )}
          </div>
          
          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button onClick={onEdit} variant="outline" size="sm">
                <Edit size={16} className="mr-1.5" />
                Edit
              </Button>
            )}
            
            <Button onClick={onImport} variant="outline" size="sm">
              <Upload size={16} className="mr-1.5" />
              Import
            </Button>
            
            {canSubmit && (
              <Button onClick={onSubmit} size="sm">
                <Send size={16} className="mr-1.5" />
                Submit for Review
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onCompare}>
                  <GitCompare size={16} className="mr-2" />
                  Compare Versions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onHistory}>
                  <History size={16} className="mr-2" />
                  View History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onExport}>
                  <Download size={16} className="mr-2" />
                  Export to Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

