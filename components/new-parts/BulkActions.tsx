'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  Check,
  ChevronDown,
  ClipboardPaste,
  Package,
  Plane,
  Ship,
  Truck,
  X,
} from 'lucide-react';
import { NewPartStatus, NewPart } from '@/types/newPart';

// Helper to parse various date formats
function parseDate(input: string): string | null {
  const trimmed = input.trim();
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try natural language dates
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

// Fields that can be bulk edited via paste
type BulkPasteField = 
  | 'sprintQuantity' 
  | 'massProductionQuantity' 
  | 'sprintTargetDate' 
  | 'productionTargetDate'
  | 'quotedPrice'
  | 'baseLeadTimeDays'
  | 'sprintPoNumber'
  | 'productionPoNumber';

const BULK_PASTE_FIELDS: { value: BulkPasteField; label: string; type: 'number' | 'date' | 'text' }[] = [
  { value: 'sprintQuantity', label: 'Sprint Quantity', type: 'number' },
  { value: 'massProductionQuantity', label: 'Production Quantity', type: 'number' },
  { value: 'sprintTargetDate', label: 'Sprint Target Date', type: 'date' },
  { value: 'productionTargetDate', label: 'Production Target Date', type: 'date' },
  { value: 'quotedPrice', label: 'Quoted Price', type: 'number' },
  { value: 'baseLeadTimeDays', label: 'Lead Time (days)', type: 'number' },
  { value: 'sprintPoNumber', label: 'Sprint PO Number', type: 'text' },
  { value: 'productionPoNumber', label: 'Production PO Number', type: 'text' },
];

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onBulkSetVendor: (vendor: { code?: string; name: string }) => Promise<void>;
  onBulkMarkOrdered: (order: { poNumber: string; poDate: Date; type: 'sprint' | 'production' | 'both' }) => Promise<void>;
  onBulkUpdateFreight: (freightType: 'sea' | 'air') => Promise<void>;
  onBulkChangeStatus: (status: NewPartStatus) => Promise<void>;
  onBulkAssignGroup: (groupCode: string) => Promise<void>;
  onBulkPaste?: (field: keyof NewPart, value: any) => Promise<void>;
  groups: { code: string; description?: string }[];
  className?: string;
}

