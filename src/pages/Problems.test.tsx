import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/state/tracker', () => ({
  useTracker: () => ({
    entries: {},
    isLoading: false,
    markStatus: vi.fn(),
    logAttempt: vi.fn(),
    setNotes: vi.fn(),
    resetProblem: vi.fn(),
    totalSolved: 0,
    currentStreak: 0,
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
});
