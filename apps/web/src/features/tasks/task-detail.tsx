import type { TaskView, UpdateTaskInput } from '@pauta/contracts'
import { CalendarClock, Check, Inbox, Trash2 } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { useLabels } from '../../entities/label/index.js'
import { toDateInputValue } from '../../entities/planner/index.js'
import { buildProjectTree, flattenProjectTree, useProjects } from '../../entities/project/index.js'
import { PRIORITY_LABELS, priorityColorClass } from '../../entities/task/index.js'
import { cn } from '../../shared/lib/cn.js'
import { Button } from '../../shared/ui/button.js'
import { NamedIcon } from '../../shared/ui/icon-catalog.js'
import { useDeleteTask, useToggleTask, useUpdateTask } from './queries.js'
import { TaskSchedule } from './task-schedule.js'

const COPY = {
  trilha: 'Trilha de navegação',
  inbox: 'Inbox',
  titulo: 'Título',
  anotacao: 'Anotação',
  anotacaoVazia: 'Escreva o que precisa lembrar sobre isto…',
  propriedades: 'Propriedades',
  prioridade: 'Prioridade',
  projeto: 'Projeto',
  semProjeto: 'Sem projeto',
  prazo: 'Prazo',
  planner: 'No planner',
  agendar: 'Agendar',
  etiquetas: 'Etiquetas',
  semEtiquetas: 'Nenhuma etiqueta criada ainda.',
  processar: 'Processar',
  processarAjuda: 'Tira da fila. A tarefa continua nas listas.',
  concluir: 'Concluir',
  excluir: 'Excluir',
  vazio: 'Escolha um item da fila.',
  vazioAjuda: 'Ou capture algo novo com ⌘K.',
}

const PRIORIDADES = [1, 2, 3, 4] as const

/**
 * O detalhe de um item da fila, com as propriedades à direita.
 *
 * É aqui que a captura vira decisão: dar projeto, prioridade, prazo, hora no planner —
 * e então **processar**, que só troca o status e tira o item da fila. Processar não
 * apaga nem conclui nada: a tarefa segue viva nas listas, apenas deixa de ser um item
 * por decidir.
 */
type TaskDetailProps = {
  task: TaskView | null
  /** Onde este item está na fila. Só o inbox tem uma; o cabeçalho a mostra. */
  posicao?: { atual: number; total: number }
}

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
  const update = useUpdateTask()
  const toggle = useToggleTask()
  const remove = useDeleteTask()
  const campoId = useId()

  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [agendando, setAgendando] = useState(false)

  const naFila = task.status === 'inbox'
  const concluida = task.status === 'done'

  function salvar(input: UpdateTaskInput) {
    update.mutate({ id: task.id, input })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-line border-b py-3 pr-4 pl-6">
        {/*
          A trilha diz onde se está e quanto falta, não o título — ele está 40px abaixo,
          em corpo maior. "3 de 12" é o que não aparece em nenhum outro lugar da tela, e
          é o que dá noção de progresso a quem está descendo a fila.
        */}
        <nav aria-label={COPY.trilha} className="min-w-0 flex-1 text-ink-subtle text-xs">
          <span className="truncate">
            {COPY.inbox}
            {posicao ? ` · ${posicao.atual} de ${posicao.total}` : null}
          </span>
        </nav>

        <Button
          variant="ghost"
          onClick={() => toggle.mutate({ id: task.id, done: !concluida })}
          loading={toggle.isPending}
        >
          <Check aria-hidden="true" className="size-4" />
          {COPY.concluir}
        </Button>

        <Button variant="ghost" onClick={() => remove.mutate(task.id)} loading={remove.isPending}>
          <Trash2 aria-hidden="true" className="size-4" />
          {COPY.excluir}
        </Button>

        {naFila ? (
          <Button
            onClick={() => salvar({ status: 'todo' })}
            loading={update.isPending}
            title={COPY.processarAjuda}
          >
            {COPY.processar}
          </Button>
        ) : null}
      </header>

      {/*
        Duas colunas com um traço entre elas: à esquerda o que se lê e escreve, à
        direita o que se decide. Sem o traço, as propriedades pareciam soltas na borda
        da tela em vez de um painel.
      */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_16rem] lg:overflow-hidden">
        <div className="flex min-w-0 max-w-2xl flex-col gap-3 overflow-y-auto px-6 py-7">
          <label htmlFor={`${campoId}-titulo`} className="sr-only">
            {COPY.titulo}
          </label>
          <input
            id={`${campoId}-titulo`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            // Salva ao sair do campo, não a cada tecla: uma requisição por letra
            // digitada encheria a fila de escritas e o Toast de avisos.
            onBlur={() => {
              const limpo = title.trim()
              if (limpo && limpo !== task.title) salvar({ title: limpo })
              else setTitle(task.title)
            }}
            className={cn(
              'w-full rounded-control border border-transparent bg-transparent px-2 py-1',
              '-ml-2 font-semibold text-ink text-lg outline-none',
              'transition-colors hover:border-line focus:border-iris',
              concluida && 'line-through',
            )}
          />

          <label htmlFor={`${campoId}-notas`} className="sr-only">
            {COPY.anotacao}
          </label>
          <textarea
            id={`${campoId}-notas`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => {
              if (notes !== (task.notes ?? '')) salvar({ notes: notes || null })
            }}
            placeholder={COPY.anotacaoVazia}
            className={cn(
              '-ml-2 min-h-64 w-full flex-1 resize-none rounded-control border border-transparent',
              'bg-transparent px-2 py-1.5 text-ink text-sm leading-relaxed outline-none',
              'placeholder:text-ink-subtle',
              'transition-colors hover:border-line focus:border-iris',
            )}
          />
        </div>

        <aside
          aria-label={COPY.propriedades}
          className="flex min-w-0 flex-col gap-5 overflow-y-auto border-line px-5 py-6 lg:border-l"
        >
          <Campo rotulo={COPY.prioridade}>
            <div className="flex gap-1">
              {PRIORIDADES.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => salvar({ priority: valor })}
                  aria-pressed={task.priority === valor}
                  title={PRIORITY_LABELS[valor]}
                  className={cn(
                    'flex h-7 flex-1 items-center justify-center gap-1 rounded-[8px] text-xs',
                    'transition-colors',
                    task.priority === valor
                      ? 'bg-surface-raised font-medium text-ink'
                      : 'text-ink-subtle hover:bg-surface-raised hover:text-ink',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('size-1.5 rounded-full', priorityColorClass(valor))}
                  />
                  P{valor}
                </button>
              ))}
            </div>
          </Campo>

          <ProjetoCampo task={task} onChange={(projectId) => salvar({ projectId })} />

          <Campo rotulo={COPY.prazo}>
            <input
              type="date"
              value={task.dueAt ? toDateInputValue(new Date(task.dueAt)) : ''}
              onChange={(event) =>
                salvar({
                  // O campo nativo devolve `AAAA-MM-DD`; meio-dia local evita que o
                  // fuso empurre o prazo para o dia anterior ao virar ISO.
                  dueAt: event.target.value
                    ? new Date(`${event.target.value}T12:00`).toISOString()
                    : null,
                })
              }
              className="h-8 w-full rounded-[8px] border border-line bg-surface px-2 text-[13px] text-ink outline-none focus:border-iris"
            />
          </Campo>

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

          <EtiquetasCampo task={task} onChange={(labelIds) => salvar({ labelIds })} />
        </aside>
      </div>
    </div>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-[11px] text-ink-subtle">{rotulo}</span>
      {children}
    </div>
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

