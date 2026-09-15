import React, { createContext, useContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { useAuth } from '@/state/auth';
import { calculateStreak } from '@/lib/streak';
import { isMilestone } from '@/lib/milestones';
import { nextReviewState } from '@/lib/spacedRepetition';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ProblemStatus = 'unsolved' | 'attempted' | 'solved';

export interface ProblemEntry {
  status: ProblemStatus;
  attempts: number;
  notes?: string;
  intervalDays: number;
  easeFactor: number;
  nextReviewAt?: string;
}

interface TrackerContextValue {
  entries: Record<number, ProblemEntry>;
  isLoading: boolean;
  logAttempt: (
    problemId: number,
    minutes: number,
    result: 'attempted' | 'solved',
    onSuccess?: () => void
  ) => void;
  setNotes: (problemId: number, notes: string) => void;
  resetProblem: (problemId: number, onSuccess?: () => void) => void;
  totalSolved: number;
  currentStreak: number;
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

export const TrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const statusQuery = useQuery({
    queryKey: ['user_problem_status', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_problem_status')
        .select('*')
        .eq('user_id', userId as string);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const solvedDatesQuery = useQuery({
    queryKey: ['solved_dates', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attempts')
        .select('created_at')
        .eq('user_id', userId as string)
        .eq('result', 'solved');
      if (error) throw error;
      return data.map((row) => format(new Date(row.created_at), 'yyyy-MM-dd'));
    },
    enabled: !!userId,
  });

  const entries = useMemo(() => {
    const map: Record<number, ProblemEntry> = {};
    (statusQuery.data ?? []).forEach((row) => {
      map[row.problem_id] = {
        status: row.status as ProblemStatus,
        attempts: row.attempts_count,
        notes: row.notes ?? undefined,
        intervalDays: row.review_interval_days,
        easeFactor: row.ease_factor,
        nextReviewAt: row.next_review_at ?? undefined,
      };
    });
    return map;
  }, [statusQuery.data]);

  const invalidateStatus = () =>
    queryClient.invalidateQueries({ queryKey: ['user_problem_status', userId] });
  const invalidateSolvedDates = () =>
    queryClient.invalidateQueries({ queryKey: ['solved_dates', userId] });

  const logAttemptMutation = useMutation({
    mutationFn: async ({
      problemId,
      minutes,
      result,
    }: {
      problemId: number;
      minutes: number;
      result: 'attempted' | 'solved';
    }) => {
      if (!userId) throw new Error('Sign in to track progress');
      const { error: attemptError } = await supabase.from('attempts').insert({
        user_id: userId,
        problem_id: problemId,
        minutes,
        result,
      });
      if (attemptError) throw attemptError;

      const current = entries[problemId];
      const wasAlreadySolved = current?.status === 'solved';

      const statusPayload: TablesInsert<'user_problem_status'> = {
        user_id: userId,
        problem_id: problemId,
        status: result,
        attempts_count: (current?.attempts ?? 0) + 1,
        last_activity_at: new Date().toISOString(),
      };

      // Only schedule a review once a problem has been solved at least once:
      // a fresh solve schedules the first review; reviewing an already-solved
      // problem (success or failure) reschedules it. Struggling on a
      // never-yet-solved problem doesn't touch scheduling.
      if (result === 'solved' || wasAlreadySolved) {
        const next = nextReviewState(
          { intervalDays: current?.intervalDays ?? 1, easeFactor: current?.easeFactor ?? 2.5 },
          result === 'solved'
        );
        statusPayload.next_review_at = next.nextReviewAt.toISOString();
        statusPayload.review_interval_days = next.intervalDays;
        statusPayload.ease_factor = next.easeFactor;
      }

      const { error: statusError } = await supabase
        .from('user_problem_status')
        .upsert(statusPayload);
      if (statusError) throw statusError;

      return { wasAlreadySolved };
    },
    onSuccess: ({ wasAlreadySolved }, variables) => {
      invalidateStatus();
      invalidateSolvedDates();
      if (variables.result === 'solved' && !wasAlreadySolved) {
        const newTotal = totalSolved + 1;
        if (isMilestone(newTotal)) {
          toast.success(`${newTotal} problems solved! Keep the streak going.`);
        }
      }
    },
  });

  const setNotesMutation = useMutation({
    mutationFn: async ({ problemId, notes }: { problemId: number; notes: string }) => {
      if (!userId) throw new Error('Sign in to track progress');
      const { error } = await supabase
        .from('user_problem_status')
        .upsert({ user_id: userId, problem_id: problemId, notes });
      if (error) throw error;
    },
    onSuccess: invalidateStatus,
  });

  const resetProblemMutation = useMutation({
    mutationFn: async (problemId: number) => {
      if (!userId) throw new Error('Sign in to track progress');
      const { error } = await supabase
        .from('user_problem_status')
        .delete()
        .eq('user_id', userId)
        .eq('problem_id', problemId);
      if (error) throw error;
    },
    onSuccess: invalidateStatus,
  });

  const totalSolved = useMemo(
    () => Object.values(entries).filter((e) => e.status === 'solved').length,
    [entries]
  );

  const currentStreak = useMemo(
    () => calculateStreak(solvedDatesQuery.data ?? []),
    [solvedDatesQuery.data]
  );

  const value: TrackerContextValue = {
    entries,
    isLoading: statusQuery.isLoading || solvedDatesQuery.isLoading,
    logAttempt: (problemId, minutes, result, onSuccess) => {
      logAttemptMutation.mutate({ problemId, minutes, result }, { onSuccess });
    },
    setNotes: (problemId, notes) => setNotesMutation.mutate({ problemId, notes }),
    resetProblem: (problemId, onSuccess) => resetProblemMutation.mutate(problemId, { onSuccess }),
    totalSolved,
    currentStreak,
  };

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
};

export const useTracker = () => {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error('useTracker must be used within TrackerProvider');
  return ctx;
};
