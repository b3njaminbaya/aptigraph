import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TopicHeatmap from './TopicHeatmap';
import DifficultyChart from './DifficultyChart';
import type { ProblemRow } from '@/data/problems';

const problems: ProblemRow[] = [
  { id: 1, title: 'A', difficulty: 'Easy', topics: ['Array', 'Hash Table'], url: '' },
  { id: 2, title: 'B', difficulty: 'Easy', topics: ['Array'], url: '' },
  { id: 3, title: 'C', difficulty: 'Medium', topics: ['Graph'], url: '' },
  { id: 4, title: 'D', difficulty: 'Hard', topics: ['Graph', 'Array'], url: '' },
];

const mocks = vi.hoisted(() => ({
  entries: {} as Record<number, { status: string }>,
  problems: undefined as unknown,
}));

vi.mock('@/data/problems', () => ({ useProblems: () => ({ data: mocks.problems }) }));
vi.mock('@/state/tracker', () => ({ useTracker: () => ({ entries: mocks.entries }) }));

describe('TopicHeatmap', () => {
  it('shows solved/total per topic, alphabetically', () => {
    mocks.problems = problems;
    mocks.entries = { 1: { status: 'solved' }, 2: { status: 'attempted' }, 3: { status: 'solved' } };
    render(<TopicHeatmap />);

    const tiles = screen.getAllByTitle(/.+/);
    expect(tiles.map((t) => t.textContent)).toEqual(['Array', 'Graph', 'Hash Table']);
    const counts = (topic: string) => screen.getByTitle(topic).parentElement!.textContent;
    expect(counts('Array')).toContain('1/3'); // A solved; B only attempted; D unsolved
    expect(counts('Graph')).toContain('1/2');
    expect(counts('Hash Table')).toContain('1/1');
  });

  it('scales the bar to the share solved', () => {
    mocks.problems = problems;
    mocks.entries = { 1: { status: 'solved' }, 2: { status: 'solved' }, 4: { status: 'solved' } };
    render(<TopicHeatmap />);

    const bar = (topic: string) => screen.getByTitle(topic).closest('div.rounded-md')!.querySelector<HTMLElement>('.rounded-full > .rounded-full')!;
    expect(bar('Array').style.width).toBe('100%');
    expect(bar('Graph').style.width).toBe('50%');
  });

  it('renders no tiles while the catalog is loading', () => {
    mocks.problems = undefined;
    mocks.entries = {};
    render(<TopicHeatmap />);
    expect(screen.queryAllByTitle(/.+/)).toHaveLength(0);
  });
});

describe('DifficultyChart', () => {
  it('renders its container for real data and for an empty catalog without crashing', () => {
    mocks.entries = { 1: { status: 'solved' }, 3: { status: 'attempted' } };
    mocks.problems = problems;
    const { container, rerender } = render(<DifficultyChart />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();

    mocks.problems = undefined;
    rerender(<DifficultyChart />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
