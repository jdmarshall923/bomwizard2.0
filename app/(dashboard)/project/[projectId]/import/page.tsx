'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/import/FileUpload';
import { TemplateSelector } from '@/components/import/TemplateSelector';
import { ColumnMapper } from '@/components/import/ColumnMapper';
import { ImportPreview } from '@/components/import/ImportPreview';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProject } from '@/lib/context/ProjectContext';
import { parseCSV, previewCSV } from '@/lib/import/csvParser';
import { getTemplates, getTemplate, createTemplate } from '@/lib/import/templateManager';
import { ImportTemplate } from '@/types';
import { ColumnMappings, autoDetectMappings, validateMappings } from '@/lib/import/columnMapper';
import { processImport, validateBomData } from '@/lib/import/importProcessor';
import { importToTemplateBom, createWorkingBomFromTemplate, saveAsGlobalTemplate } from '@/lib/bom/templateBomService';
import { uploadFile } from '@/lib/firebase/storage';
import { createDocument } from '@/lib/firebase/firestore';
import { ImportHistory } from '@/types';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Trash2, FileBox, Wrench, Globe, ArrowRight, Copy, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Timestamp } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type ImportStep = 'upload' | 'template' | 'mapping' | 'preview' | 'destination' | 'validation' | 'import' | 'results';
type ImportDestination = 'template' | 'working' | 'both';

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { project } = useProject();
  const projectId = params?.projectId as string;

  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<ColumnMappings>({});
  const [importDestination, setImportDestination] = useState<ImportDestination>('template');
  const [saveToGlobal, setSaveToGlobal] = useState(false);
  const [globalTemplateName, setGlobalTemplateName] = useState('');
  const [globalTemplateDescription, setGlobalTemplateDescription] = useState('');
  const [importOptions, setImportOptions] = useState({
    createVersion: true,
    replaceExisting: false,
    createMissingItems: true,
  });
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [workingBomResult, setWorkingBomResult] = useState<any>(null);
  const [globalTemplateResult, setGlobalTemplateResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load templates on mount
  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  // Load CSV when file is selected
  useEffect(() => {
    if (selectedFile) {
      loadCSV();
    }
  }, [selectedFile]);

  // Apply template mappings when template is selected
  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      applyTemplate();
    }
  }, [selectedTemplateId, templates]);

  const loadTemplates = async () => {
    if (!user) return;
    try {
      const loadedTemplates = await getTemplates(user.uid);
      setTemplates(loadedTemplates);
    } catch (err: any) {
      console.error('Error loading templates:', err);
    }
  };

  const loadCSV = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError('');

    try {
      const result = await parseCSV(selectedFile);
      setCsvData(result.data);
      setCsvHeaders(result.headers);
      
      if (result.errors.length > 0) {
        console.warn('CSV parsing errors:', result.errors);
      }

      // Auto-detect mappings if no template selected
      if (!selectedTemplateId && result.headers.length > 0) {
        const autoMappings = autoDetectMappings(result.headers);
        setMappings(autoMappings);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file');
      console.error('Error parsing CSV:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplateId) return;

    try {
      const template = await getTemplate(selectedTemplateId);
      if (template) {
        setMappings(template.columnMappings.mappings);
      }
    } catch (err: any) {
      console.error('Error loading template:', err);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError('');
    setCsvData([]);
    setCsvHeaders([]);
    setMappings({});
    setCurrentStep('template');
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setMappings({});
    setCurrentStep('upload');
  };

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      setCurrentStep('preview');
    } else {
      setCurrentStep('mapping');
    }
  };

  const handleNext = () => {
    if (currentStep === 'upload' && selectedFile) {
      setCurrentStep('template');
    } else if (currentStep === 'template') {
      if (selectedTemplateId) {
        setCurrentStep('preview');
      } else {
        setCurrentStep('mapping');
      }
    } else if (currentStep === 'mapping') {
      const validation = validateMappings(mappings);
      if (validation.valid) {
        setCurrentStep('preview');
      } else {
        setError(`Please map all required fields: ${validation.missing.join(', ')}`);
      }
    } else if (currentStep === 'preview') {
      setCurrentStep('destination');
    } else if (currentStep === 'destination') {
      setCurrentStep('validation');
      validateData();
    } else if (currentStep === 'validation') {
      setCurrentStep('import');
      performImport();
    }
  };

  const handleBack = () => {
    if (currentStep === 'template') {
      setCurrentStep('upload');
    } else if (currentStep === 'mapping') {
      setCurrentStep('template');
    } else if (currentStep === 'preview') {
      setCurrentStep('template');
    } else if (currentStep === 'destination') {
      setCurrentStep('preview');
    } else if (currentStep === 'validation') {
      setCurrentStep('destination');
    }
  };

  const validateData = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const result = await validateBomData(csvData, mappings);
      setValidationResult(result);

      if (!result.valid) {
        setError(`Validation failed: ${result.errors.length} errors found`);
      }
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const performImport = async () => {
    if (!user || !projectId) return;
    setLoading(true);
    setError('');

    try {
      // Upload file to Storage
      const storagePath = `imports/${user.uid}/${Date.now()}-${selectedFile?.name}`;
      if (selectedFile) {
        await uploadFile(storagePath, selectedFile, {
          projectId,
          uploadedBy: user.uid,
        });
      }

      let result: any;
      let workingResult: any = null;
      let globalResult: any = null;

      // Import based on destination choice
      if (importDestination === 'template' || importDestination === 'both') {
        // Import to Template BOM (new flow)
        result = await importToTemplateBom(
          projectId,
          csvData,
          mappings,
          { createMissingItems: importOptions.createMissingItems },
          user.uid,
          selectedFile?.name || 'unknown'
        );

        // If 'both' selected, also create working BOM from template
        if (importDestination === 'both' && result.success) {
          workingResult = await createWorkingBomFromTemplate(projectId, user.uid);
          setWorkingBomResult(workingResult);
        }

        // Save to global templates if requested
        if (saveToGlobal && result.success && globalTemplateName) {
          globalResult = await saveAsGlobalTemplate(
            projectId,
            globalTemplateName,
            globalTemplateDescription,
            user.uid
          );
          setGlobalTemplateResult(globalResult);
        }
      } else {
        // Import directly to Working BOM (legacy flow - skip template)
        result = await processImport(
          projectId,
          csvData,
          mappings,
          importOptions,
          user.uid
        );
      }

      setImportResult(result);

      // Record import history
      if (result.success || result.successCount > 0) {
        await createDocument<ImportHistory>(
          `projects/${projectId}/importHistory`,
          {
            templateId: selectedTemplateId || '',
            filename: selectedFile?.name || 'unknown',
            rowCount: csvData.length,
            successCount: result.successCount,
            errorCount: result.errorCount,
            errors: result.errors,
            importedAt: Timestamp.now(),
            importedBy: user.uid,
            versionId: result.versionId || '',
            importDestination, // Track which destination was used
          } as Omit<ImportHistory, 'id'> & { importDestination: string }
        );
      }

      setCurrentStep('results');
    } catch (err: any) {
      setError(err.message || 'Import failed');
      console.error('Import error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const templateName = prompt('Enter template name:');
      if (!templateName) return;

      await createTemplate({
        name: templateName,
        description: `Template for ${selectedFile?.name}`,
        sourceType: 'infor_bom',
        columnMappings: {
          sourceColumns: csvHeaders,
          mappings,
          skipRows: 0,
          delimiter: ',',
        },
        isDefault: false,
        createdBy: user.uid,
      });

      await loadTemplates();
      alert('Template saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return <div className="text-[var(--text-secondary)]">Loading project...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Data</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Import CSV data from Infor or other sources
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {(['upload', 'template', 'mapping', 'preview', 'destination', 'validation', 'import'] as ImportStep[]).map(
          (step, index) => {
            const stepLabels: Record<ImportStep, string> = {
              upload: 'Upload',
              template: 'Template',
              mapping: 'Mapping',
              preview: 'Preview',
              destination: 'Destination',
              validation: 'Validate',
              import: 'Import',
              results: 'Results',
            };
            const allSteps: ImportStep[] = ['upload', 'template', 'mapping', 'preview', 'destination', 'validation', 'import'];
            const currentIndex = allSteps.indexOf(currentStep);
            const stepIndex = allSteps.indexOf(step);
            
            return (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${
                        currentStep === step
                          ? 'bg-[var(--accent-blue)] text-white'
                          : stepIndex < currentIndex
                          ? 'bg-[var(--accent-green)] text-white'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }
                    `}
                  >
                    {index + 1}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] mt-1 whitespace-nowrap">
                    {stepLabels[step]}
                  </span>
                </div>
                {index < 6 && (
                  <div
                    className={`
                      w-8 h-0.5 mx-1
                      ${
                        stepIndex < currentIndex
                          ? 'bg-[var(--accent-green)]'
                          : 'bg-[var(--border-subtle)]'
                      }
                    `}
                  />
                )}
              </div>
            );
          }
        )}
      </div>

      {error && (
        <div className="p-4 text-sm text-[var(--accent-red)] bg-[var(--accent-red)]/10 rounded-md border border-[var(--accent-red)]/20 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 'upload' && (
            <div className="space-y-4">
              <FileUpload
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                selectedFile={selectedFile}
              />
            </div>
          )}

          {currentStep === 'template' && selectedFile && (
            <div className="space-y-4">
              <TemplateSelector
                templates={templates}
                selectedTemplateId={selectedTemplateId || undefined}
                onTemplateSelect={handleTemplateSelect}
                onNewTemplate={() => setCurrentStep('mapping')}
                sourceType="infor_bom"
              />
            </div>
          )}

          {currentStep === 'mapping' && csvHeaders.length > 0 && (
            <div className="space-y-4">
              <ColumnMapper
                sourceColumns={csvHeaders}
                mappings={mappings}
                onMappingChange={setMappings}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSaveTemplate}>
                  Save as Template
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'preview' && csvData.length > 0 && (
            <div className="space-y-4">
              <Tabs defaultValue="raw" className="w-full">
                <TabsList>
                  <TabsTrigger value="raw">Raw Data</TabsTrigger>
                  <TabsTrigger value="transformed">Transformed</TabsTrigger>
                </TabsList>
                <TabsContent value="raw">
                  <ImportPreview
                    data={csvData}
                    columns={csvHeaders}
                    mappings={mappings}
                    showTransformed={false}
                  />
                </TabsContent>
                <TabsContent value="transformed">
                  <ImportPreview
                    data={csvData}
                    columns={csvHeaders}
                    mappings={mappings}
                    showTransformed={true}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {currentStep === 'destination' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Import Destination</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Choose how you want to use this imported BOM data
                </p>
              </div>

              <RadioGroup
                value={importDestination}
                onValueChange={(value: string) => setImportDestination(value as ImportDestination)}
                className="space-y-4"
              >
                {/* Template BOM Option */}
                <label
                  className={`
                    flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${importDestination === 'template' 
                      ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5' 
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
                  `}
                >
                  <RadioGroupItem value="template" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileBox className="h-5 w-5 text-[var(--accent-blue)]" />
                      <span className="font-medium">Create as Template BOM</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Import as a read-only template. You can then create a Working BOM from this template 
                      to start building costs. This preserves the original structure for comparison.
                    </p>
                  </div>
                </label>

                {/* Template + Working BOM Option */}
                <label
                  className={`
                    flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${importDestination === 'both' 
                      ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5' 
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
                  `}
                >
                  <RadioGroupItem value="both" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center">
                        <FileBox className="h-5 w-5 text-[var(--accent-blue)]" />
                        <ArrowRight className="h-4 w-4 text-[var(--text-secondary)] mx-1" />
                        <Wrench className="h-5 w-5 text-[var(--accent-green)]" />
                      </div>
                      <span className="font-medium">Create Template + Working BOM</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Import as template AND immediately create a Working BOM from it. 
                      This is the quickest way to start working with your BOM data.
                    </p>
                  </div>
                </label>

                {/* Direct to Working BOM Option */}
                <label
                  className={`
                    flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${importDestination === 'working' 
                      ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/5' 
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
                  `}
                >
                  <RadioGroupItem value="working" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Wrench className="h-5 w-5 text-[var(--accent-orange)]" />
                      <span className="font-medium">Import directly to Working BOM</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]">
                        Legacy
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Skip template creation and import directly as editable Working BOM.
                      Use this if you don't need to compare against the original import.
                    </p>
                  </div>
                </label>
              </RadioGroup>

              {/* Save to Global Templates Option */}
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-subtle)]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={saveToGlobal}
                    onCheckedChange={(checked) => setSaveToGlobal(checked === true)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-4 w-4 text-[var(--text-secondary)]" />
                      <span className="text-sm font-medium">Save to Global Templates</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">
                      Make this template available for use in other projects
                    </p>
                    
                    {saveToGlobal && (
                      <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                        <div>
                          <Label htmlFor="globalTemplateName" className="text-xs">Template Name *</Label>
                          <Input
                            id="globalTemplateName"
                            value={globalTemplateName}
                            onChange={(e) => setGlobalTemplateName(e.target.value)}
                            placeholder="e.g., Standard Product BOM 2024"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="globalTemplateDescription" className="text-xs">Description</Label>
                          <Textarea
                            id="globalTemplateDescription"
                            value={globalTemplateDescription}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGlobalTemplateDescription(e.target.value)}
                            placeholder="Optional description..."
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Import Options */}
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-subtle)]">
                <h4 className="font-medium mb-3 text-sm">Additional Options</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={importOptions.createMissingItems}
                      onCheckedChange={(checked) => 
                        setImportOptions(prev => ({ ...prev, createMissingItems: checked === true }))
                      }
                    />
                    <div>
                      <span className="text-sm font-medium">Create missing items</span>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Automatically create new items in the global catalog if they don't exist
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'validation' && validationResult && (
            <div className="space-y-4">
              <div className={`p-4 rounded-md border-2 ${
                validationResult.valid 
                  ? 'border-[var(--accent-green)]/50 bg-[var(--accent-green)]/10'
                  : 'border-[var(--accent-orange)]/50 bg-[var(--accent-orange)]/10'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {validationResult.valid ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--accent-green)]" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-[var(--accent-orange)]" />
                  )}
                  <h3 className="font-medium">Validation Results</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Errors:</span> {validationResult.errors.length}
                  </p>
                  <p>
                    <span className="font-medium">Warnings:</span> {validationResult.warnings.length}
                  </p>
                </div>
              </div>
              {validationResult.errors.length > 0 && (
                <>
                  <div className="p-3 text-sm bg-[var(--bg-tertiary)] rounded-md border border-[var(--border-subtle)]">
                    <p className="text-[var(--text-secondary)]">
                      You can still proceed with the import. Rows with errors will be skipped.
                    </p>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {validationResult.errors.map((err: any, idx: number) => (
                      <div key={idx} className="p-2 text-sm text-[var(--accent-red)] bg-[var(--bg-tertiary)] rounded mb-1">
                        Row {err.row}: {err.message}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {currentStep === 'import' && loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-[var(--accent-blue)] mb-4" />
              <p className="text-[var(--text-secondary)]">Importing data...</p>
            </div>
          )}

          {currentStep === 'results' && importResult && (
            <div className="space-y-4">
              {/* Main Import Result */}
              <div
                className={`p-6 rounded-md border-2 ${
                  importResult.success
                    ? 'border-[var(--accent-green)]/50 bg-[var(--accent-green)]/10'
                    : 'border-[var(--accent-orange)]/50 bg-[var(--accent-orange)]/10'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {importResult.success ? (
                    <CheckCircle2 className="h-8 w-8 text-[var(--accent-green)]" />
                  ) : (
                    <XCircle className="h-8 w-8 text-[var(--accent-orange)]" />
                  )}
                  <div>
                    <h3 className="text-lg font-medium">
                      {importDestination === 'working' ? 'Working BOM' : 'Template BOM'} Import {importResult.success ? 'Successful' : 'Completed with Errors'}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {importResult.successCount} items imported successfully
                      {importResult.errorCount > 0 && `, ${importResult.errorCount} errors`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Working BOM Result (if created) */}
              {workingBomResult && (
                <div
                  className={`p-4 rounded-md border ${
                    workingBomResult.success
                      ? 'border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5'
                      : 'border-[var(--accent-red)]/30 bg-[var(--accent-red)]/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {workingBomResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-[var(--accent-green)]" />
                    ) : (
                      <XCircle className="h-5 w-5 text-[var(--accent-red)]" />
                    )}
                    <div>
                      <span className="font-medium text-sm">Working BOM Created</span>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {workingBomResult.itemCount} items ready for cost building
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Global Template Result (if saved) */}
              {globalTemplateResult && (
                <div
                  className={`p-4 rounded-md border ${
                    globalTemplateResult.success
                      ? 'border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5'
                      : 'border-[var(--accent-red)]/30 bg-[var(--accent-red)]/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {globalTemplateResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-[var(--accent-blue)]" />
                    ) : (
                      <XCircle className="h-5 w-5 text-[var(--accent-red)]" />
                    )}
                    <div>
                      <span className="font-medium text-sm">Saved to Global Templates</span>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Template "{globalTemplateName}" is now available for other projects
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="max-h-64 overflow-auto">
                  <h4 className="font-medium mb-2">Errors:</h4>
                  {importResult.errors.map((err: any, idx: number) => (
                    <div key={idx} className="p-2 text-sm text-[var(--accent-red)] bg-[var(--bg-tertiary)] rounded mb-1">
                      Row {err.row}: {err.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Next Actions for Template Import */}
              {importDestination === 'template' && importResult.success && !workingBomResult && (
                <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-subtle)]">
                  <h4 className="font-medium mb-3">Next Steps</h4>
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Your Template BOM has been imported. You can now:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={async () => {
                          if (!user) return;
                          setLoading(true);
                          const result = await createWorkingBomFromTemplate(projectId, user.uid);
                          setWorkingBomResult(result);
                          setLoading(false);
                        }}
                        disabled={loading}
                        className="bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        Create Working BOM
                      </Button>
                      {!globalTemplateResult && (
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (!user) return;
                            const name = prompt('Enter template name:');
                            if (!name) return;
                            setLoading(true);
                            const result = await saveAsGlobalTemplate(projectId, name, '', user.uid);
                            setGlobalTemplateResult(result);
                            setGlobalTemplateName(name);
                            setLoading(false);
                          }}
                          disabled={loading}
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Save as Global Template
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {importResult.versionId && (
                <div className="p-4 bg-[var(--bg-tertiary)] rounded-md">
                  <p className="text-sm">
                    <span className="font-medium">Version created:</span> {importResult.versionId}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {currentStep !== 'upload' && currentStep !== 'results' && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={loading}>
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading || (currentStep === 'validation' && !validationResult)}
            variant={currentStep === 'validation' && !validationResult?.valid ? 'outline' : 'default'}
            className={currentStep === 'validation' && !validationResult?.valid 
              ? 'border-[var(--accent-orange)] text-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/10' 
              : ''
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : currentStep === 'validation' ? (
              validationResult?.valid ? 'Import' : 'Import Anyway (Skip Errors)'
            ) : (
              'Next'
            )}
          </Button>
        </div>
      )}

      {currentStep === 'results' && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => {
            // Reset and start over
            setCurrentStep('upload');
            setSelectedFile(null);
            setCsvData([]);
            setCsvHeaders([]);
            setMappings({});
            setImportResult(null);
            setWorkingBomResult(null);
            setGlobalTemplateResult(null);
            setValidationResult(null);
            setError('');
          }}>
            Import Another File
          </Button>
          <div className="flex gap-2">
            {importDestination === 'template' && !workingBomResult && (
              <Button variant="outline" onClick={() => router.push(`/project/${projectId}/bom?view=template`)}>
                View Template
              </Button>
            )}
            <Button onClick={() => router.push(`/project/${projectId}/bom`)}>
              {workingBomResult || importDestination === 'working' || importDestination === 'both' 
                ? 'View Working BOM' 
                : 'View BOM'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
