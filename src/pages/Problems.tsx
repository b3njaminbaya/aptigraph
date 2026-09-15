import { useEffect, useMemo, useState } from 'react';
import { useProblems, ProblemRow } from '@/data/problems';
import { deriveTopics } from '@/lib/topics';
import { useTracker } from '@/state/tracker';
import { useAuth } from '@/state/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setPageMetadata } from '@/lib/seo';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { ProblemStatusIcon } from '@/components/ProblemStatusIcon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const DEFAULT_MINUTES = 30;

export default function Problems() {
  useEffect(() => setPageMetadata('Aptigraph – Problems', 'Search and track LeetCode problems by difficulty and topic.', '/problems'), []);
  const { user } = useAuth();
  const { data: problems, isLoading: problemsLoading } = useProblems();
  const { entries, logAttempt, setNotes, resetProblem } = useTracker();
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<string>('All');
  const [topic, setTopic] = useState<string>('All');
  const [minutesByProblem, setMinutesByProblem] = useState<Record<number, number>>({});

  const allTopics = useMemo(() => deriveTopics(problems ?? []), [problems]);

  const list = useMemo(() => (problems ?? []).filter(p => {
    const okQ = !query || p.title.toLowerCase().includes(query.toLowerCase());
    const okD = difficulty === 'All' || p.difficulty === difficulty;
    const okT = topic === 'All' || p.topics.includes(topic);
    return okQ && okD && okT;
  }), [problems, query, difficulty, topic]);

  const minutesFor = (problemId: number) => minutesByProblem[problemId] ?? DEFAULT_MINUTES;

  const onSolved = (p: ProblemRow) => {
    logAttempt(p.id, minutesFor(p.id), 'solved', () => toast.success(`Marked "${p.title}" as solved`));
  };
  const onAttempted = (p: ProblemRow) => {
    logAttempt(p.id, minutesFor(p.id), 'attempted', () => toast('Logged an attempt'));
  };
  const onReset = (p: ProblemRow) => {
    resetProblem(p.id, () => toast.success(`Reset progress on "${p.title}"`));
  };

  return (
    <main className="min-h-screen">
      <section className="container py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Problems</h1>
          <p className="text-muted-foreground mt-1">Search, filter, and log your progress</p>
        </header>

        {!user && (
          <div className="mb-6 rounded-lg border p-4 bg-card text-sm">
            <Link to="/auth" className="font-medium story-link">Sign in</Link> to save your progress — you can still browse the catalog below.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-4 mb-6">
          <Input placeholder="Search by title…" value={query} onChange={e=>setQuery(e.target.value)} className="md:col-span-2" />
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              {['All','Easy','Medium','Hard'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              {['All',...allTopics].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {problemsLoading ? (
          <p className="text-muted-foreground">Loading problems…</p>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No problems match your filters</p>
            <p className="text-sm text-muted-foreground">Try a different search term, difficulty, or topic.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map(p => {
              const entry = entries[p.id];
              return (
                <li key={p.id} className="border rounded-lg p-4 bg-card transition-shadow hover:shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <ProblemStatusIcon status={entry?.status ?? 'unsolved'} className="mt-1 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a href={p.url} target="_blank" rel="noreferrer" className="font-medium story-link">{p.title}</a>
                          <DifficultyBadge difficulty={p.difficulty} />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.topics.map((t) => (
                            <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                              {t}
                            </span>
                          ))}
                        </div>
                        {entry?.notes ? <p className="text-sm mt-2 text-muted-foreground">{entry.notes}</p> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="secondary" disabled={!user} onClick={() => onAttempted(p)}>Attempted</Button>
                      <Button variant="hero" disabled={!user} onClick={() => onSolved(p)}>Solved</Button>
                      {entry && (entry.status !== 'unsolved' || entry.attempts > 0) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={!user}>Reset</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reset progress on "{p.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This clears its status, notes, and review schedule. Your attempt
                                history stays intact for your streak and analytics.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onReset(p)}>Reset</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                    <Input
                      placeholder="Add notes…"
                      disabled={!user}
                      onBlur={(e) => setNotes(p.id, e.target.value)}
                      defaultValue={entry?.notes || ''}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <label htmlFor={`minutes-${p.id}`} className="text-sm text-muted-foreground whitespace-nowrap">
                        Minutes
                      </label>
                      <Input
                        id={`minutes-${p.id}`}
                        type="number"
                        min={0}
                        disabled={!user}
                        value={minutesFor(p.id)}
                        onChange={(e) =>
                          setMinutesByProblem((prev) => ({
                            ...prev,
                            [p.id]: Math.max(0, parseInt(e.target.value || '0', 10)),
                          }))
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground font-mono whitespace-nowrap">
                        {entry?.attempts || 0} attempt{entry?.attempts === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
