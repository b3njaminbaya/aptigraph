import type { ProblemRow } from '@/data/problems';

export function deriveTopics(problems: ProblemRow[]): string[] {
  return Array.from(new Set(problems.flatMap((p) => p.topics))).sort();
}
