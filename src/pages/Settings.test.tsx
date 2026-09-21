import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import Settings from './Settings';
import { callsOf, fail, firstCallArgs, mockTable, ok, queriesFor, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock';
import { renderWithProviders, signIn } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

beforeEach(() => {
  resetSupabaseMock();
  mockTable('profiles', ok({ display_name: 'Ada', avatar_url: null }));
});

async function renderSettings() {
  signIn();
  const utils = renderWithProviders(<Settings />, { route: '/settings' });
  await screen.findByRole('heading', { name: 'Settings' });
  await waitFor(() => expect(screen.getByLabelText('Display name')).toHaveValue('Ada'));
  return utils;
}

describe('Settings: auth gating', () => {
  it('does not redirect while the session is still loading (regression: bounced signed-in users to /auth)', async () => {
    supabaseMock.auth.getSession.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Settings />, { route: '/settings' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByTestId('location')).toHaveTextContent('/settings');
    expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('redirects to sign in once it is known nobody is signed in', async () => {
    renderWithProviders(<Settings />, { route: '/settings' });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/auth'));
    expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('shows the account details for a signed-in user without redirecting', async () => {
    await renderSettings();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/settings');
  });
});

describe('Settings: profile', () => {
  it('saves a trimmed display name for the current user and confirms', async () => {
    const user = userEvent.setup();
    await renderSettings();

    const input = screen.getByLabelText('Display name');
    await user.clear(input);
    await user.type(input, '  Grace Hopper  ');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Profile updated'));
    expect(firstCallArgs('profiles', 'update')).toEqual([{ display_name: 'Grace Hopper' }]);
    const update = queriesFor('profiles').find((q) => callsOf(q, 'update').length)!;
    expect(callsOf(update, 'eq')[0].args).toEqual(['id', 'user-1']);
  });

  it('clears the display name when the field is emptied', async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.clear(screen.getByLabelText('Display name'));
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(firstCallArgs('profiles', 'update')).toEqual([{ display_name: null }]));
  });

  it('shows the error and re-enables the button when saving fails', async () => {
    mockTable('profiles', (q) => (callsOf(q, 'update').length ? fail('permission denied') : ok({ display_name: 'Ada', avatar_url: null })));
    const user = userEvent.setup();
    await renderSettings();

    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('permission denied'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeEnabled();
  });
});

describe('Settings: password', () => {
  it('rejects a password under 6 characters without calling Supabase', async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.type(screen.getByLabelText('New password'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters');
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it('updates the password and clears the field', async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.type(screen.getByLabelText('New password'), 'hunter22');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Password updated'));
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'hunter22' });
    expect(screen.getByLabelText('New password')).toHaveValue('');
  });

  it('keeps what was typed and recovers when the request fails on the network (regression)', async () => {
    supabaseMock.auth.updateUser.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    await renderSettings();

    await user.type(screen.getByLabelText('New password'), 'hunter22');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to fetch'));
    expect(screen.getByLabelText('New password')).toHaveValue('hunter22');
    expect(screen.getByRole('button', { name: 'Update password' })).toBeEnabled();
  });
});

describe('Settings: delete account', () => {
  async function confirmDelete(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));
  }

  it('does nothing until the user confirms, and cancelling leaves the account alone', async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
  });

  it('deletes via the edge function, signs out and returns home', async () => {
    const user = userEvent.setup();
    await renderSettings();
    await confirmDelete(user);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Account deleted'));
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('stays signed in and shows the error if the edge function fails', async () => {
    supabaseMock.functions.invoke.mockResolvedValue({ data: null, error: { message: 'Function returned an error' } });
    const user = userEvent.setup();
    await renderSettings();
    await confirmDelete(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Function returned an error'));
    expect(supabaseMock.auth.signOut).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('survives a network failure without leaving the button stuck (regression)', async () => {
    supabaseMock.functions.invoke.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    await renderSettings();
    await confirmDelete(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to fetch'));
    expect(supabaseMock.auth.signOut).not.toHaveBeenCalled();
  });
});
