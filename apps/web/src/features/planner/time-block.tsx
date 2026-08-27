import { useDraggable } from '@dnd-kit/core'
import {
  blockGeometry,
  type DragPayload,
  type LaidOutItem,
  timeLabel,
} from '../../entities/planner/index.js'
import { cn } from '../../shared/lib/cn.js'
import { useResizeBlock } from './use-resize-block.js'

const COPY = {
  mover: 'Mover',
  redimensionar: 'Ajustar duração de',
}

/** Abaixo desta altura só cabe o título; a linha de horário é omitida. */
const COMPACT_HEIGHT_PX = 34

type TimeBlockProps = {
  item: LaidOutItem
  day: Date
  hourHeight: number
}

/** Folga entre colunas vizinhas, para as bordas não se colarem. */
const COLUMN_GAP_PERCENT = 1

/**
 * Um compromisso desenhado na grade.
 *
 * Tarefa e evento se distinguem pela forma, não só pela cor: a tarefa leva uma barra
 * colorida à esquerda (a cor do projeto), o evento tem fundo preenchido. Quem não
 * enxerga a diferença de cor ainda lê a diferença.
 *
 * Só tarefa se move e se redimensiona — evento é compromisso marcado, e reagendá-lo
 * é assunto do calendário de origem, não do arrastar.
 */
export function TimeBlock({ item, day, hourHeight }: TimeBlockProps) {
  const { top, height } = blockGeometry(item, day, hourHeight)
  const isTask = item.kind === 'task'
  const movable = isTask && !item.continuesFromPreviousDay && !item.continuesToNextDay

  const payload: DragPayload = {
    kind: 'block',
    taskId: item.id,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${item.id}`,
    data: payload,
    disabled: !movable,
  })

  const resize = useResizeBlock({ item, day, hourHeight, enabled: movable })

  // Enquanto redimensiona, a altura vem do gesto — o servidor só é avisado ao soltar.
  const visualHeight = resize.previewHeight ?? height
  const compact = visualHeight < COMPACT_HEIGHT_PX

  const accent = item.color ?? undefined

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute overflow-hidden rounded-[6px] border text-left transition-colors',
        isTask
          ? 'border-line-strong bg-surface-raised hover:bg-surface-overlay'
          : 'border-iris-soft bg-iris-soft/30 hover:bg-iris-soft/45',
        item.continuesFromPreviousDay && 'rounded-t-none border-t-0',
        item.continuesToNextDay && 'rounded-b-none border-b-0',
        item.done && 'opacity-50',
        isDragging && 'z-30 opacity-80 shadow-lg',
      )}
      style={{
        top,
        height: visualHeight,
        // Sobreposição: cada item ocupa uma fatia da largura, deslocada pela coluna.
        left: `calc(${(item.columnIndex / item.columnCount) * 100}% + 4px)`,
        width: `calc(${100 / item.columnCount - COLUMN_GAP_PERCENT}% - 8px)`,
        // Uma linha em vez de depender de @dnd-kit/utilities só para isto.
        transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
      }}
    >
      {isTask && accent ? (
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-[3px] rounded-l-[6px]"
          style={{ backgroundColor: accent }}
        />
      ) : null}

      {/*
        A área de mover cobre o bloco inteiro menos a faixa de baixo, que é a alça de
        redimensionar. Sem essa separação, esticar e arrastar disputariam o ponteiro.
      */}
      {/*
        O rótulo só existe junto dos `attributes` do dnd-kit, que trazem o `role`.
        Sozinho num <div> sem papel, um aria-label não é lido por leitor de tela.
      */}
      <div
        {...(movable
          ? { ...attributes, ...listeners, 'aria-label': `${COPY.mover} ${item.title}` }
          : {})}
        className={cn('h-full px-2 py-1', movable && 'cursor-grab active:cursor-grabbing')}
      >
        <p
          className={cn(
            'truncate font-medium text-xs',
            item.done ? 'text-ink-subtle line-through' : 'text-ink',
          )}
        >
          {item.title}
        </p>

        {!compact ? (
          <p className="tabular truncate text-[11px] text-ink-subtle">
            {timeLabel(item.startsAt)} – {timeLabel(resize.previewEnd ?? item.endsAt)}
          </p>
        ) : null}
      </div>

      {movable ? (
        <button
          type="button"
          aria-label={`${COPY.redimensionar} ${item.title}`}
          onPointerDown={resize.onPointerDown}
          className={cn(
            'absolute right-0 bottom-0 left-0 h-2 cursor-ns-resize',
            'opacity-0 transition hover:bg-iris/30 focus-visible:opacity-100',
          )}
        />
      ) : null}
    </div>
  )
}
