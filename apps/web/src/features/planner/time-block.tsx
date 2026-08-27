import { blockGeometry, type PlannerItem, timeLabel } from '../../entities/planner/index.js'
import { cn } from '../../shared/lib/cn.js'

/** Abaixo desta altura só cabe o título; a linha de horário é omitida. */
const COMPACT_HEIGHT_PX = 34

type TimeBlockProps = {
  item: PlannerItem
  day: Date
  hourHeight: number
}

/**
 * Um compromisso desenhado na grade.
 *
 * Tarefa e evento se distinguem pela forma, não só pela cor: a tarefa leva uma barra
 * colorida à esquerda (a cor do projeto), o evento tem fundo preenchido. Quem não
 * enxerga a diferença de cor ainda lê a diferença.
 */
export function TimeBlock({ item, day, hourHeight }: TimeBlockProps) {
  const { top, height } = blockGeometry(item, day, hourHeight)
  const isTask = item.kind === 'task'
  const compact = height < COMPACT_HEIGHT_PX

  const accent = item.color ?? undefined

  return (
    <div
      className={cn(
        'absolute right-1 left-1 overflow-hidden rounded-[6px] px-2 py-1 text-left',
        'border transition-colors',
        isTask
          ? 'border-line-strong bg-surface-raised hover:bg-surface-overlay'
          : 'border-iris-soft bg-iris-soft/30 hover:bg-iris-soft/45',
        // Recortado na borda do dia: o canto some para indicar que continua.
        item.continuesFromPreviousDay && 'rounded-t-none border-t-0',
        item.continuesToNextDay && 'rounded-b-none border-b-0',
        item.done && 'opacity-50',
      )}
      style={{ top, height }}
    >
      {isTask && accent ? (
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-[3px] rounded-l-[6px]"
          style={{ backgroundColor: accent }}
        />
      ) : null}

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
          {timeLabel(item.startsAt)} – {timeLabel(item.endsAt)}
        </p>
      ) : null}
    </div>
  )
}
