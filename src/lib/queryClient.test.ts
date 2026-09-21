import { describe, expect, it } from 'vitest';
import { toast } from 'sonner';
import { createQueryClient, toastError } from './queryClient';

describe('toastError', () => {
  it('shows the message of an Error', () => {
    toastError(new Error('row-level security violation'));
    expect(toast.error).toHaveBeenCalledWith('row-level security violation');
  });

  it('falls back to a generic message for non-Error values', () => {
    toastError('boom');
    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
  });
});

describe('createQueryClient', () => {
  it('surfaces a failed mutation as an error toast without any per-call handler', async () => {
    const client = createQueryClient({ defaultOptions: { mutations: { retry: false } } });
    await client
      .getMutationCache()
      .build(client, {
        mutationFn: async () => {
          throw new Error('insert failed');
        },
      })
      .execute(undefined)
      .catch(() => {});
    expect(toast.error).toHaveBeenCalledWith('insert failed');
  });

  it('surfaces a failed query as an error toast', async () => {
    const client = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    await client
      .fetchQuery({
        queryKey: ['x'],
        queryFn: async () => {
          throw new Error('select failed');
        },
      })
      .catch(() => {});
    expect(toast.error).toHaveBeenCalledWith('select failed');
  });

  it('respects caller-supplied defaults', () => {
    const client = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    expect(client.getDefaultOptions().queries?.retry).toBe(false);
  });
});
