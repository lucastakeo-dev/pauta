import type { TaskView } from '@pauta/contracts'
import { Check, RotateCcw, Trash2 } from 'lucide-react'
import { cn } from '../../shared/lib/cn.js'
import { Button } from '../../shared/ui/button.js'
import { useDeleteTask, useToggleTask, useUpdateTask } from './queries.js'

const COPY = {
  processar: 'Processar',
  processarAjuda: 'Tira da fila. A tarefa continua nas listas.',
  concluir: 'Concluir',
  reabrir: 'Reabrir',
  excluir: 'Excluir',
}

/**
 * O que se faz com uma tarefa inteira: concluir, excluir, processar.
 *
 * Separado dos campos porque os dois hospedeiros as põem em lugares diferentes — no
 * alto, na tela do inbox; no rodapé, dentro do modal — e mesmo assim precisam ser as
 * mesmas ações, com os mesmos rótulos.
 *
 * No estreito as secundárias ficam só com o ícone; o nome continua lá para quem lê a
 * tela. Lado a lado com o resto, os três botões encolhiam até o texto vazar de dentro.
 */
export function TaskActions({
  task,
  className,
  onDepoisDeExcluir,
}: {
  task: TaskView
  className?: string
  /** Chamado após excluir — o modal usa para se fechar. */
  onDepoisDeExcluir?: () => void
}) {
  const update = useUpdateTask()
  const toggle = useToggleTask()
  const remove = useDeleteTask()

  const naFila = task.status === 'inbox'
  const concluida = task.status === 'done'

  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      <Button
        variant="ghost"
        onClick={() => toggle.mutate({ id: task.id, done: !concluida })}
        loading={toggle.isPending}
        title={concluida ? COPY.reabrir : COPY.concluir}
        className="max-sm:px-2.5"
      >
        {concluida ? (
          <RotateCcw aria-hidden="true" className="size-4" />
        ) : (
          <Check aria-hidden="true" className="size-4" />
        )}
        <span className="sr-only sm:not-sr-only">{concluida ? COPY.reabrir : COPY.concluir}</span>
      </Button>

      <Button
        variant="ghost"
        onClick={() => {
          remove.mutate(task.id)
          onDepoisDeExcluir?.()
        }}
        loading={remove.isPending}
        title={COPY.excluir}
        className="max-sm:px-2.5"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        <span className="sr-only sm:not-sr-only">{COPY.excluir}</span>
      </Button>

      {naFila ? (
        <Button
          onClick={() => update.mutate({ id: task.id, input: { status: 'todo' } })}
          loading={update.isPending}
          title={COPY.processarAjuda}
        >
          {COPY.processar}
        </Button>
      ) : null}
    </div>
  )
}
