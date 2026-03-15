import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../../styles/theme';
import { useState, type ReactNode } from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

interface Props {
  children: ReactNode;
}

/**
 * Provides MantineProvider + QueryClientProvider for React islands.
 *
 * IMPORTANT: This component must NEVER be used directly in .astro files
 * with slot children (e.g. `<MantineWrapper client:only="react"><Child /></MantineWrapper>`).
 * Astro eagerly SSRs slot children before passing them to the island component,
 * which causes Mantine "MantineProvider not found" errors.
 *
 * Instead, use one of the pre-built island components in src/components/islands/
 * (e.g. NavigationIsland, MobileNavIsland) which import their children internally.
 * For .astro <script> tags using createRoot(), this component can be used directly.
 */
export function MantineWrapper({ children }: Props) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <Notifications position="top-right" />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
}
