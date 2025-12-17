'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BomItem, BomGroup, Item } from '@/types';
import { 
  Search, 
  Plus, 
  Package, 
  Loader2, 
  Trash2, 
  Sparkles,
  AlertTriangle,
  Layers,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  BatchItem, 
  batchAddItems, 
  generatePlaceholderCode, 
  generateGroupCode,
  checkDuplicates,
  NewGroupDetails
} from '@/lib/bom/batchAddService';
import { cn } from '@/lib/utils';

interface BatchAddItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  groups: BomGroup[];
  existingItems: BomItem[];
  onItemsAdded: (result: { itemsCreated: number; newPartsCount: number; groupCreated?: BomGroup }) => void;
}

const CATEGORY_OPTIONS = [
  'Frame',
  'Seating',
  'Handlebars',
  'Drivetrain',
  'Wheels',
  'Brakes',
  'Suspension',
  'Electrical',
  'Accessories',
  'Other',
];

export function BatchAddItemsDialog({
  open,
  onOpenChange,
  projectId,
  groups,
  existingItems,
  onItemsAdded,
}: BatchAddItemsDialogProps) {
  // Input state
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Form state
  const [itemCode, setItemCode] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [level, setLevel] = useState('1');
  const [selectedGroupCode, setSelectedGroupCode] = useState('');
  const [isNewPartCategory, setIsNewPartCategory] = useState(false);
  const [isNewPartTrack, setIsNewPartTrack] = useState(false);

  // New group creation
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState<NewGroupDetails>({
    code: '',
    description: '',
    category: 'Other',
  });
  
  // Track new groups created in this session
  const [newGroupsInSession, setNewGroupsInSession] = useState<Map<string, BomGroup>>(new Map());

  // Items queue
  const [items, setItems] = useState<BatchItem[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Generate next placeholder code
  const nextPlaceholderCode = useMemo(() => {
    const existingCodes = existingItems.map(i => i.itemCode);
    const batchCodes = items.map(i => i.code);
    return generatePlaceholderCode(existingCodes, batchCodes);
  }, [existingItems, items]);

  // Generate next group code
  const nextGroupCode = useMemo(() => {
    return generateGroupCode(groups);
  }, [groups]);

  // Count stats
  const newPartsCount = useMemo(() => {
    return items.filter(i => i.isNewPartCategory).length;
  }, [items]);

  const trackedCount = useMemo(() => {
    return items.filter(i => i.isNewPart).length;
  }, [items]);

  // Combine existing groups with new groups created in session
  const allGroups = useMemo(() => {
    const combined = [...groups];
    newGroupsInSession.forEach(group => {
      if (!combined.some(g => g.groupCode === group.groupCode)) {
        combined.push(group);
      }
    });
    return combined;
  }, [groups, newGroupsInSession]);

  // Group items by groupCode for display
  const itemsByGroup = useMemo(() => {
    const grouped = new Map<string, BatchItem[]>();
    const newGroupCodes = new Set<string>();
    
    items.forEach(item => {
      if (!grouped.has(item.groupCode)) {
        grouped.set(item.groupCode, []);
      }
      grouped.get(item.groupCode)!.push(item);
      
      // Check if this is a new group (not in existing groups or session groups)
      if (!groups.some(g => g.groupCode === item.groupCode) &&
          !newGroupsInSession.has(item.groupCode)) {
        newGroupCodes.add(item.groupCode);
      }
    });

    return { grouped, newGroupCodes };
  }, [items, groups, newGroupsInSession]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setInputValue('');
      setSearchResults([]);
      setSelectedItem(null);
      setItemCode('');
      setItemDescription('');
      setQuantity('1');
      setLevel('1');
      setSelectedGroupCode(groups[0]?.groupCode || '');
      setIsNewPartCategory(false);
      setIsNewPartTrack(false);
      setItems([]);
      setShowNewGroup(false);
      setNewGroup({
        code: nextGroupCode,
        description: '',
        category: 'Other',
      });
      setNewGroupsInSession(new Map());
      setError('');
    }
  }, [open, groups, nextGroupCode]);

  // Update new group code when it changes
  useEffect(() => {
    if (showNewGroup && !newGroup.code) {
      setNewGroup(prev => ({ ...prev, code: nextGroupCode }));
    }
  }, [showNewGroup, nextGroupCode, newGroup.code]);

  // Smart input detection - search if starts with B and digits, otherwise create placeholder
  const detectInputMode = useCallback((value: string): 'search' | 'placeholder' => {
    const trimmed = value.trim();
    // If it looks like a B-code (starts with B followed by digits), search
    if (/^B\d/i.test(trimmed)) {
      return 'search';
    }
    // Otherwise, treat as description for new placeholder
    return 'placeholder';
  }, []);

  // Search items in SLItems
  const searchItems = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const itemsRef = collection(db, 'slItems');
      // Use a simpler query that doesn't require composite indexes
      // Get all items and filter client-side for small datasets
      // For larger datasets, this would need an index, but we limit to 10 results
      const codeQuery = query(
        itemsRef,
        where('code', '>=', searchTerm.toUpperCase()),
        where('code', '<=', searchTerm.toUpperCase() + '\uf8ff'),
        limit(10)
      );
      
      const codeSnapshot = await getDocs(codeQuery);
      const results = codeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];

      setSearchResults(results);
    } catch (err: any) {
      console.error('Search error:', err);
      // If index error, show empty results instead of crashing
      if (err.code === 'failed-precondition' || err.message?.includes('index')) {
        console.warn('Firestore index required for search. Please create the index or search will be limited.');
        setSearchResults([]);
      } else {
        setSearchResults([]);
      }
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Handle input change with smart detection
  useEffect(() => {
    const mode = detectInputMode(inputValue);
    
    if (mode === 'search' && inputValue.length >= 2) {
      searchItems(inputValue);
    } else {
      setSearchResults([]);
      setSelectedItem(null);
      
      // If placeholder mode and has text, auto-generate code and description
      if (mode === 'placeholder' && inputValue.trim()) {
        setItemCode(nextPlaceholderCode);
        setItemDescription(inputValue.trim());
        setIsNewPartCategory(true); // Default for placeholders
        setIsNewPartTrack(true); // Default for placeholders
      }
    }
  }, [inputValue, detectInputMode, searchItems, nextPlaceholderCode]);

  // Handle selecting a search result
  const handleSelectSearchResult = (item: Item) => {
    setSelectedItem(item);
    setItemCode(item.code);
    setItemDescription(item.description);
    setIsNewPartCategory(false); // Existing items default to not new part
    setIsNewPartTrack(false); // Existing items default to not tracked
    setSearchResults([]);
    setInputValue('');
  };

  // Handle add item
  const handleAddItem = () => {
    const code = itemCode.trim();
    const description = itemDescription.trim();
    const qty = parseFloat(quantity) || 1;
    const lvl = parseInt(level) || 1;
    const groupCode = showNewGroup ? newGroup.code.toUpperCase() : selectedGroupCode;

    if (!code) {
      setError('Item code is required');
      return;
    }

    if (!description) {
      setError('Description is required');
      return;
    }

    if (!groupCode) {
      setError('Please select a group');
      return;
    }

    // If this is a new group, add it to the session groups
    if (showNewGroup && newGroup.code && newGroup.description) {
      const upperCode = newGroup.code.toUpperCase();
      if (!newGroupsInSession.has(upperCode) && !groups.some(g => g.groupCode === upperCode)) {
        const newBomGroup: BomGroup = {
          id: `temp-${Date.now()}`,
          groupCode: upperCode,
          description: newGroup.description,
          groupType: 'assembly',
          category: newGroup.category,
          isStandard: false,
          itemCount: 0,
          maxLevel: 0,
        };
        setNewGroupsInSession(prev => new Map(prev).set(upperCode, newBomGroup));
        // Auto-select the new group
        setSelectedGroupCode(upperCode);
        // Switch back to existing group mode so dropdown shows the new group
        setShowNewGroup(false);
      }
    }

    // Check if code already in batch
    if (items.some(i => i.code.toUpperCase() === code.toUpperCase())) {
      setError(`${code} is already in the batch`);
      return;
    }

    // Check if code already in BOM
    if (existingItems.some(i => i.itemCode.toUpperCase() === code.toUpperCase())) {
      setError(`${code} already exists in the BOM`);
      return;
    }

    const newItem: BatchItem = {
      tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: code.toUpperCase(),
      description,
      quantity: qty,
      level: lvl,
      groupCode,
      isPlaceholder: code.startsWith('Bxxx'),
      isNewPartCategory,
      isNewPart: isNewPartTrack,
    };

    setItems(prev => [...prev, newItem]);
    
    // Reset form (but keep the selected group)
    setInputValue('');
    setItemCode('');
    setItemDescription('');
    setQuantity('1');
    setIsNewPartCategory(false);
    setIsNewPartTrack(false);
    setSelectedItem(null);
    setError('');
  };

  // Remove item from batch
  const handleRemoveItem = (tempId: string) => {
    setItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  // Toggle flags for an item
  const handleToggleNewPartCategory = (tempId: string) => {
    setItems(prev => prev.map(i => 
      i.tempId === tempId ? { ...i, isNewPartCategory: !i.isNewPartCategory } : i
    ));
  };

  const handleToggleNewPartTrack = (tempId: string) => {
    setItems(prev => prev.map(i => 
      i.tempId === tempId ? { ...i, isNewPart: !i.isNewPart } : i
    ));
  };

  // Handle save
  const handleSave = async () => {
    if (items.length === 0) {
      setError('Add at least one item');
      return;
    }

    // Collect new groups to create from session groups
    const newGroups = new Map<string, NewGroupDetails>();
    newGroupsInSession.forEach((group, groupCode) => {
      newGroups.set(groupCode, {
        code: group.groupCode,
        description: group.description,
        category: group.category || 'Other',
      });
    });
    
    // Also check for any groups in items that aren't in existing or session groups
    for (const item of items) {
      if (!groups.some(g => g.groupCode === item.groupCode) &&
          !newGroupsInSession.has(item.groupCode) &&
          !newGroups.has(item.groupCode)) {
        // This is a new group that wasn't properly tracked, use defaults
        if (item.groupCode.startsWith('GRP-CUSTOM-')) {
          newGroups.set(item.groupCode, {
            code: item.groupCode,
            description: item.groupCode,
            category: 'Other',
          });
        }
      }
    }

    setSaving(true);
    setError('');

    try {
      const result = await batchAddItems(
        projectId,
        items,
        existingItems,
        newGroups
      );

      if (result.success) {
        onItemsAdded({
          itemsCreated: result.itemsCreated,
          newPartsCount: result.newPartsCount,
          groupCreated: result.groupCreated,
        });
        onOpenChange(false);
      } else {
        const errorMessages = result.errors.map(e => `${e.code}: ${e.error}`).join(', ');
        setError(errorMessages || 'Failed to add items');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add items');
    } finally {
      setSaving(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedItem) {
        handleAddItem();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[var(--accent-blue)]" />
            Add Items
          </DialogTitle>
          <DialogDescription>
            Add multiple items to your working BOM
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Input Section */}
          <div className="space-y-3 p-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)]/50">
            <div className="space-y-2">
              <Label className="text-sm">Search B-code or enter description</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                <Input
                  placeholder="B1034... or Custom bracket..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--text-tertiary)]" />
                )}
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-48 overflow-auto border rounded-md bg-[var(--bg-elevated)] shadow-lg divide-y divide-[var(--border-subtle)]">
                    {searchResults.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full p-2 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-[var(--text-tertiary)]" />
                          <span className="font-mono text-sm">{item.code}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                          {item.description}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Item Details */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <Label className="text-xs">Code</Label>
                <Input
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  placeholder="Bxxx001"
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div className="col-span-5">
                <Label className="text-xs">Description</Label>
                <Input
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Item description"
                  className="mt-1 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map(l => (
                      <SelectItem key={l} value={String(l)}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Group Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Add to</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewGroup(!showNewGroup)}
                  className="h-6 text-xs ml-auto"
                >
                  {showNewGroup ? (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Hide New Group
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      Create New Group
                    </>
                  )}
                </Button>
              </div>

              {showNewGroup ? (
                <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--bg-tertiary)] rounded-md">
                  <div>
                    <Label className="text-xs">Group Code</Label>
                    <Input
                      value={newGroup.code}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="GRP-CUSTOM-A01"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={newGroup.description}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Custom Assembly"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select 
                      value={newGroup.category} 
                      onValueChange={(v) => setNewGroup(prev => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <Select 
                  value={selectedGroupCode} 
                  onValueChange={setSelectedGroupCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {allGroups.map(group => {
                      const isNewInSession = newGroupsInSession.has(group.groupCode);
                      return (
                        <SelectItem key={group.id || group.groupCode} value={group.groupCode}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{group.groupCode}</span>
                            {isNewInSession && (
                              <Badge variant="outline" className="text-xs">New</Badge>
                            )}
                            <span className="text-xs text-[var(--text-secondary)]">
                              {group.description}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={isNewPartCategory}
                  onCheckedChange={(checked) => setIsNewPartCategory(checked === true)}
                  className="h-4 w-4"
                />
                <span className="text-sm">New Part</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={isNewPartTrack}
                  onCheckedChange={(checked) => setIsNewPartTrack(checked === true)}
                  className="h-4 w-4"
                />
                <span className="text-sm">Track</span>
              </label>
              <Button
                onClick={handleAddItem}
                size="sm"
                className="ml-auto bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90"
                disabled={!itemCode || !itemDescription}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          <Separator />

          {/* Items List */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Items to Add</span>
                <Badge variant="secondary">{items.length} items</Badge>
              </div>
              {(newPartsCount > 0 || trackedCount > 0) && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  {newPartsCount > 0 && (
                    <span>{newPartsCount} new</span>
                  )}
                  {trackedCount > 0 && (
                    <span>{trackedCount} tracked</span>
                  )}
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 border border-[var(--border-subtle)] rounded-lg">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="h-10 w-10 text-[var(--text-tertiary)] mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No items added yet. Use the form above to add items.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {Array.from(itemsByGroup.grouped.entries()).map(([groupCode, groupItems]) => {
                    const isNewGroup = itemsByGroup.newGroupCodes.has(groupCode);
                    const group = groups.find(g => g.groupCode === groupCode);
                    
                    return (
                      <div key={groupCode}>
                        {/* Group Header */}
                        <div className="px-3 py-2 bg-[var(--bg-secondary)]/50 border-b border-[var(--border-subtle)]">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-[var(--accent-blue)]" />
                            <span className="font-mono text-sm font-medium">{groupCode}</span>
                            {isNewGroup && (
                              <Badge variant="outline" className="text-xs">New</Badge>
                            )}
                            {(group || newGroupsInSession.get(groupCode)) && (
                              <span className="text-xs text-[var(--text-secondary)]">
                                {(group || newGroupsInSession.get(groupCode))?.description}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Items in Group */}
                        {groupItems.map((item, index) => {
                          const isDuplicate = checkDuplicates([item], existingItems).some(d => 
                            d.code.toUpperCase() === item.code.toUpperCase() && d.existsInBom
                          );
                          
                          return (
                            <div 
                              key={item.tempId}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2',
                                isDuplicate && 'bg-[var(--accent-red)]/5'
                              )}
                            >
                              <span className="text-xs text-[var(--text-tertiary)] w-6">
                                {index + 1}
                              </span>
                              <span className={cn(
                                'font-mono text-sm w-24',
                                item.isPlaceholder && 'text-[var(--accent-orange)]'
                              )}>
                                {item.code}
                              </span>
                              <span className="flex-1 text-sm text-[var(--text-secondary)] truncate">
                                {item.description}
                              </span>
                              <span className="text-sm text-[var(--text-tertiary)] w-16">
                                Qty: {item.quantity}
                              </span>
                              <div className="flex items-center gap-2">
                                {item.isNewPartCategory && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-1.5 py-0 border-[var(--accent-blue)] text-[var(--accent-blue)]"
                                  >
                                    New
                                  </Badge>
                                )}
                                {item.isNewPart && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-1.5 py-0 border-[var(--accent-purple)] text-[var(--accent-purple)]"
                                  >
                                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                    Track
                                  </Badge>
                                )}
                              </div>
                              {isDuplicate && (
                                <AlertTriangle className="h-4 w-4 text-[var(--accent-red)]" />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.tempId)}
                                className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--accent-red)]"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-[var(--accent-red)]" />
              <span className="text-sm text-[var(--accent-red)] flex-1">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError('')}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || items.length === 0}
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Save {items.length} Item{items.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
