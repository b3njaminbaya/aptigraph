import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import Friends from './Friends';
import { callsOf, fail, firstCallArgs, mockRpc, mockTable, ok, queriesFor, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock';
import { renderWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

const friendship = (requester: string, addressee: string, status: string) => ({
  requester_id: requester,
  addressee_id: addressee,
  status,
});
const profile = (id: string, name: string) => ({ id, display_name: name, avatar_url: null });

beforeEach(() => {
  resetSupabaseMock();
});

function seed({ friendships = [] as unknown[], profiles = [] as unknown[], leaderboard = [] as unknown[] } = {}) {
  mockTable('friendships', ok(friendships));
  // one table serves both the friend-profile lookup and the search; tests that search override it
  mockTable('profiles', ok(profiles));
  mockRpc('get_leaderboard', ok(leaderboard));
}

describe('Friends page: signed-out states', () => {
  it('waits for the session instead of flashing the sign-in prompt to a signed-in user (regression)', async () => {
    supabaseMock.auth.getSession.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Friends />, { route: '/friends' });

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('invites a signed-out visitor to sign in', async () => {
    renderWithProviders(<Friends />, { route: '/friends' });
    const link = await screen.findByRole('link', { name: 'Sign in' });
    expect(link).toHaveAttribute('href', '/auth');
  });
});

describe('Friends page: lists', () => {
  it('shows an empty state when there are no friends yet', async () => {
    signIn();
    seed();
    renderWithProviders(<Friends />, { route: '/friends' });
    expect(await screen.findByText(/No friends yet/)).toBeInTheDocument();
  });

  it('lists friends with their solved counts', async () => {
    signIn();
    seed({
      friendships: [friendship('user-1', 'a', 'accepted')],
      profiles: [profile('a', 'Alan')],
      leaderboard: [{ user_id: 'a', display_name: 'Alan', avatar_url: null, total_solved: '7', last_active_at: null }],
    });
    renderWithProviders(<Friends />, { route: '/friends' });

    expect(await screen.findByText('Alan')).toBeInTheDocument();
    expect(await screen.findByText('7 solved')).toBeInTheDocument();
    expect(firstCallArgs('rpc:get_leaderboard', 'rpc')).toEqual([
      'get_leaderboard',
      { limit_count: 100, filter_user_ids: ['a'] },
    ]);
  });

  it('accepts and declines incoming requests', async () => {
    signIn();
    seed({
      friendships: [friendship('b', 'user-1', 'pending'), friendship('c', 'user-1', 'pending')],
      profiles: [profile('b', 'Barbara'), profile('c', 'Claude')],
    });
    const user = userEvent.setup();
    renderWithProviders(<Friends />, { route: '/friends' });

    const barbara = (await screen.findByText('Barbara')).closest('li')!;
    await user.click(within(barbara).getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(queriesFor('friendships').some((q) => callsOf(q, 'update').length)).toBe(true));
    expect(callsOf(queriesFor('friendships').find((q) => callsOf(q, 'update').length), 'update')[0].args).toEqual([{ status: 'accepted' }]);

    const claude = screen.getByText('Claude').closest('li')!;
    await user.click(within(claude).getByRole('button', { name: 'Decline' }));
    await waitFor(() =>
      expect(queriesFor('friendships').filter((q) => callsOf(q, 'update').length)).toHaveLength(2)
    );
  });

  it('removes a friend', async () => {
    signIn();
    seed({ friendships: [friendship('user-1', 'a', 'accepted')], profiles: [profile('a', 'Alan')] });
    const user = userEvent.setup();
    renderWithProviders(<Friends />, { route: '/friends' });

    const row = (await screen.findByText('Alan')).closest('li')!;
    await user.click(within(row).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(queriesFor('friendships').some((q) => callsOf(q, 'delete').length)).toBe(true));
  });
});

describe('Friends page: search and add', () => {
  const searchFor = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await user.type(await screen.findByPlaceholderText('Search by display name…'), name);
    return screen.findByText(name);
  };

  beforeEach(() => {
    signIn();
  });

  it('sends a request and confirms only after it succeeds (regression: toast fired before the write)', async () => {
    seed();
    mockTable('profiles', ok([profile('x', 'Margaret')]));
    const user = userEvent.setup();
    renderWithProviders(<Friends />, { route: '/friends' });

    const result = (await searchFor(user, 'Margaret')).closest('li')!;
    await user.click(within(result).getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Friend request sent to Margaret'));
    expect(firstCallArgs('friendships', 'insert')).toEqual([{ requester_id: 'user-1', addressee_id: 'x' }]);
  });

  it('does not claim success when the request fails', async () => {
    mockTable('friendships', (q) => (callsOf(q, 'insert').length ? fail('duplicate key') : ok([])));
    mockTable('profiles', ok([profile('x', 'Margaret')]));
    mockRpc('get_leaderboard', ok([]));
    const user = userEvent.setup();
    renderWithProviders(<Friends />, { route: '/friends' });

    const result = (await searchFor(user, 'Margaret')).closest('li')!;
    await user.click(within(result).getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('duplicate key'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('marks people you are already connected to instead of offering Add', async () => {
    seed({ friendships: [friendship('user-1', 'x', 'pending')] });
    mockTable('profiles', ok([profile('x', 'Margaret')]));
    const user = userEvent.setup();
    renderWithProviders(<Friends />, { route: '/friends' });

    const result = (await searchFor(user, 'Margaret')).closest('li')!;
    expect(await within(result).findByText('Already connected')).toBeInTheDocument();
    expect(within(result).queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
  });
});
