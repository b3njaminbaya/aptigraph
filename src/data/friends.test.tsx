import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useAuth } from '@/state/auth';
import { useFriendMutations, useFriendsData, useProfileSearch } from './friends';
import { callsOf, fail, mockTable, ok, queriesFor, resetSupabaseMock, firstCallArgs } from '@/test/supabaseMock';
import { renderHookWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

const friendship = (requester: string, addressee: string, status: string) => ({
  requester_id: requester,
  addressee_id: addressee,
  status,
});

beforeEach(() => {
  resetSupabaseMock();
  signIn(); // user-1
});

describe('useFriendsData', () => {
  it('classifies rows into friends, incoming and outgoing requests from the current user\'s point of view', async () => {
    mockTable('friendships', ok([
      friendship('user-1', 'a', 'accepted'), // I sent it, they accepted
      friendship('b', 'user-1', 'accepted'), // they sent it, I accepted
      friendship('c', 'user-1', 'pending'), // incoming
      friendship('user-1', 'd', 'pending'), // outgoing
      friendship('e', 'user-1', 'declined'), // ignored entirely
    ]));
    mockTable('profiles', ok(['a', 'b', 'c', 'd'].map((id) => ({ id, display_name: id.toUpperCase(), avatar_url: null }))));

    const { result } = renderHookWithProviders(() => useFriendsData());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.friends.map((p) => p.userId)).toEqual(['a', 'b']);
    expect(result.current.data?.incomingRequests.map((p) => p.userId)).toEqual(['c']);
    expect(result.current.data?.outgoingRequests.map((p) => p.userId)).toEqual(['d']);
    expect(result.current.data?.friends[0]).toEqual({ userId: 'a', displayName: 'A', avatarUrl: null });
  });

  it('only fetches profiles for people involved in a relationship', async () => {
    mockTable('friendships', ok([friendship('user-1', 'a', 'accepted'), friendship('e', 'user-1', 'declined')]));
    mockTable('profiles', ok([{ id: 'a', display_name: 'A', avatar_url: null }]));
    const { result } = renderHookWithProviders(() => useFriendsData());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(callsOf(queriesFor('profiles')[0], 'in')[0].args).toEqual(['id', ['a']]);
  });

  it('skips the profile lookup entirely when there are no relationships', async () => {
    mockTable('friendships', ok([]));
    const { result } = renderHookWithProviders(() => useFriendsData());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ friends: [], incomingRequests: [], outgoingRequests: [] });
    expect(queriesFor('profiles')).toHaveLength(0);
  });

  it('falls back to a null display name when a profile row is missing', async () => {
    mockTable('friendships', ok([friendship('user-1', 'ghost', 'accepted')]));
    mockTable('profiles', ok([]));
    const { result } = renderHookWithProviders(() => useFriendsData());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.friends[0]).toEqual({ userId: 'ghost', displayName: null, avatarUrl: null });
  });

  it('scopes the friendship query to rows involving the current user', async () => {
    const { result } = renderHookWithProviders(() => useFriendsData());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(callsOf(queriesFor('friendships')[0], 'or')[0].args).toEqual(['requester_id.eq.user-1,addressee_id.eq.user-1']);
  });
});

describe('useProfileSearch', () => {
  it.each(['', ' ', 'a', ' a '])('does not search for %j (needs 2+ characters)', async (query) => {
    const { result } = renderHookWithProviders(() => useProfileSearch(query));
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(queriesFor('profiles')).toHaveLength(0);
  });

  it('searches display names case-insensitively, excluding yourself, capped at 10', async () => {
    mockTable('profiles', ok([{ id: 'x', display_name: 'Adam', avatar_url: null }]));
    const { result } = renderHookWithProviders(() => useProfileSearch('ad'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([{ userId: 'x', displayName: 'Adam', avatarUrl: null }]);
    const query = queriesFor('profiles')[0];
    expect(callsOf(query, 'ilike')[0].args).toEqual(['display_name', '%ad%']);
    expect(callsOf(query, 'neq')[0].args).toEqual(['id', 'user-1']);
    expect(callsOf(query, 'limit')[0].args).toEqual([10]);
  });

  it('does not search while signed out', async () => {
    resetSupabaseMock();
    const { result } = renderHookWithProviders(() => useProfileSearch('ada'));
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(queriesFor('profiles')).toHaveLength(0);
  });
});

describe('useFriendMutations', () => {
  /** Renders the mutations alongside auth and waits for the session, so calls see a signed-in user. */
  async function renderMutations() {
    const utils = renderHookWithProviders(() => ({ auth: useAuth(), mutations: useFriendMutations() }));
    await waitFor(() => expect(utils.result.current.auth.user).not.toBeNull());
    return utils;
  }

  it('sends a friend request from the current user', async () => {
    const { result } = await renderMutations();
    await act(async () => {
      await result.current.mutations.sendRequest.mutateAsync('target');
    });
    expect(firstCallArgs('friendships', 'insert')).toEqual([{ requester_id: 'user-1', addressee_id: 'target' }]);
  });

  it.each([
    [true, 'accepted'],
    [false, 'declined'],
  ])('responding accept=%s sets the status to %s, only on requests addressed to me', async (accept, status) => {
    const { result } = await renderMutations();
    await act(async () => {
      await result.current.mutations.respondToRequest.mutateAsync({ requesterId: 'them', accept });
    });
    const query = queriesFor('friendships').find((q) => callsOf(q, 'update').length)!;
    expect(callsOf(query, 'update')[0].args).toEqual([{ status }]);
    expect(callsOf(query, 'eq').map((c) => c.args)).toEqual([
      ['requester_id', 'them'],
      ['addressee_id', 'user-1'],
    ]);
  });

  it('removes a friendship in either direction', async () => {
    const { result } = await renderMutations();
    await act(async () => {
      await result.current.mutations.removeFriendship.mutateAsync('them');
    });
    const query = queriesFor('friendships').find((q) => callsOf(q, 'delete').length)!;
    expect(callsOf(query, 'or')[0].args).toEqual([
      'and(requester_id.eq.user-1,addressee_id.eq.them),and(requester_id.eq.them,addressee_id.eq.user-1)',
    ]);
  });

  it('refreshes the friends list after a successful change', async () => {
    const { result } = renderHookWithProviders(() => ({ data: useFriendsData(), mutations: useFriendMutations() }));
    await waitFor(() => expect(result.current.data.isSuccess).toBe(true));
    const reads = () => queriesFor('friendships').filter((q) => !callsOf(q, 'insert').length).length;
    const readsBefore = reads();

    await act(async () => {
      await result.current.mutations.sendRequest.mutateAsync('target');
    });
    await waitFor(() => expect(reads()).toBeGreaterThan(readsBefore));
  });

  it('shows the database error when a request fails (e.g. duplicate request)', async () => {
    mockTable('friendships', (q) =>
      callsOf(q, 'insert').length ? fail('duplicate key value violates unique constraint') : ok([])
    );
    const { result } = await renderMutations();
    await act(async () => {
      await result.current.mutations.sendRequest.mutateAsync('target').catch(() => {});
    });
    expect(toast.error).toHaveBeenCalledWith('duplicate key value violates unique constraint');
  });

  it('refuses to act when signed out', async () => {
    resetSupabaseMock();
    const { result } = renderHookWithProviders(() => useFriendMutations());
    await act(async () => {
      await result.current.sendRequest.mutateAsync('target').catch(() => {});
    });
    expect(toast.error).toHaveBeenCalledWith('Sign in to add friends');
    expect(queriesFor('friendships')).toHaveLength(0);
  });
});
