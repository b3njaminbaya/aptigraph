import { useMemo } from 'react';
import { useProblems } from '@/data/problems';
import { deriveTopics } from '@/lib/topics';
import { useTracker } from '@/state/tracker';

export default function TopicHeatmap() {
  const { entries } = useTracker();
  const { data: problems } = useProblems();

  const scores = useMemo(() => {
    const list = problems ?? [];
    const topics = deriveTopics(list);
    return topics.map(topic => {
      const related = list.filter(p => p.topics.includes(topic));
      const solved = related.filter(p => entries[p.id]?.status === 'solved').length;
      const ratio = related.length ? solved / related.length : 0;
      return { topic, ratio, solved, total: related.length };
    });
  }, [problems, entries]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {scores.map(({ topic, ratio, solved, total }) => (
        <div key={topic} className="rounded-md p-3 border bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium truncate min-w-0" title={topic}>{topic}</span>
            <span className="text-xs text-muted-foreground font-mono shrink-0 ml-auto">{solved}/{total}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: `hsl(var(--primary))`, opacity: 0.35 + ratio * 0.65 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
