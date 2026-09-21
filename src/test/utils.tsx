import type { ReactElement, ReactNode } from 'react';
import { render, renderHook, type RenderOptions } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { AuthProvider } from '@/state/auth';
import { TrackerProvider } from '@/state/tracker';
import { createQueryClient } from '@/lib/queryClient';
import { supabaseMock } from './supabaseMock';

export function makeUser(overrides: Partial<User> = {}): User {
  return { id: 'user-1', email: 'test@example.com', ...overrides } as User;
}

export function makeSession(user: User = makeUser()): Session {
  return { access_token: 'access-token', refresh_token: 'refresh-token', user } as unknown as Session;
}

/** Makes the mocked Supabase auth report an existing session, as after a page reload. */
export function signIn(user: User = makeUser()) {
  supabaseMock.auth.getSession.mockResolvedValue({ data: { session: makeSession(user) }, error: null });
  return user;
}

export function createTestQueryClient() {
  return createQueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

export function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

interface ProviderOptions {
  route?: string;
  queryClient?: QueryClient;
  tracker?: boolean;
}

function createWrapper({ route = '/', queryClient = createTestQueryClient(), tracker = false }: ProviderOptions) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AuthProvider>
            {tracker ? <TrackerProvider>{children}</TrackerProvider> : children}
          </AuthProvider>
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {}
) {
  const { route, tracker, queryClient = createTestQueryClient(), ...renderOptions } = options;
  return {
    queryClient,
    ...render(ui, { wrapper: createWrapper({ route, tracker, queryClient }), ...renderOptions }),
  };
}

export function renderHookWithProviders<T>(hook: () => T, options: ProviderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();
  return {
    queryClient,
    ...renderHook(hook, { wrapper: createWrapper({ ...options, queryClient }) }),
  };
}
