'use client';

import { Badge } from '@/components/ui/badge';
import { SpecStatus } from '@/types/spec';
import { 
  FileEdit, 
  Send, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Archive 
} from 'lucide-react';

interface SpecStatusBadgeProps {
  status: SpecStatus;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const statusConfig: Record<SpecStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  Icon: typeof FileEdit;
}> = {
  draft: {
    label: 'Draft',
    variant: 'secondary',
    className: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200',
    Icon: FileEdit,
  },
  submitted: {
    label: 'Submitted',
    variant: 'default',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200',
    Icon: Send,
  },
  in_review: {
    label: 'In Review',
    variant: 'default',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200',
    Icon: Eye,
  },
  accepted: {
    label: 'Accepted',
    variant: 'default',
    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    Icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200',
    Icon: XCircle,
  },
  archived: {
    label: 'Archived',
    variant: 'outline',
    className: 'bg-gray-50 text-gray-500 hover:bg-gray-50 border-gray-200',
    Icon: Archive,
  },
};

export function SpecStatusBadge({ 
  status, 
  showIcon = true,
  size = 'default' 
}: SpecStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.Icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };
  
  const iconSizes = {
    sm: 12,
    default: 14,
    lg: 16,
  };
  
  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} font-medium`}
    >
      {showIcon && (
        <Icon size={iconSizes[size]} className="mr-1.5" />
      )}
      {config.label}
    </Badge>
  );
}

