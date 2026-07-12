import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/state/auth';

export interface Profile {
  displayName: string | null;
  avatarUrl: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId as string)
        .single();
      if (error) throw error;
      return { displayName: data.display_name, avatarUrl: data.avatar_url };
    },
    enabled: !!userId,
  });
}
