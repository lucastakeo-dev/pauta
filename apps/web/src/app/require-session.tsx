import { Navigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useSession } from '../features/auth/session-context.js'

/**
 * Guardas de rota. Ficam em `app/` porque são decisão de navegação, não regra de
 * negócio — a feature de auth sabe autenticar, e é este arquivo que sabe para onde ir.
 */

function Verificando() {
  // Estado neutro enquanto a sessão é conferida: sem ele, quem já está logado veria
  // a tela de login piscar a cada F5.
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh items-center justify-center text-ink-subtle text-sm"
    >
      Carregando…
    </div>
  )
}

/** Área logada: sem sessão, vai para o login. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useSession()

  if (status === 'loading') return <Verificando />
  if (status === 'anonymous') return <Navigate to="/signin" replace />

  return <>{children}</>
}

/**
 * Telas públicas (login e vitrine): com sessão válida, entra direto no app.
 *
 * É o que fecha o ciclo do cadastro — assim que o token chega, o contexto muda de
 * status e este redirecionamento leva a pessoa para dentro.
 */
export function RedirectIfSession({
  children,
  to = '/today',
}: {
  children: ReactNode
  to?: '/today' | '/notes'
}) {
  const { status } = useSession()

  if (status === 'loading') return <Verificando />
  if (status === 'authenticated') return <Navigate to={to} replace />

  return <>{children}</>
}
