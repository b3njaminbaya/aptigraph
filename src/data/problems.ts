import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Difficulty } from '@/state/tracker';

export interface ProblemRow {
  id: number;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  url: string;
}

export function useProblems() {
  return useQuery({
    queryKey: ['problems'],
    queryFn: async () => {
      const { data, error } = await supabase.from('problems').select('*').order('id');
      if (error) throw error;
      return data.map((row) => ({
        id: row.id,
        title: row.title,
        difficulty: row.difficulty as Difficulty,
        topics: row.topics,
        url: row.url,
      })) satisfies ProblemRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