export function BulkActions({
  selectedCount,
  totalCount,
  onClearSelection,
  onBulkSetVendor,
  onBulkMarkOrdered,
  onBulkUpdateFreight,
  onBulkChangeStatus,
  onBulkAssignGroup,
  onBulkPaste,
  groups,
  className,
}: BulkActionsProps) {
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Vendor dialog state
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');

  // Bulk paste dialog state
  const [pasteField, setPasteField] = useState<BulkPasteField>('sprintQuantity');
  const [pasteValue, setPasteValue] = useState('');

  // Order dialog state
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [orderType, setOrderType] = useState<'sprint' | 'production' | 'both'>('both');

  // Group dialog state
  const [selectedGroup, setSelectedGroup] = useState('');

  const handleSetVendor = async () => {
    if (!vendorName) return;
    setIsProcessing(true);
    try {
      await onBulkSetVendor({ code: vendorCode || undefined, name: vendorName });
      setShowVendorDialog(false);
      setVendorName('');
      setVendorCode('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkOrdered = async () => {
    if (!poNumber || !poDate) return;
    setIsProcessing(true);
    try {
      await onBulkMarkOrdered({ 
        poNumber, 
        poDate: new Date(poDate), 
        type: orderType 
      });
      setShowOrderDialog(false);
      setPoNumber('');
      setPoDate('');
      setOrderType('both');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignGroup = async () => {
    if (!selectedGroup) return;
    setIsProcessing(true);
    try {
      await onBulkAssignGroup(selectedGroup);
      setShowGroupDialog(false);
      setSelectedGroup('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkPaste = async () => {
    if (!pasteValue || !onBulkPaste) return;
    setIsProcessing(true);
    try {
      const fieldConfig = BULK_PASTE_FIELDS.find(f => f.value === pasteField);
      if (!fieldConfig) return;

      let parsedValue: any;
      
      if (fieldConfig.type === 'number') {
        parsedValue = parseFloat(pasteValue.replace(/[^\d.-]/g, ''));
        if (isNaN(parsedValue)) {
          alert('Please enter a valid number');
          setIsProcessing(false);
          return;
        }
      } else if (fieldConfig.type === 'date') {
        // Try to parse various date formats
        const date = parseDate(pasteValue);
        if (!date) {
          alert('Please enter a valid date (e.g., 2025-01-15 or 15/01/2025)');
          setIsProcessing(false);
          return;
        }
        // Convert to Firestore-like timestamp format
        parsedValue = { toDate: () => new Date(date) };
      } else {
        parsedValue = pasteValue.trim();
      }

      await onBulkPaste(pasteField, parsedValue);
      setShowPasteDialog(false);
      setPasteValue('');
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 bg-[var(--accent-blue)]/5 border border-[var(--accent-blue)]/20 rounded-lg',
        className
      )}>
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-[var(--accent-blue)]" />
          <span className="text-[var(--text-primary)] font-medium">
            {selectedCount} of {totalCount}
          </span>
          <span className="text-[var(--text-secondary)]">selected</span>
        </div>

        <div className="h-4 w-px bg-[var(--border-subtle)] mx-2" />

        {/* Set Vendor */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVendorDialog(true)}
          className="h-7 text-xs gap-1.5 hover:bg-[var(--bg-tertiary)]"
        >
          <Building2 className="h-3.5 w-3.5" />
          Set Vendor
        </Button>

        {/* Mark Ordered */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowOrderDialog(true)}
          className="h-7 text-xs gap-1.5 hover:bg-[var(--bg-tertiary)]"
        >
          <Truck className="h-3.5 w-3.5" />
          Mark Ordered
        </Button>

        {/* Update Freight */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 hover:bg-[var(--bg-tertiary)]"
            >
              <Ship className="h-3.5 w-3.5" />
              Freight
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
            <DropdownMenuItem 
              onClick={() => onBulkUpdateFreight('sea')}
              className="text-xs gap-2"
            >
              <Ship className="h-3.5 w-3.5 text-teal-500" />
              Sea Freight (35 days)
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onBulkUpdateFreight('air')}
              className="text-xs gap-2"
            >
              <Plane className="h-3.5 w-3.5 text-sky-400" />
              Air Freight (5 days)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Change Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 hover:bg-[var(--bg-tertiary)]"
            >
              Status
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
            <DropdownMenuItem 
              onClick={() => onBulkChangeStatus('added')}
              className="text-xs"
            >
              Added
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onBulkChangeStatus('design')}
              className="text-xs"
            >
              Design
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onBulkChangeStatus('engineering')}
              className="text-xs"
            >
              Engineering
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onBulkChangeStatus('procurement')}
              className="text-xs"
            >
              Procurement
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onBulkChangeStatus('on_hold')}
              className="text-xs text-yellow-400"
            >
              On Hold
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assign Group */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowGroupDialog(true)}
          className="h-7 text-xs gap-1.5 hover:bg-[var(--bg-tertiary)]"
        >
          <Package className="h-3.5 w-3.5" />
          Assign Group
        </Button>

        {/* Bulk Paste */}
        {onBulkPaste && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPasteDialog(true)}
            className="h-7 text-xs gap-1.5 hover:bg-[var(--bg-tertiary)]"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Bulk Paste
          </Button>
        )}

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7 text-xs ml-auto hover:bg-[var(--bg-tertiary)]"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Set Vendor Dialog */}
      <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
          <DialogHeader>
            <DialogTitle>Set Vendor for {selectedCount} parts</DialogTitle>
            <DialogDescription>
              Apply the same vendor to all selected parts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g., Acme Suppliers Ltd"
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor Code (optional)</Label>
              <Input
                value={vendorCode}
                onChange={(e) => setVendorCode(e.target.value)}
                placeholder="e.g., V100001"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVendorDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSetVendor}
              disabled={!vendorName || isProcessing}
              className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
            >
              {isProcessing ? 'Applying...' : `Apply to ${selectedCount} parts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Ordered Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
          <DialogHeader>
            <DialogTitle>Mark {selectedCount} parts as Ordered</DialogTitle>
            <DialogDescription>
              Enter the PO details to apply to all selected parts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={(v) => setOrderType(v as typeof orderType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Sprint + Production</SelectItem>
                  <SelectItem value="sprint">Sprint Only</SelectItem>
                  <SelectItem value="production">Production Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>PO Number *</Label>
              <Input
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g., PX00057395"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>PO Date *</Label>
              <Input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkOrdered}
              disabled={!poNumber || !poDate || isProcessing}
              className="bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90"
            >
              {isProcessing ? 'Applying...' : `Mark ${selectedCount} as Ordered`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
          <DialogHeader>
            <DialogTitle>Assign Group to {selectedCount} parts</DialogTitle>
            <DialogDescription>
              Move all selected parts to a BOM group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Group</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.code} value={group.code}>
                      {group.code} {group.description && `- ${group.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignGroup}
              disabled={!selectedGroup || isProcessing}
              className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
            >
              {isProcessing ? 'Applying...' : `Assign ${selectedCount} parts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Paste Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
          <DialogHeader>
            <DialogTitle>Bulk Paste to {selectedCount} parts</DialogTitle>
            <DialogDescription>
              Paste a value to apply to all selected parts. Great for adding quantities, dates, or PO numbers in bulk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Field to Update</Label>
              <Select value={pasteField} onValueChange={(v) => setPasteField(v as BulkPasteField)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BULK_PASTE_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Value to Apply
                <span className="text-[var(--text-tertiary)] text-xs ml-2">
                  ({BULK_PASTE_FIELDS.find(f => f.value === pasteField)?.type === 'date' 
                    ? 'e.g., 2025-01-15 or 15/01/2025' 
                    : BULK_PASTE_FIELDS.find(f => f.value === pasteField)?.type === 'number'
                    ? 'enter a number'
                    : 'enter text'})
                </span>
              </Label>
              <Input
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                placeholder={
                  BULK_PASTE_FIELDS.find(f => f.value === pasteField)?.type === 'date'
                    ? '2025-01-15'
                    : BULK_PASTE_FIELDS.find(f => f.value === pasteField)?.type === 'number'
                    ? '100'
                    : 'PX00057395'
                }
                type={BULK_PASTE_FIELDS.find(f => f.value === pasteField)?.type === 'date' ? 'date' : 'text'}
                className="font-mono"
                onPaste={(e) => {
                  // Handle paste from clipboard
                  const pasted = e.clipboardData.getData('text').trim();
                  if (pasted) {
                    setPasteValue(pasted);
                    e.preventDefault();
                  }
                }}
              />
            </div>
            <div className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] p-3 rounded">
              <strong>Tip:</strong> You can paste values directly from Excel or other spreadsheets. 
              Select rows in this table, then paste the same value to apply to all selected parts at once.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkPaste}
              disabled={!pasteValue || isProcessing}
              className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
            >
              {isProcessing ? 'Applying...' : `Apply to ${selectedCount} parts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

