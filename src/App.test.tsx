import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { resetSupabaseMock } from '@/test/supabaseMock';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

beforeEach(() => {
  resetSupabaseMock();
});

function visit(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

describe('App routing', () => {
  it('renders the landing page with the shared header and footer', async () => {
    visit('/');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Crack LeetCode');
    expect(screen.getAllByRole('link', { name: 'Aptigraph' }).length).toBeGreaterThanOrEqual(2); // header + footer
  });

  it('lazy-loads a route on demand', async () => {
    visit('/leaderboard');
    expect(await screen.findByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
  });

  it('serves the password-reset page (regression: route was missing)', async () => {
    visit('/reset-password');
    expect(await screen.findByRole('heading', { name: 'Link expired' })).toBeInTheDocument();
  });

  it('sends a signed-out visitor from Settings to sign in', async () => {
    visit('/settings');
    expect(await screen.findByRole('heading', { name: /Welcome to Aptigraph/ })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/auth');
  });

  it('shows the 404 page for unknown routes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    visit('/definitely-not-a-page');
    expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument();
  });
});
