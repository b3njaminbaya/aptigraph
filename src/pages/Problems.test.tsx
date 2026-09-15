import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Problems from './Problems';
import type { ProblemRow } from '@/data/problems';

const mockProblems: ProblemRow[] = [
  { id: 1, title: 'Two Sum', difficulty: 'Easy', topics: ['Array', 'Hash Table'], url: 'https://leetcode.com/problems/two-sum' },
  { id: 3, title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', topics: ['String', 'Sliding Window'], url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters' },
  { id: 200, title: 'Number of Islands', difficulty: 'Medium', topics: ['Graph', 'DFS', 'BFS'], url: 'https://leetcode.com/problems/number-of-islands' },
];

vi.mock('@/data/problems', () => ({
  useProblems: () => ({ data: mockProblems, isLoading: false }),
}));

const mockResetProblem = vi.fn();

vi.mock('@/state/tracker', () => ({
  useTracker: () => ({
    entries: {
      1: { status: 'solved', attempts: 2, intervalDays: 1, easeFactor: 2.5 },
    },
    isLoading: false,
    logAttempt: vi.fn(),
    setNotes: vi.fn(),
    resetProblem: mockResetProblem,
    totalSolved: 1,
    currentStreak: 1,
  }),
}));

vi.mock('@/state/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: null,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

function renderProblems() {
  return render(
    <MemoryRouter>
      <Problems />
    </MemoryRouter>
  );
}

describe('Problems page filtering', () => {
  it('shows all seeded problems by default', () => {
    renderProblems();
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('Longest Substring Without Repeating Characters')).toBeInTheDocument();
    expect(screen.getByText('Number of Islands')).toBeInTheDocument();
  });

  it('filters the list by search query', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.type(screen.getByPlaceholderText('Search by title…'), 'island');

    expect(screen.getByText('Number of Islands')).toBeInTheDocument();
    expect(screen.queryByText('Two Sum')).not.toBeInTheDocument();
    expect(screen.queryByText('Longest Substring Without Repeating Characters')).not.toBeInTheDocument();
  });

  it('does not show the sign-in prompt for an authenticated user', () => {
    renderProblems();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('only offers a Reset action for a problem with tracked progress', () => {
    renderProblems();
    // Two Sum (id 1) has an entry in the mocked tracker; the others don't.
    expect(screen.getAllByRole('button', { name: 'Reset' })).toHaveLength(1);
  });

  it('asks for confirmation before resetting progress', async () => {
    const user = userEvent.setup();
    renderProblems();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Reset progress on "Two Sum"?')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Reset' }));
    expect(mockResetProblem).toHaveBeenCalledWith(1, expect.any(Function));
  });
});
