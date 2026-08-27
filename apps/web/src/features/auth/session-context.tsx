import type { LoginInput, RegisterInput, UserView } from '@pauta/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { fetchCurrentUser, login, register } from '../../entities/session/index.js'
import { UNAUTHORIZED_EVENT } from '../../shared/api/client.js'
import { clearToken, readToken, saveToken } from '../../shared/api/token-storage.js'

type SessionStatus = 'loading' | 'authenticated' | 'anonymous'

type SessionContextValue = {
  user: UserView | null
  status: SessionStatus
  signIn: (input: LoginInput) => Promise<void>
  signUp: (input: RegisterInput) => Promise<void>
  signOut: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(() => readToken())

  // Só perguntamos quem é o usuário se existe token — sem isso, toda visita anônima
  // dispararia um 401 na abertura do app.
  const query = useQuery({
    queryKey: ['session'],
    queryFn: fetchCurrentUser,
    enabled: token !== null,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const signOut = useCallback(() => {
    clearToken()
    setToken(null)
    queryClient.removeQueries({ queryKey: ['session'] })
  }, [queryClient])

  // O client dispara este evento em qualquer 401. Assim uma sessão expirada no meio
  // do uso derruba o app para o login sem cada tela precisar tratar isso.
  useEffect(() => {
    const handle = () => signOut()
    window.addEventListener(UNAUTHORIZED_EVENT, handle)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handle)
  }, [signOut])

  const signInMutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      saveToken(session.token)
      setToken(session.token)
      queryClient.setQueryData(['session'], session.user)
    },
  })

  const signUpMutation = useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      saveToken(session.token)
      setToken(session.token)
      queryClient.setQueryData(['session'], session.user)
    },
  })

  const status: SessionStatus =
    token === null
      ? 'anonymous'
      : query.isPending
        ? 'loading'
        : query.data
          ? 'authenticated'
          : 'anonymous'

  const value = useMemo<SessionContextValue>(
    () => ({
      user: query.data ?? null,
      status,
      signIn: async (input) => {
        await signInMutation.mutateAsync(input)
      },
      signUp: async (input) => {
        await signUpMutation.mutateAsync(input)
      },
      signOut,
    }),
    [query.data, status, signInMutation, signUpMutation, signOut],
  )

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)

  if (!context) {
    throw new Error('useSession precisa estar dentro de <SessionProvider>.')
  }

  return context
}
