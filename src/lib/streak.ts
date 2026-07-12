import { format, subDays } from 'date-fns';

/**
 * Consecutive-day streak ending today or yesterday. A day is "solved" if it
 * appears in solvedDateKeys (local yyyy-MM-dd strings, not UTC — mixing UTC
 * and local dates was the source of the original off-by-one streak bug).
 * If today has no solve yet, the streak still counts through yesterday
 * rather than zeroing out mid-day.
 */
export function calculateStreak(solvedDateKeys: string[], now: Date = new Date()): number {
  const days = new Set(solvedDateKeys);
  if (days.size === 0) return 0;

  let cursor = now;
  if (!days.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor = subDays(cursor, 1);
  }

  let streak = 0;
  while (days.has(format(cursor, 'yyyy-MM-dd'))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}
