import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/state/auth';

export interface DiscussionPost {
  id: string;
  problemId: number;
  problemTitle: string;
  authorId: string;
  authorDisplayName: string | null;
  body: string;
  upvoteCount: number;
  hasVoted: boolean;
  createdAt: string;
}

export interface DiscussionComment {
  id: string;
  postId: string;
  authorId: string;
  authorDisplayName: string | null;
  body: string;
  createdAt: string;
}

async function attachAuthorNames<T extends { user_id: string }>(rows: T[]) {
  const authorIds = Array.from(new Set(rows.map((r) => r.user_id)));
  if (authorIds.length === 0) return new Map<string, string | null>();
  const { data: authors, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', authorIds);
  if (error) throw error;
  return new Map(authors.map((a) => [a.id, a.display_name]));
}

export function usePosts(problemId?: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['discussion_posts', problemId ?? 'all'],
    queryFn: async (): Promise<DiscussionPost[]> => {
      let request = supabase
        .from('discussion_posts')
        .select('*, problems(title)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (problemId) request = request.eq('problem_id', problemId);
      const { data: posts, error } = await request;
      if (error) throw error;

      const authorById = await attachAuthorNames(posts);

      let votedPostIds = new Set<string>();
      if (user && posts.length > 0) {
        const { data: votes, error: votesError } = await supabase
          .from('discussion_votes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', posts.map((p) => p.id));
        if (votesError) throw votesError;
        votedPostIds = new Set(votes.map((v) => v.post_id));
      }

      return posts.map((p) => ({
        id: p.id,
        problemId: p.problem_id,
        problemTitle: p.problems?.title ?? 'Unknown problem',
        authorId: p.user_id,
        authorDisplayName: authorById.get(p.user_id) ?? null,
        body: p.body,
        upvoteCount: p.upvote_count,
        hasVoted: votedPostIds.has(p.id),
        createdAt: p.created_at,
      }));
    },
  });
}

export function useComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['discussion_comments', postId],
    queryFn: async (): Promise<DiscussionComment[]> => {
      const { data: comments, error } = await supabase
        .from('discussion_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const authorById = await attachAuthorNames(comments);

      return comments.map((c) => ({
        id: c.id,
        postId: c.post_id,
        authorId: c.user_id,
        authorDisplayName: authorById.get(c.user_id) ?? null,
        body: c.body,
        createdAt: c.created_at,
      }));
    },
    enabled,
  });
}

export function useDiscussMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: async ({ problemId, body }: { problemId: number; body: string }) => {
      if (!user) throw new Error('Sign in to post');
      const { error } = await supabase
        .from('discussion_posts')
        .insert({ problem_id: problemId, user_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discussion_posts'] }),
  });

  const createComment = useMutation({
    mutationFn: async ({ postId, body }: { postId: string; body: string }) => {
      if (!user) throw new Error('Sign in to comment');
      const { error } = await supabase
        .from('discussion_comments')
        .insert({ post_id: postId, user_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['discussion_comments', variables.postId] }),
  });

  const toggleVote = useMutation({
    mutationFn: async ({ postId, currentlyVoted }: { postId: string; currentlyVoted: boolean }) => {
      if (!user) throw new Error('Sign in to vote');
      if (currentlyVoted) {
        const { error } = await supabase
          .from('discussion_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('discussion_votes')
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discussion_posts'] }),
  });

  return { createPost, createComment, toggleVote };
}
