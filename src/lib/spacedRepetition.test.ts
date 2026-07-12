import { describe, expect, it } from 'vitest';
import { addDays } from 'date-fns';
import { nextReviewState } from './spacedRepetition';

const NOW = new Date(2026, 6, 12);

describe('nextReviewState', () => {
  it('grows the interval and nudges ease up on success', () => {
    const result = nextReviewState({ intervalDays: 1, easeFactor: 2.5 }, true, NOW);
    expect(result.intervalDays).toBe(3); // round(1 * 2.5)
    expect(result.easeFactor).toBeCloseTo(2.6);
    expect(result.nextReviewAt).toEqual(addDays(NOW, 3));
  });

  it('compounds growth across consecutive successes', () => {
    const first = nextReviewState({ intervalDays: 1, easeFactor: 2.5 }, true, NOW);
    const second = nextReviewState(first, true, NOW);
    expect(second.intervalDays).toBe(8); // round(3 * 2.6)
    expect(second.easeFactor).toBeCloseTo(2.7);
  });

  it('resets the interval to 1 day on failure', () => {
    const result = nextReviewState({ intervalDays: 8, easeFactor: 2.7 }, false, NOW);
    expect(result.intervalDays).toBe(1);
    expect(result.nextReviewAt).toEqual(addDays(NOW, 1));
  });

  it('nudges ease factor down on failure', () => {
    const result = nextReviewState({ intervalDays: 8, easeFactor: 2.7 }, false, NOW);
    expect(result.easeFactor).toBeCloseTo(2.5);
  });

  it('floors ease factor at 1.3', () => {
    const result = nextReviewState({ intervalDays: 1, easeFactor: 1.3 }, false, NOW);
    expect(result.easeFactor).toBe(1.3);
  });

  it('caps ease factor at 3.0', () => {
    const result = nextReviewState({ intervalDays: 10, easeFactor: 3.0 }, true, NOW);
    expect(result.easeFactor).toBe(3.0);
  });
});
