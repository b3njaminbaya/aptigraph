import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Index from './Index';
import NotFound from './NotFound';

const router = (ui: React.ReactNode, route = '/') => (
  <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {ui}
  </MemoryRouter>
);

describe('Landing page', () => {
  it('leads with the value proposition and both calls to action', () => {
    render(router(<Index />));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Crack LeetCode with smart tracking & spaced practice');
    expect(screen.getByRole('link', { name: 'Get Started Free' })).toHaveAttribute('href', '/auth');
    expect(screen.getByRole('link', { name: 'Browse Problems' })).toHaveAttribute('href', '/problems');
    expect(screen.getByRole('link', { name: 'View Leaderboard' })).toHaveAttribute('href', '/leaderboard');
  });

  it('describes every headline feature', () => {
    render(router(<Index />));
    for (const feature of ['Smart Recommendations', 'Analytics & Insights', 'Streaks & Milestones', 'Leaderboards & Friends', 'Spaced Repetition']) {
      expect(screen.getByRole('heading', { name: feature })).toBeInTheDocument();
    }
  });

  it('makes no unverifiable user-count claims (regression: "thousands of users")', () => {
    const { container } = render(router(<Index />));
    expect(container.textContent).not.toMatch(/thousands|millions|\d+,?\d*\s+(users|developers)/i);
  });

  it('describes the hero image for screen readers', () => {
    render(router(<Index />));
    expect(screen.getByAltText(/dashboard preview/i)).toBeInTheDocument();
  });
});

describe('NotFound page', () => {
  it('tells the user the page is missing and links home', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(router(<NotFound />, '/nope'));
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Home' })).toHaveAttribute('href', '/');
  });

  it('logs which route was requested', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(router(<NotFound />, '/some/missing/page'));
    expect(consoleError).toHaveBeenCalledWith('404 Error: User attempted to access non-existent route:', '/some/missing/page');
  });
});
