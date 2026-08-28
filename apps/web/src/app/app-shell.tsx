import { Link, useRouterState } from '@tanstack/react-router'
import { CalendarDays, ChevronDown, FileText, FolderTree, LogOut, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useSession } from '../features/auth/session-context.js'
import { ConsoleOverlay } from '../features/console/console-overlay.js'
import { useConsoleShortcut } from '../features/console/use-console-shortcut.js'
import { cn } from '../shared/lib/cn.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../shared/ui/dropdown-menu.js'
import { SidebarSlotProvider, SidebarSlotTarget } from '../shared/ui/sidebar-slot.js'

const COPY = {
  marca: 'Pauta',
  conta: 'Conta',
  sair: 'Sair',
  console: 'Captura rápida',
  atalho: '⌘K',
  navegacao: 'Seções',
}

const NAV = [
  { to: '/today', label: 'Hoje', icon: CalendarDays },
  { to: '/projects', label: 'Projetos', icon: FolderTree },
  { to: '/notes', label: 'Notas', icon: FileText },
] as const

/**
 * Moldura das telas logadas: uma barra lateral, e nada mais.
 *
 * Antes havia também uma faixa no topo com marca, navegação e sair. Ela custava uma
 * linha inteira de altura para repetir o que a barra já podia dizer — num planner, onde
 * a grade de horas quer altura, essa faixa competia com o conteúdo.
 *
 * A barra tem três partes: identidade no topo, navegação no meio e o encaixe da tela
 * atual embaixo. Só a do meio é fixa; o resto é da página, entregue pelo `SidebarSlot`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession()
  const quickCapture = useConsoleShortcut()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <SidebarSlotProvider>
      <div className="flex h-dvh overflow-hidden">
        <aside className="flex w-[232px] shrink-0 flex-col gap-4 overflow-y-auto border-line border-r bg-surface/40 px-2 py-3">
          {/*
            Identidade e captura dividem a primeira linha, como na referência. A captura
            é a única ação não-navegacional da barra; como ícone ela para de competir
            com os destinos logo abaixo, e o atalho vive no `title`.
          */}
          <div className="flex items-center gap-1">
            <ContaMenu name={user?.name ?? COPY.marca} onSignOut={signOut} />

            <button
              type="button"
              onClick={() => quickCapture.setOpen(true)}
              aria-label={COPY.console}
              title={`${COPY.console} (${COPY.atalho})`}
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-[5px] text-ink-subtle',
                'transition-colors hover:bg-surface-raised hover:text-ink',
              )}
            >
              <Search aria-hidden="true" className="size-4" />
            </button>
          </div>

          <nav aria-label={COPY.navegacao} className="flex flex-col gap-px">
            {NAV.map((item) => {
              // `startsWith` e não igualdade: a página de um projeto também é "Projetos".
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
              const Icon = item.icon

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-7 items-center gap-2 rounded-[5px] px-2 text-[13px]',
                    'transition-colors duration-100',
                    active
                      ? 'bg-surface-raised font-medium text-ink'
                      : 'text-ink-muted hover:bg-surface hover:text-ink',
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* O que a tela atual quer na barra. Vazio é um estado normal. */}
          <SidebarSlotTarget className="flex min-h-0 flex-1 flex-col" />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1">{children}</div>

        {quickCapture.open ? <ConsoleOverlay onClose={() => quickCapture.setOpen(false)} /> : null}
      </div>
    </SidebarSlotProvider>
  )
}

/**
 * Identidade e saída, no formato que o Linear usa: o nome é o próprio botão do menu.
 *
 * Sair mora aqui em vez de solto na barra porque é ação rara e destrutiva o bastante
 * para não merecer ficar a um clique de distância o tempo todo.
 */
function ContaMenu({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  const inicial = name.trim().slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={COPY.conta}
        className={cn(
          'flex h-7 min-w-0 flex-1 items-center gap-2 rounded-[5px] px-1.5 text-left',
          'transition-colors hover:bg-surface-raised',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-iris font-medium text-[10px] text-canvas"
        >
          {inicial}
        </span>

        <span className="min-w-0 truncate font-medium text-ink text-[13px]">{name}</span>
        <ChevronDown aria-hidden="true" className="size-3 shrink-0 text-ink-subtle" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut aria-hidden="true" className="size-4" />
          {COPY.sair}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
