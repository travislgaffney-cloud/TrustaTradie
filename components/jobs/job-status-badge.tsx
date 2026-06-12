import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { JobStatus } from '@/types/database';

const STATUS_CONFIG: Record<JobStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  open: { label: 'Open', variant: 'info' },
  quotes_received: { label: 'Quotes Received', variant: 'warning' },
  accepted: { label: 'Quote Accepted', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'info' },
  pending_completion: { label: 'Awaiting Approval', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
  disputed: { label: 'Disputed', variant: 'error' },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'default' as const };
  return <Badge label={config.label} variant={config.variant} />;
}
