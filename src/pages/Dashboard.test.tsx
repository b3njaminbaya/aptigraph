import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import Dashboard from './Dashboard';
import { fail, mockRpc, mockTable, ok, resetSupabaseMock } from '@/test/supabaseMock';
import { renderWithProviders, signIn } from '@/test/utils';
import { toast } from 'sonner';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

const statusRow = (problemId: number, status = 'solved') => ({
  user_id: 'user-1',
  problem_id: problemId,
  status,
  attempts_count: 1,
  notes: null,
  review_interval_days: 1,
  ease_factor: 2.5,
  next_review_at: null,
});

function seed({
  statuses = [] as unknown[],
  due = [] as unknown[],
  solvedDates = [] as string[],
  recommendations = [] as unknown[],
} = {}) {
  // useDueForReview is the only reader that filters with lte(); the tracker reads everything.
  mockTable('user_problem_status', (q) => (q.calls.some((c) => c.method === 'lte') ? ok(due) : ok(statuses)));
  mockTable('attempts', ok(solvedDates.map((created_at) => ({ created_at }))));
  mockTable('problems', ok([{ id: 1, slug: 'a', title: 'A', difficulty: 'Easy', topics: ['Array'], url: 'u' }]));
  mockRpc('get_recommendations', ok(recommendations));
}

function renderDashboard() {
  return renderWithProviders(<Dashboard />, { route: '/dashboard', tracker: true });
}

const card = (label: string) => screen.getByText(label).closest<HTMLElement>('.rounded-lg')!;

beforeEach(() => {
  resetSupabaseMock();
  signIn();
});

describe('Dashboard stats', () => {
  it('shows solved count, streak and distance to the next milestone', async () => {
    seed({ statuses: [statusRow(1), statusRow(2), statusRow(3), statusRow(4, 'attempted')], solvedDates: [new Date().toISOString()] });
    renderDashboard();

    await waitFor(() => expect(within(card('Solved')).getByText('3')).toBeInTheDocument());
    expect(within(card('Current Streak')).getByText('1 day')).toBeInTheDocument();
    expect(within(card('Next Goal')).getByText('+2 solved')).toBeInTheDocument();
  });

  it('pluralises the streak', async () => {
    const day = 86_400_000;
    seed({ solvedDates: [new Date().toISOString(), new Date(Date.now() - day).toISOString(), new Date(Date.now() - 2 * day).toISOString()] });
    renderDashboard();
    await waitFor(() => expect(within(card('Current Streak')).getByText('3 days')).toBeInTheDocument());
  });

  it('starts a new user at zero with the first milestone in reach', async () => {
    seed();
    renderDashboard();
    await waitFor(() => expect(within(card('Next Goal')).getByText('+5 solved')).toBeInTheDocument());
    expect(within(card('Solved')).getByText('0')).toBeInTheDocument();
    expect(within(card('Current Streak')).getByText('0 days')).toBeInTheDocument();
  });
});

describe('Dashboard recommendations', () => {
  it('explains each recommendation with the weak topic and solve rate behind it', async () => {
    seed({
      recommendations: [
        { problem_id: 11, title: 'Container With Most Water', difficulty: 'Medium', topics: ['Two Pointers'], reason_topic: 'Two Pointers', reason_solve_rate: 0.25 },
      ],
    });
    renderDashboard();

    expect(await screen.findByText('Container With Most Water')).toBeInTheDocument();
    expect(screen.getByText("Because you're at 25% on Two Pointers")).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('suggests starter problems for a brand-new user', async () => {
    seed(); // RPC returns nothing, so the hook falls back to Easy problems
    renderDashboard();
    expect(await screen.findByText('A good place to start')).toBeInTheDocument();
  });

  it('reports a failed load through the global error toast', async () => {
    seed();
    mockRpc('get_recommendations', fail('function get_recommendations does not exist'));
    renderDashboard();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('function get_recommendations does not exist'));
  });
});

describe('Dashboard due for review', () => {
  it('lists problems that are due, linking to the catalog', async () => {
    seed({
      due: [{ problem_id: 4, next_review_at: new Date(Date.now() - 2 * 86_400_000).toISOString(), problems: { title: 'Valid Parentheses', difficulty: 'Easy' } }],
    });
    renderDashboard();

    const link = await screen.findByRole('link', { name: 'Valid Parentheses' });
    expect(link).toHaveAttribute('href', '/problems');
    expect(screen.getByText(/Due 2 days ago/)).toBeInTheDocument();
  });

  it('explains how items get here when nothing is due', async () => {
    seed();
    renderDashboard();
    expect(await screen.findByText('Nothing due — solved problems will show up here for spaced review.')).toBeInTheDocument();
  });
});
