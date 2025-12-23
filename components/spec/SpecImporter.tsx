'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ParsedSpec, SpecValidationResult } from '@/types/spec';
import { parseSpecSheet, validateParsedSpec } from '@/lib/spec/specImportService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { SpecConfigSummary } from './SpecConfigTable';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpecImporterProps {
  projectId: string;
  onImportComplete: (specId: string) => void;
  onCancel: () => void;
}

type ImportStep = 'upload' | 'parsing' | 'preview' | 'importing' | 'complete' | 'error';

export function SpecImporter({
  projectId,
  onImportComplete,
  onCancel,
}: SpecImporterProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedSpec, setParsedSpec] = useState<ParsedSpec | null>(null);
  const [validation, setValidation] = useState<SpecValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setFile(file);
    setStep('parsing');
    setProgress(20);
    
    try {
      const parsed = await parseSpecSheet(file);
      setProgress(60);
      
      const validationResult = validateParsedSpec(parsed);
      setProgress(80);
      
      setParsedSpec(parsed);
      setValidation(validationResult);
      setProgress(100);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setStep('error');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!parsedSpec) return;
    
    setStep('importing');
    setProgress(0);
    
    try {
      // Import would create the spec
      // const specId = await createSpecFromImport(projectId, parsedSpec, userId);
      // For now, simulate
      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(100);
      
      setStep('complete');
      // onImportComplete(specId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import spec');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('upload');
    setFile(null);
    setParsedSpec(null);
    setValidation(null);
    setError(null);
    setProgress(0);
  };

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={20} />
            Import Spec Sheet
          </DialogTitle>
          <DialogDescription>
            Upload an Excel spec sheet to import configuration options
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {(step === 'parsing' || step === 'importing') && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              {step === 'parsing' ? 'Parsing spec sheet...' : 'Importing spec...'}
            </p>
          </div>
        )}

        {/* Upload step */}
        {step === 'upload' && (
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <input {...getInputProps()} />
            <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop the file here' : 'Drag & drop a spec sheet'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to select a file
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Supports .xlsx and .xls files
            </p>
          </div>
        )}

        {/* Preview step */}
        {step === 'preview' && parsedSpec && validation && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileSpreadsheet size={24} className="text-emerald-500" />
              <div className="flex-1">
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedSpec.categories.length} categories • 
                  {parsedSpec.colourOptions.length} colour options
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleRetry}>
                <X size={16} />
              </Button>
            </div>

            {/* Validation status */}
            {validation.isValid ? (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="text-emerald-800">Validation Passed</AlertTitle>
                <AlertDescription className="text-emerald-700">
                  The spec sheet was parsed successfully and is ready to import.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Failed</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {validation.errors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Warnings</AlertTitle>
                <AlertDescription className="text-amber-700">
                  <ul className="list-disc list-inside mt-2">
                    {validation.warnings.map((warn, i) => (
                      <li key={i}>{warn.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Parsed spec preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Parsed Spec Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Header info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Project Name:</span>
                    <span className="ml-2 font-medium">{parsedSpec.header.projectName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bike Type:</span>
                    <span className="ml-2 font-medium">{parsedSpec.header.bikeType || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Model Year:</span>
                    <span className="ml-2 font-medium">{parsedSpec.header.modelYear || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Product Family:</span>
                    <span className="ml-2 font-medium">{parsedSpec.header.productFamily || '—'}</span>
                  </div>
                </div>

                {/* Selected options summary */}
                <SpecConfigSummary categories={parsedSpec.categories} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error step */}
        {step === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Complete step */}
        {step === 'complete' && (
          <div className="text-center py-8">
            <CheckCircle2 size={64} className="mx-auto mb-4 text-emerald-500" />
            <h3 className="text-xl font-semibold">Import Complete!</h3>
            <p className="text-muted-foreground mt-2">
              Your spec has been imported successfully.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleRetry}>
                Choose Different File
              </Button>
              <Button 
                onClick={handleImport}
                disabled={!validation?.isValid}
              >
                Import Spec
              </Button>
            </>
          )}
          
          {step === 'error' && (
            <>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={handleRetry}>
                Try Again
              </Button>
            </>
          )}
          
          {step === 'complete' && (
            <Button onClick={() => onImportComplete('')}>
              Continue
            </Button>
          )}
          
          {(step === 'parsing' || step === 'importing') && (
            <Button disabled>
              <Loader2 size={16} className="mr-2 animate-spin" />
              {step === 'parsing' ? 'Parsing...' : 'Importing...'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

