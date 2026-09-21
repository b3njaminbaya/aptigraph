import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Flame } from 'lucide-react';
import { StatCard } from './StatCard';
import { ProblemStatusIcon } from './ProblemStatusIcon';
import { DifficultyBadge } from './ui/difficulty-badge';
import { ErrorBoundary } from './ErrorBoundary';
import { ThemeToggle } from './ThemeToggle';
import AppFooter from './layout/AppFooter';

describe('StatCard', () => {
  it('renders the label, value and optional hint', () => {
    render(<StatCard icon={Flame} label="Current Streak" value="4 days" hint="Aim for consistency" />);
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('4 days')).toBeInTheDocument();
    expect(screen.getByText('Aim for consistency')).toBeInTheDocument();
  });

  it('omits the hint when none is given', () => {
    const { container } = render(<StatCard icon={Flame} label="Solved" value={3} />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});

describe('ProblemStatusIcon', () => {
  it.each([
    ['solved', 'text-status-good'],
    ['attempted', 'text-status-warning'],
    ['unsolved', 'text-muted-foreground'],
  ] as const)('renders the %s state with the %s colour', (status, colour) => {
    const { container } = render(<ProblemStatusIcon status={status} className="extra" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveClass(colour, 'extra');
  });
});

describe('DifficultyBadge', () => {
  it.each([
    ['Easy', 'text-status-good'],
    ['Medium', 'text-status-warning'],
    ['Hard', 'text-status-critical'],
  ])('styles %s distinctly', (difficulty, colour) => {
    render(<DifficultyBadge difficulty={difficulty} />);
    expect(screen.getByText(difficulty)).toHaveClass(colour);
  });

  it('falls back to a neutral style for an unknown difficulty', () => {
    render(<DifficultyBadge difficulty="Extreme" />);
    expect(screen.getByText('Extreme')).toHaveClass('text-muted-foreground');
  });
});

describe('ErrorBoundary', () => {
  function Boom(): never {
    throw new Error('render exploded');
  }

  it('renders children when nothing goes wrong', () => {
    render(<ErrorBoundary><p>all good</p></ErrorBoundary>);
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('shows a recovery screen instead of a blank page when a child throws, and logs the error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith('Unhandled UI error', expect.any(Error), expect.anything());
    consoleError.mockRestore();
  });

  it('reloads the page from the recovery screen', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });

    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }));

    expect(reload).toHaveBeenCalled();
    Object.defineProperty(window, 'location', { configurable: true, value: original });
    consoleError.mockRestore();
  });
});

describe('ThemeToggle', () => {
  it('switches between dark and light', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(document.documentElement).toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(document.documentElement).not.toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(document.documentElement).toHaveClass('dark');
  });
});

describe('AppFooter', () => {
  it('links to the product and account pages and shows the current year', () => {
    render(<MemoryRouter><AppFooter /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Leaderboard' })).toHaveAttribute('href', '/leaderboard');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
  });
});
