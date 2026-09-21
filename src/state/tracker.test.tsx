import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useTracker } from './tracker';
import {
  callsOf,
  fail,
  firstCallArgs,
  mockTable,
  ok,
  queriesFor,
  resetSupabaseMock,
  type RecordedQuery,
} from '@/test/supabaseMock';
import { renderHookWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

const isWrite = (q: RecordedQuery) => q.calls.some((c) => ['insert', 'upsert', 'delete'].includes(c.method));

function statusRow(problemId: number, overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'user-1',
    problem_id: problemId,
    status: 'solved',
    attempts_count: 1,
    notes: null,
    review_interval_days: 1,
    ease_factor: 2.5,
    next_review_at: null,
    ...overrides,
  };
}

/** Serves `rows` for reads of user_problem_status and acknowledges writes. */
function seedStatuses(rows: unknown[]) {
  mockTable('user_problem_status', (q) => (isWrite(q) ? ok(null) : ok(rows)));
}

function seedSolvedDates(dates: string[]) {
  mockTable('attempts', (q) => (isWrite(q) ? ok(null) : ok(dates.map((created_at) => ({ created_at })))));
}

async function renderTracker() {
  const utils = renderHookWithProviders(() => useTracker(), { tracker: true });
  // isLoading is briefly false before the session resolves, so first wait for
  // the signed-in user's queries to actually start.
  await waitFor(() => expect(queriesFor('user_problem_status').length).toBeGreaterThan(0));
  await waitFor(() => expect(utils.result.current.isLoading).toBe(false));
  return utils;
}

beforeEach(() => {
  resetSupabaseMock();
  signIn();
});

describe('TrackerProvider reads', () => {
  it('maps status rows into per-problem entries', async () => {
    seedStatuses([
      statusRow(1, { status: 'solved', attempts_count: 3, notes: 'use a hash map', review_interval_days: 6, ease_factor: 2.6 }),
      statusRow(2, { status: 'attempted', attempts_count: 1 }),
    ]);
    const { result } = await renderTracker();

    expect(result.current.entries[1]).toEqual({
      status: 'solved',
      attempts: 3,
      notes: 'use a hash map',
      intervalDays: 6,
      easeFactor: 2.6,
      nextReviewAt: undefined,
    });
    expect(result.current.entries[2].status).toBe('attempted');
    expect(result.current.entries[2].notes).toBeUndefined();
  });

  it('counts only solved problems in totalSolved', async () => {
    seedStatuses([statusRow(1), statusRow(2), statusRow(3, { status: 'attempted' })]);
    const { result } = await renderTracker();
    expect(result.current.totalSolved).toBe(2);
  });

  it('derives the current streak from days with a solved attempt', async () => {
    const now = new Date();
    seedSolvedDates([now.toISOString(), new Date(now.getTime() - 86_400_000).toISOString()]);
    const { result } = await renderTracker();
    expect(result.current.currentStreak).toBe(2);
  });

  it('only queries the signed-in user\'s rows', async () => {
    await renderTracker();
    const read = queriesFor('user_problem_status')[0];
    expect(callsOf(read, 'eq')[0].args).toEqual(['user_id', 'user-1']);
  });

  it('does not query anything when signed out', async () => {
    resetSupabaseMock();
    const { result } = renderHookWithProviders(() => useTracker(), { tracker: true });
    await waitFor(() => expect(result.current.entries).toEqual({}));
    expect(queriesFor('user_problem_status')).toHaveLength(0);
    expect(queriesFor('attempts')).toHaveLength(0);
    expect(result.current.totalSolved).toBe(0);
    expect(result.current.currentStreak).toBe(0);
  });
});

