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

export default function Problems() {
  useEffect(() => setPageMetadata('Aptigraph – Problems', 'Search and track LeetCode problems by difficulty and topic.', '/problems'), []);
  const { user } = useAuth();
  const { data: problems, isLoading: problemsLoading } = useProblems();
  const { entries, logAttempt, setNotes } = useTracker();
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<string>('All');
  const [topic, setTopic] = useState<string>('All');
  const [time, setTime] = useState<number>(30);

  const allTopics = useMemo(() => deriveTopics(problems ?? []), [problems]);

  const list = useMemo(() => (problems ?? []).filter(p => {
    const okQ = !query || p.title.toLowerCase().includes(query.toLowerCase());
    const okD = difficulty === 'All' || p.difficulty === difficulty;
    const okT = topic === 'All' || p.topics.includes(topic);
    return okQ && okD && okT;
  }), [problems, query, difficulty, topic]);

  const onSolved = (p: ProblemRow) => { logAttempt(p.id, time, 'solved'); toast.success(`Marked "${p.title}" as solved`); };
  const onAttempted = (p: ProblemRow) => { logAttempt(p.id, time, 'attempted'); toast('Logged an attempt'); };

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

        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Attempt time (min)</label>
          <Input type="number" value={time} onChange={e=>setTime(parseInt(e.target.value||'0'))} className="w-28" />
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
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <Input placeholder="Add notes…" disabled={!user} onBlur={(e)=>setNotes(p.id, e.target.value)} defaultValue={entry?.notes||''} />
                    <div className="text-sm text-muted-foreground self-center font-mono">
                      {entry?.attempts || 0} attempt{entry?.attempts === 1 ? '' : 's'}
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
