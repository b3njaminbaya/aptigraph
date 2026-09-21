import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import Auth from './Auth';
import { resetSupabaseMock, supabaseMock } from '@/test/supabaseMock';
import { renderWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

beforeEach(() => {
  resetSupabaseMock();
});

async function fillSignIn(user: ReturnType<typeof userEvent.setup>, email = 'me@example.com', password = 'hunter22') {
  await user.type(screen.getByPlaceholderText('Email'), email);
  await user.type(screen.getByPlaceholderText('Password'), password);
}

describe('Auth page: sign in', () => {
  it('submits with the Enter key from the password field (regression: Enter did nothing)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Auth />, { route: '/auth' });

    await user.type(screen.getByPlaceholderText('Email'), 'me@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'hunter22{Enter}');

    await waitFor(() =>
      expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'me@example.com', password: 'hunter22' })
    );
    expect(toast.success).toHaveBeenCalledWith('Signed in.');
  });

  it('shows the error and re-enables the button after a failed sign in', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } });
    const user = userEvent.setup();
    renderWithProviders(<Auth />, { route: '/auth' });

    await fillSignIn(user);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid login credentials'));
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('recovers from a network failure instead of sticking on "Signing in…" (regression)', async () => {
    supabaseMock.auth.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    renderWithProviders(<Auth />, { route: '/auth' });

    await fillSignIn(user);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to fetch'));
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  it('disables the button while the request is in flight', async () => {
    let resolveSignIn: (value: unknown) => void = () => {};
    supabaseMock.auth.signInWithPassword.mockReturnValue(new Promise((resolve) => (resolveSignIn = resolve)));
    const user = userEvent.setup();
    renderWithProviders(<Auth />, { route: '/auth' });

    await fillSignIn(user);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByRole('button', { name: 'Signing in…' })).toBeDisabled();
    resolveSignIn({ data: {}, error: null });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled());
  });

  it('hints password managers with the right autocomplete values', () => {
    renderWithProviders(<Auth />, { route: '/auth' });
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('sends an already signed-in user straight to the dashboard', async () => {
    signIn();
    renderWithProviders(<Auth />, { route: '/auth' });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'));
  });
});

describe('Auth page: sign up', () => {
  it('creates an account and tells the user to confirm their email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Auth />, { route: '/auth' });

    await user.click(screen.getByRole('tab', { name: 'Sign Up' }));
    expect(screen.getByPlaceholderText(/Password/)).toHaveAttribute('autocomplete', 'new-password');
    await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
    await user.type(screen.getByPlaceholderText(/Password/), 'hunter22{Enter}');

    await waitFor(() =>
      expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'hunter22' })
    );
    expect(toast.success).toHaveBeenCalledWith('Account created. Check your email to confirm before signing in.');
  });

  it('shows why sign up failed', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } });
    const user = userEvent.setup();
    renderWithProviders(<Auth />, { route: '/auth' });

    await user.click(screen.getByRole('tab', { name: 'Sign Up' }));
    await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
    await user.type(screen.getByPlaceholderText(/Password/), 'hunter22');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('User already registered'));
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeEnabled();
  });
});

describe('Auth page: forgot password', () => {
  it('asks for an email first instead of calling Supabase with nothing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Auth />, { route: '/auth' });

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));

    expect(toast.error).toHaveBeenCalledWith('Enter your email above first');
    expect(supabaseMock.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('requests a reset email that links back to this app\'s reset page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Auth />, { route: '/auth' });

    await user.type(screen.getByPlaceholderText('Email'), '  me@example.com ');
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));

    await waitFor(() =>
      expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith('me@example.com', {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    );
    expect(toast.success).toHaveBeenCalledWith('Check your email for a password reset link.');
  });

  it('shows the error when the request is rejected', async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: { message: 'rate limit exceeded' } });
    const user = userEvent.setup();
    renderWithProviders(<Auth />, { route: '/auth' });

    await user.type(screen.getByPlaceholderText('Email'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('rate limit exceeded'));
  });

  it('recovers from a network failure instead of sticking on "Sending…" (regression)', async () => {
    supabaseMock.auth.resetPasswordForEmail.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    renderWithProviders(<Auth />, { route: '/auth' });

    await user.type(screen.getByPlaceholderText('Email'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to fetch'));
    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeEnabled();
  });
});
