import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import Problems from './Problems';
import type { ProblemRow } from '@/data/problems';

const mockProblems: ProblemRow[] = [
  { id: 1, title: 'Two Sum', difficulty: 'Easy', topics: ['Array', 'Hash Table'], url: 'https://leetcode.com/problems/two-sum' },
  { id: 3, title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', topics: ['String', 'Sliding Window'], url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters' },
  { id: 200, title: 'Number of Islands', difficulty: 'Medium', topics: ['Graph', 'DFS', 'BFS'], url: 'https://leetcode.com/problems/number-of-islands' },
];

const mocks = vi.hoisted(() => ({
  logAttempt: vi.fn(),
  setNotes: vi.fn(),
  resetProblem: vi.fn(),
  entries: {} as Record<number, unknown>,
  user: { id: 'user-1', email: 'test@example.com' } as { id: string; email: string } | null,
  problemsLoading: false,
}));

vi.mock('@/data/problems', () => ({
  useProblems: () => ({ data: mocks.problemsLoading ? undefined : mockProblems, isLoading: mocks.problemsLoading }),
}));

vi.mock('@/state/tracker', () => ({
  useTracker: () => ({
    entries: mocks.entries,
    isLoading: false,
    logAttempt: mocks.logAttempt,
    setNotes: mocks.setNotes,
    resetProblem: mocks.resetProblem,
    totalSolved: 0,
    currentStreak: 0,
  }),
}));

vi.mock('@/state/auth', () => ({
  useAuth: () => ({ user: mocks.user, session: null, loading: false, signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));

function renderProblems() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Problems />
    </MemoryRouter>
  );
}

const row = (title: string) => screen.getByText(title).closest('li')!;

beforeEach(() => {
  mocks.entries = {};
  mocks.user = { id: 'user-1', email: 'test@example.com' };
  mocks.problemsLoading = false;
});

describe('Problems page: catalog and filtering', () => {
  it('shows all seeded problems by default, each linking out to LeetCode', () => {
    renderProblems();
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('Longest Substring Without Repeating Characters')).toBeInTheDocument();
    expect(screen.getByText('Number of Islands')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Two Sum' })).toHaveAttribute('href', 'https://leetcode.com/problems/two-sum');
  });

  it('shows a loading message while the catalog loads', () => {
    mocks.problemsLoading = true;
    renderProblems();
    expect(screen.getByText('Loading problems…')).toBeInTheDocument();
  });

  it('filters the list by search query, case-insensitively', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.type(screen.getByPlaceholderText('Search by title…'), 'ISLAND');

    expect(screen.getByText('Number of Islands')).toBeInTheDocument();
    expect(screen.queryByText('Two Sum')).not.toBeInTheDocument();
    expect(screen.queryByText('Longest Substring Without Repeating Characters')).not.toBeInTheDocument();
  });

  it('filters by difficulty', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(await screen.findByRole('option', { name: 'Easy' }));

    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.queryByText('Number of Islands')).not.toBeInTheDocument();
  });

  it('filters by topic, offering every topic in the catalog', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.click(screen.getAllByRole('combobox')[1]);
    expect(await screen.findByRole('option', { name: 'Sliding Window' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Graph' }));

    expect(screen.getByText('Number of Islands')).toBeInTheDocument();
    expect(screen.queryByText('Two Sum')).not.toBeInTheDocument();
  });

  it('combines filters and explains an empty result', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.type(screen.getByPlaceholderText('Search by title…'), 'islands');
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(await screen.findByRole('option', { name: 'Easy' }));

    expect(screen.getByText('No problems match your filters')).toBeInTheDocument();
  });
});

describe('Problems page: signed in vs signed out', () => {
  it('does not show the sign-in prompt for an authenticated user', () => {
    renderProblems();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(within(row('Two Sum')).getByRole('button', { name: 'Solved' })).toBeEnabled();
  });

  it('lets a visitor browse but not track, and points them to sign in', () => {
    mocks.user = null;
    renderProblems();

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth');
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    const twoSum = row('Two Sum');
    expect(within(twoSum).getByRole('button', { name: 'Solved' })).toBeDisabled();
    expect(within(twoSum).getByRole('button', { name: 'Attempted' })).toBeDisabled();
    expect(within(twoSum).getByPlaceholderText('Add notes…')).toBeDisabled();
  });
});

