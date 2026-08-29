import { ChevronDown } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '../lib/cn.js'

type SidebarGroupProps = {
  title: string
  /** Botão à direita do título. Aparece com o mouse na seção. */
  action?: ReactNode
  children: ReactNode
}

/**
 * Seção recolhível da barra lateral.
 *
 * O título é em caixa normal, com a seta depois do texto — e não em versalete espaçado
 * com a seta antes. Versalete grita para algo que é rótulo de organização, não conteúdo;
 * a seta depois é o que faz o par "título ⌄" ser lido como um controle só.
 *
 * O alvo do clique é o título inteiro. Alvo de 12px é difícil de acertar.
 */
export function SidebarGroup({ title, action, children }: SidebarGroupProps) {
  const [open, setOpen] = useState(true)

  return (
    <section className="flex flex-col gap-px">
      <div className="group/section flex h-7 items-center pr-1">
        <button
          type="button"
          onClick={() => setOpen((atual) => !atual)}
          aria-expanded={open}
          className={cn(
            'flex min-w-0 items-center gap-1 rounded-[5px] px-2 py-1 text-left',
            'font-medium text-[11px] text-ink-subtle transition-colors hover:text-ink-muted',
          )}
        >
          <span className="truncate">{title}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-3 shrink-0 transition-transform duration-150 ease-press',
              !open && '-rotate-90',
            )}
          />
        </button>

        {/* Empurra a ação para a ponta sem precisar que o título ocupe a linha inteira:
            o clique fora do texto não deve recolher a seção sem querer. */}
        <span className="ml-auto opacity-0 transition-opacity focus-within:opacity-100 group-hover/section:opacity-100">
          {action}
        </span>
      </div>

      {open ? children : null}
    </section>
  )
}
