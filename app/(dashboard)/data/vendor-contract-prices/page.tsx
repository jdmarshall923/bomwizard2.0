'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { 
  getVendorContractPrices, 
  importVendorContractPrices,
  clearVendorContractPrices,
} from '@/lib/bom/vendorPriceService';
import { VendorContractPrice } from '@/types';
import { parseCSV } from '@/lib/import/csvParser';
import { transformData } from '@/lib/import/columnMapper';
import { 
  Upload, 
  Search, 
  PoundSterling, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Clock,
  Package,
  Trash2
} from 'lucide-react';

export default function VendorContractPricesPage() {
  const { user } = useAuth();
  const [prices, setPrices] = useState<VendorContractPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    successCount: number;
    errorCount: number;
    error?: string;
  } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{
    success: boolean;
    deletedCount: number;
  } | null>(null);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    setLoading(true);
    try {
      const data = await getVendorContractPrices();
      setPrices(data);
    } catch (err) {
      console.error('Failed to load prices:', err);
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
      
      // Import directly - no column mapping needed
      const result = await importVendorContractPrices(
        parseResult.data,
        null, // mappings no longer used
        user.uid,
        file.name
      );
      
      setImportResult({
        success: result.success,
        successCount: result.successCount,
        errorCount: result.errorCount,
      });

      // Reload prices
      await loadPrices();
    } catch (err: any) {
      console.error('Import failed:', err);
      setImportResult({
        success: false,
        successCount: 0,
        errorCount: 1,
        error: err?.message || 'Unknown error',
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    setClearResult(null);
    setImportResult(null);
    
    try {
      const result = await clearVendorContractPrices();
      setClearResult(result);
      setPrices([]);
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

  const filteredPrices = useMemo(() => {
    if (!searchTerm) return prices;
    const term = searchTerm.toLowerCase();
    return prices.filter(price => 
      price.itemCode?.toLowerCase().includes(term) ||
      price.vendorCode?.toLowerCase().includes(term) ||
      price.vendorName?.toLowerCase().includes(term) ||
      price.description?.toLowerCase().includes(term)
    );
  }, [prices, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const active = prices.filter(p => p.status === 'active').length;
    const expired = prices.filter(p => p.status === 'expired').length;
    const pending = prices.filter(p => p.status === 'pending').length;
    const uniqueItems = new Set(prices.map(p => p.itemCode)).size;
    const uniqueVendors = new Set(prices.map(p => p.vendorCode)).size;
    return { active, expired, pending, uniqueItems, uniqueVendors };
  }, [prices]);

  const formatCurrency = (value: number, currency: string = 'GBP') => {
    const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
    return `${symbol}${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">VendorContractPrices</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Vendor pricing data from Infor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadPrices} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={clearing || prices.length === 0}>
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
                <AlertDialogTitle>Clear All Vendor Contract Prices?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {prices.length} price records. This action cannot be undone.
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
              Import VendorContractPrices.csv
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
            {importResult.successCount} prices imported/updated
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
            {clearResult.deletedCount} prices deleted
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <PoundSterling className="h-6 w-6 text-[var(--accent-blue)]" />
              <div>
                <p className="text-xl font-bold">{prices.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Total Prices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-[var(--accent-green)]" />
              <div>
                <p className="text-xl font-bold">{stats.active}</p>
                <p className="text-xs text-[var(--text-secondary)]">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-[var(--accent-orange)]" />
              <div>
                <p className="text-xl font-bold">{stats.pending}</p>
                <p className="text-xs text-[var(--text-secondary)]">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-[var(--text-tertiary)]" />
              <div>
                <p className="text-xl font-bold">{stats.uniqueItems}</p>
                <p className="text-xs text-[var(--text-secondary)]">Unique Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-[var(--accent-red)]" />
              <div>
                <p className="text-xl font-bold">{stats.expired}</p>
                <p className="text-xs text-[var(--text-secondary)]">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
        <Input
          placeholder="Search by item code, vendor, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border border-[var(--border-subtle)] overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--bg-secondary)]/50">
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">MOQ</TableHead>
                  <TableHead className="text-right">Lead Time</TableHead>
                  <TableHead className="text-right">Landing %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredPrices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-[var(--text-secondary)]">
                      {prices.length === 0 ? 'No prices imported yet. Upload VendorContractPrices.csv to get started.' : 'No prices match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrices.slice(0, 100).map((price) => (
                    <TableRow key={price.id}>
                      <TableCell className="font-mono font-medium">{price.itemCode}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{price.description || '-'}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs">{price.vendorCode}</span>
                          <p className="text-xs text-[var(--text-secondary)] truncate max-w-[150px]">
                            {price.vendorName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(price.unitPrice, price.currency)}
                      </TableCell>
                      <TableCell className="text-right">{price.moq}</TableCell>
                      <TableCell className="text-right">{price.leadTimeDays} days</TableCell>
                      <TableCell className="text-right">
                        {price.landingPct ? `${price.landingPct}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            price.status === 'active' 
                              ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                              : price.status === 'pending'
                                ? 'border-[var(--accent-orange)] text-[var(--accent-orange)]'
                                : 'border-[var(--text-tertiary)] text-[var(--text-tertiary)]'
                          }
                        >
                          {price.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredPrices.length > 100 && (
            <p className="text-sm text-[var(--text-secondary)] p-4 text-center">
              Showing 100 of {filteredPrices.length} prices
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

