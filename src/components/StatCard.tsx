import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, hint, className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-3xl font-bold font-mono mt-2">{value}</div>
      {hint && <p className="text-sm text-muted-foreground mt-2">{hint}</p>}
    </div>
  );
}
