import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/state/auth';

export interface Recommendation {
  problemId: number;
  title: string;
  difficulty: string;
  topics: string[];
  reasonTopic: string | null;
  reasonSolveRate: number | null;
}

export function useRecommendations(limit = 5) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['recommendations', userId, limit],
    queryFn: async (): Promise<Recommendation[]> => {
      const { data, error } = await supabase.rpc('get_recommendations', { limit_count: limit });
      if (error) throw error;

      if (data.length > 0) {
        return data.map((row) => ({
          problemId: row.problem_id,
          title: row.title,
          difficulty: row.difficulty,
          topics: row.topics,
          reasonTopic: row.reason_topic,
          reasonSolveRate: row.reason_solve_rate,
        }));
      }

      // No weak topics yet (user hasn't attempted anything) — suggest a
      // starting point instead of an empty list.
      const { data: fallback, error: fallbackError } = await supabase
        .from('problems')
        .select('id, title, difficulty, topics')
        .eq('difficulty', 'Easy')
        .order('id')
        .limit(limit);
      if (fallbackError) throw fallbackError;

      return fallback.map((p) => ({
        problemId: p.id,
        title: p.title,
        difficulty: p.difficulty,
        topics: p.topics,
        reasonTopic: null,
        reasonSolveRate: null,
      }));
    },
    enabled: !!userId,
  });
}
