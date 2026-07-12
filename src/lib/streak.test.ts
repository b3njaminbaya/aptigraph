import { describe, expect, it } from 'vitest';
import { format, subDays } from 'date-fns';
import { calculateStreak } from './streak';

const NOW = new Date(2026, 6, 12, 21, 30); // July 12, 2026, 9:30pm local
const key = (daysAgo: number) => format(subDays(NOW, daysAgo), 'yyyy-MM-dd');

describe('calculateStreak', () => {
  it('returns 0 when nothing has been solved', () => {
    expect(calculateStreak([], NOW)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(calculateStreak([key(0), key(1), key(2)], NOW)).toBe(3);
  });

  it('still counts through yesterday when today has no solve yet', () => {
    // regression test: the original implementation zeroed the streak the
    // moment "today" had no solve, instead of checking yesterday first.
    expect(calculateStreak([key(1), key(2), key(3)], NOW)).toBe(3);
  });

  it('stops at the first gap', () => {
    expect(calculateStreak([key(0), key(1), key(3)], NOW)).toBe(2);
  });

  it('is timezone-consistent (not UTC) for a date near local midnight', () => {
    // 11:30pm local — a UTC-based date key would roll over to the next day
    // in timezones behind UTC, which was the source of the original bug.
    const lateNight = new Date(2026, 6, 12, 23, 30);
    const todayKey = format(lateNight, 'yyyy-MM-dd');
    expect(calculateStreak([todayKey], lateNight)).toBe(1);
  });

  it('does not count a day that was solved but is more than one day removed from today', () => {
    expect(calculateStreak([key(2)], NOW)).toBe(0);
  });
});
