import { ChevronRight } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '../lib/cn.js'

type SidebarGroupProps = {
  title: string
  /** Botão à direita do título — some junto com o grupo quando ele fecha. */
  action?: ReactNode
  children: ReactNode
}

/**
 * Seção recolhível da barra lateral.
 *
 * Recolher importa porque a barra acumula: projetos e etiquetas crescem sem limite, e
 * quem tem vinte projetos não quer rolar por eles para chegar nas etiquetas. O título
 * inteiro é o alvo do clique, não só a seta — alvo de 12px é difícil de acertar.
 *
 * O estado é local e reinicia aberto. Guardá-lo entre sessões seria útil, mas nenhuma
 * das seções de hoje é grande o bastante para justificar a persistência.
 */
export function SidebarGroup({ title, action, children }: SidebarGroupProps) {
  const [open, setOpen] = useState(true)

  return (
    <section className="flex flex-col gap-0.5">
      <div className="group flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={() => setOpen((atual) => !atual)}
          aria-expanded={open}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1 rounded-[4px] px-2 py-1 text-left',
            'font-medium text-ink-subtle text-xs uppercase tracking-wider',
            'transition-colors hover:text-ink-muted',
          )}
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'size-3 shrink-0 transition-transform duration-150 ease-press',
              open && 'rotate-90',
            )}
          />
          <span className="truncate">{title}</span>
        </button>

        {action}
      </div>

      {open ? children : null}
    </section>
  )
}