describe('logAttempt', () => {
  it('records the attempt and schedules the first review when a problem is solved', async () => {
    const { result } = await renderTracker();
    const onSuccess = vi.fn();

    act(() => result.current.logAttempt(7, 25, 'solved', onSuccess));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    expect(firstCallArgs('attempts', 'insert')).toEqual([
      { user_id: 'user-1', problem_id: 7, minutes: 25, result: 'solved' },
    ]);
    const [status] = firstCallArgs('user_problem_status', 'upsert') as [Record<string, unknown>];
    expect(status).toMatchObject({
      user_id: 'user-1',
      problem_id: 7,
      status: 'solved',
      attempts_count: 1,
      review_interval_days: 3, // round(1 day * 2.5 ease)
      ease_factor: 2.6,
    });
    expect(typeof status.next_review_at).toBe('string');
  });

  it('does not schedule a review for a struggle on a never-solved problem', async () => {
    seedStatuses([statusRow(7, { status: 'attempted', attempts_count: 2 })]);
    const { result } = await renderTracker();
    const onSuccess = vi.fn();

    act(() => result.current.logAttempt(7, 40, 'attempted', onSuccess));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const [status] = firstCallArgs('user_problem_status', 'upsert') as [Record<string, unknown>];
    expect(status.status).toBe('attempted');
    expect(status.attempts_count).toBe(3);
    expect(status).not.toHaveProperty('next_review_at');
    expect(status).not.toHaveProperty('review_interval_days');
  });

  it('grows the interval when an already-solved problem is solved again', async () => {
    seedStatuses([statusRow(7, { review_interval_days: 6, ease_factor: 2.5 })]);
    const { result } = await renderTracker();
    const onSuccess = vi.fn();

    act(() => result.current.logAttempt(7, 10, 'solved', onSuccess));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const [status] = firstCallArgs('user_problem_status', 'upsert') as [Record<string, unknown>];
    expect(status).toMatchObject({ review_interval_days: 15, ease_factor: 2.6, attempts_count: 2 });
  });

  it('keeps a solved problem solved, and due tomorrow, when a review attempt fails', async () => {
    // A failed review must reschedule for 1 day, not demote the problem out of
    // the solved set (which would also drop it from the "Due for review" list).
    seedStatuses([statusRow(7, { review_interval_days: 15, ease_factor: 2.6 })]);
    const { result } = await renderTracker();
    const onSuccess = vi.fn();

    act(() => result.current.logAttempt(7, 50, 'attempted', onSuccess));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const [status] = firstCallArgs('user_problem_status', 'upsert') as [Record<string, unknown>];
    expect(status.status).toBe('solved');
    expect(status).toMatchObject({ review_interval_days: 1, ease_factor: 2.4 });
  });

  it('refreshes the status list after a successful write', async () => {
    const { result } = await renderTracker();
    const readsBefore = queriesFor('user_problem_status').filter((q) => !isWrite(q)).length;

    act(() => result.current.logAttempt(1, 5, 'solved'));
    await waitFor(() =>
      expect(queriesFor('user_problem_status').filter((q) => !isWrite(q)).length).toBeGreaterThan(readsBefore)
    );
  });

  it('writes nothing further and calls no success handler when the attempt insert fails', async () => {
    mockTable('attempts', (q) => (isWrite(q) ? fail('row-level security violation') : ok([])));
    const { result } = await renderTracker();
    const onSuccess = vi.fn();

    act(() => result.current.logAttempt(7, 25, 'solved', onSuccess));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('row-level security violation'));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(firstCallArgs('user_problem_status', 'upsert')).toBeUndefined();
  });
});

describe('milestone toasts', () => {
  const fourSolved = () => seedStatuses([1, 2, 3, 4].map((id) => statusRow(id)));

  it('celebrates the 5th solved problem, but only after the write succeeds', async () => {
    fourSolved();
    const { result } = await renderTracker();

    act(() => result.current.logAttempt(50, 20, 'solved'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('5 problems solved! Keep the streak going.'));
  });

  it('does not celebrate when the write fails (regression: toast fired optimistically)', async () => {
    fourSolved();
    mockTable('attempts', (q) => (isWrite(q) ? fail('network error') : ok([])));
    const { result } = await renderTracker();

    act(() => result.current.logAttempt(50, 20, 'solved'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('network error'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('does not celebrate re-solving a problem that was already solved', async () => {
    fourSolved();
    const { result } = await renderTracker();
    const onSuccess = vi.fn();

    act(() => result.current.logAttempt(1, 20, 'solved', onSuccess));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('does not celebrate a non-milestone count or a failed attempt', async () => {
    seedStatuses([1, 2].map((id) => statusRow(id)));
    const { result } = await renderTracker();
    const onSuccess = vi.fn();

    act(() => result.current.logAttempt(50, 20, 'solved', onSuccess)); // 3rd solve
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    act(() => result.current.logAttempt(51, 20, 'attempted', onSuccess));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(2));
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('setNotes and resetProblem', () => {
  it('saves notes for a problem', async () => {
    const { result } = await renderTracker();
    act(() => result.current.setNotes(9, 'two pointers'));
    await waitFor(() =>
      expect(firstCallArgs('user_problem_status', 'upsert')).toEqual([
        { user_id: 'user-1', problem_id: 9, notes: 'two pointers' },
      ])
    );
  });

  it('resets a problem by deleting only that user\'s row and reports success', async () => {
    const { result } = await renderTracker();
    const onSuccess = vi.fn();

    act(() => result.current.resetProblem(9, onSuccess));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    const deleteQuery = queriesFor('user_problem_status').find((q) => callsOf(q, 'delete').length > 0);
    expect(callsOf(deleteQuery, 'eq').map((c) => c.args)).toEqual([
      ['user_id', 'user-1'],
      ['problem_id', 9],
    ]);
  });

  it('does not report success when the reset fails', async () => {
    mockTable('user_problem_status', (q) => (isWrite(q) ? fail('delete denied') : ok([])));
    const { result } = await renderTracker();
    const onSuccess = vi.fn();

    act(() => result.current.resetProblem(9, onSuccess));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('delete denied'));
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('useTracker', () => {
  it('throws when used outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTracker())).toThrow('useTracker must be used within TrackerProvider');
    consoleError.mockRestore();
  });
});
