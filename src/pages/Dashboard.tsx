import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Clock, Flame, Sparkles, Target } from 'lucide-react';
import DifficultyChart from '@/components/analytics/DifficultyChart';
import TopicHeatmap from '@/components/analytics/TopicHeatmap';
import { useTracker } from '@/state/tracker';
import { setPageMetadata } from '@/lib/seo';
import { nextMilestone } from '@/lib/milestones';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useDueForReview } from '@/hooks/useDueForReview';
import { StatCard } from '@/components/StatCard';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';

export default function Dashboard() {
  const { totalSolved, currentStreak } = useTracker();
  const remainingToMilestone = nextMilestone(totalSolved) - totalSolved;
  const { data: recommendations, isLoading: recommendationsLoading } = useRecommendations();
  const { data: dueForReview, isLoading: dueForReviewLoading } = useDueForReview();
  useEffect(() => setPageMetadata('Aptigraph – Dashboard', 'Your coding progress, streaks, and insights in one place.', '/dashboard'), []);

  return (
    <main>
      <section className="container py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your LeetCode journey</p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <StatCard icon={CheckCircle2} label="Solved" value={totalSolved} hint="Keep it up!" />
          <StatCard
            icon={Flame}
            label="Current Streak"
            value={`${currentStreak} day${currentStreak === 1 ? '' : 's'}`}
            hint="Aim for consistency"
          />
          <StatCard
            icon={Target}
            label="Next Goal"
            value={`+${remainingToMilestone} solved`}
            hint="Unlock a milestone badge"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Sparkles className="h-4 w-4 text-primary" /> Recommended for you
            </h2>
            {recommendationsLoading ? (
              <p className="text-sm text-muted-foreground">Loading recommendations…</p>
            ) : !recommendations || recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Solve a few problems to get personalized recommendations.
              </p>
            ) : (
              <ul className="space-y-3">
                {recommendations.map((rec) => (
                  <li key={rec.problemId} className="flex items-start justify-between gap-3">
                    <div>
                      <Link to="/problems" className="font-medium story-link">{rec.title}</Link>
                      <div className="text-xs text-muted-foreground mt-1">
                        {rec.reasonTopic && rec.reasonSolveRate !== null
                          ? `Because you're at ${Math.round(rec.reasonSolveRate * 100)}% on ${rec.reasonTopic}`
                          : 'A good place to start'}
                      </div>
                    </div>
                    <DifficultyBadge difficulty={rec.difficulty} className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Clock className="h-4 w-4 text-primary" /> Due for review
            </h2>
            {dueForReviewLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !dueForReview || dueForReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due — solved problems will show up here for spaced review.</p>
            ) : (
              <ul className="space-y-3">
                {dueForReview.map((item) => (
                  <li key={item.problemId} className="flex items-start justify-between gap-3">
                    <div>
                      <Link to="/problems" className="font-medium story-link">{item.title}</Link>
                      <div className="text-xs text-muted-foreground mt-1">
                        Due {formatDistanceToNow(new Date(item.nextReviewAt), { addSuffix: true })}
                      </div>
                    </div>
                    <DifficultyBadge difficulty={item.difficulty} className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Difficulty Heatmap</h2>
            <DifficultyChart />
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Topic Strengths</h2>
            <TopicHeatmap />
          </div>
        </div>
      </section>
    </main>
  );
}
