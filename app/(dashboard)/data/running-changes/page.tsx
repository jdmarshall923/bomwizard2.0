'use client';

import { useState, useMemo } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRunningChanges } from '@/lib/hooks/useRunningChanges';
import { 
  importRunningChanges,
  clearRunningChanges,
  deactivateRunningChange,
  reactivateRunningChange,
} from '@/lib/runningChanges/runningChangeService';
import { parseCSV } from '@/lib/import/csvParser';
import { 
  Upload, 
  Search, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Clock,
  ArrowRightLeft,
  Trash2,
  Calendar,
  Users,
  XCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';

export default function RunningChangesPage() {
  const { user } = useAuth();
  const { runningChanges, loading, stats, refresh } = useRunningChanges({ realtime: true });
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    successCount: number;
    errorCount: number;
    errors?: string[];
  } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    setImportResult(null);

    try {
      const parseResult = await parseCSV(file);
      
      const result = await importRunningChanges(
        parseResult.data,
        user.uid,
        file.name
      );
      
      setImportResult({
        success: result.success,
        successCount: result.successCount,
        errorCount: result.errorCount,
        errors: result.errors,
      });

      if (result.successCount > 0) {
        toast.success('Running changes imported', {
          description: `${result.successCount} changes imported successfully.`,
        });
      }

      refresh();
    } catch (err: unknown) {
      console.error('Import failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setImportResult({
        success: false,
        successCount: 0,
        errorCount: 1,
        errors: [message],
      });
      toast.error('Import failed', { description: message });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    setImportResult(null);
    
    try {
      const result = await clearRunningChanges();
      toast.success('Data cleared', {
        description: `${result.deletedCount} running changes deleted.`,
      });
      refresh();
    } catch (err: unknown) {
      console.error('Clear failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Clear failed', { description: message });
    } finally {
      setClearing(false);
    }
  };

  const handleToggleActive = async (changeId: string, isCurrentlyActive: boolean) => {
    try {
      if (isCurrentlyActive) {
        await deactivateRunningChange(changeId);
        toast.success('Change deactivated');
      } else {
        await reactivateRunningChange(changeId);
        toast.success('Change reactivated');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to update change', { description: message });
    }
  };

  const filteredChanges = useMemo(() => {
    let changes = runningChanges;
    
    // Filter by active status
    if (!showInactive) {
      changes = changes.filter(c => c.isActive);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      changes = changes.filter(change => 
        change.cnNumber?.toLowerCase().includes(term) ||
        change.cnDescription?.toLowerCase().includes(term) ||
        change.owner?.toLowerCase().includes(term) ||
        change.assignee?.toLowerCase().includes(term) ||
        change.oldBCodes?.some(code => code.toLowerCase().includes(term)) ||
        change.newBCodes?.some(code => code.toLowerCase().includes(term)) ||
        change.projectCode?.toLowerCase().includes(term)
      );
    }
    
    return changes;
  }, [runningChanges, searchTerm, showInactive]);

  const formatDate = (timestamp: { toDate?: () => Date } | undefined) => {
    if (!timestamp?.toDate) return '-';
    const date = timestamp.toDate();
    return format(date, 'dd/MM/yyyy');
  };

  const getStatusBadge = (change: typeof runningChanges[0]) => {
    if (!change.isActive) {
      return (
        <Badge variant="outline" className="border-[var(--text-tertiary)] text-[var(--text-tertiary)]">
          Inactive
        </Badge>
      );
    }
    
    const goLiveDate = change.estimatedGoLiveDate?.toDate?.();
    if (!goLiveDate) return null;
    
    const now = new Date();
    const isLive = goLiveDate <= now;
    const daysUntil = Math.ceil((goLiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (isLive) {
      return (
        <Badge className="bg-[var(--accent-green)] text-white">
          Live
        </Badge>
      );
    } else if (daysUntil <= 30) {
      return (
        <Badge className="bg-[var(--accent-orange)] text-white">
          {daysUntil} days
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="border-[var(--accent-blue)] text-[var(--accent-blue)]">
          Upcoming
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Running Changes</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Continuous improvement changes that affect B-codes in BOMs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={clearing || runningChanges.length === 0}>
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
                <AlertDialogTitle>Clear All Running Changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {runningChanges.length} running changes. 
                  This action cannot be undone.
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
              Import Running Changes
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
            {importResult.successCount} changes imported
            {importResult.errorCount > 0 && `, ${importResult.errorCount} errors`}
          </p>
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-2 text-sm text-[var(--accent-red)] font-mono max-h-32 overflow-y-auto">
              {importResult.errors.slice(0, 5).map((err, i) => (
                <div key={i}>{err}</div>
              ))}
              {importResult.errors.length > 5 && (
                <div>...and {importResult.errors.length - 5} more errors</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-6 w-6 text-[var(--accent-blue)]" />
              <div>
                <p className="text-xl font-bold">{stats.total}</p>
                <p className="text-xs text-[var(--text-secondary)]">Total Changes</p>
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
                <p className="text-xl font-bold">{stats.upcoming}</p>
                <p className="text-xs text-[var(--text-secondary)]">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-[var(--accent-green)]" />
              <div>
                <p className="text-xl font-bold">{stats.live}</p>
                <p className="text-xs text-[var(--text-secondary)]">Live Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-[var(--text-tertiary)]" />
              <div>
                <p className="text-xl font-bold">{stats.uniqueOldBCodes}</p>
                <p className="text-xs text-[var(--text-secondary)]">B-Codes Affected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search by CN number, description, owner, or B-code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showInactive ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? (
            <Eye className="h-4 w-4 mr-2" />
          ) : (
            <EyeOff className="h-4 w-4 mr-2" />
          )}
          {showInactive ? 'Showing All' : 'Show Inactive'}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border border-[var(--border-subtle)] overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--bg-secondary)]/50">
                  <TableHead>CN Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Old B-Codes</TableHead>
                  <TableHead>New B-Codes</TableHead>
                  <TableHead>Go-Live Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredChanges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-[var(--text-secondary)]">
                      {runningChanges.length === 0 
                        ? 'No running changes imported yet. Upload a CSV to get started.' 
                        : 'No running changes match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChanges.map((change) => (
                    <TableRow key={change.id} className={!change.isActive ? 'opacity-50' : ''}>
                      <TableCell className="font-mono font-medium">{change.cnNumber}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{change.cnDescription || '-'}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{change.cnDescription}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span>{change.owner || '-'}</span>
                          {change.assignee && (
                            <p className="text-xs text-[var(--text-secondary)]">
                              Assignee: {change.assignee}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {change.oldBCodes?.map((code, i) => (
                            <Badge key={i} variant="outline" className="font-mono text-xs">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {change.newBCodes?.map((code, i) => (
                            <Badge key={i} variant="outline" className="font-mono text-xs border-[var(--accent-green)] text-[var(--accent-green)]">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(change.estimatedGoLiveDate)}
                      </TableCell>
                      <TableCell>{getStatusBadge(change)}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleActive(change.id, change.isActive)}
                              >
                                {change.isActive ? (
                                  <XCircle className="h-4 w-4 text-[var(--text-tertiary)]" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-[var(--accent-green)]" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {change.isActive ? 'Deactivate' : 'Reactivate'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredChanges.length > 100 && (
            <p className="text-sm text-[var(--text-secondary)] p-4 text-center">
              Showing all {filteredChanges.length} changes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
