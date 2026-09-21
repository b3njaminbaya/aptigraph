import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import Discuss from './Discuss';
import { callsOf, fail, firstCallArgs, mockTable, ok, queriesFor, resetSupabaseMock } from '@/test/supabaseMock';
import { renderWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

const problems = [
  { id: 1, slug: 'two-sum', title: 'Two Sum', difficulty: 'Easy', topics: ['Array'], url: 'https://leetcode.com/problems/two-sum' },
  { id: 2, slug: 'add-two-numbers', title: 'Add Two Numbers', difficulty: 'Medium', topics: ['Linked List'], url: 'https://leetcode.com/problems/add-two-numbers' },
];

const post = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  problem_id: 1,
  user_id: 'author-1',
  body: `Body of ${id}`,
  upvote_count: 3,
  created_at: new Date().toISOString(),
  problems: { title: 'Two Sum' },
  ...overrides,
});

const isWrite = (q: { calls: { method: string }[] }) => q.calls.some((c) => c.method === 'insert' || c.method === 'delete');

beforeEach(() => {
  resetSupabaseMock();
  mockTable('problems', ok(problems));
  mockTable('discussion_posts', (q) => (isWrite(q) ? ok(null) : ok([post('p1')])));
  mockTable('profiles', ok([{ id: 'author-1', display_name: 'Ada' }]));
  mockTable('discussion_votes', (q) => (isWrite(q) ? ok(null) : ok([])));
  mockTable('discussion_comments', (q) =>
    isWrite(q) ? ok(null) : ok([{ id: 'c1', post_id: 'p1', user_id: 'author-1', body: 'First!', created_at: new Date().toISOString() }])
  );
});

async function selectProblem(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(await screen.findByRole('combobox'));
  await user.click(await screen.findByRole('option', { name: title }));
}

describe('Discuss page: feed', () => {
  it('shows the recent feed with author, problem and upvote count', async () => {
    renderWithProviders(<Discuss />, { route: '/discuss' });

    expect(await screen.findByText('Body of p1')).toBeInTheDocument();
    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Two Sum' })).toHaveAttribute('href', '/problems');
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows an empty state with guidance when nothing has been posted', async () => {
    mockTable('discussion_posts', ok([]));
    renderWithProviders(<Discuss />, { route: '/discuss' });
    expect(await screen.findByText('No discussions yet — pick a problem above to start one.')).toBeInTheDocument();
  });

  it('does not offer a composer on the all-problems feed', async () => {
    signIn();
    renderWithProviders(<Discuss />, { route: '/discuss' });
    await screen.findByText('Body of p1');
    expect(screen.queryByPlaceholderText('Share your approach or ask a question…')).not.toBeInTheDocument();
  });

  it('filters the feed to the chosen problem', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Discuss />, { route: '/discuss' });
    await screen.findByText('Body of p1');

    await selectProblem(user, 'Add Two Numbers');

    await waitFor(() =>
      expect(queriesFor('discussion_posts').some((q) => callsOf(q, 'eq').some((c) => c.args[0] === 'problem_id' && c.args[1] === 2))).toBe(true)
    );
  });
});

describe('Discuss page: posting', () => {
  it('asks a signed-out visitor to sign in before posting', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Discuss />, { route: '/discuss' });
    await selectProblem(user, 'Two Sum');

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth');
    expect(screen.queryByPlaceholderText('Share your approach or ask a question…')).not.toBeInTheDocument();
  });

  it('posts, then clears the draft and confirms', async () => {
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<Discuss />, { route: '/discuss' });
    await selectProblem(user, 'Two Sum');

    const box = await screen.findByPlaceholderText('Share your approach or ask a question…');
    await user.type(box, '  Use a hash map  ');
    await user.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Posted'));
    expect(firstCallArgs('discussion_posts', 'insert')).toEqual([{ problem_id: 1, user_id: 'user-1', body: 'Use a hash map' }]);
    expect(box).toHaveValue('');
  });

  it('keeps the draft and does not claim success when posting fails (regression: draft was lost)', async () => {
    mockTable('discussion_posts', (q) => (isWrite(q) ? fail('new row violates row-level security policy') : ok([post('p1')])));
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<Discuss />, { route: '/discuss' });
    await selectProblem(user, 'Two Sum');

    const box = await screen.findByPlaceholderText('Share your approach or ask a question…');
    await user.type(box, 'A long, carefully written answer');
    await user.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('new row violates row-level security policy'));
    expect(box).toHaveValue('A long, carefully written answer');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('disables Post for an empty or whitespace-only draft', async () => {
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<Discuss />, { route: '/discuss' });
    await selectProblem(user, 'Two Sum');

    const box = await screen.findByPlaceholderText('Share your approach or ask a question…');
    expect(screen.getByRole('button', { name: 'Post' })).toBeDisabled();
    await user.type(box, '   ');
    expect(screen.getByRole('button', { name: 'Post' })).toBeDisabled();
  });
});

describe('Discuss page: votes and comments', () => {
  it('upvotes a post, and disables voting when signed out', async () => {
    const { unmount } = renderWithProviders(<Discuss />, { route: '/discuss' });
    expect(await screen.findByRole('button', { name: 'Upvote' })).toBeDisabled();
    unmount();

    signIn();
    const user = userEvent.setup();
    renderWithProviders(<Discuss />, { route: '/discuss' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Upvote' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Upvote' }));

    await waitFor(() => expect(firstCallArgs('discussion_votes', 'insert')).toEqual([{ post_id: 'p1', user_id: 'user-1' }]));
  });

  it('shows an existing vote as removable and removes it on click', async () => {
    mockTable('discussion_votes', (q) => (isWrite(q) ? ok(null) : ok([{ post_id: 'p1' }])));
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<Discuss />, { route: '/discuss' });

    const button = await screen.findByRole('button', { name: 'Remove upvote' });
    await user.click(button);
    await waitFor(() => expect(queriesFor('discussion_votes').some((q) => callsOf(q, 'delete').length)).toBe(true));
  });

  it('loads comments only when a thread is opened', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Discuss />, { route: '/discuss' });
    await screen.findByText('Body of p1');
    expect(queriesFor('discussion_comments')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Comments' }));
    expect(await screen.findByText('First!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide comments' })).toBeInTheDocument();
  });

  it('adds a comment and clears the box only once it is saved', async () => {
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<Discuss />, { route: '/discuss' });
    await user.click(await screen.findByRole('button', { name: 'Comments' }));

    const box = await screen.findByPlaceholderText('Add a comment…');
    await user.type(box, ' Nice one ');
    const thread = box.closest('div')!.parentElement!;
    await user.click(within(thread).getByRole('button', { name: 'Post' }));

    await waitFor(() => expect(firstCallArgs('discussion_comments', 'insert')).toEqual([{ post_id: 'p1', user_id: 'user-1', body: 'Nice one' }]));
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('keeps the comment draft when saving fails (regression)', async () => {
    mockTable('discussion_comments', (q) => (isWrite(q) ? fail('comment rejected') : ok([])));
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<Discuss />, { route: '/discuss' });
    await user.click(await screen.findByRole('button', { name: 'Comments' }));

    const box = await screen.findByPlaceholderText('Add a comment…');
    await user.type(box, 'Keep me');
    await user.click(within(box.closest('div')!.parentElement!).getByRole('button', { name: 'Post' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('comment rejected'));
    expect(box).toHaveValue('Keep me');
  });
});
