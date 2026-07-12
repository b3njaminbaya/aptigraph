import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/state/auth';

export interface FriendProfile {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface FriendsData {
  friends: FriendProfile[];
  incomingRequests: FriendProfile[];
  outgoingRequests: FriendProfile[];
}

export function useFriendsData() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['friends_data', userId],
    queryFn: async (): Promise<FriendsData> => {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      if (error) throw error;

      const counterpartId = (row: (typeof rows)[number]) =>
        row.requester_id === userId ? row.addressee_id : row.requester_id;

      const friendIds = rows.filter((r) => r.status === 'accepted').map(counterpartId);
      const incomingIds = rows
        .filter((r) => r.status === 'pending' && r.addressee_id === userId)
        .map((r) => r.requester_id);
      const outgoingIds = rows
        .filter((r) => r.status === 'pending' && r.requester_id === userId)
        .map((r) => r.addressee_id);

      const allIds = Array.from(new Set([...friendIds, ...incomingIds, ...outgoingIds]));
      if (allIds.length === 0) return { friends: [], incomingRequests: [], outgoingRequests: [] };

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', allIds);
      if (profilesError) throw profilesError;

      const byId = new Map(profiles.map((p) => [p.id, p]));
      const toProfile = (id: string): FriendProfile => {
        const p = byId.get(id);
        return { userId: id, displayName: p?.display_name ?? null, avatarUrl: p?.avatar_url ?? null };
      };

      return {
        friends: friendIds.map(toProfile),
        incomingRequests: incomingIds.map(toProfile),
        outgoingRequests: outgoingIds.map(toProfile),
      };
    },
    enabled: !!userId,
  });
}

export function useProfileSearch(query: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile_search', query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .ilike('display_name', `%${query}%`)
        .neq('id', user!.id)
        .limit(10);
      if (error) throw error;
      return data.map((p) => ({ userId: p.id, displayName: p.display_name, avatarUrl: p.avatar_url })) satisfies FriendProfile[];
    },
    enabled: query.trim().length >= 2 && !!user,
  });
}

export function useFriendMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['friends_data', user?.id] });

  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!user) throw new Error('Sign in to add friends');
      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: user.id, addressee_id: addresseeId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const respondToRequest = useMutation({
    mutationFn: async ({ requesterId, accept }: { requesterId: string; accept: boolean }) => {
      if (!user) throw new Error('Sign in to manage friend requests');
      const { error } = await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('requester_id', requesterId)
        .eq('addressee_id', user.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeFriendship = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('Sign in to manage friends');
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { sendRequest, respondToRequest, removeFriendship };
}
