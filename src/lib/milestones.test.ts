import { describe, expect, it } from 'vitest';
import { isMilestone, nextMilestone } from './milestones';

describe('nextMilestone', () => {
  it('returns the first milestone when nothing is solved', () => {
    expect(nextMilestone(0)).toBe(5);
  });

  it('returns the next milestone mid-range', () => {
    expect(nextMilestone(3)).toBe(5);
  });

  it('advances to the next milestone right after hitting one', () => {
    expect(nextMilestone(5)).toBe(10);
  });

  it('supports a custom step', () => {
    expect(nextMilestone(9, 10)).toBe(10);
    expect(nextMilestone(10, 10)).toBe(20);
  });
});

describe('isMilestone', () => {
  it('is false for zero', () => {
    expect(isMilestone(0)).toBe(false);
  });

  it('is false between milestones', () => {
    expect(isMilestone(3)).toBe(false);
    expect(isMilestone(7)).toBe(false);
  });

  it('is true exactly on a milestone', () => {
    expect(isMilestone(5)).toBe(true);
    expect(isMilestone(10)).toBe(true);
  });

  it('supports a custom step', () => {
    expect(isMilestone(10, 10)).toBe(true);
    expect(isMilestone(5, 10)).toBe(false);
  });
});
