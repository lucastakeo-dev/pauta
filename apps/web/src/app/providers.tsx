import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { SessionProvider } from '../features/auth/session-context.js'

/**
 * Estado de servidor fica no React Query; estado de sessão, no SessionProvider.
 * Nenhum estado global além destes — o resto mora em quem usa.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // O client já derruba a sessão no 401; repetir requisição sem token só atrasa.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof Error && error.message.includes('Sessão')),
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  )
}
