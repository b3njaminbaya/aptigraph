import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/state/auth';

export interface DueReviewItem {
  problemId: number;
  title: string;
  difficulty: string;
  nextReviewAt: string;
}

export function useDueForReview(limit = 5) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['due_for_review', userId, limit],
    queryFn: async (): Promise<DueReviewItem[]> => {
      const { data, error } = await supabase
        .from('user_problem_status')
        .select('problem_id, next_review_at, problems(title, difficulty)')
        .eq('user_id', userId as string)
        .eq('status', 'solved')
        .not('next_review_at', 'is', null)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true })
        .limit(limit);
      if (error) throw error;

      return data.map((row) => ({
        problemId: row.problem_id,
        title: row.problems?.title ?? 'Unknown problem',
        difficulty: row.problems?.difficulty ?? '',
        nextReviewAt: row.next_review_at as string,
      }));
    },
    enabled: !!userId,
  });
}
