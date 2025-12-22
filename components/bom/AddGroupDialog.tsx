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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BomGroup } from '@/types';
import { Loader2, Plus, Layers } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Timestamp } from 'firebase/firestore';

interface AddGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingGroups: BomGroup[];
  onGroupAdded: (group: BomGroup) => void;
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

export function AddGroupDialog({
  open,
  onOpenChange,
  projectId,
  existingGroups,
  onGroupAdded,
}: AddGroupDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [groupCode, setGroupCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');

  // Generate next group code suggestion
  const generateGroupCode = useCallback(() => {
    const customGroups = existingGroups
      .filter(g => g.groupCode.startsWith('GRP-CUSTOM-'))
      .map(g => parseInt(g.groupCode.replace('GRP-CUSTOM-A', ''), 10))
      .filter(n => !isNaN(n));

    const maxNum = customGroups.length > 0 ? Math.max(...customGroups) : 0;
    return `GRP-CUSTOM-A${String(maxNum + 1).padStart(2, '0')}`;
  }, [existingGroups]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setGroupCode(generateGroupCode());
      setDescription('');
      setCategory('Other');
      setError('');
    }
  }, [open, generateGroupCode]);

  const handleSubmit = async () => {
    // Validation
    if (!groupCode.trim()) {
      setError('Group code is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    // Check for duplicate group code
    const existingGroup = existingGroups.find(
      g => g.groupCode.toUpperCase() === groupCode.toUpperCase()
    );
    if (existingGroup) {
      setError(`Group ${groupCode} already exists`);
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Create new group in templateGroups collection
      const groupsRef = collection(db, `projects/${projectId}/templateGroups`);
      
      const newGroup: Omit<BomGroup, 'id'> = {
        groupCode: groupCode.toUpperCase(),
        description,
        groupType: 'assembly',
        category,
        isStandard: false,
        itemCount: 0,
        maxLevel: 0,
        importedAt: Timestamp.now(),
      };

      const docRef = await addDoc(groupsRef, {
        ...newGroup,
        createdAt: serverTimestamp(),
      });

      // Also create a group selection entry (selected by default)
      const selectionsRef = collection(db, `projects/${projectId}/groupSelections`);
      await addDoc(selectionsRef, {
        projectId,
        groupCode: groupCode.toUpperCase(),
        isSelected: true,
        selectedAt: serverTimestamp(),
      });

      // Notify parent
      onGroupAdded({
        id: docRef.id,
        ...newGroup,
      });

      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[var(--accent-blue)]" />
            Add Custom Group
          </DialogTitle>
          <DialogDescription>
            Create a new group to organize items that aren't in the template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="groupCode">Group Code</Label>
            <Input
              id="groupCode"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
              placeholder="e.g., GRP-CUSTOM-A01"
              className="mt-1.5 font-mono"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Use format: GRP-CATEGORY-VERSION
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Custom Assembly Group"
              className="mt-1.5"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            disabled={saving}
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

