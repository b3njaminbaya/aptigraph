import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  Easy: 'bg-status-good/10 text-status-good border-status-good/20',
  Medium: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  Hard: 'bg-status-critical/10 text-status-critical border-status-critical/20',
};

export function DifficultyBadge({ difficulty, className }: { difficulty: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        styles[difficulty] ?? 'bg-muted text-muted-foreground border-border',
        className
      )}
    >
      {difficulty}
    </span>
  );
}
