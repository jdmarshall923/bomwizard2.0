'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProject } from '@/lib/context/ProjectContext';
import { 
  getBomGroups, 
  getTemplateBomItems, 
  createWorkingBomFromTemplate,
  saveGroupSelections,
  getGroupSelections,
  type GroupSelection
} from '@/lib/bom/templateBomService';
import { BomGroup, TemplateBomItem } from '@/types';
import { 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ChevronRight, 
  Layers, 
  Package,
  SplitSquareVertical,
  ArrowRight
} from 'lucide-react';

interface GroupWithSelection extends BomGroup {
  isSelected: boolean;
  splitPercentage?: number;
}

export default function ConfigureBomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { project } = useProject();
  const projectId = params?.projectId as string;

  const [groups, setGroups] = useState<GroupWithSelection[]>([]);
  const [templateItems, setTemplateItems] = useState<TemplateBomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load groups and template items
  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [bomGroups, items, savedSelections] = await Promise.all([
        getBomGroups(projectId),
        getTemplateBomItems(projectId),
        getGroupSelections(projectId),
      ]);

      // Merge groups with saved selections
      const groupsWithSelection = bomGroups.map(group => {
        const saved = savedSelections.find(s => s.groupCode === group.groupCode);
        return {
          ...group,
          isSelected: saved?.isSelected ?? true, // Default to selected
          splitPercentage: saved?.splitPercentage,
        };
      });

      setGroups(groupsWithSelection);
      setTemplateItems(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load BOM groups');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group groups by category
  const groupedByCategory = useMemo(() => {
    const categorized = new Map<string, GroupWithSelection[]>();
    
    groups.forEach(group => {
      const category = group.category || 'Other';
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      categorized.get(category)!.push(group);
    });

    // Sort categories and convert to array
    return Array.from(categorized.entries()).sort(([a], [b]) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [groups]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const selectedGroups = groups.filter(g => g.isSelected);
    const selectedGroupCodes = new Set(selectedGroups.map(g => g.groupCode));
    
    const selectedItems = templateItems.filter(item => 
      selectedGroupCodes.has(item.groupCode)
    );
    
    const excludedGroups = groups.filter(g => !g.isSelected);
    const excludedItems = templateItems.filter(item => 
      !selectedGroupCodes.has(item.groupCode)
    );

    return {
      selectedGroups: selectedGroups.length,
      selectedItems: selectedItems.length,
      excludedGroups: excludedGroups.length,
      excludedItems: excludedItems.length,
      totalGroups: groups.length,
      totalItems: templateItems.length,
    };
  }, [groups, templateItems]);

  const toggleGroup = (groupCode: string) => {
    setGroups(prev => prev.map(g => 
      g.groupCode === groupCode 
        ? { ...g, isSelected: !g.isSelected }
        : g
    ));
  };

  const toggleAll = (selected: boolean) => {
    setGroups(prev => prev.map(g => ({ ...g, isSelected: selected })));
  };

  const setSplitPercentage = (groupCode: string, percentage: number | undefined) => {
    setGroups(prev => prev.map(g => 
      g.groupCode === groupCode 
        ? { ...g, splitPercentage: percentage }
        : g
    ));
  };

  const handleSaveSelections = async () => {
    if (!user) return;
    setSaving(true);
    setError('');

    try {
      const selections: GroupSelection[] = groups.map(g => ({
        groupCode: g.groupCode,
        isSelected: g.isSelected,
        splitPercentage: g.splitPercentage,
      }));

      await saveGroupSelections(projectId, selections, user.uid);
    } catch (err: any) {
      setError(err.message || 'Failed to save selections');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWorkingBom = async () => {
    if (!user) return;
    setSaving(true);
    setError('');

    try {
      // Save selections first
      const selections: GroupSelection[] = groups.map(g => ({
        groupCode: g.groupCode,
        isSelected: g.isSelected,
        splitPercentage: g.splitPercentage,
      }));
      await saveGroupSelections(projectId, selections, user.uid);

      // Create working BOM from selected groups
      const selectedGroupCodes = groups
        .filter(g => g.isSelected)
        .map(g => g.groupCode);

      const result = await createWorkingBomFromTemplate(projectId, user.uid, selectedGroupCodes);
      
      if (result.success) {
        router.push(`/project/${projectId}/bom`);
      } else {
        setError(result.error || 'Failed to create working BOM');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create working BOM');
    } finally {
      setSaving(false);
    }
  };

  if (!project) {
    return <div className="text-[var(--text-secondary)]">Loading project...</div>;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configure BOM</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Select which configuration groups to include
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configure BOM</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Select which configuration groups to include
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Groups Found</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Import a BOM template first to configure groups.
            </p>
            <Button onClick={() => router.push(`/project/${projectId}/import`)}>
              Import BOM
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configure BOM</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Select which configuration groups to include in your working BOM
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toggleAll(true)} size="sm">
            Select All
          </Button>
          <Button variant="outline" onClick={() => toggleAll(false)} size="sm">
            Deselect All
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-[var(--accent-red)] bg-[var(--accent-red)]/10 rounded-md border border-[var(--accent-red)]/20 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Group Selection */}
      <div className="space-y-6">
        {groupedByCategory.map(([category, categoryGroups]) => (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-3 text-[var(--text-secondary)]">
              {category}
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categoryGroups.map(group => (
                <Card 
                  key={group.id} 
                  className={`
                    cursor-pointer transition-all hover:shadow-md
                    ${group.isSelected 
                      ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5' 
                      : 'border-[var(--border-subtle)] opacity-60 hover:opacity-100'}
                  `}
                  onClick={() => toggleGroup(group.groupCode)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={group.isSelected}
                        onCheckedChange={() => toggleGroup(group.groupCode)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium truncate">
                            {group.groupCode}
                          </span>
                          {group.isStandard && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] truncate">
                          {group.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-tertiary)]">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {group.itemCount} items
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {group.maxLevel + 1} levels
                          </span>
                        </div>

                        {/* Split Percentage (optional) */}
                        {group.isSelected && (
                          <div 
                            className="mt-3 pt-3 border-t border-[var(--border-subtle)]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <SplitSquareVertical className="h-3 w-3 text-[var(--text-tertiary)]" />
                              <Label className="text-xs text-[var(--text-secondary)]">
                                Split %
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={group.splitPercentage || ''}
                                onChange={(e) => setSplitPercentage(
                                  group.groupCode, 
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )}
                                placeholder="100"
                                className="h-7 w-16 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="bg-[var(--bg-tertiary)]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Selected</p>
                <p className="text-lg font-semibold text-[var(--accent-green)]">
                  {summary.selectedGroups} groups
                  <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">
                    ({summary.selectedItems} items)
                  </span>
                </p>
              </div>
              <div className="h-8 w-px bg-[var(--border-subtle)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Excluded</p>
                <p className="text-lg font-semibold text-[var(--text-tertiary)]">
                  {summary.excludedGroups} groups
                  <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">
                    ({summary.excludedItems} items)
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSaveSelections}
                disabled={saving}
              >
                Save Selection
              </Button>
              <Button
                onClick={handleCreateWorkingBom}
                disabled={saving || summary.selectedGroups === 0}
                className="bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Working BOM
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
