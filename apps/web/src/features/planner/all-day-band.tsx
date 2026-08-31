import { useDraggable } from '@dnd-kit/core'
import type { AllDayItem, DragPayload } from '../../entities/planner/index.js'
import { DEFAULT_BLOCK_MINUTES } from '../../entities/planner/index.js'
import { cn } from '../../shared/lib/cn.js'
import { NamedIcon } from '../../shared/ui/icon-catalog.js'

const COPY = {
  faixa: 'Dia todo',
  arrastar: 'Arrastar para o planner',
  vence: 'Vence hoje',
}

/**
 * A faixa do dia todo, acima da grade de horas.
 *
 * Existe porque data e hora não são a mesma coisa. Um prazo de terça não é um
 * compromisso das 12h de terça, e um evento de dia inteiro não é um bloco de 24 horas —
 * era assim que ele aparecia antes, cobrindo a grade inteira. Ambos precisam ser vistos
 * ao olhar o dia, e nenhum dos dois cabe numa linha de hora.
 *
 * O chip de tarefa é arrastável para a grade: é o gesto que transforma "vence hoje" em
 * "faço às 15h", sem sair da tela.
 */
export function AllDayBand({ items, className }: { items: AllDayItem[]; className?: string }) {
  return (
    <ul className={cn('flex min-w-0 flex-wrap items-start gap-1 py-1 pr-1 pl-1.5', className)}>
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="min-w-0 max-w-full">
          {item.kind === 'task' ? <TaskChip item={item} /> : <EventChip item={item} />}
        </li>
      ))}
    </ul>
  )
}

/** O rótulo da faixa, na calha dos rótulos de hora. */
export function AllDayGutter({ width }: { width: number }) {
  return (
    <span
      aria-hidden="true"
      className="shrink-0 pt-1.5 pr-2 text-right text-[11px] text-ink-subtle"
      style={{ width }}
    >
      {COPY.faixa}
    </span>
  )
}

/**
 * Prazo de tarefa.
 *
 * Segue a forma que a grade já usa para tarefa — barra colorida à esquerda sobre fundo
 * neutro —, então o mesmo par de formas distingue tarefa de evento na faixa e na grade.
 */
function TaskChip({ item }: { item: AllDayItem }) {
  const payload: DragPayload = {
    kind: 'task',
    taskId: item.id,
    durationMinutes: item.estimateMin ?? DEFAULT_BLOCK_MINUTES,
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `allday-${item.id}`,
    data: payload,
  })

  return (
    // Botão, e não um `span` com alça: assim o chip entra na ordem do Tab e anuncia o
    // que é. Quem não usa ponteiro agenda pelo botão "Agendar" da lista, que já existe.
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`${COPY.arrastar}: ${item.title}`}
      title={`${COPY.vence}: ${item.title}`}
      className={cn(
        'relative flex h-6 max-w-full cursor-grab items-center gap-1 overflow-hidden',
        'rounded-[6px] border border-line-strong bg-surface-raised pr-2 pl-2.5',
        'text-[11px] transition-colors hover:bg-surface-overlay active:cursor-grabbing',
        item.done && 'opacity-50',
        isDragging && 'z-30 opacity-80 shadow-lg',
      )}
    >
      {item.color ? (
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-[3px] rounded-l-[6px]"
          style={{ backgroundColor: item.color }}
        />
      ) : null}

      {item.projectIcon ? (
        <NamedIcon name={item.projectIcon} className="size-3 shrink-0 text-ink-subtle" />
      ) : null}

      <span className={cn('truncate text-ink', item.done && 'line-through')}>{item.title}</span>
    </button>
  )
}

/** Evento de dia inteiro: fundo preenchido, como o bloco de evento na grade. */
function EventChip({ item }: { item: AllDayItem }) {
  return (
    <span
      title={item.title}
      className={cn(
        'flex h-6 max-w-full items-center overflow-hidden rounded-[6px] border',
        'border-iris-soft bg-iris-soft/30 px-2 text-[11px] text-ink',
      )}
    >
      <span className="truncate">{item.title}</span>
    </span>
  )
}
