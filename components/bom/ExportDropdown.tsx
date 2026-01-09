'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Download, 
  FileSpreadsheet, 
  FileText,
  Loader2,
  Columns3,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { BomItem } from '@/types/bom';
import { ColumnVisibilitySettings, getDefaultVisibility } from '@/types/settings';
import { 
  exportWithStyles, 
  exportToCsv, 
  exportFullCCM,
  downloadBlob 
} from '@/lib/services/exportService';

/**
 * Phase 14: Export Dropdown Component
 * 
 * Provides export options for BOM data:
 * - CSV (current visible columns)
 * - Excel (current visible columns)
 * - Full CCM (all 29 columns)
 */

interface ExportDropdownProps {
  items: BomItem[];
  projectName: string;
  visibility?: ColumnVisibilitySettings;
  disabled?: boolean;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportDropdown({
  items,
  projectName,
  visibility,
  disabled = false,
  variant = 'ghost',
  size = 'sm',
}: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);
  
  const effectiveVisibility = visibility || getDefaultVisibility();
  
  const handleExportCsv = async () => {
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }
    
    setIsExporting(true);
    setExportType('csv');
    
    try {
      const blob = exportToCsv(items, projectName, {
        visibility: effectiveVisibility,
        includeTimestamp: true,
      });
      
      const filename = `${projectName}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadBlob(blob, filename);
      
      toast.success('CSV exported successfully', {
        description: `${items.length} items exported`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };
  
  const handleExportExcel = async () => {
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }
    
    setIsExporting(true);
    setExportType('excel');
    
    try {
      // Use styled export with formatting:
      // - Blue headers
      // - Olive green for Level 1 groups/assemblies
      // - Bright yellow for new parts
      const blob = await exportWithStyles(items, projectName, {
        visibility: effectiveVisibility,
        includeTimestamp: true,
      });
      
      const filename = `${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadBlob(blob, filename);
      
      toast.success('Excel exported successfully', {
        description: `${items.length} items exported with formatting`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };
  
  const handleExportFullCCM = async () => {
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }
    
    setIsExporting(true);
    setExportType('ccm');
    
    try {
      const blob = await exportFullCCM(items, projectName);
      
      const filename = `${projectName}_CCM_${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadBlob(blob, filename);
      
      toast.success('Full CCM exported successfully', {
        description: `${items.length} items with all 29 columns`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting || items.length === 0}
          className="gap-1.5"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {size !== 'icon' && 'Export'}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export BOM</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* CSV Export */}
        <DropdownMenuItem 
          onClick={handleExportCsv}
          disabled={isExporting}
        >
          <FileText className="h-4 w-4 mr-2" />
          <div className="flex-1">
            <div>CSV (Visible Columns)</div>
            <div className="text-xs text-[var(--text-tertiary)]">
              Simple format, opens in any app
            </div>
          </div>
          {exportType === 'csv' && <Loader2 className="h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        
        {/* Excel Export */}
        <DropdownMenuItem 
          onClick={handleExportExcel}
          disabled={isExporting}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          <div className="flex-1">
            <div>Excel (Visible Columns)</div>
            <div className="text-xs text-[var(--text-tertiary)]">
              With formatting and colors
            </div>
          </div>
          {exportType === 'excel' && <Loader2 className="h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Full CCM Export */}
        <DropdownMenuItem 
          onClick={handleExportFullCCM}
          disabled={isExporting}
        >
          <Columns3 className="h-4 w-4 mr-2" />
          <div className="flex-1">
            <div>Full CCM Format</div>
            <div className="text-xs text-[var(--text-tertiary)]">
              All 29 columns, official format
            </div>
          </div>
          {exportType === 'ccm' && <Loader2 className="h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
