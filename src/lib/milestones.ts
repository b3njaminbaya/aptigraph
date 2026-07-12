/** Smallest multiple of `step` strictly greater than `totalSolved`. */
export function nextMilestone(totalSolved: number, step = 5): number {
  return (Math.floor(totalSolved / step) + 1) * step;
}

/** True when `totalSolved` lands exactly on a milestone (and isn't zero). */
export function isMilestone(totalSolved: number, step = 5): boolean {
  return totalSolved > 0 && totalSolved % step === 0;
}
