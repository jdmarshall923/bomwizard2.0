'use client';

import { useState, useCallback } from 'react';
import { 
  Spec, 
  SpecCategory, 
  SuggestedMapping,
  AppliedMapping 
} from '@/types/spec';
import { useBikeTypeMappings } from '@/lib/hooks/useSpecMapping';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  ArrowRight, 
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  Search,
  Plus,
  Loader2,
  Boxes,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpecApplyWizardProps {
  spec: Spec;
  onApply: (mappings: AppliedMapping[]) => Promise<void>;
  onCancel: () => void;
}

type WizardStep = 'review' | 'mapping' | 'confirm' | 'applying' | 'complete';

interface CategoryMappingState {
  category: string;
  options: {
    optionName: string;
    suggestedGroups: string[];
    selectedGroups: string[];
    confidence: number;
    isConfirmed: boolean;
  }[];
}

export function SpecApplyWizard({
  spec,
  onApply,
  onCancel,
}: SpecApplyWizardProps) {
  const [step, setStep] = useState<WizardStep>('review');
  const [mappingState, setMappingState] = useState<CategoryMappingState[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const { mappings: bikeTypeMappings, loading: loadingMappings } = useBikeTypeMappings(
    spec.header.bikeType
  );
  
  // Get selected options from spec
  const selectedCategories = spec.categories
    .filter(cat => cat.options.some(opt => opt.selected))
    .map(cat => ({
      category: cat.category,
      selectedOptions: cat.options.filter(opt => opt.selected),
    }));
  
  // Initialize mapping state
  const initializeMappingState = useCallback(() => {
    const state: CategoryMappingState[] = selectedCategories.map(({ category, selectedOptions }) => ({
      category,
      options: selectedOptions.map(opt => {
        // Look up existing mapping
        const mapping = bikeTypeMappings.find(
          m => m.category === category && m.optionValue === opt.optionName
        );
        
        return {
          optionName: opt.optionName,
          suggestedGroups: mapping?.groupCodes || [],
          selectedGroups: mapping?.groupCodes || [],
          confidence: mapping?.confidence || 0,
          isConfirmed: false,
        };
      }),
    }));
    
    setMappingState(state);
    setStep('mapping');
  }, [selectedCategories, bikeTypeMappings]);
  
  // Toggle group selection
  const toggleGroup = (categoryIndex: number, optionIndex: number, groupCode: string) => {
    setMappingState(prev => {
      const updated = [...prev];
      const option = updated[categoryIndex].options[optionIndex];
      
      if (option.selectedGroups.includes(groupCode)) {
        option.selectedGroups = option.selectedGroups.filter(g => g !== groupCode);
      } else {
        option.selectedGroups = [...option.selectedGroups, groupCode];
      }
      
      return updated;
    });
  };
  
  // Confirm option mapping
  const confirmOption = (categoryIndex: number, optionIndex: number) => {
    setMappingState(prev => {
      const updated = [...prev];
      updated[categoryIndex].options[optionIndex].isConfirmed = true;
      return updated;
    });
  };
  
  // Confirm all options for a category
  const confirmAllInCategory = (categoryIndex: number) => {
    setMappingState(prev => {
      const updated = [...prev];
      updated[categoryIndex].options.forEach(opt => {
        opt.isConfirmed = true;
      });
      return updated;
    });
  };
  
  // Calculate progress
  const totalOptions = mappingState.reduce((sum, cat) => sum + cat.options.length, 0);
  const confirmedOptions = mappingState.reduce(
    (sum, cat) => sum + cat.options.filter(opt => opt.isConfirmed).length, 
    0
  );
  const progressPercent = totalOptions > 0 ? (confirmedOptions / totalOptions) * 100 : 0;
  
  // Check if all options are confirmed
  const allConfirmed = confirmedOptions === totalOptions && totalOptions > 0;
  
  // Handle apply
  const handleApply = async () => {
    setStep('applying');
    setProgress(0);
    
    // Build applied mappings
    const appliedMappings: AppliedMapping[] = [];
    
    for (const category of mappingState) {
      for (const option of category.options) {
        appliedMappings.push({
          category: category.category,
          optionValue: option.optionName,
          groupCodes: option.selectedGroups,
          appliedAt: new Date() as unknown as import('firebase/firestore').Timestamp,
          appliedBy: 'current-user',
          wasAutoSuggested: option.confidence > 60,
          wasModified: JSON.stringify(option.suggestedGroups.sort()) !== 
                       JSON.stringify(option.selectedGroups.sort()),
        });
      }
      setProgress((appliedMappings.length / totalOptions) * 100);
    }
    
    try {
      await onApply(appliedMappings);
      setStep('complete');
    } catch (error) {
      // Handle error
      setStep('confirm');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Apply Spec to BOM</h1>
          <p className="text-muted-foreground">
            Map spec options to BOM groups for {spec.header.projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {step !== 'complete' && step !== 'applying' && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      {step === 'mapping' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Mapping Progress</span>
            <span>{confirmedOptions} / {totalOptions} options confirmed</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}
      
      {/* Review Step */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Selected Options</CardTitle>
            <CardDescription>
              These options will be mapped to BOM groups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                <p>No options selected in the spec.</p>
                <p className="text-sm">Go back and select some options first.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedCategories.map(({ category, selectedOptions }) => (
                    <div key={category} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {category}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedOptions.map(opt => (
                          <Badge key={opt.optionName} variant="secondary">
                            {opt.optionName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={initializeMappingState}
                    disabled={loadingMappings}
                  >
                    {loadingMappings ? (
                      <>
                        <Loader2 size={16} className="mr-1.5 animate-spin" />
                        Loading Mappings...
                      </>
                    ) : (
                      <>
                        Continue to Mapping
                        <ArrowRight size={16} className="ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Mapping Step */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes size={20} />
              Map Options to Groups
            </CardTitle>
            <CardDescription>
              Review and confirm the suggested group mappings for each option.
              Mappings are automatically learned from your selections.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Accordion 
                type="single" 
                collapsible 
                defaultValue={mappingState[0]?.category}
              >
                {mappingState.map((category, categoryIndex) => {
                  const allConfirmedInCategory = category.options.every(opt => opt.isConfirmed);
                  const confirmedCount = category.options.filter(opt => opt.isConfirmed).length;
                  
                  return (
                    <AccordionItem 
                      key={category.category} 
                      value={category.category}
                      className="border-b"
                    >
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          {allConfirmedInCategory ? (
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full border-2 border-muted-foreground/30" />
                          )}
                          <span className="font-medium">{category.category}</span>
                          <Badge variant="secondary" className="text-xs">
                            {confirmedCount} / {category.options.length} confirmed
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4">
                          {category.options.map((option, optionIndex) => (
                            <OptionMappingCard
                              key={option.optionName}
                              option={option}
                              bikeType={spec.header.bikeType}
                              onToggleGroup={(groupCode) => 
                                toggleGroup(categoryIndex, optionIndex, groupCode)
                              }
                              onConfirm={() => confirmOption(categoryIndex, optionIndex)}
                            />
                          ))}
                          
                          {!allConfirmedInCategory && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => confirmAllInCategory(categoryIndex)}
                              className="w-full"
                            >
                              <Check size={14} className="mr-1.5" />
                              Confirm All in {category.category}
                            </Button>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </CardContent>
          
          <div className="p-4 border-t flex justify-between">
            <Button variant="outline" onClick={() => setStep('review')}>
              <ArrowLeft size={16} className="mr-1.5" />
              Back
            </Button>
            <Button 
              onClick={() => setStep('confirm')}
              disabled={!allConfirmed}
            >
              Review & Apply
              <ArrowRight size={16} className="ml-1.5" />
            </Button>
          </div>
        </Card>
      )}
      
      {/* Confirm Step */}
      {step === 'confirm' && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Application</CardTitle>
            <CardDescription>
              Review the groups that will be added to your Working BOM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">
                    {mappingState.reduce(
                      (sum, cat) => sum + cat.options.reduce(
                        (s, opt) => s + opt.selectedGroups.length, 0
                      ), 0
                    )}
                  </p>
                  <p className="text-sm text-emerald-600">Groups to Add</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {mappingState.length}
                  </p>
                  <p className="text-sm text-blue-600">Categories Mapped</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {confirmedOptions}
                  </p>
                  <p className="text-sm text-purple-600">Options Confirmed</p>
                </div>
              </div>
              
              {/* Group list */}
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {mappingState.flatMap(cat => 
                  cat.options.flatMap(opt => 
                    opt.selectedGroups.map(group => ({
                      category: cat.category,
                      option: opt.optionName,
                      group,
                    }))
                  )
                ).map(({ category, option, group }, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-mono">{group}</span>
                    <span className="text-muted-foreground text-xs">
                      {category}: {option}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          
          <div className="p-4 border-t flex justify-between">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              <ArrowLeft size={16} className="mr-1.5" />
              Back to Mapping
            </Button>
            <Button onClick={handleApply}>
              <Check size={16} className="mr-1.5" />
              Apply to BOM
            </Button>
          </div>
        </Card>
      )}
      
      {/* Applying Step */}
      {step === 'applying' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 size={48} className="mx-auto mb-4 animate-spin text-primary" />
            <h3 className="text-xl font-semibold mb-2">Applying Spec to BOM...</h3>
            <p className="text-muted-foreground mb-4">
              Adding groups and saving mappings
            </p>
            <Progress value={progress} className="h-2 max-w-xs mx-auto" />
          </CardContent>
        </Card>
      )}
      
      {/* Complete Step */}
      {step === 'complete' && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 size={64} className="mx-auto mb-4 text-emerald-500" />
            <h3 className="text-2xl font-semibold mb-2">Spec Applied Successfully!</h3>
            <p className="text-muted-foreground mb-6">
              Groups have been added to your Working BOM and mappings have been saved.
            </p>
            <Button onClick={onCancel}>
              Return to Spec Overview
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual option mapping card
interface OptionMappingCardProps {
  option: CategoryMappingState['options'][0];
  bikeType: string;
  onToggleGroup: (groupCode: string) => void;
  onConfirm: () => void;
}

function OptionMappingCard({
  option,
  bikeType,
  onToggleGroup,
  onConfirm,
}: OptionMappingCardProps) {
  if (option.isConfirmed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span className="font-medium">{option.optionName}</span>
          </div>
          <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
            {option.selectedGroups.length} groups
          </Badge>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{option.optionName}</span>
        <ConfidenceIndicator 
          score={option.confidence} 
          size="sm"
        />
      </div>
      
      {option.suggestedGroups.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Suggested groups for {bikeType} bikes:
          </p>
          <div className="space-y-1">
            {option.suggestedGroups.map(group => (
              <label 
                key={group}
                className={cn(
                  'flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors',
                  option.selectedGroups.includes(group)
                    ? 'bg-primary/5 border-primary'
                    : 'hover:bg-muted'
                )}
              >
                <Checkbox
                  checked={option.selectedGroups.includes(group)}
                  onCheckedChange={() => onToggleGroup(group)}
                />
                <span className="font-mono text-sm">{group}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700">No mapping found</p>
              <p className="text-amber-600 text-xs mt-1">
                Search and select groups manually. Your selection will be saved for future use.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-2 w-full">
            <Search size={14} className="mr-1.5" />
            Search Groups
          </Button>
        </div>
      )}
      
      <Button 
        size="sm" 
        onClick={onConfirm}
        disabled={option.selectedGroups.length === 0}
        className="w-full"
      >
        <Check size={14} className="mr-1.5" />
        Confirm Selection
      </Button>
    </div>
  );
}

