import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderboardEntry {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalSolved: number;
  lastActiveAt: string | null;
}

export function useLeaderboard(options?: { limit?: number; userIds?: string[] }) {
  const limit = options?.limit ?? 100;
  const userIds = options?.userIds;
  const scoped = userIds !== undefined;

  return useQuery({
    queryKey: ['leaderboard', limit, scoped ? [...userIds].sort() : 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        limit_count: limit,
        filter_user_ids: userIds,
      });
      if (error) throw error;
      return data.map((row) => ({
        userId: row.user_id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        totalSolved: Number(row.total_solved),
        lastActiveAt: row.last_active_at,
      })) satisfies LeaderboardEntry[];
    },
    enabled: !scoped || userIds.length > 0,
  });
}
