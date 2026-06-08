import React from 'react';
import { cn } from '@/lib/utils';

type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';

interface StatusBadgeProps {
  children?: React.ReactNode;
  status?: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  default: 'bg-slate-800 text-slate-300 border-slate-700',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

const statusMap: Record<string, { variant: StatusVariant; label: string }> = {
  // Projects
  planning: { variant: 'info', label: 'Planning' },
  active: { variant: 'success', label: 'Active' },
  on_hold: { variant: 'warning', label: 'On Hold' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'error', label: 'Cancelled' },

  // Sites
  setup: { variant: 'info', label: 'Setup' },
  suspended: { variant: 'warning', label: 'Suspended' },
  closed: { variant: 'error', label: 'Closed' },

  // Workfronts / Tasks
  pending: { variant: 'default', label: 'Pending' },
  in_progress: { variant: 'info', label: 'In Progress' },
  blocked: { variant: 'error', label: 'Blocked' },

  // PR / PO / MB
  draft: { variant: 'default', label: 'Draft' },
  pending_approval: { variant: 'warning', label: 'Pending Approval' },
  approved: { variant: 'success', label: 'Approved' },
  sent_to_vendor: { variant: 'purple', label: 'Sent to Vendor' },
  partially_received: { variant: 'info', label: 'Partially Received' },
  fully_received: { variant: 'success', label: 'Fully Received' },
};

function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const StatusBadge = ({ children, status, variant, className }: StatusBadgeProps) => {
  let resolvedVariant: StatusVariant = variant || 'default';
  let resolvedLabel: React.ReactNode = children;

  if (status) {
    const mapped = statusMap[status.toLowerCase()];
    if (mapped) {
      resolvedVariant = variant || mapped.variant;
      resolvedLabel = children || mapped.label;
    } else {
      resolvedLabel = children || formatStatus(status);
    }
  }

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap",
      variantStyles[resolvedVariant],
      className
    )}>
      {resolvedLabel}
    </span>
  );
};

