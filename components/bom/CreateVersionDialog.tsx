'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, History } from 'lucide-react';

interface CreateVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateVersion: (name?: string, description?: string) => Promise<void>;
  currentItemCount?: number;
  currentTotalCost?: number;
}

export function CreateVersionDialog({
  open,
  onOpenChange,
  onCreateVersion,
  currentItemCount = 0,
  currentTotalCost = 0,
}: CreateVersionDialogProps) {
  const [versionName, setVersionName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreateVersion(
        versionName.trim() || undefined,
        description.trim() || undefined
      );
      // Reset form
      setVersionName('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create version:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Create Version Snapshot
          </DialogTitle>
          <DialogDescription>
            Create a snapshot of the current BOM state. This allows you to track
            changes over time and compare different versions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Current state info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="text-sm font-medium mb-2">Current BOM State</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Items:</span>
                <span className="ml-2 font-medium">{currentItemCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Cost:</span>
                <span className="ml-2 font-medium">{formatCurrency(currentTotalCost)}</span>
              </div>
            </div>
          </div>
          
          {/* Version name */}
          <div className="grid gap-2">
            <Label htmlFor="versionName">Version Name (optional)</Label>
            <Input
              id="versionName"
              placeholder="e.g., Pre-Q1 Price Update"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              Give this version a memorable name to find it easily later.
            </p>
          </div>
          
          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="e.g., Snapshot before applying vendor price updates..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Add notes about why you&apos;re creating this snapshot.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Snapshot
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

