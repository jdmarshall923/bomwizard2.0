'use client';

import { useState, useCallback } from 'react';
import { 
  Spec, 
  SpecCategory, 
  SpecOption, 
  SpecHeader, 
  SpecTimeline,
  SPEC_CATEGORIES,
  BIKE_TYPES 
} from '@/types/spec';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Save, 
  Send, 
  X,
  Plus,
  Trash2,
  Bike,
  Calendar,
  Settings2,
  Palette
} from 'lucide-react';

interface SpecEditorProps {
  spec?: Spec;
  onSave: (data: Partial<Spec>) => Promise<void>;
  onSubmit?: () => Promise<void>;
  onCancel: () => void;
  isNew?: boolean;
}

export function SpecEditor({
  spec,
  onSave,
  onSubmit,
  onCancel,
  isNew = false,
}: SpecEditorProps) {
  const [header, setHeader] = useState<SpecHeader>(spec?.header || {
    projectName: '',
    bikeType: '',
  });
  const [timeline, setTimeline] = useState<SpecTimeline>(spec?.timeline || {});
  const [categories, setCategories] = useState<SpecCategory[]>(
    spec?.categories || SPEC_CATEGORIES.map(cat => ({
      category: cat,
      options: [],
      mappingStatus: 'unmapped',
    }))
  );
  const [activeTab, setActiveTab] = useState('header');
  const [isSaving, setIsSaving] = useState(false);
  
  // Header field handlers
  const updateHeader = (field: keyof SpecHeader, value: string) => {
    setHeader(prev => ({ ...prev, [field]: value }));
  };
  
  // Timeline field handlers
  const updateTimeline = (field: keyof SpecTimeline, value: string | number | boolean) => {
    setTimeline(prev => ({ ...prev, [field]: value }));
  };
  
  // Category handlers
  const toggleOption = (categoryIndex: number, optionIndex: number, field: keyof SpecOption) => {
    setCategories(prev => {
      const updated = [...prev];
      const option = updated[categoryIndex].options[optionIndex];
      if (field === 'selected' || field === 'available' || field === 'isDefault') {
        (option[field] as boolean) = !option[field];
      }
      return updated;
    });
  };
  
  const addOption = (categoryIndex: number) => {
    const optionName = prompt('Enter option name:');
    if (!optionName) return;
    
    setCategories(prev => {
      const updated = [...prev];
      updated[categoryIndex].options.push({
        optionName,
        available: true,
        selected: false,
        isDefault: false,
        mappingStatus: 'unmapped',
      });
      return updated;
    });
  };
  
  const removeOption = (categoryIndex: number, optionIndex: number) => {
    setCategories(prev => {
      const updated = [...prev];
      updated[categoryIndex].options.splice(optionIndex, 1);
      return updated;
    });
  };
  
  const updateOptionQty = (
    categoryIndex: number, 
    optionIndex: number, 
    field: 'estQtyMin' | 'estQtyMax' | 'estSplit',
    value: string
  ) => {
    setCategories(prev => {
      const updated = [...prev];
      const option = updated[categoryIndex].options[optionIndex];
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        option[field] = numValue;
      } else {
        delete option[field];
      }
      return updated;
    });
  };
  
  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        header,
        timeline,
        categories,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Validation
  const isValid = header.projectName && header.bikeType;
  
  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isNew ? 'Create New Spec' : 'Edit Spec'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X size={16} className="mr-1.5" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            <Save size={16} className="mr-1.5" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          {onSubmit && (
            <Button variant="default" onClick={onSubmit} disabled={!isValid}>
              <Send size={16} className="mr-1.5" />
              Submit for Review
            </Button>
          )}
        </div>
      </div>
      
      {/* Tabbed editor */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="header" className="flex items-center gap-1.5">
            <Bike size={16} />
            Header
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1.5">
            <Calendar size={16} />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-1.5">
            <Settings2 size={16} />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="colours" className="flex items-center gap-1.5">
            <Palette size={16} />
            Colours
          </TabsTrigger>
        </TabsList>
        
        {/* Header Tab */}
        <TabsContent value="header">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    value={header.projectName || ''}
                    onChange={(e) => updateHeader('projectName', e.target.value)}
                    placeholder="e.g., MY2025 Trail Master"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bikeType">Bike Type *</Label>
                  <Select
                    value={header.bikeType || ''}
                    onValueChange={(value) => updateHeader('bikeType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bike type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BIKE_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="productFamily">Product Family</Label>
                  <Input
                    id="productFamily"
                    value={header.productFamily || ''}
                    onChange={(e) => updateHeader('productFamily', e.target.value)}
                    placeholder="e.g., Turbo"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="modelYear">Model Year</Label>
                  <Input
                    id="modelYear"
                    value={header.modelYear || ''}
                    onChange={(e) => updateHeader('modelYear', e.target.value)}
                    placeholder="e.g., 2025"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="productCategory">Product Category</Label>
                  <Input
                    id="productCategory"
                    value={header.productCategory || ''}
                    onChange={(e) => updateHeader('productCategory', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="productClass">Product Class</Label>
                  <Input
                    id="productClass"
                    value={header.productClass || ''}
                    onChange={(e) => updateHeader('productClass', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="productLine">Product Line</Label>
                  <Input
                    id="productLine"
                    value={header.productLine || ''}
                    onChange={(e) => updateHeader('productLine', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frameMaterial">Frame Material</Label>
                  <Input
                    id="frameMaterial"
                    value={header.frameMaterial || ''}
                    onChange={(e) => updateHeader('frameMaterial', e.target.value)}
                    placeholder="e.g., Carbon, Aluminium"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Planning Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderingOpenWeek">Ordering Open Week</Label>
                  <Input
                    id="orderingOpenWeek"
                    value={timeline.orderingOpenWeek || ''}
                    onChange={(e) => updateTimeline('orderingOpenWeek', e.target.value)}
                    placeholder="e.g., W12 2025"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="orderingCloseWeek">Ordering Close Week</Label>
                  <Input
                    id="orderingCloseWeek"
                    value={timeline.orderingCloseWeek || ''}
                    onChange={(e) => updateTimeline('orderingCloseWeek', e.target.value)}
                    placeholder="e.g., W20 2025"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sprintRunWeek">Sprint Run Week</Label>
                  <Input
                    id="sprintRunWeek"
                    value={timeline.sprintRunWeek || ''}
                    onChange={(e) => updateTimeline('sprintRunWeek', e.target.value)}
                    placeholder="e.g., W24 2025"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="productionWeek">Production Week</Label>
                  <Input
                    id="productionWeek"
                    value={timeline.productionWeek || ''}
                    onChange={(e) => updateTimeline('productionWeek', e.target.value)}
                    placeholder="e.g., W28 2025"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="totalQty">Total Quantity</Label>
                  <Input
                    id="totalQty"
                    type="number"
                    value={timeline.totalQty || ''}
                    onChange={(e) => updateTimeline('totalQty', parseInt(e.target.value, 10))}
                    placeholder="e.g., 5000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pbomCodeName">PBOM Code Name</Label>
                  <Input
                    id="pbomCodeName"
                    value={timeline.pbomCodeName || ''}
                    onChange={(e) => updateTimeline('pbomCodeName', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="businessCaseLink">Business Case Link</Label>
                  <Input
                    id="businessCaseLink"
                    value={timeline.businessCaseLink || ''}
                    onChange={(e) => updateTimeline('businessCaseLink', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Options</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {categories.map((category, categoryIndex) => (
                  <div key={category.category} className="border-b last:border-b-0">
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category.category}</span>
                        <Badge variant="secondary" className="text-xs">
                          {category.options.filter(o => o.selected).length} / {category.options.length}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addOption(categoryIndex)}
                      >
                        <Plus size={14} className="mr-1" />
                        Add Option
                      </Button>
                    </div>
                    
                    {category.options.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[30%]">Option</TableHead>
                            <TableHead className="w-[10%] text-center">Available</TableHead>
                            <TableHead className="w-[10%] text-center">Selected</TableHead>
                            <TableHead className="w-[10%] text-center">Default</TableHead>
                            <TableHead className="w-[12%]">Min Qty</TableHead>
                            <TableHead className="w-[12%]">Max Qty</TableHead>
                            <TableHead className="w-[10%]">Split %</TableHead>
                            <TableHead className="w-[6%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {category.options.map((option, optionIndex) => (
                            <TableRow key={option.optionName}>
                              <TableCell className="font-medium">
                                {option.optionName}
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={option.available}
                                  onCheckedChange={() => toggleOption(categoryIndex, optionIndex, 'available')}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={option.selected}
                                  onCheckedChange={() => toggleOption(categoryIndex, optionIndex, 'selected')}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={option.isDefault}
                                  onCheckedChange={() => toggleOption(categoryIndex, optionIndex, 'isDefault')}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className="h-8 w-20"
                                  value={option.estQtyMin || ''}
                                  onChange={(e) => updateOptionQty(categoryIndex, optionIndex, 'estQtyMin', e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className="h-8 w-20"
                                  value={option.estQtyMax || ''}
                                  onChange={(e) => updateOptionQty(categoryIndex, optionIndex, 'estQtyMax', e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className="h-8 w-16"
                                  value={option.estSplit || ''}
                                  onChange={(e) => updateOptionQty(categoryIndex, optionIndex, 'estSplit', e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeOption(categoryIndex, optionIndex)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    
                    {category.options.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No options defined. Click "Add Option" to create one.
                      </div>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Colours Tab */}
        <TabsContent value="colours">
          <Card>
            <CardHeader>
              <CardTitle>Colour Options</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Colour options editor coming soon. 
                Import from Excel to populate colour data.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

