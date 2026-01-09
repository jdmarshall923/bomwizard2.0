'use client';

import { useState, useEffect } from 'react';
import { NewPart, NewPartStatus } from '@/types/newPart';
import { getStatusInfo, getPriorityInfo, KANBAN_COLUMNS, calculateTotalProductionQty } from '@/lib/bom/newPartService';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { DrawingStatusBadge } from './StatusBadge';
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  ClipboardList,
  DollarSign,
  FileText,
  History,
  Package,
  Palette,
  PencilRuler,
  Plane,
  Save,
  Settings2,
  Ship,
  ShoppingCart,
  Trash2,
  Truck,
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
  const [activeTab, setActiveTab] = useState('overview');
  const [editData, setEditData] = useState<Partial<NewPart>>({});
  const [completeData, setCompleteData] = useState({
    finalItemCode: '',
    finalUnitPrice: 0,
    landingPct: 0,
  });

  // Reset state when part changes
  useEffect(() => {
    if (part) {
      setEditData({ ...part });
      setCompleteData({
        finalItemCode: part.finalItemCode || '',
        finalUnitPrice: part.quotedPrice || 0,
        landingPct: part.landingPct || 0,
      });
    }
    setIsEditing(false);
    setShowCompleteForm(false);
    setActiveTab('overview');
  }, [part]);

  if (!part) return null;

  const statusInfo = getStatusInfo(part.status);
  const priorityInfo = getPriorityInfo(part.priority);

  const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
    if (!timestamp) return 'Not set';
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
        'current-user'
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

  const updateField = (field: keyof NewPart, value: unknown) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate production total
  const productionTotal = calculateTotalProductionQty(editData as NewPart);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)]">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold font-mono text-[var(--accent-blue)]">
                {part.placeholderCode}
                {part.finalItemCode && (
                  <span className="text-[var(--accent-green)] ml-2">→ {part.finalItemCode}</span>
                )}
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
            {part.isColorTouchpoint && (
              <Badge className="px-2 bg-purple-500/10 text-purple-400">
                <Palette className="h-3 w-3 mr-1" />
                Color
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator className="my-4 mx-6" />

        {/* Quick Status Change */}
        {part.status !== 'complete' && part.status !== 'cancelled' && (
          <div className="mb-4 px-6">
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

        {/* 6-Tab Layout */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-6">
          <TabsList className="grid w-full grid-cols-6 bg-[var(--bg-tertiary)] h-9">
            <TabsTrigger value="overview" className="text-xs px-2">
              <ClipboardList className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="drawing" className="text-xs px-2">
              <PencilRuler className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Drawing</span>
            </TabsTrigger>
            <TabsTrigger value="sourcing" className="text-xs px-2">
              <DollarSign className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Sourcing</span>
            </TabsTrigger>
            <TabsTrigger value="sprint" className="text-xs px-2">
              <Truck className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Sprint</span>
            </TabsTrigger>
            <TabsTrigger value="production" className="text-xs px-2">
              <ShoppingCart className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Prod</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs px-2">
              <History className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Part Code</Label>
                <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                  <span className="text-sm font-mono font-medium">{part.placeholderCode}</span>
                  {part.finalItemCode && (
                    <>
                      <span className="text-[var(--text-tertiary)]">→</span>
                      <span className="text-sm font-mono text-[var(--accent-green)]">{part.finalItemCode}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Category</Label>
                {isEditing ? (
                  <Input
                    value={editData.category || ''}
                    onChange={(e) => updateField('category', e.target.value)}
                    placeholder="e.g., Frame, Fork, Seat"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.category || '—'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">BOM Group</Label>
                {isEditing ? (
                  <Input
                    value={editData.groupCode || ''}
                    onChange={(e) => updateField('groupCode', e.target.value)}
                    placeholder="e.g., GRP-FRAME-A01"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                    <Package className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="text-sm font-medium">{part.groupCode || 'Unassigned'}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Priority</Label>
                {isEditing ? (
                  <Select
                    value={editData.priority || part.priority}
                    onValueChange={(value) => updateField('priority', value)}
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
            </div>

            <Separator />

            {/* Assignments */}
            <div>
              <h4 className="text-sm font-medium mb-3">Assignments</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--text-tertiary)]">Project Coordinator</Label>
                  {isEditing ? (
                    <Input
                      value={editData.projectCoordinator || ''}
                      onChange={(e) => updateField('projectCoordinator', e.target.value)}
                      placeholder="Name"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                      <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <span className="text-sm">{part.projectCoordinator || '—'}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--text-tertiary)]">Buyer</Label>
                  {isEditing ? (
                    <Input
                      value={editData.buyer || ''}
                      onChange={(e) => updateField('buyer', e.target.value)}
                      placeholder="Name"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                      <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <span className="text-sm">{part.buyer || '—'}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--text-tertiary)]">SQE</Label>
                  {isEditing ? (
                    <Input
                      value={editData.sqe || ''}
                      onChange={(e) => updateField('sqe', e.target.value)}
                      placeholder="Name"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                      <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <span className="text-sm">{part.sqe || '—'}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--text-tertiary)]">Design Engineer</Label>
                  {isEditing ? (
                    <Input
                      value={editData.designEngineer || ''}
                      onChange={(e) => updateField('designEngineer', e.target.value)}
                      placeholder="Name"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                      <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <span className="text-sm">{part.designEngineer || '—'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Flags */}
            <div>
              <h4 className="text-sm font-medium mb-3">Flags</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editData.isColorTouchpoint ?? part.isColorTouchpoint ?? false}
                    onCheckedChange={(checked) => updateField('isColorTouchpoint', checked)}
                    disabled={!isEditing}
                  />
                  <span className="text-sm">Color Touchpoint</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editData.orderTogether ?? part.orderTogether ?? false}
                    onCheckedChange={(checked) => updateField('orderTogether', checked)}
                    disabled={!isEditing}
                  />
                  <span className="text-sm">Order Sprint + Production Together</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editData.isNewSupplier ?? part.isNewSupplier ?? false}
                    onCheckedChange={(checked) => updateField('isNewSupplier', checked)}
                    disabled={!isEditing}
                  />
                  <span className="text-sm">New Supplier</span>
                </label>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Drawing & Design */}
          <TabsContent value="drawing" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Drawing Number (incl. variant)</Label>
                {isEditing ? (
                  <Input
                    value={editData.drawingNumber || ''}
                    onChange={(e) => updateField('drawingNumber', e.target.value)}
                    placeholder="e.g., 283928-A"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-mono">
                    {part.drawingNumber || '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">PDM Revision</Label>
                {isEditing ? (
                  <Input
                    value={editData.drawingRevision || ''}
                    onChange={(e) => updateField('drawingRevision', e.target.value)}
                    placeholder="e.g., A1"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.drawingRevision || '—'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">PDF Revision</Label>
                {isEditing ? (
                  <Input
                    value={editData.pdfRevision || ''}
                    onChange={(e) => updateField('pdfRevision', e.target.value)}
                    placeholder="e.g., 01"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.pdfRevision || '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Workflow State</Label>
                {isEditing ? (
                  <Select
                    value={editData.drawingWorkflowState || 'not_started'}
                    onValueChange={(value) => updateField('drawingWorkflowState', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="released">Released</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <DrawingStatusBadge state={part.drawingWorkflowState} />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[var(--text-tertiary)]">Drawing Release Deadline</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.drawingReleaseDeadline 
                    ? new Date((editData.drawingReleaseDeadline as any).toDate?.() || editData.drawingReleaseDeadline).toISOString().split('T')[0]
                    : ''
                  }
                  onChange={(e) => {
                    // Convert to timestamp-like object for now
                    updateField('drawingReleaseDeadline', e.target.value ? { toDate: () => new Date(e.target.value) } : undefined);
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                  <CalendarDays className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="text-sm">{formatDate(part.drawingReleaseDeadline)}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* ERP Status */}
            <div>
              <h4 className="text-sm font-medium mb-3">ERP Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editData.inInfor ?? part.inInfor ?? false}
                    onCheckedChange={(checked) => updateField('inInfor', checked)}
                    disabled={!isEditing}
                  />
                  <span className="text-sm">In Infor (ERP)</span>
                </label>
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--text-tertiary)]">Infor Revision</Label>
                  {isEditing ? (
                    <Input
                      value={editData.inforRevision || ''}
                      onChange={(e) => updateField('inforRevision', e.target.value)}
                      placeholder="e.g., 001"
                    />
                  ) : (
                    <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                      {part.inforRevision || '—'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Sourcing & Pricing */}
          <TabsContent value="sourcing" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Vendor Code</Label>
                {isEditing ? (
                  <Input
                    value={editData.vendorCode || ''}
                    onChange={(e) => updateField('vendorCode', e.target.value)}
                    placeholder="e.g., V100001"
                    className="font-mono"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-mono">
                    {part.vendorCode || '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Vendor Name</Label>
                {isEditing ? (
                  <Input
                    value={editData.vendorName || ''}
                    onChange={(e) => updateField('vendorName', e.target.value)}
                    placeholder="Vendor name"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                    <Building2 className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="text-sm">{part.vendorName || '—'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={editData.isOemPart ?? part.isOemPart ?? false}
                  onCheckedChange={(checked) => updateField('isOemPart', checked)}
                  disabled={!isEditing}
                />
                <span className="text-sm">OEM Part</span>
              </label>
              {(editData.isOemPart || part.isOemPart) && (
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--text-tertiary)]">OEM Part Number</Label>
                  {isEditing ? (
                    <Input
                      value={editData.oemPartNumber || ''}
                      onChange={(e) => updateField('oemPartNumber', e.target.value)}
                      placeholder="Supplier model ref"
                    />
                  ) : (
                    <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-mono">
                      {part.oemPartNumber || '—'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Country of Origin</Label>
                {isEditing ? (
                  <Input
                    value={editData.countryOfOrigin || ''}
                    onChange={(e) => updateField('countryOfOrigin', e.target.value)}
                    placeholder="e.g., China, Taiwan"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.countryOfOrigin || '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Factory Location</Label>
                {isEditing ? (
                  <Input
                    value={editData.factoryLocation || ''}
                    onChange={(e) => updateField('factoryLocation', e.target.value)}
                    placeholder="e.g., Unit 1 Factory"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.factoryLocation || '—'}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Pricing</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Quoted Price</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.quotedPrice || ''}
                    onChange={(e) => updateField('quotedPrice', parseFloat(e.target.value) || undefined)}
                    placeholder="0.00"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-medium">
                    {part.quotedPrice ? `${part.quotedPrice.toFixed(2)}` : '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Currency</Label>
                {isEditing ? (
                  <Select
                    value={editData.currency || 'GBP'}
                    onValueChange={(value) => updateField('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.currency || 'GBP'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Cost Source</Label>
                {isEditing ? (
                  <Select
                    value={editData.costSource || 'placeholder'}
                    onValueChange={(value) => updateField('costSource', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder">Placeholder</SelectItem>
                      <SelectItem value="estimate">Estimate</SelectItem>
                      <SelectItem value="quote">Quote</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm capitalize">
                    {part.costSource || 'Placeholder'}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Lead Times</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Production Lead Time</Label>
                {isEditing ? (
                  <Input
                    value={editData.productionLeadTimeWeeks || ''}
                    onChange={(e) => updateField('productionLeadTimeWeeks', e.target.value)}
                    placeholder="e.g., 39 weeks sea, 28 air"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.productionLeadTimeWeeks || '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Base Lead Time (days)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.baseLeadTimeDays || ''}
                    onChange={(e) => updateField('baseLeadTimeDays', parseInt(e.target.value) || undefined)}
                    placeholder="Days"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.baseLeadTimeDays ? `${part.baseLeadTimeDays} days` : '—'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Freight Type</Label>
                {isEditing ? (
                  <Select
                    value={editData.freightType || 'sea'}
                    onValueChange={(value) => updateField('freightType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sea">
                        <span className="flex items-center gap-2">
                          <Ship className="h-3 w-3" /> Sea
                        </span>
                      </SelectItem>
                      <SelectItem value="air">
                        <span className="flex items-center gap-2">
                          <Plane className="h-3 w-3" /> Air
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.freightType === 'air' ? <Plane className="h-4 w-4" /> : <Ship className="h-4 w-4" />}
                    {part.freightType === 'air' ? 'Air' : 'Sea'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Sea Freight (days)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.seaFreightDays || 35}
                    onChange={(e) => updateField('seaFreightDays', parseInt(e.target.value) || 35)}
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.seaFreightDays || 35} days
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Air Freight (days)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.airFreightDays || 5}
                    onChange={(e) => updateField('airFreightDays', parseInt(e.target.value) || 5)}
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.airFreightDays || 5} days
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Sprint Order */}
          <TabsContent value="sprint" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium">Sprint Order Details</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Sprint Quantity</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.sprintQuantity || ''}
                    onChange={(e) => updateField('sprintQuantity', parseInt(e.target.value) || undefined)}
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-medium">
                    {part.sprintQuantity || '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Target Date (Stock in Plant)</Label>
                {isEditing ? (
                  <Input 
                    type="date"
                    value={editData.sprintTargetDate 
                      ? new Date((editData.sprintTargetDate as any).toDate?.() || editData.sprintTargetDate).toISOString().split('T')[0]
                      : ''
                    }
                    onChange={(e) => {
                      updateField('sprintTargetDate', e.target.value ? { toDate: () => new Date(e.target.value) } : undefined);
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                    <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="text-sm">{formatDate(part.sprintTargetDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Order Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">PO Number</Label>
                {isEditing ? (
                  <Input
                    value={editData.sprintPoNumber || ''}
                    onChange={(e) => updateField('sprintPoNumber', e.target.value)}
                    placeholder="e.g., PX00057395"
                    className="font-mono"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-mono">
                    {part.sprintPoNumber || '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">PO Date</Label>
                {isEditing ? (
                  <Input 
                    type="date"
                    value={editData.sprintPoDate 
                      ? new Date((editData.sprintPoDate as any).toDate?.() || editData.sprintPoDate).toISOString().split('T')[0]
                      : ''
                    }
                    onChange={(e) => {
                      updateField('sprintPoDate', e.target.value ? { toDate: () => new Date(e.target.value) } : undefined);
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                    <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="text-sm">{formatDate(part.sprintPoDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Indicator */}
            <div className={cn(
              'p-3 rounded-lg border',
              part.sprintPoLate 
                ? 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30' 
                : part.sprintReceived
                  ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30'
                  : part.sprintPoNumber
                    ? 'bg-[var(--accent-green)]/5 border-[var(--accent-green)]/20'
                    : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'
            )}>
              <div className="flex items-center gap-2">
                {part.sprintPoLate ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-[var(--accent-red)]" />
                    <span className="text-sm font-medium text-[var(--accent-red)]">PO is Late</span>
                  </>
                ) : part.sprintReceived ? (
                  <>
                    <Check className="h-4 w-4 text-[var(--accent-green)]" />
                    <span className="text-sm font-medium text-[var(--accent-green)]">Received</span>
                  </>
                ) : part.sprintPoNumber ? (
                  <>
                    <Check className="h-4 w-4 text-[var(--accent-green)]" />
                    <span className="text-sm font-medium text-[var(--accent-green)]">On Track</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="text-sm text-[var(--text-secondary)]">No PO placed</span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Receipt</h4>
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={editData.sprintReceived ?? part.sprintReceived ?? false}
                  onCheckedChange={(checked) => updateField('sprintReceived', checked)}
                  disabled={!isEditing}
                />
                <span className="text-sm">Received?</span>
              </label>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Qty Received</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.sprintReceivedQty || ''}
                    onChange={(e) => updateField('sprintReceivedQty', parseInt(e.target.value) || undefined)}
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.sprintReceivedQty ?? '—'} / {part.sprintQuantity ?? '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Qty Outstanding</Label>
                <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                  {(part.sprintQuantity || 0) - (part.sprintReceivedQty || 0)}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 5: Production Order */}
          <TabsContent value="production" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium">Production Order Details</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Mass Production Quantity</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.massProductionQuantity || ''}
                    onChange={(e) => updateField('massProductionQuantity', parseInt(e.target.value) || undefined)}
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-medium">
                    {part.massProductionQuantity || '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Target Date (MRD)</Label>
                {isEditing ? (
                  <Input 
                    type="date"
                    value={editData.productionTargetDate 
                      ? new Date((editData.productionTargetDate as any).toDate?.() || editData.productionTargetDate).toISOString().split('T')[0]
                      : ''
                    }
                    onChange={(e) => {
                      updateField('productionTargetDate', e.target.value ? { toDate: () => new Date(e.target.value) } : undefined);
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                    <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="text-sm">{formatDate(part.productionTargetDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">P&A Forecast</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.paForecast || ''}
                    onChange={(e) => updateField('paForecast', parseInt(e.target.value) || undefined)}
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.paForecast || '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Scrap Rate (%)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.1"
                    value={editData.scrapRate !== undefined ? (editData.scrapRate * 100).toFixed(1) : ''}
                    onChange={(e) => updateField('scrapRate', (parseFloat(e.target.value) || 0) / 100)}
                    placeholder="e.g., 4"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.scrapRate !== undefined ? `${(part.scrapRate * 100).toFixed(1)}%` : '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Total Production Qty</Label>
                <div className="p-2 rounded-md bg-[var(--accent-blue)]/10 text-sm font-medium text-[var(--accent-blue)]">
                  {productionTotal}
                </div>
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Order Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">PO Number</Label>
                {isEditing ? (
                  <Input
                    value={editData.productionPoNumber || ''}
                    onChange={(e) => updateField('productionPoNumber', e.target.value)}
                    placeholder="e.g., PX00057396"
                    className="font-mono"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm font-mono">
                    {part.productionPoNumber || '—'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">PO Date</Label>
                {isEditing ? (
                  <Input 
                    type="date"
                    value={editData.productionPoDate 
                      ? new Date((editData.productionPoDate as any).toDate?.() || editData.productionPoDate).toISOString().split('T')[0]
                      : ''
                    }
                    onChange={(e) => {
                      updateField('productionPoDate', e.target.value ? { toDate: () => new Date(e.target.value) } : undefined);
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)]">
                    <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="text-sm">{formatDate(part.productionPoDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Indicator */}
            <div className={cn(
              'p-3 rounded-lg border',
              part.productionPoLate 
                ? 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30' 
                : part.productionReceived
                  ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30'
                  : part.productionPoNumber
                    ? 'bg-[var(--accent-green)]/5 border-[var(--accent-green)]/20'
                    : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'
            )}>
              <div className="flex items-center gap-2">
                {part.productionPoLate ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-[var(--accent-red)]" />
                    <span className="text-sm font-medium text-[var(--accent-red)]">PO is Late</span>
                  </>
                ) : part.productionReceived ? (
                  <>
                    <Check className="h-4 w-4 text-[var(--accent-green)]" />
                    <span className="text-sm font-medium text-[var(--accent-green)]">Received</span>
                  </>
                ) : part.productionPoNumber ? (
                  <>
                    <Check className="h-4 w-4 text-[var(--accent-green)]" />
                    <span className="text-sm font-medium text-[var(--accent-green)]">On Track</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="text-sm text-[var(--text-secondary)]">No PO placed</span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Receipt</h4>
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={editData.productionReceived ?? part.productionReceived ?? false}
                  onCheckedChange={(checked) => updateField('productionReceived', checked)}
                  disabled={!isEditing}
                />
                <span className="text-sm">Received?</span>
              </label>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Qty Received</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.productionReceivedQty || ''}
                    onChange={(e) => updateField('productionReceivedQty', parseInt(e.target.value) || undefined)}
                  />
                ) : (
                  <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                    {part.productionReceivedQty ?? '—'} / {productionTotal}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[var(--text-tertiary)]">Qty Outstanding</Label>
                <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                  {productionTotal - (part.productionReceivedQty || 0)}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 6: Notes & History */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs text-[var(--text-tertiary)]">Comments</Label>
              {isEditing ? (
                <Textarea
                  value={editData.comments || ''}
                  onChange={(e) => updateField('comments', e.target.value)}
                  placeholder="Add dated comments..."
                  rows={6}
                />
              ) : (
                <div className="p-3 rounded-md bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] min-h-[120px] whitespace-pre-wrap">
                  {part.comments || 'No comments'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[var(--text-tertiary)]">Tooling / Financial Commitments</Label>
              {isEditing ? (
                <Textarea
                  value={editData.toolingCommitment || ''}
                  onChange={(e) => updateField('toolingCommitment', e.target.value)}
                  placeholder="Notes about tooling costs, commitments..."
                  rows={3}
                />
              ) : (
                <div className="p-3 rounded-md bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] min-h-[60px]">
                  {part.toolingCommitment || 'No tooling notes'}
                </div>
              )}
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Yearly Forecasts</h4>
            <div className="grid grid-cols-4 gap-4">
              {['year1', 'year2', 'year3', 'year4'].map((year, idx) => (
                <div key={year} className="space-y-2">
                  <Label className="text-xs text-[var(--text-tertiary)]">Year {idx + 1}</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={(editData.yearlyForecasts as any)?.[year] || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || undefined;
                        updateField('yearlyForecasts', {
                          ...(editData.yearlyForecasts || {}),
                          [year]: value,
                        });
                      }}
                    />
                  ) : (
                    <div className="p-2 rounded-md bg-[var(--bg-tertiary)] text-sm">
                      {(part.yearlyForecasts as any)?.[year] || '—'}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Metadata</h4>
            <div className="grid grid-cols-2 gap-4 text-xs text-[var(--text-tertiary)]">
              <div>
                <span className="block text-[var(--text-tertiary)]">Created</span>
                <span className="text-[var(--text-secondary)]">
                  {formatDate(part.createdAt)} by {part.createdBy || part.requestedBy || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="block text-[var(--text-tertiary)]">Last Updated</span>
                <span className="text-[var(--text-secondary)]">
                  {formatDate(part.updatedAt)}
                </span>
              </div>
              {part.importedFromPpl && (
                <div>
                  <span className="block text-[var(--text-tertiary)]">Imported from PPL</span>
                  <span className="text-[var(--text-secondary)]">
                    {formatDate(part.lastPplSync)}
                  </span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4 mx-6" />

        {/* Complete Part Form */}
        {showCompleteForm && part.status === 'procurement' && (
          <div className="space-y-4 p-4 rounded-lg border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 mb-4 mx-6">
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
                <Label className="text-xs text-[var(--text-tertiary)]">Unit Price *</Label>
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
          <div className="p-4 rounded-lg border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 mb-4 mx-6">
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
                  {part.currency || '£'}{part.finalUnitPrice?.toFixed(2) || part.quotedPrice?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-2">
              Completed on {formatDate(part.completedAt)} by {part.completedBy || 'Unknown'}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 px-6 pb-6">
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
                onClick={() => {
                  setIsEditing(false);
                  setEditData({ ...part });
                }}
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
