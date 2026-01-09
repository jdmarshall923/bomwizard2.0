'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Phase 14: Override Confirmation Dialog
 * 
 * Prompts user when they're about to override a value
 * that came from master data or was calculated.
 * 
 * Collects optional reason for the override.
 */

interface OverrideConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Override details
  fieldName: string;
  fieldDisplayName: string;
  originalValue: string | number | null;
  newValue: string | number | null;
  sourceType: 'master' | 'calculated' | 'imported' | 'contract';
  sourceName?: string;  // e.g., "Vendor Contract Price", "Acme Corp Quote"
  
  // Callbacks
  onConfirm: (reason?: string, dontAskAgain?: boolean) => void;
  onCancel: () => void;
  
  // Format helpers
  formatValue?: (value: string | number | null) => string;
}

export function OverrideConfirmDialog({
  open,
  onOpenChange,
  fieldName,
  fieldDisplayName,
  originalValue,
  newValue,
  sourceType,
  sourceName,
  onConfirm,
  onCancel,
  formatValue = (v) => v?.toString() ?? '—',
}: OverrideConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [dontAskAgain, setDontAskAgain] = useState(false);
  
  // Source type display
  const sourceDisplay = {
    master: 'Master Data',
    calculated: 'Calculated',
    imported: 'Imported',
    contract: 'Vendor Contract',
  }[sourceType];
  
  // Source color
  const sourceColor = {
    master: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/30',
    calculated: 'bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)] border-[var(--text-tertiary)]/30',
    imported: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border-[var(--accent-purple)]/30',
    contract: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/30',
  }[sourceType];
  
  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined, dontAskAgain);
    setReason('');
    setDontAskAgain(false);
  };
  
  const handleCancel = () => {
    onCancel();
    setReason('');
    setDontAskAgain(false);
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--accent-orange)]" />
            Override {fieldDisplayName}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p>
                This value is pulled from{' '}
                <Badge variant="outline" className={cn('font-normal', sourceColor)}>
                  {sourceDisplay}
                </Badge>
                {sourceName && (
                  <span className="text-[var(--text-secondary)]">
                    {' '}({sourceName})
                  </span>
                )}
              </p>
              
              {/* Value change display */}
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div className="flex-1 text-center">
                  <div className="text-xs text-[var(--text-tertiary)] mb-1">Original</div>
                  <div className="font-mono font-medium text-[var(--text-primary)]">
                    {formatValue(originalValue)}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                <div className="flex-1 text-center">
                  <div className="text-xs text-[var(--text-tertiary)] mb-1">New Value</div>
                  <div className="font-mono font-medium text-[var(--accent-orange)]">
                    {formatValue(newValue)}
                  </div>
                </div>
              </div>
              
              {/* Reason input */}
              <div className="space-y-2">
                <Label htmlFor="override-reason" className="text-[var(--text-primary)]">
                  Reason (optional)
                </Label>
                <Textarea
                  id="override-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you overriding this value?"
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-[var(--text-tertiary)]">
                  This will be recorded in the change history.
                </p>
              </div>
              
              {/* Don't ask again checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dont-ask-again"
                  checked={dontAskAgain}
                  onCheckedChange={(checked) => setDontAskAgain(checked === true)}
                />
                <Label
                  htmlFor="dont-ask-again"
                  className="text-sm text-[var(--text-secondary)] cursor-pointer"
                >
                  Don&apos;t ask again for this session
                </Label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/90"
          >
            Override Value
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
