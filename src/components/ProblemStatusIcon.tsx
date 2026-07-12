import { CheckCircle2, Circle, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProblemStatus } from '@/state/tracker';

export function ProblemStatusIcon({ status, className }: { status: ProblemStatus; className?: string }) {
  if (status === 'solved') return <CheckCircle2 className={cn('h-4 w-4 text-status-good', className)} />;
  if (status === 'attempted') return <CircleDot className={cn('h-4 w-4 text-status-warning', className)} />;
  return <Circle className={cn('h-4 w-4 text-muted-foreground', className)} />;
}
