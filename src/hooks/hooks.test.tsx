import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRecommendations } from './useRecommendations';
import { useDueForReview } from './useDueForReview';
import { useLeaderboard } from './useLeaderboard';
import { useProfile } from './useProfile';
import { useProblems } from '@/data/problems';
import {
  callsOf,
  fail,
  firstCallArgs,
  mockRpc,
  mockTable,
  ok,
  queriesFor,
  resetSupabaseMock,
} from '@/test/supabaseMock';
import { createTestQueryClient, renderHookWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

beforeEach(() => {
  resetSupabaseMock();
  signIn();
});

describe('useRecommendations', () => {
  it('maps the RPC rows and asks for the requested number of results', async () => {
    mockRpc(
      'get_recommendations',
      ok([
        {
          problem_id: 11,
          title: 'Container With Most Water',
          difficulty: 'Medium',
          topics: ['Array', 'Two Pointers'],
          reason_topic: 'Two Pointers',
          reason_solve_rate: 0.25,
        },
      ])
    );
    const { result } = renderHookWithProviders(() => useRecommendations(3));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        problemId: 11,
        title: 'Container With Most Water',
        difficulty: 'Medium',
        topics: ['Array', 'Two Pointers'],
        reasonTopic: 'Two Pointers',
        reasonSolveRate: 0.25,
      },
    ]);
    expect(firstCallArgs('rpc:get_recommendations', 'rpc')).toEqual(['get_recommendations', { limit_count: 3 }]);
  });

  it('falls back to starter Easy problems when the user has no history yet', async () => {
    mockRpc('get_recommendations', ok([]));
    mockTable('problems', ok([{ id: 1, title: 'Two Sum', difficulty: 'Easy', topics: ['Array'] }]));
    const { result } = renderHookWithProviders(() => useRecommendations(5));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { problemId: 1, title: 'Two Sum', difficulty: 'Easy', topics: ['Array'], reasonTopic: null, reasonSolveRate: null },
    ]);
    const fallback = queriesFor('problems')[0];
    expect(callsOf(fallback, 'eq')[0].args).toEqual(['difficulty', 'Easy']);
    expect(callsOf(fallback, 'limit')[0].args).toEqual([5]);
  });

  it('surfaces an RPC failure as an error toast', async () => {
    mockRpc('get_recommendations', fail('function does not exist'));
    const { result } = renderHookWithProviders(() => useRecommendations());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('function does not exist');
  });

  it('does not call the RPC while signed out', async () => {
    resetSupabaseMock();
    const { result } = renderHookWithProviders(() => useRecommendations());
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(queriesFor('rpc:get_recommendations')).toHaveLength(0);
  });
});

describe('useDueForReview', () => {
  it('maps due problems and joins the problem title', async () => {
    mockTable(
      'user_problem_status',
      ok([{ problem_id: 4, next_review_at: '2026-07-01T00:00:00Z', problems: { title: 'Valid Parentheses', difficulty: 'Easy' } }])
    );
    const { result } = renderHookWithProviders(() => useDueForReview());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { problemId: 4, title: 'Valid Parentheses', difficulty: 'Easy', nextReviewAt: '2026-07-01T00:00:00Z' },
    ]);
  });

  it('only asks for the user\'s own solved problems that are due, soonest first', async () => {
    const { result } = renderHookWithProviders(() => useDueForReview(7));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queriesFor('user_problem_status')[0];
    const eqs = callsOf(query, 'eq').map((c) => c.args);
    expect(eqs).toContainEqual(['user_id', 'user-1']);
    expect(eqs).toContainEqual(['status', 'solved']);
    expect(callsOf(query, 'not')[0].args).toEqual(['next_review_at', 'is', null]);
    expect(callsOf(query, 'lte')[0].args[0]).toBe('next_review_at');
    expect(callsOf(query, 'order')[0].args).toEqual(['next_review_at', { ascending: true }]);
    expect(callsOf(query, 'limit')[0].args).toEqual([7]);
  });

  it('tolerates a missing joined problem row', async () => {
    mockTable('user_problem_status', ok([{ problem_id: 9, next_review_at: '2026-07-01T00:00:00Z', problems: null }]));
    const { result } = renderHookWithProviders(() => useDueForReview());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]).toMatchObject({ title: 'Unknown problem', difficulty: '' });
  });
});

describe('useLeaderboard', () => {
  const row = (id: string, solved: string | number) => ({
    user_id: id,
    display_name: id.toUpperCase(),
    avatar_url: null,
    total_solved: solved,
    last_active_at: null,
  });

  it('converts bigint counts (returned as strings) to numbers', async () => {
    mockRpc('get_leaderboard', ok([row('a', '12'), row('b', 3)]));
    const { result } = renderHookWithProviders(() => useLeaderboard({ limit: 50 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((e) => e.totalSolved)).toEqual([12, 3]);
    expect(firstCallArgs('rpc:get_leaderboard', 'rpc')).toEqual([
      'get_leaderboard',
      { limit_count: 50, filter_user_ids: undefined },
    ]);
  });

  it('is public: works without a signed-in user', async () => {
    resetSupabaseMock();
    mockRpc('get_leaderboard', ok([row('a', 1)]));
    const { result } = renderHookWithProviders(() => useLeaderboard());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('does not query when scoped to an empty friend list', async () => {
    const { result } = renderHookWithProviders(() => useLeaderboard({ userIds: [] }));
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(queriesFor('rpc:get_leaderboard')).toHaveLength(0);
  });

  it('scopes the RPC to the given users and shares a cache entry regardless of id order', async () => {
    mockRpc('get_leaderboard', ok([row('a', 1)]));
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(({ ids }) => useLeaderboard({ userIds: ids }), {
      initialProps: { ids: ['b', 'a'] },
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(firstCallArgs('rpc:get_leaderboard', 'rpc')).toEqual([
      'get_leaderboard',
      { limit_count: 100, filter_user_ids: ['b', 'a'] },
    ]);

    rerender({ ids: ['a', 'b'] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesFor('rpc:get_leaderboard')).toHaveLength(1);
  });
});

describe('useProfile', () => {
  it('loads the signed-in user\'s profile', async () => {
    mockTable('profiles', ok({ display_name: 'Ada', avatar_url: null }));
    const { result } = renderHookWithProviders(() => useProfile());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ displayName: 'Ada', avatarUrl: null });
    const query = queriesFor('profiles')[0];
    expect(callsOf(query, 'eq')[0].args).toEqual(['id', 'user-1']);
    expect(callsOf(query, 'single')).toHaveLength(1);
  });

  it('reports a failed load', async () => {
    mockTable('profiles', fail('JSON object requested, multiple (or no) rows returned'));
    const { result } = renderHookWithProviders(() => useProfile());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useProblems', () => {
  it('returns the catalog ordered by id, with typed difficulty', async () => {
    mockTable('problems', ok([{ id: 1, slug: 'two-sum', title: 'Two Sum', difficulty: 'Easy', topics: ['Array'], url: 'https://leetcode.com/problems/two-sum', created_at: 'x' }]));
    const { result } = renderHookWithProviders(() => useProblems());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { id: 1, title: 'Two Sum', difficulty: 'Easy', topics: ['Array'], url: 'https://leetcode.com/problems/two-sum' },
    ]);
    expect(callsOf(queriesFor('problems')[0], 'order')[0].args).toEqual(['id']);
  });

  it('does not need a signed-in user (the catalog is public)', async () => {
    resetSupabaseMock();
    mockTable('problems', ok([]));
    const { result } = renderHookWithProviders(() => useProblems());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
