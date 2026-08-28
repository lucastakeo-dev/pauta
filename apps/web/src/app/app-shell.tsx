import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useSession } from '../features/auth/session-context.js'
import { ConsoleOverlay } from '../features/console/console-overlay.js'
import { useConsoleShortcut } from '../features/console/use-console-shortcut.js'
import { cn } from '../shared/lib/cn.js'
import { Button } from '../shared/ui/button.js'

const COPY = {
  marca: 'Pauta',
  sair: 'Sair',
  console: 'Captura rápida (Ctrl+K)',
}

const NAV = [
  { to: '/', label: 'Hoje' },
  { to: '/notas', label: 'Notas' },
] as const

/**
 * Moldura das telas logadas: marca, navegação, captura rápida e sair.
 *
 * Mora em `app/` porque é bootstrap e navegação, não regra de negócio — e porque o
 * console precisa ser global: o atalho vale em qualquer tela, não só no planner.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useSession()
  const quickCapture = useConsoleShortcut()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-6 border-line border-b px-6 py-3">
        <span className="font-mono text-iris text-xs uppercase tracking-widest">{COPY.marca}</span>

        <nav aria-label="Seções" className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.to

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-control px-3 py-1.5 text-sm transition-colors',
                  active ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:bg-surface',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {/* O atalho é o caminho principal; o botão existe para quem ainda não o conhece. */}
          <Button variant="ghost" onClick={() => quickCapture.setOpen(true)}>
            {COPY.console}
          </Button>
          <Button variant="ghost" onClick={signOut}>
            {COPY.sair}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">{children}</div>

      {quickCapture.open ? <ConsoleOverlay onClose={() => quickCapture.setOpen(false)} /> : null}
    </div>
  )
}