describe('Problems page: logging attempts', () => {
  it('logs a solve with the default 30 minutes and confirms only once the write succeeds', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.click(within(row('Two Sum')).getByRole('button', { name: 'Solved' }));

    expect(mocks.logAttempt).toHaveBeenCalledWith(1, 30, 'solved', expect.any(Function));
    expect(toast.success).not.toHaveBeenCalled(); // nothing is confirmed until the write reports success

    mocks.logAttempt.mock.calls[0][3](); // the tracker calls this on success
    expect(toast.success).toHaveBeenCalledWith('Marked "Two Sum" as solved');
  });

  it('logs an attempt and confirms it only on success', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.click(within(row('Number of Islands')).getByRole('button', { name: 'Attempted' }));

    expect(mocks.logAttempt).toHaveBeenCalledWith(200, 30, 'attempted', expect.any(Function));
    expect(toast).not.toHaveBeenCalled();
    mocks.logAttempt.mock.calls[0][3]();
    expect(toast).toHaveBeenCalledWith('Logged an attempt');
  });

  it('keeps minutes per problem, so one row never changes another (regression: one global field)', async () => {
    const user = userEvent.setup();
    renderProblems();

    const twoSumMinutes = within(row('Two Sum')).getByLabelText('Minutes');
    await user.clear(twoSumMinutes);
    await user.type(twoSumMinutes, '45');
    await user.click(within(row('Two Sum')).getByRole('button', { name: 'Solved' }));
    await user.click(within(row('Number of Islands')).getByRole('button', { name: 'Solved' }));

    expect(mocks.logAttempt).toHaveBeenNthCalledWith(1, 1, 45, 'solved', expect.any(Function));
    expect(mocks.logAttempt).toHaveBeenNthCalledWith(2, 200, 30, 'solved', expect.any(Function));
  });

  it('never logs negative or blank minutes', async () => {
    const user = userEvent.setup();
    renderProblems();

    const minutes = within(row('Two Sum')).getByLabelText('Minutes');
    await user.clear(minutes);
    expect(minutes).toHaveValue(0); // blank snaps to 0

    await user.type(minutes, '-5');
    expect(Number((minutes as HTMLInputElement).value)).toBeGreaterThanOrEqual(0);

    await user.click(within(row('Two Sum')).getByRole('button', { name: 'Solved' }));
    expect(mocks.logAttempt.mock.calls[0][1]).toBeGreaterThanOrEqual(0);
  });
});

describe('Problems page: progress display', () => {
  it('shows attempt counts with correct pluralisation and saved notes', () => {
    mocks.entries = {
      1: { status: 'solved', attempts: 1, notes: 'hash map', intervalDays: 1, easeFactor: 2.5 },
      3: { status: 'attempted', attempts: 4, intervalDays: 1, easeFactor: 2.5 },
    };
    renderProblems();

    expect(within(row('Two Sum')).getByText('1 attempt')).toBeInTheDocument();
    expect(within(row('Two Sum')).getAllByText('hash map').length).toBeGreaterThan(0);
    expect(within(row('Longest Substring Without Repeating Characters')).getByText('4 attempts')).toBeInTheDocument();
    expect(within(row('Number of Islands')).getByText('0 attempts')).toBeInTheDocument();
  });

  it('saves notes when the field loses focus', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.type(within(row('Two Sum')).getByPlaceholderText('Add notes…'), 'use a map');
    await user.tab();

    expect(mocks.setNotes).toHaveBeenCalledWith(1, 'use a map');
  });
});

describe('Problems page: reset', () => {
  beforeEach(() => {
    mocks.entries = { 1: { status: 'solved', attempts: 2, intervalDays: 1, easeFactor: 2.5 } };
  });

  it('only offers Reset for a problem with tracked progress', () => {
    renderProblems();
    expect(screen.getAllByRole('button', { name: 'Reset' })).toHaveLength(1);
    expect(within(row('Two Sum')).getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('asks for confirmation, then resets and confirms only on success', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Reset progress on "Two Sum"?')).toBeInTheDocument();
    expect(mocks.resetProblem).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Reset' }));
    expect(mocks.resetProblem).toHaveBeenCalledWith(1, expect.any(Function));
    expect(toast.success).not.toHaveBeenCalled();
    mocks.resetProblem.mock.calls[0][1]();
    expect(toast.success).toHaveBeenCalledWith('Reset progress on "Two Sum"');
  });

  it('does nothing when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));

    expect(mocks.resetProblem).not.toHaveBeenCalled();
  });
});
