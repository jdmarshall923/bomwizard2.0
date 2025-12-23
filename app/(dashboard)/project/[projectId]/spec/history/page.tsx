'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSpec, useSpecHistory } from '@/lib/hooks/useSpec';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SpecStatusBadge } from '@/components/spec/SpecStatusBadge';
import { 
  History, 
  ArrowLeft,
  User,
  Clock,
  FileEdit,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

export default function SpecHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const { spec, loading: specLoading } = useSpec(projectId, 'current-user');
  const { history, loading: historyLoading, revertTo } = useSpecHistory(
    projectId,
    spec?.id || '',
    'current-user'
  );
  
  const handleBack = () => {
    router.push(`/project/${projectId}/spec`);
  };
  
  const handleRevert = async (version: number) => {
    if (!confirm(`Revert to version ${version}? This will create a new draft version.`)) {
      return;
    }
    
    try {
      await revertTo(version);
      toast.success(`Reverted to version ${version}`);
    } catch (error) {
      toast.error('Failed to revert');
    }
  };
  
  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'created': return FileEdit;
      case 'submitted': return Send;
      case 'accepted': return CheckCircle2;
      case 'rejected': return XCircle;
      case 'edited': return FileEdit;
      default: return FileEdit;
    }
  };
  
  const getChangeColor = (type: string) => {
    switch (type) {
      case 'created': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'submitted': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'accepted': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-300';
      case 'edited': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };
  
  if (specLoading || historyLoading) {
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
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
          <ArrowLeft size={16} className="mr-1" />
          Back to Spec
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History size={24} />
          Spec History
        </h1>
        <p className="text-muted-foreground">
          View all changes made to this spec
        </p>
      </div>
      
      {/* Current version info */}
      {spec && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{spec.header.projectName}</h3>
                <p className="text-sm text-muted-foreground">
                  Current Version: {spec.version}
                </p>
              </div>
              <SpecStatusBadge status={spec.status} />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* History timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History size={48} className="mx-auto mb-4 opacity-50" />
              <p>No history available</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
              
              {/* Timeline items */}
              <div className="space-y-6">
                {history.map((change, index) => {
                  const Icon = getChangeIcon(change.changeType);
                  const colorClass = getChangeColor(change.changeType);
                  
                  return (
                    <div key={change.id} className="relative flex gap-4">
                      {/* Icon */}
                      <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${colorClass}`}>
                        <Icon size={20} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 bg-muted/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={colorClass}>
                              {change.changeType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Version {change.version}
                            </span>
                          </div>
                          {index > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRevert(change.version)}
                            >
                              <RotateCcw size={14} className="mr-1" />
                              Revert to this
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User size={14} />
                            <span>{change.changedBy}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>
                              {change.changedAt?.toDate?.()?.toLocaleString() || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        
                        {change.notes && (
                          <p className="mt-2 text-sm">{change.notes}</p>
                        )}
                        
                        {change.changes.length > 0 && (
                          <div className="mt-3 pt-3 border-t space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Changes:
                            </p>
                            {change.changes.slice(0, 5).map((c, i) => (
                              <p key={i} className="text-xs text-muted-foreground">
                                • {c.field}: {String(c.oldValue)} → {String(c.newValue)}
                              </p>
                            ))}
                            {change.changes.length > 5 && (
                              <p className="text-xs text-muted-foreground">
                                +{change.changes.length - 5} more changes
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

