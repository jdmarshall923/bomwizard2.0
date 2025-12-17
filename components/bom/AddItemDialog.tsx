'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BomItem, BomGroup, Item, BomItemType, ItemSource } from '@/types';
import { Search, Plus, Package, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  groups: BomGroup[];
  onAddItem: (item: Omit<BomItem, 'id'>) => Promise<void>;
  existingItems: BomItem[];
}

type AddMode = 'search' | 'placeholder';

export function AddItemDialog({
  open,
  onOpenChange,
  projectId,
  groups,
  onAddItem,
  existingItems,
}: AddItemDialogProps) {
  const [mode, setMode] = useState<AddMode>('search');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Form state
  const [itemCode, setItemCode] = useState('');
  const [description, setDescription] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [level, setLevel] = useState('1');
  const [notes, setNotes] = useState('');

  // Generate next placeholder code
  const generatePlaceholderCode = useCallback(() => {
    const existingBnewCodes = existingItems
      .map(item => item.itemCode)
      .filter(code => code.startsWith('BNEW-'))
      .map(code => parseInt(code.replace('BNEW-', ''), 10))
      .filter(num => !isNaN(num));

    const maxNum = existingBnewCodes.length > 0 
      ? Math.max(...existingBnewCodes) 
      : 0;
    
    return `BNEW-${String(maxNum + 1).padStart(3, '0')}`;
  }, [existingItems]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setMode('search');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedItem(null);
      setItemCode('');
      setDescription('');
      setGroupCode(groups[0]?.groupCode || '');
      setQuantity('1');
      setLevel('1');
      setNotes('');
      setError('');
    }
  }, [open, groups]);

  // Generate placeholder code when switching to placeholder mode
  useEffect(() => {
    if (mode === 'placeholder') {
      setItemCode(generatePlaceholderCode());
      setSelectedItem(null);
    } else {
      setItemCode('');
    }
  }, [mode, generatePlaceholderCode]);

  // Search items in SLItems (Infor master data)
  const searchItems = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Search in slItems collection (Infor master data)
      const itemsRef = collection(db, 'slItems');
      
      // Search by code (prefix match)
      const codeQuery = query(
        itemsRef,
        where('code', '>=', searchTerm.toUpperCase()),
        where('code', '<=', searchTerm.toUpperCase() + '\uf8ff'),
        limit(10)
      );
      
      const codeSnapshot = await getDocs(codeQuery);
      const codeResults = codeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];

      setSearchResults(codeResults);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchItems(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (item: Item) => {
    setSelectedItem(item);
    setItemCode(item.code);
    setDescription(item.description);
  };

  const handleSubmit = async () => {
    // Validation
    if (!itemCode.trim()) {
      setError('Item code is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    if (!groupCode) {
      setError('Please select a group');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    // Check if item already exists in BOM
    const existingInBom = existingItems.find(
      item => item.itemCode.toUpperCase() === itemCode.toUpperCase()
    );
    if (existingInBom) {
      setError(`Item ${itemCode} already exists in this BOM`);
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Note: We no longer create items in a global collection.
      // BOM items just store the itemCode - they can be compared against
      // SLItems (Infor master data) to identify items not in the system.

      // Calculate sequence (add to end)
      const groupItems = existingItems.filter(item => item.groupCode === groupCode);
      const maxSequence = groupItems.length > 0
        ? Math.max(...groupItems.map(item => item.sequence))
        : 0;

      // Determine item type
      const itemType: BomItemType = itemCode.startsWith('G') ? 'manufactured' : 'material';
      const source: ItemSource = itemCode.startsWith('G') ? 'manufactured' : 'purchased';

      // Create BOM item
      const newItem: Omit<BomItem, 'id'> = {
        // Hierarchy
        level: parseInt(level),
        groupCode,
        sequence: maxSequence + 1,
        
        // Item identification
        itemCode: itemCode.toUpperCase(),
        itemDescription: description,
        itemType,
        source,
        isPlaceholder: mode === 'placeholder',
        
        // Quantities
        quantity: parseFloat(quantity),
        unitOfMeasure: 'EA',
        
        // Legacy fields
        assemblyCode: groupCode,
        itemId: '', // No longer linked to a separate items collection
        
        // Costs (placeholder)
        materialCost: 0,
        landingCost: 0,
        labourCost: 0,
        extendedCost: 0,
        costSource: 'placeholder',
        
        // Tracking
        isFromTemplate: false,
        isAddedItem: true,
        isCustomGroup: false,
        hasCostChange: false,
        hasQuantityChange: false,
        
        // Notes
        notes: notes || undefined,
        
        // Metadata
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await onAddItem(newItem);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>
            Search for an existing item or create a new placeholder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Selection */}
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as AddMode)}
            className="flex gap-4"
          >
            <label className={`
              flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
              ${mode === 'search' 
                ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5' 
                : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
            `}>
              <RadioGroupItem value="search" />
              <div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span className="font-medium text-sm">Search Existing</span>
                </div>
              </div>
            </label>
            
            <label className={`
              flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
              ${mode === 'placeholder' 
                ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/5' 
                : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
            `}>
              <RadioGroupItem value="placeholder" />
              <div>
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="font-medium text-sm">New Placeholder</span>
                </div>
              </div>
            </label>
          </RadioGroup>

          {/* Search Mode */}
          {mode === 'search' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                <Input
                  placeholder="Search by item code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Search Results */}
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
                </div>
              )}
              
              {!loading && searchResults.length > 0 && (
                <div className="max-h-48 overflow-auto border rounded-md divide-y divide-[var(--border-subtle)]">
                  {searchResults.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectSearchResult(item)}
                      className={`
                        w-full p-3 text-left hover:bg-[var(--bg-secondary)] transition-colors
                        ${selectedItem?.id === item.id ? 'bg-[var(--accent-blue)]/10' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-[var(--text-tertiary)]" />
                        <span className="font-mono text-sm font-medium">{item.code}</span>
                        {item.isPlaceholder && (
                          <Badge variant="outline" className="text-xs">Placeholder</Badge>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-1 truncate">
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {!loading && searchQuery && searchResults.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  No items found. Try a different search or create a placeholder.
                </p>
              )}
            </div>
          )}

          {/* Item Details Form */}
          <div className="space-y-4 pt-2 border-t border-[var(--border-subtle)]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemCode">Item Code</Label>
                <Input
                  id="itemCode"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  disabled={mode === 'search' && !!selectedItem}
                  placeholder={mode === 'placeholder' ? 'Auto-generated' : 'Select from search'}
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={mode === 'search' && !!selectedItem}
                placeholder="Item description"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="group">Add to Group</Label>
                <Select value={groupCode} onValueChange={setGroupCode}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.groupCode}>
                        <span className="font-mono text-sm">{group.groupCode}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="level">Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(l => (
                      <SelectItem key={l} value={String(l)}>
                        Level {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                className="mt-1.5"
                rows={2}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-[var(--accent-red)]">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={saving || (!selectedItem && mode === 'search' && !itemCode)}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
