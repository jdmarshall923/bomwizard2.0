'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/hooks/useAuth';
import { getSLItems, importSLItems, clearSLItems, SLItem } from '@/lib/data/masterDataService';
import { parseCSV } from '@/lib/import/csvParser';
import { 
  Upload, 
  Search, 
  Package, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';

export default function SLItemsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SLItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    successCount: number;
    updatedCount: number;
    errorCount: number;
    error?: string;
  } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{
    success: boolean;
    deletedCount: number;
  } | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getSLItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    setImportResult(null);

    try {
      const parseResult = await parseCSV(file);
      const result = await importSLItems(parseResult.data, user.uid, file.name);
      
      setImportResult({
        success: result.success,
        successCount: result.successCount,
        updatedCount: result.updatedCount,
        errorCount: result.errorCount,
      });

      // Reload items
      await loadItems();
    } catch (err: any) {
      console.error('Import failed:', err);
      const errorMessage = err?.message || 'Unknown error';
      setImportResult({
        success: false,
        successCount: 0,
        updatedCount: 0,
        errorCount: 1,
        error: errorMessage,
      });
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    setClearResult(null);
    setImportResult(null);
    
    try {
      const result = await clearSLItems();
      setClearResult(result);
      setItems([]);
    } catch (err: any) {
      console.error('Clear failed:', err);
      setClearResult({
        success: false,
        deletedCount: 0,
      });
    } finally {
      setClearing(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.code.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.buyer?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">SLItems</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Item master data from Infor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadItems} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={clearing || items.length === 0}>
                {clearing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Clear Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All SLItems Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {items.length} SLItems records. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearData}
                  className="bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90"
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={importing}
            />
            <Button disabled={importing}>
              {importing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import SLItems.csv
            </Button>
          </div>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`p-4 rounded-lg border ${
          importResult.success 
            ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30' 
            : 'bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/30'
        }`}>
          <div className="flex items-center gap-2">
            {importResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-[var(--accent-green)]" />
            ) : (
              <AlertCircle className="h-5 w-5 text-[var(--accent-orange)]" />
            )}
            <span className="font-medium">
              Import {importResult.success ? 'Complete' : 'Completed with Errors'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {importResult.successCount} items created, {importResult.updatedCount} updated
            {importResult.errorCount > 0 && `, ${importResult.errorCount} errors`}
          </p>
          {importResult.error && (
            <p className="text-sm text-[var(--accent-red)] mt-2 font-mono">
              Error: {importResult.error}
            </p>
          )}
        </div>
      )}

      {/* Clear Result */}
      {clearResult && (
        <div className={`p-4 rounded-lg border ${
          clearResult.success 
            ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30' 
            : 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30'
        }`}>
          <div className="flex items-center gap-2">
            {clearResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-[var(--accent-green)]" />
            ) : (
              <AlertCircle className="h-5 w-5 text-[var(--accent-red)]" />
            )}
            <span className="font-medium">
              {clearResult.success ? 'Data Cleared Successfully' : 'Clear Failed'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {clearResult.deletedCount} items deleted
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-[var(--accent-blue)]" />
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-sm text-[var(--text-secondary)]">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-[var(--accent-green)]" />
              <div>
                <p className="text-2xl font-bold">{items.filter(i => i.pmtCode === 'P').length}</p>
                <p className="text-sm text-[var(--text-secondary)]">Purchased</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-[var(--accent-orange)]" />
              <div>
                <p className="text-2xl font-bold">{items.filter(i => i.pmtCode === 'M').length}</p>
                <p className="text-sm text-[var(--text-secondary)]">Manufactured</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
        <Input
          placeholder="Search by code, description, or buyer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border border-[var(--border-subtle)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--bg-secondary)]/50">
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Drawing</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[var(--text-secondary)]">
                      {items.length === 0 ? 'No items imported yet. Upload SLItems.csv to get started.' : 'No items match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.slice(0, 100).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-medium">{item.code}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{item.description}</TableCell>
                      <TableCell className="font-mono text-sm">{item.drawingNumber}</TableCell>
                      <TableCell>{item.revision}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          item.pmtCode === 'M' 
                            ? 'border-[var(--accent-orange)] text-[var(--accent-orange)]' 
                            : 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                        }>
                          {item.pmtCode === 'M' ? 'Manufactured' : 'Purchased'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.country}</TableCell>
                      <TableCell>
                        {item.unitWeight ? `${item.unitWeight} ${item.weightUnits || 'KG'}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredItems.length > 100 && (
            <p className="text-sm text-[var(--text-secondary)] p-4 text-center">
              Showing 100 of {filteredItems.length} items
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

