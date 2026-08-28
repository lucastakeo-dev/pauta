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
        <aside className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto border-line border-r bg-surface/40 px-3 py-4">
          <ContaMenu name={user?.name ?? COPY.marca} onSignOut={signOut} />

          {/*
            A captura é a ação mais usada do app e a única que não é navegação — por isso
            fica acima da lista, com o atalho à mostra: o botão existe para ensinar o
            atalho a quem ainda não o conhece.
          */}
          <button
            type="button"
            onClick={() => quickCapture.setOpen(true)}
            className={cn(
              'flex items-center gap-2 rounded-control px-2 py-1.5 text-ink-muted text-sm',
              'transition-[colors,transform] duration-150 ease-press',
              'hover:bg-surface-raised hover:text-ink active:scale-[0.98]',
            )}
          >
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <span className="flex-1 text-left">{COPY.console}</span>
            <kbd className="tabular text-ink-subtle text-xs">{COPY.atalho}</kbd>
          </button>

          <nav aria-label={COPY.navegacao} className="flex flex-col gap-0.5">
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
                    'flex items-center gap-2 rounded-control px-2 py-1.5 text-sm',
                    'transition-[colors,transform] duration-150 ease-press active:scale-[0.98]',
                    active
                      ? 'bg-surface-raised text-ink'
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
          'flex items-center gap-2 rounded-control px-2 py-1.5 text-left',
          'transition-colors hover:bg-surface-raised',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-iris font-medium text-[10px] text-canvas"
        >
          {inicial}
        </span>

        <span className="min-w-0 flex-1 truncate font-medium text-ink text-sm">{name}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-ink-subtle" />
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
