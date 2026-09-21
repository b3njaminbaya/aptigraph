import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('supabase client', () => {
  it('fails fast with actionable setup instructions when the environment is not configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.resetModules();

    await expect(import('./client')).rejects.toThrow(/Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.*\.env\.example/s);
  });

  it('fails when only one of the two variables is set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.resetModules();

    await expect(import('./client')).rejects.toThrow('Missing VITE_SUPABASE_URL');
  });

  it('creates a client exposing the auth, database and functions APIs when configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');
    vi.resetModules();

    const { supabase } = await import('./client');
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.rpc).toBe('function');
    expect(typeof supabase.auth.getSession).toBe('function');
    expect(typeof supabase.functions.invoke).toBe('function');
  });
});
