'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Package,
  Plane,
  Ship,
  Truck,
  X,
} from 'lucide-react';
import { NewPartStatus } from '@/types/newPart';

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onBulkSetVendor: (vendor: { code?: string; name: string }) => Promise<void>;
  onBulkMarkOrdered: (order: { poNumber: string; poDate: Date; type: 'sprint' | 'production' | 'both' }) => Promise<void>;
  onBulkUpdateFreight: (freightType: 'sea' | 'air') => Promise<void>;
  onBulkChangeStatus: (status: NewPartStatus) => Promise<void>;
  onBulkAssignGroup: (groupCode: string) => Promise<void>;
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
  groups,
  className,
}: BulkActionsProps) {
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Vendor dialog state
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');

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
    </>
  );
}

