import { QueryClient } from '@tanstack/react-query';

let browserClient: QueryClient | undefined;
export function getQueryClient() {
  const createClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
          retry: 2,
          refetchOnWindowFocus: false,
        },
      },
    });
  // Never share request data across SSR users.
  if (typeof window === 'undefined') return createClient();
  return (browserClient ??= createClient());
}
