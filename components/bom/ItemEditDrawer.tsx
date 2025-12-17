'use client';

import { BomItem } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Boxes, 
  PoundSterling, 
  Calculator,
  Sparkles,
  AlertCircle,
  Save,
  X,
  Loader2,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemEditDrawerProps {
  item: BomItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (itemId: string, updates: Partial<BomItem>) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
}

interface FormState {
  quantity: number;
  materialCost: number;
  landingCost: number;
  labourCost: number;
  costSource: 'placeholder' | 'contract' | 'quote' | 'estimate' | undefined;
  vendorId: string;
}

export function ItemEditDrawer({ item, open, onClose, onSave, onDelete }: ItemEditDrawerProps) {
  const [formState, setFormState] = useState<FormState>({
    quantity: 0,
    materialCost: 0,
    landingCost: 0,
    labourCost: 0,
    costSource: undefined,
    vendorId: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setFormState({
        quantity: item.quantity || 0,
        materialCost: item.materialCost || 0,
        landingCost: item.landingCost || 0,
        labourCost: item.labourCost || 0,
        costSource: item.costSource,
        vendorId: item.vendorId || '',
      });
      setHasChanges(false);
      setError(null);
    }
  }, [item]);

  // Calculate extended cost
  const extendedCost = formState.quantity * (formState.materialCost + formState.landingCost + formState.labourCost);
  const unitCost = formState.materialCost + formState.landingCost + formState.labourCost;

  // Check for changes
  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setError(null);
  }, []);

  // Handle save
  const handleSave = async () => {
    if (!item) return;

    setSaving(true);
    setError(null);

    try {
      await onSave(item.id, {
        quantity: formState.quantity,
        materialCost: formState.materialCost,
        landingCost: formState.landingCost,
        labourCost: formState.labourCost,
        costSource: formState.costSource,
        vendorId: formState.vendorId || undefined,
      });
      setHasChanges(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle close with unsaved changes
  const handleClose = () => {
    if (hasChanges) {
      // Could add a confirmation dialog here
      // For now, just close
    }
    onClose();
  };

  // Handle delete
  const handleDelete = async () => {
    if (!item || !onDelete) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      await onDelete(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      setDeleting(false);
    }
  };

  const isPlaceholder = item?.itemCode?.startsWith('B') && /^B\d/.test(item?.itemCode || '');

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className={cn(
              'h-5 w-5',
              item.partCategory === 'new_part' 
                ? 'text-[var(--accent-blue)]' 
                : isPlaceholder
                  ? 'text-[var(--accent-orange)]'
                  : 'text-[var(--text-tertiary)]'
            )} />
            <SheetTitle className="flex items-center gap-2">
              {item.itemCode}
              {item.partCategory === 'new_part' && (
                <Badge className="bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border-[var(--accent-blue)]/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  New Part
                </Badge>
              )}
              {isPlaceholder && (
                <Badge className="bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] border-[var(--accent-orange)]/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Placeholder
                </Badge>
              )}
            </SheetTitle>
          </div>
          <SheetDescription className="text-left">
            {item.itemDescription}
          </SheetDescription>
        </SheetHeader>

        {/* Item Info */}
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-[var(--text-tertiary)]" />
              <div>
                <div className="text-xs text-[var(--text-tertiary)]">Assembly</div>
                <div className="font-medium">{item.assemblyCode}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">Level</div>
              <div className="font-medium">Level {item.level}</div>
            </div>
          </div>

          <Separator />

          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4 text-[var(--text-tertiary)]" />
              Quantity
            </label>
            <Input 
              type="number" 
              min="0"
              step="1"
              value={formState.quantity}
              onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
              className="font-mono"
            />
          </div>

          <Separator />

          {/* Cost Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <PoundSterling className="h-4 w-4 text-[var(--text-tertiary)]" />
              Costs (per unit)
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-secondary)]">Material Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">£</span>
                  <Input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formState.materialCost}
                    onChange={(e) => updateField('materialCost', parseFloat(e.target.value) || 0)}
                    className="pl-7 font-mono"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-secondary)]">Landing Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">£</span>
                  <Input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formState.landingCost}
                    onChange={(e) => updateField('landingCost', parseFloat(e.target.value) || 0)}
                    className="pl-7 font-mono"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-secondary)]">Labour Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">£</span>
                  <Input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formState.labourCost}
                    onChange={(e) => updateField('labourCost', parseFloat(e.target.value) || 0)}
                    className="pl-7 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Cost Summary */}
            <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Unit Cost</span>
                <span className="font-mono">
                  £{unitCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-[var(--text-primary)] font-medium">Extended Cost</span>
                <span className={cn(
                  'font-mono font-bold',
                  extendedCost > 100 ? 'text-[var(--accent-green)]' : 'text-[var(--text-primary)]'
                )}>
                  £{extendedCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-xs text-[var(--text-tertiary)] text-right">
                {formState.quantity} × £{unitCost.toFixed(2)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Cost Source */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cost Source</label>
            <Select
              value={formState.costSource || 'none'}
              onValueChange={(value) => updateField('costSource', value === 'none' ? undefined : value as 'contract' | 'quote' | 'estimate')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="quote">Quote</SelectItem>
                <SelectItem value="estimate">Estimate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vendor ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Vendor ID</label>
            <Input 
              value={formState.vendorId}
              onChange={(e) => updateField('vendorId', e.target.value)}
              placeholder="Enter vendor ID"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg text-sm text-[var(--accent-red)]">
              {error}
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 flex flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={saving || deleting}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving || deleting || !hasChanges}
              className="flex-1 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
          
          {onDelete && (
            <Button 
              variant="outline"
              onClick={handleDelete}
              disabled={saving || deleting}
              className="w-full border-[var(--accent-red)]/50 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Item
                </>
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
