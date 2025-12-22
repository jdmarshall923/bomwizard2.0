'use client';

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
import { AlertTriangle, Trash2, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-[var(--accent-red)]/10',
    iconColor: 'text-[var(--accent-red)]',
    confirmBg: 'bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-[var(--accent-orange)]/10',
    iconColor: 'text-[var(--accent-orange)]',
    confirmBg: 'bg-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/90',
  },
  info: {
    icon: HelpCircle,
    iconBg: 'bg-[var(--accent-blue)]/10',
    iconColor: 'text-[var(--accent-blue)]',
    confirmBg: 'bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[var(--bg-secondary)] border-[var(--border-default)]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn('p-3 rounded-full', config.iconBg)}>
              <Icon className={cn('h-6 w-6', config.iconColor)} />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-[var(--text-primary)]">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[var(--text-secondary)] mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-[var(--bg-tertiary)] border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            disabled={isLoading}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(config.confirmBg, 'text-white')}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for using confirm dialog imperatively
import { create } from 'zustand';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  variant: ConfirmDialogVariant;
  onConfirm: () => void | Promise<void>;
  isLoading: boolean;
  open: (options: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => void;
  close: () => void;
  setLoading: (loading: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  title: '',
  description: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger',
  onConfirm: () => {},
  isLoading: false,
  open: (options) =>
    set({
      isOpen: true,
      title: options.title,
      description: options.description,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'danger',
      onConfirm: options.onConfirm,
    }),
  close: () => set({ isOpen: false, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// Provider component to be placed at app root
export function ConfirmDialogProvider() {
  const store = useConfirmStore();

  return (
    <ConfirmDialog
      open={store.isOpen}
      onOpenChange={(open) => {
        if (!open) store.close();
      }}
      title={store.title}
      description={store.description}
      confirmText={store.confirmText}
      cancelText={store.cancelText}
      variant={store.variant}
      onConfirm={async () => {
        store.setLoading(true);
        try {
          await store.onConfirm();
        } finally {
          store.close();
        }
      }}
      isLoading={store.isLoading}
    />
  );
}

// Hook to use confirm dialog
export function useConfirm() {
  const { open } = useConfirmStore();
  
  return {
    confirm: (options: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
      return new Promise<boolean>((resolve) => {
        open({
          ...options,
          onConfirm: async () => {
            await options.onConfirm();
            resolve(true);
          },
        });
      });
    },
  };
}



