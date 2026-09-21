import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppHeader from './AppHeader';
import { resetSupabaseMock, supabaseMock } from '@/test/supabaseMock';
import { makeUser, renderWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

beforeEach(() => {
  resetSupabaseMock();
});

describe('AppHeader', () => {
  it('links to every main section', () => {
    renderWithProviders(<AppHeader />);
    for (const [name, href] of [
      ['Dashboard', '/dashboard'],
      ['Problems', '/problems'],
      ['Leaderboard', '/leaderboard'],
      ['Discuss', '/discuss'],
      ['Friends', '/friends'],
    ]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('does not flash "Get Started" at a signed-in user while the session loads (regression)', async () => {
    supabaseMock.auth.getSession.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AppHeader />);

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByRole('button', { name: 'Get Started' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sign out/ })).not.toBeInTheDocument();
  });

  it('offers Get Started to a visitor, which leads to sign in', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppHeader />);

    await user.click(await screen.findByRole('button', { name: 'Get Started' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/auth');
  });

  it('shows the signed-in user\'s email and reaches settings', async () => {
    signIn(makeUser({ email: 'ada@example.com' }));
    const user = userEvent.setup();
    renderWithProviders(<AppHeader />);

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Get Started' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/settings');
  });

  it('signs out and returns to the landing page', async () => {
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<AppHeader />, { route: '/dashboard' });

    await user.click(await screen.findByRole('button', { name: /Sign out/ }));

    await waitFor(() => expect(supabaseMock.auth.signOut).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
  });

  it('exposes the navigation and account actions in the mobile menu', async () => {
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<AppHeader />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Dashboard');
    expect(dialog).toHaveTextContent('test@example.com');
  });
});
