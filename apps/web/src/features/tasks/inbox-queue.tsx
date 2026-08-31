import type { TaskView } from '@pauta/contracts'
import { Inbox } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { dueLabel, isOverdue, priorityColorClass } from '../../entities/task/index.js'
import { cn } from '../../shared/lib/cn.js'
import { NamedIcon } from '../../shared/ui/icon-catalog.js'
import { sidebarRow, sidebarRowActive, sidebarRowIdle } from '../../shared/ui/sidebar-row.js'

const COPY = {
  vazioTitulo: 'Nada por processar.',
  vazioAjuda: 'O que você capturar com ⌘K aparece aqui.',
  carregando: 'Carregando a fila…',
  abrir: 'Abrir',
}

type InboxQueueProps = {
  tasks: TaskView[]
  isPending: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

/**
 * A fila do que foi capturado e ainda não foi decidido.
 *
 * Duas linhas por item, como na referência: o título, e abaixo o contexto que ajuda a
 * decidir sem abrir — projeto e há quanto tempo espera. A idade não é enfeite: numa
 * fila de captura, o que está parado há três semanas é justamente o que precisa de uma
 * decisão, nem que seja apagar.
 */
export function InboxQueue({ tasks, isPending, selectedId, onSelect }: InboxQueueProps) {
  if (isPending) {
    return (
      <p role="status" aria-live="polite" className="px-2 py-1.5 text-ink-subtle text-xs">
        {COPY.carregando}
      </p>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 px-2 py-10 text-center">
        <Inbox aria-hidden="true" className="mb-1 size-5 text-ink-subtle" />
        <p className="font-medium text-ink text-sm">{COPY.vazioTitulo}</p>
        <p className="text-ink-subtle text-xs">{COPY.vazioAjuda}</p>
      </div>
    )
  }

  /**
   * Setas andam pela fila, como numa caixa de e-mail.
   *
   * Tab também funciona — cada linha é um botão de verdade —, mas Tab é para sair da
   * lista, não para percorrê-la: com trinta capturas, chegar à última custaria trinta
   * paradas. As setas movem a seleção e o foco juntos, então o detalhe acompanha e a
   * navegação por teclado enxerga onde está.
   */
  function aoTeclar(event: KeyboardEvent<HTMLUListElement>) {
    const passo = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (passo === 0) return

    // O ponto de partida é a seleção, e não o que está com o foco: a fila pode ser
    // aberta pelo teclado sem nunca ter recebido um clique.
    const atual = tasks.findIndex((task) => task.id === selectedId)
    const destino = Math.min(Math.max(atual + passo, 0), tasks.length - 1)
    const alvo = tasks[destino]
    if (!alvo || alvo.id === selectedId) return

    // A página inteira rola quando a seta escapa; aqui ela é o gesto de navegar.
    event.preventDefault()
    onSelect(alvo.id)
    event.currentTarget.querySelectorAll('button')[destino]?.focus()
  }

  return (
    <ul className="flex flex-col gap-px" onKeyDown={aoTeclar}>
      {tasks.map((task) => {
        const ativo = task.id === selectedId
        const prazo = task.dueAt ? dueLabel(task.dueAt) : null

        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onSelect(task.id)}
              aria-current={ativo ? 'true' : undefined}
              aria-label={`${COPY.abrir}: ${task.title}`}
              className={cn(
                sidebarRow,
                'h-auto items-start py-1.5',
                ativo ? sidebarRowActive : sidebarRowIdle,
              )}
            >
              {/*
                A bolinha de prioridade fica na coluna do ícone, no mesmo eixo dos
                projetos e das etiquetas: a fila divide a régua do painel com o resto.
                P4 é sem cor de propósito — a maioria é P4, e colorir todas anula o sinal.
              */}
              <span className="flex size-4 shrink-0 items-center justify-center pt-0.5">
                <span
                  aria-hidden="true"
                  className={cn('size-1.5 rounded-full', priorityColorClass(task.priority))}
                />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate">{task.title}</span>

                {/*
                  A segunda linha só existe quando tem o que dizer. Escrever "sem
                  projeto" em toda captura nova encheria a fila de uma informação que é
                  sempre a mesma — e é justamente o que a tela serve para resolver.
                */}
                {task.project || prazo ? (
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-subtle">
                    {task.project ? (
                      <>
                        <NamedIcon name={task.project.icon} className="size-3 shrink-0" />
                        <span className="truncate">{task.project.name}</span>
                      </>
                    ) : null}

                    {task.project && prazo ? <span aria-hidden="true">·</span> : null}

                    {prazo ? (
                      <span className={cn('shrink-0', isOverdue(task) && 'text-danger')}>
                        {prazo}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>

              <span className="tabular shrink-0 pt-0.5 text-[11px] text-ink-subtle">
                {idade(task.createdAt)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** `2s`, `3sem`, `4m` — curto porque divide a linha com o nome do projeto. */
function idade(criadaEm: string): string {
  const dias = Math.floor((Date.now() - new Date(criadaEm).getTime()) / 86_400_000)

  if (dias < 1) return 'hoje'
  if (dias < 7) return `${dias}d`
  if (dias < 30) return `${Math.floor(dias / 7)}sem`
  if (dias < 365) return `${Math.floor(dias / 30)}m`

  return `${Math.floor(dias / 365)}a`
}
