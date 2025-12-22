'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  parseCsv,
  previewPplImport,
  importFromPpl,
  PplImportOptions,
  PplImportPreview,
} from '@/lib/import/pplImportService';
import { PplImportResult } from '@/types/newPart';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';

interface PplImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  createdBy: string;
  onImportComplete: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'complete';

export function PplImportDialog({
  open,
  onOpenChange,
  projectId,
  createdBy,
  onImportComplete,
}: PplImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PplImportPreview | null>(null);
  const [result, setResult] = useState<PplImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  
  // Import options
  const [options, setOptions] = useState<PplImportOptions>({
    createInBom: true,
    updateExisting: true,
    overwriteChanges: false,
  });
  
  // Raw parsed data
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResult(null);
    setIsLoading(false);
    setProgress({ current: 0, total: 0 });
    setError(null);
    setParsedData(null);
    setOptions({
      createInBom: true,
      updateExisting: true,
      overwriteChanges: false,
    });
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setError(null);

    try {
      const text = await selectedFile.text();
      const { headers, rows } = parseCsv(text);
      
      if (headers.length === 0 || rows.length === 0) {
        throw new Error('File appears to be empty or invalid');
      }
      
      setParsedData({ headers, rows });
      
      // Generate preview
      const previewResult = await previewPplImport(projectId, headers, rows);
      setPreview(previewResult);
      setStep('preview');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!parsedData) return;
    
    setStep('importing');
    setProgress({ current: 0, total: parsedData.rows.length });
    setError(null);

    try {
      const importResult = await importFromPpl(
        projectId,
        parsedData.headers,
        parsedData.rows,
        options,
        createdBy,
        (current, total) => setProgress({ current, total })
      );
      
      setResult(importResult);
      setStep('complete');
      onImportComplete();
    } catch (err) {
      setError((err as Error).message);
      setStep('preview');
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[var(--accent-blue)]" />
            Import from PPL
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload your PPL Excel or CSV file to import parts.'}
            {step === 'preview' && 'Review the detected parts before importing.'}
            {step === 'importing' && 'Importing parts...'}
            {step === 'complete' && 'Import complete!'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                'border-[var(--border-subtle)] hover:border-[var(--accent-blue)]/50',
                isLoading && 'opacity-50 pointer-events-none'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-12 w-12 text-[var(--accent-blue)] mx-auto mb-4 animate-spin" />
              ) : (
                <Upload className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4" />
              )}
              <p className="text-[var(--text-secondary)] mb-2">
                {isLoading ? 'Processing file...' : 'Drop your PPL file here'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mb-4">
                Supports: .xlsx, .xls, .csv
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
                id="ppl-file-input"
              />
              <Button
                variant="outline"
                className="border-[var(--border-subtle)]"
                disabled={isLoading}
                onClick={() => document.getElementById('ppl-file-input')?.click()}
              >
                Browse Files
              </Button>
              
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-left">
                  <div className="flex items-center gap-2 text-[var(--accent-red)]">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Error</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">
                    {preview.totalRows}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">Parts found</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--accent-green)]/10">
                  <div className="text-2xl font-bold text-[var(--accent-green)]">
                    {preview.newParts}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">New parts</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--accent-blue)]/10">
                  <div className="text-2xl font-bold text-[var(--accent-blue)]">
                    {preview.existingParts}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">Updates</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--accent-orange)]/10">
                  <div className="text-2xl font-bold text-[var(--accent-orange)]">
                    {preview.unassignedParts}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">Unassigned</div>
                </div>
              </div>

              {/* Detected Columns */}
              <div className="p-3 rounded-lg border border-[var(--border-subtle)]">
                <h4 className="text-sm font-medium mb-2">Detected Columns</h4>
                <div className="flex flex-wrap gap-1">
                  {preview.detectedColumns.map((col) => (
                    <Badge key={col} className="text-xs bg-[var(--accent-green)]/10 text-[var(--accent-green)]">
                      <Check className="h-2.5 w-2.5 mr-1" />
                      {col}
                    </Badge>
                  ))}
                </div>
                {preview.unmappedColumns.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                    <span className="text-xs text-[var(--text-tertiary)]">Unmapped: </span>
                    {preview.unmappedColumns.slice(0, 5).map((col) => (
                      <Badge key={col} variant="secondary" className="text-xs mr-1">
                        {col}
                      </Badge>
                    ))}
                    {preview.unmappedColumns.length > 5 && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        +{preview.unmappedColumns.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Sample Data */}
              <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)]">
                  <h4 className="text-sm font-medium">Preview</h4>
                </div>
                <ScrollArea className="h-40">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-tertiary)]">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">Code</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">Description</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">Group</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {preview.sampleData.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-mono">{item.placeholderCode}</td>
                          <td className="px-3 py-2 truncate max-w-[200px]">{item.description}</td>
                          <td className="px-3 py-2">{item.groupCode || '—'}</td>
                          <td className="px-3 py-2">
                            <Badge className={cn(
                              'text-[10px]',
                              item.action === 'create' 
                                ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                                : 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                            )}>
                              {item.action === 'create' ? '✨ Create' : '🔄 Update'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              {/* Import Options */}
              <div className="p-3 rounded-lg border border-[var(--border-subtle)] space-y-3">
                <h4 className="text-sm font-medium">Import Options</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={options.createInBom}
                    onCheckedChange={(checked) => setOptions({ ...options, createInBom: !!checked })}
                  />
                  <span className="text-sm">Create parts in BOM (Unassigned if no group)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={options.updateExisting}
                    onCheckedChange={(checked) => setOptions({ ...options, updateExisting: !!checked })}
                  />
                  <span className="text-sm">Update existing parts with PPL data</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[var(--accent-orange)]">
                  <Checkbox
                    checked={options.overwriteChanges}
                    onCheckedChange={(checked) => setOptions({ ...options, overwriteChanges: !!checked })}
                  />
                  <span className="text-sm">Overwrite my changes with PPL data (caution)</span>
                </label>
              </div>

              {/* Errors */}
              {preview.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30">
                  <div className="flex items-center gap-2 text-[var(--accent-orange)] mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{preview.errors.length} warnings</span>
                  </div>
                  <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                    {preview.errors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>Row {err.row}: {err.error}</li>
                    ))}
                    {preview.errors.length > 3 && (
                      <li className="text-[var(--text-tertiary)]">
                        +{preview.errors.length - 3} more warnings
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 text-[var(--accent-blue)] mx-auto mb-4 animate-spin" />
              <p className="text-[var(--text-secondary)] mb-4">
                Importing {progress.current} of {progress.total} parts...
              </p>
              <Progress 
                value={(progress.current / progress.total) * 100} 
                className="w-full max-w-md mx-auto"
              />
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && result && (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-[var(--accent-green)] mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-4">Import Complete!</h3>
              
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                <div className="p-3 rounded-lg bg-[var(--accent-green)]/10">
                  <div className="text-2xl font-bold text-[var(--accent-green)]">
                    {result.created}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">Created</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--accent-blue)]/10">
                  <div className="text-2xl font-bold text-[var(--accent-blue)]">
                    {result.updated}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">Updated</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--accent-orange)]/10">
                  <div className="text-2xl font-bold text-[var(--accent-orange)]">
                    {result.unassigned}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">Unassigned</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 max-w-md mx-auto text-left">
                  <div className="flex items-center gap-2 text-[var(--accent-red)] mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{result.errors.length} errors</span>
                  </div>
                  <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                    {result.errors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>Row {err.row}: {err.error}</li>
                    ))}
                    {result.errors.length > 3 && (
                      <li className="text-[var(--text-tertiary)]">
                        +{result.errors.length - 3} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={reset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              <Button
                onClick={handleImport}
                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
              >
                Import {preview?.totalRows} Parts
              </Button>
            </>
          )}
          
          {step === 'complete' && (
            <Button
              onClick={handleClose}
              className="bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90"
            >
              <Check className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

