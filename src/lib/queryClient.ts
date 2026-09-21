import { MutationCache, QueryCache, QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { toast } from 'sonner';

export function toastError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  toast.error(message);
}

// Every failed query or mutation surfaces as an error toast, so individual
// call sites only handle success (and any state they need to preserve).
export function createQueryClient(config: QueryClientConfig = {}) {
  return new QueryClient({
    ...config,
    queryCache: new QueryCache({ onError: toastError }),
    mutationCache: new MutationCache({ onError: toastError }),
  });
}
