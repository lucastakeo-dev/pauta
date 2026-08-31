import { ChevronDown } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '../lib/cn.js'

type SidebarGroupProps = {
  title: string
  /** Quantos itens a seção tem. Vai entre parênteses, ao lado do título. */
  count?: number | undefined
  /** Botão à direita do título. */
  action?: ReactNode
  children: ReactNode
}

/**
 * Seção da coluna direita da barra.
 *
 * O título é em caixa normal com o total entre parênteses — `Projetos (7)` — como na
 * referência. Versalete espaçado grita para algo que é rótulo de organização, não
 * conteúdo; e o número dá à seção recolhida o que ela esconde.
 *
 * A ação fica visível o tempo todo, e não só sob o mouse: um `+` que só aparece quando
 * o ponteiro passa por cima é um caminho que ninguém encontra de propósito.
 *
 * O alvo do clique para recolher é o título inteiro. Alvo de 12px é difícil de acertar.
 */
export function SidebarGroup({ title, count, action, children }: SidebarGroupProps) {
  const [open, setOpen] = useState(true)

  return (
    <section className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
      <div className="flex h-7 items-center gap-1 pr-0.5 pl-1.5">
        <button
          type="button"
          onClick={() => setOpen((atual) => !atual)}
          aria-expanded={open}
          className={cn(
            'flex min-w-0 items-center gap-1 rounded-[6px] py-1 text-left',
            'font-medium text-[11px] text-ink-subtle transition-colors hover:text-ink-muted',
          )}
        >
          <span className="truncate">{title}</span>
          {count !== undefined ? <span className="tabular shrink-0">({count})</span> : null}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-3 shrink-0 transition-transform duration-150 ease-press',
              !open && '-rotate-90',
            )}
          />
        </button>

        {/* Empurra a ação para a ponta sem que o título ocupe a linha inteira: clicar
            fora do texto não deve recolher a seção sem querer. */}
        <span className="ml-auto shrink-0">{action}</span>
      </div>

      {open ? children : null}
    </section>
  )
}
