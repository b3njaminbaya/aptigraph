import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { AuthProvider, useAuth } from './auth';
import { authListeners, resetSupabaseMock, supabaseMock, unsubscribe } from '@/test/supabaseMock';
import { makeSession, makeUser, signIn as mockExistingSession } from '@/test/utils';

vi.mock('@/integrations/supabase/client', async () => ({
  supabase: (await import('@/test/supabaseMock')).supabaseMock,
}));

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  resetSupabaseMock();
});

describe('AuthProvider session loading', () => {
  it('starts in a loading state and resolves to signed-out when there is no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('restores an existing session on mount', async () => {
    const user = mockExistingSession(makeUser({ id: 'abc', email: 'me@example.com' }));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user?.id).toBe(user.id);
    expect(result.current.user?.email).toBe('me@example.com');
  });

  it('stops loading even if fetching the session rejects (regression: stuck spinner)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    supabaseMock.auth.getSession.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('reacts to auth state changes (sign in from another tab, token refresh, sign out)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => authListeners.forEach((listener) => listener('SIGNED_IN', makeSession(makeUser({ id: 'new-user' })))));
    expect(result.current.user?.id).toBe('new-user');

    act(() => authListeners.forEach((listener) => listener('SIGNED_OUT', null)));
    expect(result.current.user).toBeNull();
  });

  it('unsubscribes from auth changes on unmount', async () => {
    const { unmount, result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('signIn / signUp', () => {
  it('signIn passes credentials to Supabase and returns no error on success', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    let outcome;
    await act(async () => {
      outcome = await result.current.signIn('me@example.com', 'hunter22');
    });
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'me@example.com', password: 'hunter22' });
    expect(outcome).toEqual({ error: null });
  });

  it('signIn returns the Supabase error message instead of throwing', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    let outcome;
    await act(async () => {
      outcome = await result.current.signIn('me@example.com', 'wrong');
    });
    expect(outcome).toEqual({ error: 'Invalid login credentials' });
  });

  it('signIn converts a network failure into an error result (regression: stuck "Signing in…")', async () => {
    supabaseMock.auth.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    let outcome;
    await act(async () => {
      outcome = await result.current.signIn('me@example.com', 'hunter22');
    });
    expect(outcome).toEqual({ error: 'Failed to fetch' });
  });

  it('signUp passes credentials to Supabase and reports errors', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signUp('new@example.com', 'hunter22');
    });
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'hunter22' });

    supabaseMock.auth.signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } });
    let outcome;
    await act(async () => {
      outcome = await result.current.signUp('new@example.com', 'hunter22');
    });
    expect(outcome).toEqual({ error: 'User already registered' });
  });

  it('signUp converts a thrown non-Error into a generic message', async () => {
    supabaseMock.auth.signUp.mockRejectedValue('nope');
    const { result } = renderHook(() => useAuth(), { wrapper });
    let outcome;
    await act(async () => {
      outcome = await result.current.signUp('new@example.com', 'hunter22');
    });
    expect(outcome).toEqual({ error: 'Network error. Please try again.' });
  });
});

describe('signOut', () => {
  it('calls Supabase and stays quiet on success', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signOut();
    });
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows the error when Supabase reports one', async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: { message: 'session expired' } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signOut();
    });
    expect(toast.error).toHaveBeenCalledWith('session expired');
  });

  it('shows an error instead of throwing on a network failure', async () => {
    supabaseMock.auth.signOut.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signOut();
    });
    expect(toast.error).toHaveBeenCalledWith('Failed to fetch');
  });
});

describe('useAuth', () => {
  it('throws a helpful error when used outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
    consoleError.mockRestore();
  });
});
