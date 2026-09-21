import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useComments, useDiscussMutations, usePosts } from './discuss';
import { useAuth } from '@/state/auth';
import { callsOf, fail, firstCallArgs, mockTable, ok, queriesFor, resetSupabaseMock } from '@/test/supabaseMock';
import { renderHookWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

const postRow = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  problem_id: 1,
  user_id: 'author-1',
  body: `post ${id}`,
  upvote_count: 2,
  created_at: '2026-07-01T00:00:00Z',
  problems: { title: 'Two Sum' },
  ...overrides,
});

beforeEach(() => {
  resetSupabaseMock();
  signIn();
});

describe('usePosts', () => {
  beforeEach(() => {
    mockTable('discussion_posts', ok([postRow('p1'), postRow('p2', { user_id: 'author-2', problems: null })]));
    mockTable('profiles', ok([{ id: 'author-1', display_name: 'Ada' }]));
    mockTable('discussion_votes', ok([{ post_id: 'p1' }]));
  });

  it('merges author names, the problem title and the viewer\'s own votes into each post', async () => {
    const { result } = renderHookWithProviders(() => usePosts());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        id: 'p1',
        problemId: 1,
        problemTitle: 'Two Sum',
        authorId: 'author-1',
        authorDisplayName: 'Ada',
        body: 'post p1',
        upvoteCount: 2,
        hasVoted: true,
        createdAt: '2026-07-01T00:00:00Z',
      },
      expect.objectContaining({ id: 'p2', authorDisplayName: null, problemTitle: 'Unknown problem', hasVoted: false }),
    ]);
  });

  it('shows the newest 50 posts first, and filters to a problem when asked', async () => {
    const { result } = renderHookWithProviders(() => usePosts(42));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queriesFor('discussion_posts')[0];
    expect(callsOf(query, 'order')[0].args).toEqual(['created_at', { ascending: false }]);
    expect(callsOf(query, 'limit')[0].args).toEqual([50]);
    expect(callsOf(query, 'eq')[0].args).toEqual(['problem_id', 42]);
  });

  it('does not filter by problem for the "all" feed', async () => {
    const { result } = renderHookWithProviders(() => usePosts());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(callsOf(queriesFor('discussion_posts')[0], 'eq')).toHaveLength(0);
  });

  it('is readable while signed out, without looking up votes', async () => {
    resetSupabaseMock();
    mockTable('discussion_posts', ok([postRow('p1')]));
    mockTable('profiles', ok([]));
    const { result } = renderHookWithProviders(() => usePosts());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].hasVoted).toBe(false);
    expect(queriesFor('discussion_votes')).toHaveLength(0);
  });

  it('returns an empty list without extra lookups when there are no posts', async () => {
    mockTable('discussion_posts', ok([]));
    const { result } = renderHookWithProviders(() => usePosts());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(queriesFor('profiles')).toHaveLength(0);
    expect(queriesFor('discussion_votes')).toHaveLength(0);
  });
});

describe('useComments', () => {
  it('loads comments oldest-first with author names once enabled', async () => {
    mockTable('discussion_comments', ok([{ id: 'c1', post_id: 'p1', user_id: 'author-1', body: 'nice', created_at: 'now' }]));
    mockTable('profiles', ok([{ id: 'author-1', display_name: 'Ada' }]));
    const { result } = renderHookWithProviders(() => useComments('p1', true));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { id: 'c1', postId: 'p1', authorId: 'author-1', authorDisplayName: 'Ada', body: 'nice', createdAt: 'now' },
    ]);
    const query = queriesFor('discussion_comments')[0];
    expect(callsOf(query, 'order')[0].args).toEqual(['created_at', { ascending: true }]);
  });

  it('does not fetch until the thread is opened', async () => {
    const { result } = renderHookWithProviders(() => useComments('p1', false));
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(queriesFor('discussion_comments')).toHaveLength(0);
  });
});

describe('useDiscussMutations', () => {
  async function renderMutations() {
    const utils = renderHookWithProviders(() => ({ auth: useAuth(), mutations: useDiscussMutations() }));
    await waitFor(() => expect(utils.result.current.auth.user).not.toBeNull());
    return utils;
  }

  it('creates a post as the current user', async () => {
    const { result } = await renderMutations();
    await act(async () => {
      await result.current.mutations.createPost.mutateAsync({ problemId: 3, body: 'my approach' });
    });
    expect(firstCallArgs('discussion_posts', 'insert')).toEqual([{ problem_id: 3, user_id: 'user-1', body: 'my approach' }]);
  });

  it('creates a comment as the current user', async () => {
    const { result } = await renderMutations();
    await act(async () => {
      await result.current.mutations.createComment.mutateAsync({ postId: 'p1', body: 'agreed' });
    });
    expect(firstCallArgs('discussion_comments', 'insert')).toEqual([{ post_id: 'p1', user_id: 'user-1', body: 'agreed' }]);
  });

  it('adds a vote when not yet voted, and removes it when already voted', async () => {
    const { result } = await renderMutations();

    await act(async () => {
      await result.current.mutations.toggleVote.mutateAsync({ postId: 'p1', currentlyVoted: false });
    });
    expect(firstCallArgs('discussion_votes', 'insert')).toEqual([{ post_id: 'p1', user_id: 'user-1' }]);

    await act(async () => {
      await result.current.mutations.toggleVote.mutateAsync({ postId: 'p1', currentlyVoted: true });
    });
    const removal = queriesFor('discussion_votes').find((q) => callsOf(q, 'delete').length)!;
    expect(callsOf(removal, 'eq').map((c) => c.args)).toEqual([
      ['post_id', 'p1'],
      ['user_id', 'user-1'],
    ]);
  });

  it('refreshes the post list after posting', async () => {
    mockTable('discussion_posts', ok([]));
    const { result } = renderHookWithProviders(() => ({ posts: usePosts(), mutations: useDiscussMutations() }));
    await waitFor(() => expect(result.current.posts.isSuccess).toBe(true));
    const reads = () => queriesFor('discussion_posts').filter((q) => !callsOf(q, 'insert').length).length;
    const before = reads();

    await act(async () => {
      await result.current.mutations.createPost.mutateAsync({ problemId: 1, body: 'x' });
    });
    await waitFor(() => expect(reads()).toBeGreaterThan(before));
  });

  it('surfaces a rejected write as an error toast', async () => {
    mockTable('discussion_posts', (q) => (callsOf(q, 'insert').length ? fail('new row violates row-level security policy') : ok([])));
    const { result } = await renderMutations();
    await act(async () => {
      await result.current.mutations.createPost.mutateAsync({ problemId: 1, body: 'x' }).catch(() => {});
    });
    expect(toast.error).toHaveBeenCalledWith('new row violates row-level security policy');
  });

  it.each([
    ['createPost', { problemId: 1, body: 'x' }, 'Sign in to post'],
    ['createComment', { postId: 'p', body: 'x' }, 'Sign in to comment'],
    ['toggleVote', { postId: 'p', currentlyVoted: false }, 'Sign in to vote'],
  ] as const)('%s refuses to run when signed out', async (name, variables, message) => {
    resetSupabaseMock();
    const { result } = renderHookWithProviders(() => useDiscussMutations());
    await act(async () => {
      await (result.current[name].mutateAsync as (v: unknown) => Promise<unknown>)(variables).catch(() => {});
    });
    expect(toast.error).toHaveBeenCalledWith(message);
  });
});
