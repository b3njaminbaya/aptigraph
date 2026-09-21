import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import ResetPassword from './ResetPassword';
import { resetSupabaseMock, supabaseMock } from '@/test/supabaseMock';
import { renderWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

beforeEach(() => {
  resetSupabaseMock();
});

async function renderWithRecoverySession() {
  signIn(); // opening the emailed link establishes a session
  renderWithProviders(<ResetPassword />, { route: '/reset-password' });
  return screen.findByRole('heading', { name: 'Set a new password' });
}

describe('ResetPassword page', () => {
  it('shows a spinner while the session is being checked', () => {
    supabaseMock.auth.getSession.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ResetPassword />, { route: '/reset-password' });
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('explains an invalid or expired link and offers a way back', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPassword />, { route: '/reset-password' });

    expect(await screen.findByRole('heading', { name: 'Link expired' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/auth');
  });

  it('rejects a password that is too short without calling Supabase', async () => {
    const user = userEvent.setup();
    await renderWithRecoverySession();

    await user.type(screen.getByPlaceholderText('New password (min 6 chars)'), 'abc');
    await user.type(screen.getByPlaceholderText('Confirm new password'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters');
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords without calling Supabase', async () => {
    const user = userEvent.setup();
    await renderWithRecoverySession();

    await user.type(screen.getByPlaceholderText('New password (min 6 chars)'), 'hunter22');
    await user.type(screen.getByPlaceholderText('Confirm new password'), 'hunter23');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(toast.error).toHaveBeenCalledWith('Passwords do not match');
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it('updates the password, confirms, and continues to the dashboard', async () => {
    const user = userEvent.setup();
    await renderWithRecoverySession();

    await user.type(screen.getByPlaceholderText('New password (min 6 chars)'), 'hunter22');
    await user.type(screen.getByPlaceholderText('Confirm new password'), 'hunter22{Enter}');

    await waitFor(() => expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'hunter22' }));
    expect(toast.success).toHaveBeenCalledWith('Password updated.');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'));
  });

  it('stays on the page and shows the error when the update is rejected', async () => {
    supabaseMock.auth.updateUser.mockResolvedValue({ data: {}, error: { message: 'New password should be different' } });
    const user = userEvent.setup();
    await renderWithRecoverySession();

    await user.type(screen.getByPlaceholderText('New password (min 6 chars)'), 'hunter22');
    await user.type(screen.getByPlaceholderText('Confirm new password'), 'hunter22');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('New password should be different'));
    expect(screen.getByTestId('location')).toHaveTextContent('/reset-password');
    expect(screen.getByRole('button', { name: 'Update password' })).toBeEnabled();
  });

  it('recovers from a network failure instead of sticking on "Updating…" (regression)', async () => {
    supabaseMock.auth.updateUser.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    await renderWithRecoverySession();

    await user.type(screen.getByPlaceholderText('New password (min 6 chars)'), 'hunter22');
    await user.type(screen.getByPlaceholderText('Confirm new password'), 'hunter22');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to fetch'));
    expect(screen.getByRole('button', { name: 'Update password' })).toBeEnabled();
  });
});
