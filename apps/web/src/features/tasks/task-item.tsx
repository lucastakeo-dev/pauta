import { useDraggable } from '@dnd-kit/core'
import type { LabelView, TaskView } from '@pauta/contracts'
import { CalendarClock, GripVertical, Repeat2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DEFAULT_BLOCK_MINUTES, type DragPayload } from '../../entities/planner/index.js'
import {
  dueLabel,
  isDone,
  isOverdue,
  PRIORITY_LABELS,
  priorityColorClass,
  timeRangeLabel,
} from '../../entities/task/index.js'
import { cn } from '../../shared/lib/cn.js'
import { Checkbox } from '../../shared/ui/checkbox.js'
import { NamedIcon } from '../../shared/ui/icon-catalog.js'
import { useDeleteTask, useToggleTask } from './queries.js'
import { TaskDialog } from './task-dialog.js'
import { TaskSchedule } from './task-schedule.js'

const COPY = {
  concluir: 'Concluir',
  remover: 'Remover tarefa',
  repete: 'Repete',
  arrastar: 'Arrastar para o planner',
  agendar: 'Agendar',
  subtarefas: 'subtarefas concluídas',
  maisEtiquetas: 'mais etiquetas',
}

/** Quantas etiquetas cabem antes de a linha virar uma faixa de pílulas. */
const ETIQUETAS_VISIVEIS = 2

/** Altura da linha. Sai daqui para o rascunho e o cabeçalho de grupo copiarem. */
export const TASK_ROW = 'flex h-9 items-center gap-2 pr-2 pl-1'

type TaskItemProps = {
  task: TaskView
  /** Some quando a lista inteira já é de um projeto só. */
  showProject?: boolean
}

/**
 * Uma tarefa em uma linha só.
 *
 * A geometria é de tabela e não de cartão: 36px de altura, título ocupando o espaço que
 * sobra e todo o resto encostado à direita, em colunas que se repetem linha após linha.
 * É o que permite varrer trinta tarefas de cima a baixo — antes cada uma ocupava duas
 * linhas e a lista rolava três vezes mais.
 *
 * As ações flutuam sobre a ponta direita quando o ponteiro entra, em vez de morarem no
 * fluxo: reservar espaço para elas custaria a coluna que hoje mostra prazo e etiquetas.
 */
