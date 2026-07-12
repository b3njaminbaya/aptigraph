import { addDays } from 'date-fns';

export interface ReviewState {
  intervalDays: number;
  easeFactor: number;
}

const MIN_EASE_FACTOR = 1.3; // SM-2's standard floor
const MAX_EASE_FACTOR = 3.0; // prevents runaway interval growth

/**
 * SM-2-inspired (not strict SM-2 — we only know solved/not-solved on review,
 * not a 0-5 recall-quality rating). Success grows the interval and nudges
 * ease up; failure resets the interval to 1 day and nudges ease down.
 */
export function nextReviewState(
  current: ReviewState,
  wasSuccessful: boolean,
  now: Date = new Date()
): ReviewState & { nextReviewAt: Date } {
  const intervalDays = wasSuccessful
    ? Math.max(1, Math.round(current.intervalDays * current.easeFactor))
    : 1;
  const easeFactor = wasSuccessful
    ? Math.min(MAX_EASE_FACTOR, current.easeFactor + 0.1)
    : Math.max(MIN_EASE_FACTOR, current.easeFactor - 0.2);

  return { intervalDays, easeFactor, nextReviewAt: addDays(now, intervalDays) };
}
