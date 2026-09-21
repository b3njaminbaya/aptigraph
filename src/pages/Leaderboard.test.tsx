import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import Leaderboard from './Leaderboard';
import { firstCallArgs, mockRpc, ok, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock';
import { renderWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

const entry = (id: string, name: string | null, solved: number) => ({
  user_id: id,
  display_name: name,
  avatar_url: null,
  total_solved: String(solved),
  last_active_at: null,
});

beforeEach(() => {
  resetSupabaseMock();
});

describe('Leaderboard page', () => {
  it('ranks users in the order the database returns them', async () => {
    mockRpc('get_leaderboard', ok([entry('a', 'Ada', 30), entry('b', 'Alan', 20), entry('c', 'Grace', 10)]));
    renderWithProviders(<Leaderboard />, { route: '/leaderboard' });

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('1')).toBeInTheDocument();
    expect(within(items[0]).getByText('Ada')).toBeInTheDocument();
    expect(within(items[0]).getByText('30 solved')).toBeInTheDocument();
    expect(within(items[2]).getByText('Grace')).toBeInTheDocument();
    expect(within(items[2]).getByText('3')).toBeInTheDocument();
  });

  it('asks for the top 50', async () => {
    mockRpc('get_leaderboard', ok([entry('a', 'Ada', 1)]));
    renderWithProviders(<Leaderboard />, { route: '/leaderboard' });
    await screen.findByText('Ada');
    expect(firstCallArgs('rpc:get_leaderboard', 'rpc')).toEqual(['get_leaderboard', { limit_count: 50, filter_user_ids: undefined }]);
  });

  it('shows a fallback name for users without a display name', async () => {
    mockRpc('get_leaderboard', ok([entry('a', null, 1)]));
    renderWithProviders(<Leaderboard />, { route: '/leaderboard' });
    expect(await screen.findByText('Anonymous')).toBeInTheDocument();
  });

  it('highlights the signed-in user\'s own row', async () => {
    signIn();
    mockRpc('get_leaderboard', ok([entry('other', 'Ada', 30), entry('user-1', 'Me', 5)]));
    renderWithProviders(<Leaderboard />, { route: '/leaderboard' });

    const mine = (await screen.findByText('Me')).closest('li')!;
    await waitFor(() => expect(within(mine).getByText('(you)')).toBeInTheDocument());
    expect(mine.className).toContain('ring-2');
    expect(screen.getByText('Ada').closest('li')!.className).not.toContain('ring-2');
  });

  it('is visible to signed-out visitors', async () => {
    mockRpc('get_leaderboard', ok([entry('a', 'Ada', 1)]));
    renderWithProviders(<Leaderboard />, { route: '/leaderboard' });
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.queryByText('(you)')).not.toBeInTheDocument();
  });

  it('shows an empty state before anyone has solved anything', async () => {
    mockRpc('get_leaderboard', ok([]));
    renderWithProviders(<Leaderboard />, { route: '/leaderboard' });
    expect(await screen.findByText('No one has solved a problem yet — be the first.')).toBeInTheDocument();
  });

  it('shows a loading message while the query is pending', () => {
    supabaseMock.rpc.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Leaderboard />, { route: '/leaderboard' });
    expect(screen.getByText('Loading leaderboard…')).toBeInTheDocument();
  });
});