export function TaskItem({ task, showProject = true }: TaskItemProps) {
  const toggle = useToggleTask()
  const remove = useDeleteTask()

  const [aberta, setAberta] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  // O payload é o contrato com a grade — definido em `entities`, para as duas features
  // concordarem sem uma importar a outra.
  const payload: DragPayload = {
    kind: 'task',
    taskId: task.id,
    durationMinutes: task.estimateMin ?? DEFAULT_BLOCK_MINUTES,
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: payload,
  })

  const done = isDone(task)
  const overdue = isOverdue(task)
  const timeRange = timeRangeLabel(task)
  const etiquetas = task.labels.slice(0, ETIQUETAS_VISIVEIS)
  const escondidas = task.labels.length - etiquetas.length

  return (
    <li
      ref={setNodeRef}
      className={cn(
        'group relative border-line/60 border-b transition-colors',
        // Opaco de propósito: é o mesmo fundo que as ações usam para cobrir a ponta
        // direita, e com transparência a etiqueta por baixo apareceria pela metade.
        'hover:bg-surface-raised has-focus-visible:bg-surface-raised',
        isDragging && 'opacity-40',
      )}
    >
      <div className={TASK_ROW}>
        {/*
          Alça dedicada em vez de arrastar a linha inteira: assim o arrasto nunca disputa
          o ponteiro com a caixa de marcar, o título editável e os botões da ponta.
        */}
        <button
          type="button"
          aria-label={`${COPY.arrastar}: ${task.title}`}
          className={cn(
            'flex size-4 shrink-0 cursor-grab items-center justify-center rounded-[4px]',
            'text-ink-subtle opacity-0 transition duration-150 ease-press',
            'hover:text-ink group-hover:opacity-100 focus-visible:opacity-100',
            'active:cursor-grabbing',
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-3.5" />
        </button>

        <Checkbox
          checked={done}
          onChange={(checked) => toggle.mutate({ id: task.id, done: checked })}
          label={`${COPY.concluir} ${task.title}`}
          className="shrink-0"
        />

        {/*
          O título abre a tarefa inteira, e não uma caixa de renomear.
          
          Antes ele editava o nome ali mesmo. Com o modal, renomear é um dos campos que
          ele já tem — e clicar num item de lista esperando abri-lo, para receber um
          cursor no meio da linha, era a surpresa que sobrava.
        */}
        <button
          type="button"
          onClick={() => setAberta(true)}
          title={task.title}
          // Sem `aria-label`: o nome do botão é o título da tarefa, que é o que se
          // procura numa lista. "Abrir" seria prefixo repetido em toda linha.
          className={cn(
            'min-w-0 flex-1 truncate text-left text-sm transition-colors',
            done ? 'text-ink-subtle line-through' : 'text-ink',
          )}
        >
          {task.title}
        </button>

        {/* Tudo que descreve a tarefa mora encostado à direita, na mesma ordem em toda
            linha: o olho desce a coluna procurando prazo ou etiqueta sem reler o meio. */}
        <span className="flex shrink-0 items-center gap-1.5 pl-3 text-[11px]">
          {task.subtaskCount > 0 ? (
            <span
              className="tabular text-ink-subtle"
              title={`${task.completedSubtaskCount} de ${task.subtaskCount} ${COPY.subtarefas}`}
            >
              {task.completedSubtaskCount}/{task.subtaskCount}
            </span>
          ) : null}

          {/* O resumo já é uma frase ("toda segunda"); escrevê-lo na linha custaria a
              largura que o título usa para não ser cortado. */}
          {task.recurrence ? (
            <span title={`${COPY.repete} ${task.recurrence.summary}`} className="flex shrink-0">
              <Repeat2 aria-hidden="true" className="size-3.5 text-ink-subtle" />
            </span>
          ) : null}

          {timeRange ? <span className="tabular shrink-0 text-ink-subtle">{timeRange}</span> : null}

          {/* Só o atraso ganha pílula. Fundo cinza em todo prazo competiria com as
              etiquetas, que são as únicas manchas de cor que a linha deveria ter. */}
          {task.dueAt ? (
            overdue ? (
              <Chip className="tabular bg-danger/15 text-danger">{dueLabel(task.dueAt)}</Chip>
            ) : (
              <span className="tabular shrink-0 text-ink-muted">{dueLabel(task.dueAt)}</span>
            )
          ) : null}

          {/*
            Projeto e etiquetas somem na tela estreita. A ponta direita não encolhe —
            é a régua da lista — então o que ela ganha o título perde, e num celular
            "Pagar co…" ao lado de três chips não ajuda ninguém. Prazo e prioridade
            ficam: são o que decide o que fazer agora.
          */}
          {task.project && showProject ? (
            <span className="hidden min-w-0 items-center gap-1 text-ink-subtle sm:flex">
              <NamedIcon name={task.project.icon} className="size-3.5 shrink-0" />
              <span className="max-w-24 truncate">{task.project.name}</span>
            </span>
          ) : null}

          <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
            {etiquetas.map((label) => (
              <LabelChip key={label.id} label={label} />
            ))}
          </span>

          {escondidas > 0 ? (
            <Chip
              className="hidden text-ink-subtle sm:flex"
              title={task.labels
                .slice(ETIQUETAS_VISIVEIS)
                .map((label) => label.name)
                .join(', ')}
            >
              +{escondidas} <span className="sr-only">{COPY.maisEtiquetas}</span>
            </Chip>
          ) : null}

          <PriorityBars priority={task.priority} />
        </span>
      </div>

      {scheduling ? (
        <div className="pr-2 pb-3 pl-11">
          <TaskSchedule task={task} onClose={() => setScheduling(false)} />
        </div>
      ) : null}

      {aberta ? <TaskDialog task={task} open onOpenChange={setAberta} /> : null}

      {/*
        As ações cobrem a ponta direita em vez de empurrá-la. O fundo é o mesmo da linha
        sob o ponteiro, então elas parecem deslizar por cima do que já estava ali.
      */}
      <span
        className={cn(
          'absolute top-0 right-1 flex h-9 items-center gap-0.5 bg-surface-raised',
          'before:pointer-events-none before:absolute before:top-0 before:right-full',
          'before:h-full before:w-10 before:bg-gradient-to-l before:from-surface-raised',
          'before:to-transparent before:content-[""]',
          'opacity-0 transition-opacity duration-100',
          'group-hover:opacity-100 group-focus-within:opacity-100',
        )}
      >
        {/* Caminho de teclado para agendar. Arrastar é gesto de ponteiro: sem este
            botão, quem não usa mouse não conseguiria pôr a tarefa no planner. */}
        <IconAction
          onClick={() => setScheduling((open) => !open)}
          aria-expanded={scheduling}
          aria-label={`${COPY.agendar}: ${task.title}`}
          className={scheduling ? 'text-iris' : undefined}
        >
          <CalendarClock aria-hidden="true" className="size-3.5" />
        </IconAction>

        <IconAction
          onClick={() => remove.mutate(task.id)}
          aria-label={`${COPY.remover}: ${task.title}`}
          className="hover:text-danger"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
        </IconAction>
      </span>
    </li>
  )
}

function Chip({
  className,
  children,
  title,
  style,
}: {
  className?: string
  children: React.ReactNode
  title?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      title={title}
      style={style}
      className={cn('flex shrink-0 items-center rounded-[4px] px-1.5 py-0.5', className)}
    >
      {children}
    </span>
  )
}

/**
 * A etiqueta como pílula tingida da própria cor.
 *
 * O texto colorido sobre o fundo da tela — o desenho anterior — sumia nas cores escuras
 * e gritava nas claras. A pílula resolve os dois: o fundo é a mesma cor a 18%, então a
 * mancha é sempre igual.
 *
 * O texto não é a cor pura: ela é puxada 20% na direção da tinta do tema. No claro isso
 * escurece um verde que teria 2:1 de contraste sobre branco; no escuro clareia o mesmo
 * verde. Uma cor escolhida pela pessoa não tem como servir aos dois fundos sozinha.
 */
function LabelChip({ label }: { label: LabelView }) {
  return (
    <Chip
      className="max-w-24 truncate font-medium"
      // `color-mix` em vez de classes: a cor vem do banco, e o Tailwind só gera as
      // classes que encontra escritas no código.
      style={{
        color: `color-mix(in oklab, ${label.color} 80%, var(--color-ink))`,
        backgroundColor: `color-mix(in oklab, ${label.color} 18%, transparent)`,
      }}
    >
      {label.name}
    </Chip>
  )
}

/**
 * Prioridade em barras, como num sinal de celular: P1 são três, P4 é nenhuma.
 *
 * Substituiu a bolinha colorida à esquerda do título. A bolinha dizia a prioridade pela
 * cor e só pela cor — quem não distingue vermelho de laranja via duas tarefas iguais.
 * A altura é lida antes da cor, e some para a ponta direita junto com o resto do que
 * descreve a tarefa.
 */
export function PriorityBars({ priority }: { priority: number }) {
  const acesas = priority >= 4 ? 0 : 4 - priority

  return (
    <span
      title={PRIORITY_LABELS[priority]}
      aria-hidden="true"
      className="flex h-3.5 w-3.5 shrink-0 items-end justify-center gap-px"
    >
      {[0, 1, 2].map((indice) => (
        <span
          key={indice}
          className={cn(
            'w-[3px] rounded-[1px]',
            indice === 0 ? 'h-1' : indice === 1 ? 'h-2' : 'h-3',
            indice < acesas ? priorityColorClass(priority) : 'bg-line-strong',
          )}
        />
      ))}
    </span>
  )
}

function IconAction({
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & { 'aria-label': string }) {
  return (
    <button
      type="button"
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-[6px] text-ink-subtle',
        'transition duration-150 ease-press hover:bg-surface-raised hover:text-ink active:scale-90',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
