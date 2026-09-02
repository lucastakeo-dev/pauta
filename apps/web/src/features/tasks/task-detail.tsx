import type { TaskView, UpdateTaskInput } from '@pauta/contracts'
import { CalendarClock, Inbox } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../shared/lib/cn.js'
import { useUpdateTask } from './queries.js'
import { TaskActions } from './task-actions.js'
import { Campo, TaskFields, type TaskValues, valuesOf } from './task-fields.js'
import { TaskSchedule } from './task-schedule.js'
import { TaskSubtasks } from './task-subtasks.js'

const COPY = {
  trilha: 'Trilha de navegação',
  inbox: 'Inbox',
  planner: 'No planner',
  agendar: 'Agendar',
  vazio: 'Escolha um item da fila.',
  vazioAjuda: 'Ou capture algo novo com ⌘K.',
}

type TaskDetailProps = {
  task: TaskView | null
  /** Onde este item está na fila. Só o inbox tem uma; o cabeçalho a mostra. */
  posicao?: { atual: number; total: number }
}

/**
 * O detalhe de um item da fila, ocupando a tela ao lado da lista.
 *
 * É aqui que a captura vira decisão: dar projeto, prioridade, prazo, hora no planner —
 * e então **processar**, que só troca o status e tira o item da fila.
 *
 * Os campos são os mesmos do modal (`TaskFields`); o que esta tela acrescenta é a
 * moldura da fila — a trilha com "3 de 12" e as ações no alto.
 */
export function TaskDetail({ task, posicao }: TaskDetailProps) {
  if (!task) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
        <Inbox aria-hidden="true" className="mb-1 size-6 text-ink-subtle" />
        <p className="font-medium text-ink text-sm">{COPY.vazio}</p>
        <p className="text-ink-subtle text-sm">{COPY.vazioAjuda}</p>
      </div>
    )
  }

  // `key` remonta o formulário ao trocar de item: sem isso, o título digitado num item
  // continuaria na caixa ao abrir o seguinte.
  return <Detalhe key={task.id} task={task} posicao={posicao} />
}

function Detalhe({ task, posicao }: { task: TaskView; posicao?: TaskDetailProps['posicao'] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-line border-b py-3 pr-3 pl-4 md:pr-4 md:pl-6">
        {/*
          A trilha diz onde se está e quanto falta, não o título — ele está 40px abaixo,
          em corpo maior. "3 de 12" é o que não aparece em nenhum outro lugar da tela, e
          é o que dá noção de progresso a quem está descendo a fila.
        */}
        <nav
          aria-label={COPY.trilha}
          className="min-w-0 flex-1 text-ink-subtle text-xs max-sm:w-full"
        >
          <span className="truncate">
            {COPY.inbox}
            {posicao ? ` · ${posicao.atual} de ${posicao.total}` : null}
          </span>
        </nav>

        <TaskActions task={task} className="w-full justify-end sm:w-auto" />
      </header>

      <TaskCampos task={task} />
    </div>
  )
}

/**
 * Os campos de uma tarefa que já existe: cada mudança vai direto para o servidor.
 *
 * Compartilhado entre o detalhe do inbox e o modal — é o que garante que abrir a mesma
 * tarefa nos dois lugares mostre e edite exatamente as mesmas coisas.
 */
export function TaskCampos({ task }: { task: TaskView }) {
  const update = useUpdateTask()
  const [agendando, setAgendando] = useState(false)

  const salvar = (input: UpdateTaskInput) => update.mutate({ id: task.id, input })

  const aplicar = (patch: Partial<TaskValues>) => {
    // O rascunho e o corpo do PATCH têm formatos diferentes de propósito: `labelIds` e
    // `dueAt` são iguais, mas o que a tela chama de campo o servidor chama de coluna.
    const input: UpdateTaskInput = {}

    if (patch.title !== undefined) input.title = patch.title.trim() || task.title
    if (patch.notes !== undefined) input.notes = patch.notes || null
    if (patch.priority !== undefined) input.priority = patch.priority
    if (patch.projectId !== undefined) input.projectId = patch.projectId
    if (patch.dueAt !== undefined) input.dueAt = patch.dueAt
    if (patch.labelIds !== undefined) input.labelIds = patch.labelIds

    if (Object.keys(input).length > 0) salvar(input)
  }

  return (
    <TaskFields
      values={valuesOf(task)}
      onChange={aplicar}
      onText={aplicar}
      concluida={task.status === 'done'}
      progresso={<TaskSubtasks task={task} />}
      planner={
        <Campo rotulo={COPY.planner}>
          {agendando ? (
            <TaskSchedule task={task} onClose={() => setAgendando(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAgendando(true)}
              className={cn(
                'flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-left text-[13px]',
                'text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink',
              )}
            >
              <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{rotuloDoBloco(task) ?? COPY.agendar}</span>
            </button>
          )}
        </Campo>
      }
    />
  )
}

function rotuloDoBloco(task: TaskView): string | null {
  if (!task.scheduledStart) return null

  const inicio = new Date(task.scheduledStart)
  return inicio.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
