'use client';

import { BomVersion } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, User, FileText, TrendingUp } from 'lucide-react';

interface VersionCardProps {
  version: BomVersion;
  onClick?: () => void;
  isSelected?: boolean;
}

export function VersionCard({ version, onClick, isSelected }: VersionCardProps) {
  const getTriggerBadge = (trigger: BomVersion['trigger']) => {
    const config: Record<BomVersion['trigger'], { label: string; className: string }> = {
      import: { label: 'Import', className: 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]' },
      manual: { label: 'Manual', className: 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' },
      transfer: { label: 'Transfer', className: 'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]' },
      price_update: { label: 'Price Update', className: 'bg-purple-500/20 text-purple-400' },
      bulk_edit: { label: 'Bulk Edit', className: 'bg-amber-500/20 text-amber-400' },
      scheduled: { label: 'Scheduled', className: 'bg-cyan-500/20 text-cyan-400' },
    };
    const { label, className } = config[trigger];
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <Card
      className={`
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:bg-[var(--bg-tertiary)]' : ''}
        ${isSelected ? 'ring-2 ring-[var(--accent-blue)] bg-[var(--bg-tertiary)]' : ''}
      `}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Version {version.versionNumber}
            {version.versionName && (
              <span className="ml-2 font-normal text-[var(--text-secondary)]">
                - {version.versionName}
              </span>
            )}
          </CardTitle>
          {getTriggerBadge(version.trigger)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Calendar className="h-4 w-4" />
            <span>
              {version.createdAt && format(version.createdAt.toDate(), 'PPp')}
            </span>
          </div>
          
          {version.createdByName && (
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <User className="h-4 w-4" />
              <span>{version.createdByName}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--accent-green)]" />
            <span className="font-medium">
              £{version.summary?.totalExtendedCost?.toLocaleString('en-GB', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              }) || '0.00'}
            </span>
            <span className="text-[var(--text-tertiary)]">
              ({version.summary?.totalItems || 0} items)
            </span>
          </div>
          
          {version.description && (
            <div className="flex items-start gap-2 text-[var(--text-secondary)]">
              <FileText className="h-4 w-4 mt-0.5" />
              <span className="line-clamp-2">{version.description}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
