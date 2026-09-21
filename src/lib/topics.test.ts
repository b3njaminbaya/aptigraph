import { describe, expect, it } from 'vitest';
import { deriveTopics } from './topics';
import type { ProblemRow } from '@/data/problems';

const problem = (id: number, topics: string[]): ProblemRow => ({
  id,
  title: `Problem ${id}`,
  difficulty: 'Easy',
  topics,
  url: `https://leetcode.com/problems/p${id}`,
});

describe('deriveTopics', () => {
  it('returns an empty list for no problems', () => {
    expect(deriveTopics([])).toEqual([]);
  });

  it('de-duplicates topics shared across problems and sorts them', () => {
    const topics = deriveTopics([problem(1, ['Hash Table', 'Array']), problem(2, ['Array', 'DFS'])]);
    expect(topics).toEqual(['Array', 'DFS', 'Hash Table']);
  });

  it('ignores problems that have no topics', () => {
    expect(deriveTopics([problem(1, []), problem(2, ['Graph'])])).toEqual(['Graph']);
  });
});
