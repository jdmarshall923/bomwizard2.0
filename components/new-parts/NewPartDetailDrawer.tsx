'use client';

import { useState, useEffect } from 'react';
import { NewPart } from '@/types/newPart';
import { NewPartStatus } from '@/types/bom';
import { getStatusInfo, getPriorityInfo, KANBAN_COLUMNS } from '@/lib/bom/newPartService';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  Package,
  PencilRuler,
  Save,
  Settings2,
  ShoppingCart,
  Trash2,
  User,
  X,
} from 'lucide-react';

interface NewPartDetailDrawerProps {
  part: NewPart | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (partId: string, data: Partial<NewPart>) => Promise<void>;
  onComplete: (
    partId: string,
    finalItemCode: string,
    finalUnitPrice: number,
    landingPct: number,
    completedBy: string
  ) => Promise<void>;
  onDelete: (partId: string) => Promise<void>;
  onMoveStatus: (partId: string, newStatus: NewPartStatus) => Promise<void>;
}

export function NewPartDetailDrawer({
  part,
  open,
  onClose,
  onUpdate,
  onComplete,
  onDelete,
  onMoveStatus,
}: NewPartDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [editData, setEditData] = useState<Partial<NewPart>>({});
  const [completeData, setCompleteData] = useState({
    finalItemCode: '',
    finalUnitPrice: 0,
    landingPct: 0,
  });

  // Reset state when part changes
  useEffect(() => {
    if (part) {
      setEditData({
        description: part.description,
        priority: part.priority,
        requestNotes: part.requestNotes,
        drawingNumber: part.drawingNumber,
        drawingRevision: part.drawingRevision,
        designNotes: part.designNotes,
        engineeringNotes: part.engineeringNotes,
        vendorCode: part.vendorCode,
        vendorName: part.vendorName,
        quotedPrice: part.quotedPrice,
        quotedLeadTimeDays: part.quotedLeadTimeDays,
        quotedMoq: part.quotedMoq,
        poNumber: part.poNumber,
        procurementNotes: part.procurementNotes,
      });
      setCompleteData({
        finalItemCode: part.finalItemCode || '',
        finalUnitPrice: part.quotedPrice || 0,
        landingPct: part.landingPct || 0,
      });
    }
    setIsEditing(false);
    setShowCompleteForm(false);
  }, [part]);

  if (!part) return null;

  const statusInfo = getStatusInfo(part.status);
  const priorityInfo = getPriorityInfo(part.priority);

  const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSave = async () => {
    if (!part) return;
    setIsSaving(true);
    try {
      await onUpdate(part.id, editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    }
    setIsSaving(false);
  };

  const handleComplete = async () => {
    if (!part) return;
    setIsSaving(true);
    try {
      await onComplete(
        part.id,
        completeData.finalItemCode,
        completeData.finalUnitPrice,
        completeData.landingPct,
        'current-user' // TODO: Get actual user
      );
      onClose();
    } catch (error) {
      console.error('Failed to complete:', error);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!part) return;
    if (confirm('Are you sure you want to delete this new part? This cannot be undone.')) {
      await onDelete(part.id);
      onClose();
    }
  };

  const handleStatusChange = async (newStatus: NewPartStatus) => {
    if (!part || part.status === newStatus) return;
    await onMoveStatus(part.id, newStatus);
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)]">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold font-mono text-[var(--accent-blue)]">
                {part.placeholderCode}
              </SheetTitle>
              <SheetDescription className="mt-1 line-clamp-2">
                {part.description || 'No description'}
              </SheetDescription>
            </div>
          </div>

          {/* Status & Priority Badges */}
          <div className="flex items-center gap-2 mt-3">
            <Badge className={cn('px-3', statusInfo.bgColor, statusInfo.color, statusInfo.borderColor)}>
              {statusInfo.label}
            </Badge>
            <Badge className={cn('px-3', priorityInfo.bgColor, priorityInfo.color)}>
              {priorityInfo.label}
            </Badge>
            {part.priority === 'critical' && (
              <AlertCircle className="h-4 w-4 text-[var(--accent-red)] animate-pulse ml-1" />
            )}
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Quick Status Change */}
        {part.status !== 'complete' && part.status !== 'cancelled' && (
          <div className="mb-4">
            <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
              Move to Stage
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {KANBAN_COLUMNS.filter((col) => col.id !== part.status && col.id !== 'complete').map((column) => (
                <Button
                  key={column.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(column.id)}
                  className="text-xs border-[var(--border-subtle)] hover:border-[var(--accent-blue)]/50"
                >
                  {column.title}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-[var(--bg-tertiary)]">
            <TabsTrigger value="details" className="text-xs">
              <ClipboardList className="h-3 w-3 mr-1" />
              Details
            </TabsTrigger>
            <TabsTrigger value="design" className="text-xs">
              <PencilRuler className="h-3 w-3 mr-1" />
              Design
            </TabsTrigger>
            <TabsTrigger value="engineering" className="text-xs">
              <Settings2 className="h-3 w-3 mr-1" />
              Eng.
            </TabsTrigger>
            <TabsTrigger value="procurement" className="text-xs">
              <ShoppingCart className="h-3 w-3 mr-1" />
              Proc.
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Group</Label>
                <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                  <Package className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="text-sm font-medium">{part.groupCode}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Quantity</Label>
                <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-medium">
                  {part.quantity}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-tertiary)]">Priority</Label>
              {isEditing ? (
                <Select
                  value={editData.priority || part.priority}
                  onValueChange={(value) =>
                    setEditData({ ...editData, priority: value as NewPart['priority'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className={cn('p-2 rounded-md text-sm', priorityInfo.bgColor, priorityInfo.color)}>
                  {priorityInfo.label}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-tertiary)]">Request Notes</Label>
              {isEditing ? (
                <Textarea
                  value={editData.requestNotes || ''}
                  onChange={(e) => setEditData({ ...editData, requestNotes: e.target.value })}
                  placeholder="Add notes about this part request..."
                  rows={3}
                />
              ) : (
                <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] min-h-[60px]">
                  {part.requestNotes || 'No notes'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Requested By</Label>
                <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                  <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="text-sm">{part.requestedBy || 'Unknown'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Requested</Label>
                <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                  <CalendarDays className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="text-sm">{formatDate(part.requestedAt)}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Drawing Number</Label>
                {isEditing ? (
                  <Input
                    value={editData.drawingNumber || ''}
                    onChange={(e) => setEditData({ ...editData, drawingNumber: e.target.value })}
                    placeholder="e.g., DWG-001"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.drawingNumber || '-'}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Revision</Label>
                {isEditing ? (
                  <Input
                    value={editData.drawingRevision || ''}
                    onChange={(e) => setEditData({ ...editData, drawingRevision: e.target.value })}
                    placeholder="e.g., A"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.drawingRevision || '-'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-tertiary)]">Design Notes</Label>
              {isEditing ? (
                <Textarea
                  value={editData.designNotes || ''}
                  onChange={(e) => setEditData({ ...editData, designNotes: e.target.value })}
                  placeholder="Notes about design specifications..."
                  rows={4}
                />
              ) : (
                <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] min-h-[80px]">
                  {part.designNotes || 'No design notes'}
                </div>
              )}
            </div>

            {part.designCompletedAt && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 text-sm">
                <Check className="h-4 w-4 text-[var(--accent-green)]" />
                <span className="text-[var(--accent-green)]">
                  Design completed on {formatDate(part.designCompletedAt)}
                </span>
              </div>
            )}
          </TabsContent>

          {/* Engineering Tab */}
          <TabsContent value="engineering" className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-tertiary)]">Engineering Notes</Label>
              {isEditing ? (
                <Textarea
                  value={editData.engineeringNotes || ''}
                  onChange={(e) => setEditData({ ...editData, engineeringNotes: e.target.value })}
                  placeholder="Technical review notes..."
                  rows={4}
                />
              ) : (
                <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] min-h-[80px]">
                  {part.engineeringNotes || 'No engineering notes'}
                </div>
              )}
            </div>

            {part.engineeringApprovedAt && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 text-sm">
                  <Check className="h-4 w-4 text-[var(--accent-green)]" />
                  <span className="text-[var(--accent-green)]">
                    Engineering approved on {formatDate(part.engineeringApprovedAt)}
                  </span>
                </div>
                {part.engineeringApprovedBy && (
                  <div className="text-xs text-[var(--text-tertiary)]">
                    Approved by: {part.engineeringApprovedBy}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Procurement Tab */}
          <TabsContent value="procurement" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Vendor Code</Label>
                {isEditing ? (
                  <Input
                    value={editData.vendorCode || ''}
                    onChange={(e) => setEditData({ ...editData, vendorCode: e.target.value })}
                    placeholder="e.g., V100001"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-mono">
                    {part.vendorCode || '-'}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Vendor Name</Label>
                {isEditing ? (
                  <Input
                    value={editData.vendorName || ''}
                    onChange={(e) => setEditData({ ...editData, vendorName: e.target.value })}
                    placeholder="Vendor name"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.vendorName || '-'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Quoted Price</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.quotedPrice || ''}
                    onChange={(e) => setEditData({ ...editData, quotedPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-medium">
                    {part.quotedPrice ? `£${part.quotedPrice.toFixed(2)}` : '-'}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">MOQ</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.quotedMoq || ''}
                    onChange={(e) => setEditData({ ...editData, quotedMoq: parseInt(e.target.value) || 0 })}
                    placeholder="1"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.quotedMoq || '-'}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Lead Time</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.quotedLeadTimeDays || ''}
                    onChange={(e) => setEditData({ ...editData, quotedLeadTimeDays: parseInt(e.target.value) || 0 })}
                    placeholder="Days"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.quotedLeadTimeDays ? `${part.quotedLeadTimeDays} days` : '-'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-tertiary)]">PO Number</Label>
              {isEditing ? (
                <Input
                  value={editData.poNumber || ''}
                  onChange={(e) => setEditData({ ...editData, poNumber: e.target.value })}
                  placeholder="e.g., PO-2024-001"
                />
              ) : (
                <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-mono">
                  {part.poNumber || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-tertiary)]">Procurement Notes</Label>
              {isEditing ? (
                <Textarea
                  value={editData.procurementNotes || ''}
                  onChange={(e) => setEditData({ ...editData, procurementNotes: e.target.value })}
                  placeholder="Notes about quotes, orders, etc..."
                  rows={3}
                />
              ) : (
                <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] min-h-[60px]">
                  {part.procurementNotes || 'No procurement notes'}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {/* Complete Part Form */}
        {showCompleteForm && part.status === 'procurement' && (
          <div className="space-y-4 p-4 rounded-lg border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 mb-4">
            <h4 className="font-semibold text-[var(--accent-green)] flex items-center gap-2">
              <Check className="h-4 w-4" />
              Complete Part - Assign Final B-Code
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Final B-Code *</Label>
                <Input
                  value={completeData.finalItemCode}
                  onChange={(e) => setCompleteData({ ...completeData, finalItemCode: e.target.value })}
                  placeholder="e.g., B107234"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Unit Price (£) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={completeData.finalUnitPrice || ''}
                  onChange={(e) => setCompleteData({ ...completeData, finalUnitPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--text-tertiary)]">Landing %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={completeData.landingPct || ''}
                  onChange={(e) => setCompleteData({ ...completeData, landingPct: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleComplete}
                disabled={!completeData.finalItemCode || !completeData.finalUnitPrice || isSaving}
                className="flex-1 bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90"
              >
                <Check className="h-4 w-4 mr-2" />
                {isSaving ? 'Completing...' : 'Complete Part'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCompleteForm(false)}
                className="border-[var(--border-subtle)]"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Final B-Code Display (if complete) */}
        {part.finalItemCode && (
          <div className="p-4 rounded-lg border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 mb-4">
            <h4 className="font-semibold text-[var(--accent-green)] flex items-center gap-2 mb-3">
              <Check className="h-4 w-4" />
              Completed
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[var(--text-tertiary)]">Final B-Code</Label>
                <div className="text-lg font-mono font-bold text-[var(--accent-green)]">
                  {part.finalItemCode}
                </div>
              </div>
              <div>
                <Label className="text-xs text-[var(--text-tertiary)]">Final Price</Label>
                <div className="text-lg font-bold">
                  £{part.finalUnitPrice?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-2">
              Completed on {formatDate(part.completedAt)} by {part.completedBy || 'Unknown'}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="border-[var(--border-subtle)]"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex-1 border-[var(--border-subtle)]"
              >
                <FileText className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
              {part.status === 'procurement' && !part.finalItemCode && (
                <Button
                  onClick={() => setShowCompleteForm(true)}
                  className="flex-1 bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Complete Part
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDelete}
                className="border-[var(--accent-red)]/30 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

