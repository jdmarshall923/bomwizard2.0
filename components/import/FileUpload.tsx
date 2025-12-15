'use client';

import { useCallback, useState } from 'react';
import { Upload, File, X, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  accept?: string;
  className?: string;
  maxSizeMB?: number;
  selectedFile?: File | null;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  accept = '.csv',
  className,
  maxSizeMB = 10,
  selectedFile,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const validateFile = (file: File): boolean => {
    setError('');
    
    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return false;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect, maxSizeMB]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  if (selectedFile) {
    return (
      <Card className={cn('border-2 border-[var(--accent-green)]/50', className)}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[var(--accent-green)]/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-[var(--accent-green)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {selectedFile.name}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          {onFileRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFileRemove}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'border-2 border-dashed transition-all',
        isDragging
          ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
          : 'border-[var(--border-subtle)] hover:border-[var(--accent-blue)]/50',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="flex flex-col items-center justify-center p-12">
        <div className="h-16 w-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
          <Upload className="h-8 w-8 text-[var(--accent-blue)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
          Drag and drop your CSV file here
        </p>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          or click to browse • Max {maxSizeMB}MB
        </p>
        {error && (
          <div className="mb-4 p-2 text-xs text-[var(--accent-red)] bg-[var(--accent-red)]/10 rounded">
            {error}
          </div>
        )}
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <File className="mr-2 h-4 w-4" />
            Browse files
          </Button>
        </label>
      </CardContent>
    </Card>
  );
}

