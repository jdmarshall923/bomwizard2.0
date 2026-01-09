'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AffectedBomItem } from '@/types/runningChange';
import { replaceWithNewBCode } from '@/lib/runningChanges/matchingService';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  ArrowRight, 
  RefreshCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RunningChangesPanelProps {
  /** Project ID */
  projectId: string;
  /** List of affected BOM items */
  affectedItems: AffectedBomItem[];
  /** Loading state */
  loading?: boolean;
  /** Callback when panel should close */
  onClose?: () => void;
  /** Callback after a replacement is made (to refresh BOM) */
  onReplacement?: () => void;
  /** Optional className */
  className?: string;
}

/**
 * Panel showing affected parts and allowing replacement
 */
export function RunningChangesPanel({
  projectId,
  affectedItems,
  loading = false,
  onClose,
  onReplacement,
  className,
}: RunningChangesPanelProps) {
  const { user } = useAuth();
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<AffectedBomItem | null>(null);

  const handleReplace = async (item: AffectedBomItem, skipConfirm = false) => {
    // If this is an "After DTx" change and we haven't confirmed, show dialog
    if (item.isAfterDtx && !skipConfirm) {
      setConfirmItem(item);
      return;
    }

    if (!user) {
      toast.error('You must be logged in to make changes');
      return;
    }

    setReplacingId(item.bomItemId);
    
    try {
      await replaceWithNewBCode(
        projectId,
        item.bomItemId,
        item.oldBCode,
        item.newBCode,
        item.runningChangeId,
        item.cnNumber,
        user.uid,
        user.displayName || user.email || undefined
      );
      
      toast.success('Part replaced', {
        description: `${item.oldBCode} → ${item.newBCode}`,
      });
      
      onReplacement?.();
    } catch (error) {
      console.error('Failed to replace part:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to replace part', { description: message });
    } finally {
      setReplacingId(null);
      setConfirmItem(null);
    }
  };

  const getStatusBadge = (item: AffectedBomItem) => {
    if (item.isLive) {
      return (
        <Badge className="bg-[var(--accent-green)] text-white">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Live
        </Badge>
      );
    } else if (item.isAfterDtx) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-[var(--accent-orange)] text-white">
                <AlertTriangle className="h-3 w-3 mr-1" />
                After DTx
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go-live date is after your project&apos;s DTx</p>
              <p>Consider keeping the current B-code</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      return (
        <Badge variant="outline" className="border-[var(--accent-blue)] text-[var(--accent-blue)]">
          <Clock className="h-3 w-3 mr-1" />
          {item.daysUntilGoLive} days
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <Card className={cn('border-[var(--accent-orange)]/30', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCcw className="h-5 w-5 text-[var(--accent-orange)] animate-spin" />
            Loading Running Changes...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (affectedItems.length === 0) {
    return (
      <Card className={cn('border-[var(--accent-green)]/30', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-[var(--accent-green)]" />
              No Running Changes Affect This BOM
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            All parts in your BOM are up to date with the current running changes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('border-[var(--accent-orange)]/30', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-[var(--accent-orange)]" />
              Running Changes ({affectedItems.length})
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            These parts are affected by active running changes. Replace them to apply the change.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--bg-secondary)]/50">
                  <TableHead>Current B-Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>CN Number</TableHead>
                  <TableHead>New B-Code</TableHead>
                  <TableHead>Go-Live</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affectedItems.map((item) => (
                  <TableRow key={`${item.bomItemId}-${item.runningChangeId}`}>
                    <TableCell className="font-mono font-medium">
                      {item.bomItemCode}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{item.bomItemDescription}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{item.bomItemDescription}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-mono text-sm">{item.cnNumber}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{item.cnDescription}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono border-[var(--accent-green)] text-[var(--accent-green)]">
                        {item.newBCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(item.goLiveDate, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(item)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleReplace(item)}
                        disabled={replacingId === item.bomItemId}
                        className={cn(
                          item.isAfterDtx
                            ? 'bg-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/90'
                            : 'bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90'
                        )}
                      >
                        {replacingId === item.bomItemId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Replace
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for After DTx changes */}
      <AlertDialog open={!!confirmItem} onOpenChange={() => setConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--accent-orange)]" />
              After DTx Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This running change goes live on{' '}
                <strong>{confirmItem && format(confirmItem.goLiveDate, 'dd MMMM yyyy')}</strong>,
                which is after your project&apos;s DTx date.
              </p>
              <p>
                Consider keeping the current B-code ({confirmItem?.oldBCode}) if you need to
                complete DTx before this change is active.
              </p>
              <p className="font-medium">
                Are you sure you want to replace with {confirmItem?.newBCode}?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Current</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmItem && handleReplace(confirmItem, true)}
              className="bg-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/90"
            >
              Replace Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