function ProjetoCampo({
  task,
  onChange,
}: {
  task: TaskView
  onChange: (projectId: string | null) => void
}) {
  const { data: projects } = useProjects()
  const linhas = flattenProjectTree(buildProjectTree(projects ?? []))

  return (
    <Campo rotulo={COPY.projeto}>
      <div className="flex items-center gap-2">
        {task.project ? (
          <NamedIcon name={task.project.icon} className="size-4 shrink-0 text-ink-muted" />
        ) : null}

        <select
          value={task.projectId ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
          aria-label={COPY.projeto}
          className="h-8 min-w-0 flex-1 rounded-[8px] border border-line bg-surface px-2 text-[13px] text-ink outline-none focus:border-iris"
        >
          <option value="">{COPY.semProjeto}</option>
          {linhas.map((node) => (
            <option key={node.id} value={node.id}>
              {/* O recuo vai no texto: `option` não aceita marcação, e sem ele a lista
                  plana perde a hierarquia que a barra mostra. */}
              {'— '.repeat(node.depth)}
              {node.name}
            </option>
          ))}
        </select>
      </div>
    </Campo>
  )
}

function EtiquetasCampo({
  task,
  onChange,
}: {
  task: TaskView
  onChange: (labelIds: string[]) => void
}) {
  const { data: labels } = useLabels()
  const atuais = new Set(task.labels.map((label) => label.id))

  if (!labels || labels.length === 0) {
    return (
      <Campo rotulo={COPY.etiquetas}>
        <p className="text-ink-subtle text-xs">{COPY.semEtiquetas}</p>
      </Campo>
    )
  }

  return (
    <Campo rotulo={COPY.etiquetas}>
      <div className="flex flex-wrap gap-1">
        {labels.map((label) => {
          const marcada = atuais.has(label.id)

          return (
            <button
              key={label.id}
              type="button"
              aria-pressed={marcada}
              onClick={() =>
                onChange(
                  marcada ? [...atuais].filter((id) => id !== label.id) : [...atuais, label.id],
                )
              }
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors',
                marcada
                  ? 'bg-surface-raised text-ink'
                  : 'text-ink-subtle hover:bg-surface-raised hover:text-ink',
              )}
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-[3px]"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </button>
          )
        })}
      </div>
    </Campo>
  )
}
