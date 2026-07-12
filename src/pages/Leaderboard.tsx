import { useEffect } from 'react';
import { setPageMetadata } from '@/lib/seo';
import { useAuth } from '@/state/auth';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/lib/avatar';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const rankStyles: Record<number, string> = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-zinc-300 text-zinc-900 dark:bg-zinc-400',
  3: 'bg-orange-400 text-orange-950',
};

export default function Leaderboard() {
  useEffect(() => setPageMetadata('Aptigraph – Leaderboard', 'Global ranking based on problems solved.', '/leaderboard'), []);
  const { user } = useAuth();
  const { data: entries, isLoading } = useLeaderboard({ limit: 50 });

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Leaderboard</h1>
      <p className="text-muted-foreground mb-6">Global ranking by problems solved.</p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading leaderboard…</p>
      ) : !entries || entries.length === 0 ? (
        <div className="rounded-lg border p-6 bg-card">No one has solved a problem yet — be the first.</div>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, index) => {
            const rank = index + 1;
            return (
              <li
                key={entry.userId}
                className={`flex items-center gap-4 rounded-lg border p-4 bg-card transition-shadow hover:shadow-sm ${entry.userId === user?.id ? 'ring-2 ring-primary' : ''}`}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold',
                    rankStyles[rank] ?? 'bg-muted text-muted-foreground'
                  )}
                >
                  {rank}
                </span>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={resolveAvatarUrl(entry.userId, entry.avatarUrl)} />
                  <AvatarFallback>{(entry.displayName ?? '?').slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 font-medium">
                  {entry.displayName ?? 'Anonymous'}
                  {entry.userId === user?.id ? <span className="text-muted-foreground font-normal"> (you)</span> : null}
                </span>
                {rank === 1 && <Trophy className="h-4 w-4 text-amber-400" />}
                <span className="text-sm text-muted-foreground font-mono">{entry.totalSolved} solved</span>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
