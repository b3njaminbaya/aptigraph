import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo } from 'react';
import { useTracker } from '@/state/tracker';
import { useProblems } from '@/data/problems';

interface DifficultyBucket {
  name: string;
  solved: number;
  attempted: number;
  total: number;
}

export default function DifficultyChart() {
  const { entries } = useTracker();
  const { data: problems } = useProblems();

  const data = useMemo(() => {
    const buckets: Record<string, DifficultyBucket> = {
      Easy: { name: 'Easy', solved: 0, attempted: 0, total: 0 },
      Medium: { name: 'Medium', solved: 0, attempted: 0, total: 0 },
      Hard: { name: 'Hard', solved: 0, attempted: 0, total: 0 },
    };
    (problems ?? []).forEach(p => {
      buckets[p.difficulty].total++;
      const entry = entries[p.id];
      if (entry?.status === 'solved') buckets[p.difficulty].solved++;
      if (entry?.status === 'attempted') buckets[p.difficulty].attempted++;
    });
    return Object.values(buckets);
  }, [problems, entries]);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              borderColor: 'hsl(var(--border))',
              borderRadius: 'var(--radius)',
              color: 'hsl(var(--popover-foreground))',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }} />
          <Bar dataKey="solved" name="Solved" stackId="a" fill="hsl(var(--status-good))" radius={[0, 0, 0, 0]} />
          <Bar dataKey="attempted" name="Attempted" stackId="a" fill="hsl(var(--status-warning))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
