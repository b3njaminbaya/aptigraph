import { vi } from 'vitest';

/**
 * A stand-in for the Supabase client. `from(table)` and `rpc(name)` return a
 * chainable, awaitable query builder (like PostgREST's) whose result is
 * configured per table, and every chained call is recorded so tests can assert
 * on exactly what was sent (e.g. the upsert payload or the .eq() filters).
 *
 * Usage in a test file:
 *   vi.mock('@/integrations/supabase/client', async () => ({
 *     supabase: (await import('@/test/supabaseMock')).supabaseMock,
 *   }));
 */

export interface QueryResult {
  data: unknown;
  error: Error | null;
}

export interface RecordedCall {
  method: string;
  args: unknown[];
}

export interface RecordedQuery {
  table: string;
  calls: RecordedCall[];
}

type ResultSpec = QueryResult | QueryResult[] | ((query: RecordedQuery) => QueryResult);

const specs = new Map<string, ResultSpec>();
const sequenceIndex = new Map<string, number>();
export const queries: RecordedQuery[] = [];

function resolveResult(query: RecordedQuery): QueryResult {
  const spec = specs.get(query.table);
  if (!spec) return { data: [], error: null };
  if (typeof spec === 'function') return spec(query);
  if (Array.isArray(spec)) {
    const index = sequenceIndex.get(query.table) ?? 0;
    sequenceIndex.set(query.table, index + 1);
    return spec[Math.min(index, spec.length - 1)];
  }
  return spec;
}

function createBuilder(table: string, initialCalls: RecordedCall[] = []) {
  const query: RecordedQuery = { table, calls: [...initialCalls] };
  queries.push(query);

  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve()
              .then(() => resolveResult(query))
              .then(resolve, reject);
        }
        return (...args: unknown[]) => {
          query.calls.push({ method: String(prop), args });
          return builder;
        };
      },
    }
  );
  return builder;
}

export const authListeners: Array<(event: string, session: unknown) => void> = [];
export const unsubscribe = vi.fn();

export const supabaseMock = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
  functions: { invoke: vi.fn() },
};

/** Restores every mock to a signed-out, empty-database default. Call in beforeEach. */
export function resetSupabaseMock() {
  specs.clear();
  sequenceIndex.clear();
  queries.length = 0;
  authListeners.length = 0;
  unsubscribe.mockReset();

  supabaseMock.from.mockReset().mockImplementation((table: string) => createBuilder(table));
  supabaseMock.rpc
    .mockReset()
    .mockImplementation((name: string, args: unknown) =>
      createBuilder(`rpc:${name}`, [{ method: 'rpc', args: [name, args] }])
    );

  const { auth } = supabaseMock;
  auth.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  auth.onAuthStateChange.mockReset().mockImplementation((listener: (event: string, session: unknown) => void) => {
    authListeners.push(listener);
    return { data: { subscription: { unsubscribe } } };
  });
  auth.signUp.mockReset().mockResolvedValue({ data: {}, error: null });
  auth.signInWithPassword.mockReset().mockResolvedValue({ data: {}, error: null });
  auth.signOut.mockReset().mockResolvedValue({ error: null });
  auth.updateUser.mockReset().mockResolvedValue({ data: {}, error: null });
  auth.resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null });
  supabaseMock.functions.invoke.mockReset().mockResolvedValue({ data: { success: true }, error: null });
}

/** Sets what `supabase.from(table)` resolves to. A function sees the recorded query; an array is a call sequence. */
export function mockTable(table: string, spec: ResultSpec) {
  specs.set(table, spec);
}

export function mockRpc(name: string, spec: ResultSpec) {
  specs.set(`rpc:${name}`, spec);
}

export const ok = (data: unknown): QueryResult => ({ data, error: null });
// Real PostgrestErrors extend Error, so the mock does too.
export const fail = (message: string): QueryResult => ({ data: null, error: new Error(message) });

export function queriesFor(table: string) {
  return queries.filter((q) => q.table === table);
}

export function callsOf(query: RecordedQuery | undefined, method: string) {
  return (query?.calls ?? []).filter((c) => c.method === method);
}

/** Args of the first recorded call to `method` across all queries on `table`, e.g. the upsert payload. */
export function firstCallArgs(table: string, method: string) {
  for (const query of queriesFor(table)) {
    const call = callsOf(query, method)[0];
    if (call) return call.args;
  }
  return undefined;
}
