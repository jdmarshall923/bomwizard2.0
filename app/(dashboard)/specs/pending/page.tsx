'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spec } from '@/types/spec';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { SpecStatusBadge } from '@/components/spec/SpecStatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  XCircle,
  Eye,
  GitCompare,
  User,
  Calendar,
  Bike,
  Inbox
} from 'lucide-react';
import { toast } from 'sonner';

// Mock data for pending specs (would come from API)
const mockPendingSpecs: (Spec & { projectName: string })[] = [
  {
    id: 'spec-1',
    projectId: 'proj-1',
    projectName: 'MY2025 Trail Master',
    status: 'submitted',
    version: 1,
    header: {
      projectName: 'MY2025 Trail Master',
      bikeType: 'Mountain',
      productFamily: 'Turbo',
      modelYear: '2025',
    },
    timeline: {
      orderingOpenWeek: 'W12',
      productionWeek: 'W28',
    },
    categories: [],
    colourOptions: [],
    submittedBy: 'john.doe@company.com',
    submittedAt: new Date() as unknown as import('firebase/firestore').Timestamp,
    createdAt: new Date() as unknown as import('firebase/firestore').Timestamp,
    createdBy: 'john.doe@company.com',
    updatedAt: new Date() as unknown as import('firebase/firestore').Timestamp,
    updatedBy: 'john.doe@company.com',
  },
  {
    id: 'spec-2',
    projectId: 'proj-2',
    projectName: 'MY2025 Road Elite',
    status: 'submitted',
    version: 2,
    header: {
      projectName: 'MY2025 Road Elite',
      bikeType: 'Road',
      productFamily: 'Aethos',
      modelYear: '2025',
    },
    timeline: {
      orderingOpenWeek: 'W14',
      productionWeek: 'W30',
    },
    categories: [],
    colourOptions: [],
    submittedBy: 'jane.smith@company.com',
    submittedAt: new Date() as unknown as import('firebase/firestore').Timestamp,
    createdAt: new Date() as unknown as import('firebase/firestore').Timestamp,
    createdBy: 'jane.smith@company.com',
    updatedAt: new Date() as unknown as import('firebase/firestore').Timestamp,
    updatedBy: 'jane.smith@company.com',
  },
];

export default function PendingSpecsPage() {
  const router = useRouter();
  const [pendingSpecs, setPendingSpecs] = useState<(Spec & { projectName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpec, setSelectedSpec] = useState<Spec | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  useEffect(() => {
    // Simulate loading pending specs
    const timer = setTimeout(() => {
      setPendingSpecs(mockPendingSpecs);
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleView = (spec: Spec & { projectName: string }) => {
    router.push(`/project/${spec.projectId}/spec`);
  };
  
  const handleCompare = (spec: Spec & { projectName: string }) => {
    router.push(`/project/${spec.projectId}/spec/compare`);
  };
  
  const handleAccept = async (spec: Spec & { projectName: string }) => {
    setProcessingId(spec.id);
    try {
      // TODO: Call acceptSpec service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPendingSpecs(prev => prev.filter(s => s.id !== spec.id));
      toast.success(`Spec "${spec.header.projectName}" accepted`);
    } catch (error) {
      toast.error('Failed to accept spec');
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleReject = (spec: Spec & { projectName: string }) => {
    setSelectedSpec(spec);
    setRejectReason('');
    setShowRejectDialog(true);
  };
  
  const confirmReject = async () => {
    if (!selectedSpec || !rejectReason.trim()) return;
    
    setProcessingId(selectedSpec.id);
    try {
      // TODO: Call rejectSpec service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPendingSpecs(prev => prev.filter(s => s.id !== selectedSpec.id));
      setShowRejectDialog(false);
      setSelectedSpec(null);
      toast.success(`Spec "${selectedSpec.header.projectName}" rejected`);
    } catch (error) {
      toast.error('Failed to reject spec');
    } finally {
      setProcessingId(null);
    }
  };
  
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck size={24} />
          Pending Specs
        </h1>
        <p className="text-muted-foreground">
          Review and approve submitted spec sheets
        </p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{pendingSpecs.length}</p>
              </div>
              <ClipboardCheck size={24} className="text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted Today</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected Today</p>
                <p className="text-2xl font-bold">1</p>
              </div>
              <XCircle size={24} className="text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Pending specs list */}
      {pendingSpecs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox size={64} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Pending Specs</h2>
            <p className="text-muted-foreground">
              All submitted specs have been reviewed. Check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Project</TableHead>
                  <TableHead className="w-[15%]">Bike Type</TableHead>
                  <TableHead className="w-[15%]">Submitted By</TableHead>
                  <TableHead className="w-[15%]">Submitted</TableHead>
                  <TableHead className="w-[10%]">Version</TableHead>
                  <TableHead className="w-[20%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingSpecs.map((spec) => (
                  <TableRow key={spec.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{spec.header.projectName}</p>
                        <p className="text-sm text-muted-foreground">
                          {spec.header.productFamily} • {spec.header.modelYear}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Bike size={12} />
                        {spec.header.bikeType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-muted-foreground" />
                        <span className="text-sm">{spec.submittedBy}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-muted-foreground" />
                        <span className="text-sm">
                          {spec.submittedAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">v{spec.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleView(spec)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCompare(spec)}
                        >
                          <GitCompare size={14} className="mr-1" />
                          Compare
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleReject(spec)}
                          disabled={processingId === spec.id}
                        >
                          <XCircle size={14} className="mr-1" />
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleAccept(spec)}
                          disabled={processingId === spec.id}
                        >
                          <CheckCircle2 size={14} className="mr-1" />
                          Accept
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* Reject dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Spec</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this spec. The submitter will be notified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium">{selectedSpec?.header.projectName}</p>
              <p className="text-sm text-muted-foreground">
                Submitted by {selectedSpec?.submittedBy}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                placeholder="Please explain why this spec is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectReason.trim() || processingId !== null}
            >
              {processingId ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

