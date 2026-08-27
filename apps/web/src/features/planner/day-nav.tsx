import { addDays, dayLabel, isSameDay } from '../../entities/planner/index.js'
import { cn } from '../../shared/lib/cn.js'

const COPY = {
  anterior: 'Dia anterior',
  proximo: 'Próximo dia',
  hoje: 'Hoje',
}

type DayNavProps = {
  day: Date
  onChange: (day: Date) => void
}

export function DayNav({ day, onChange }: DayNavProps) {
  const today = new Date()
  const isToday = isSameDay(day, today)

  return (
    <div className="flex items-center justify-between gap-2 pb-3">
      <div className="flex min-w-0 flex-col">
        <h2 className="truncate font-semibold text-ink capitalize">{dayLabel(day, today)}</h2>
        <p className="tabular text-ink-subtle text-xs">
          {day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Arrow label={COPY.anterior} onClick={() => onChange(addDays(day, -1))}>
          ‹
        </Arrow>

        <button
          type="button"
          onClick={() => onChange(new Date())}
          // Desabilitado quando já é hoje: um botão que não faz nada confunde mais
          // do que ajuda.
          disabled={isToday}
          className={cn(
            'rounded-control px-2.5 py-1 text-xs transition-colors',
            isToday
              ? 'cursor-default text-ink-subtle/50'
              : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
          )}
        >
          {COPY.hoje}
        </button>

        <Arrow label={COPY.proximo} onClick={() => onChange(addDays(day, 1))}>
          ›
        </Arrow>
      </div>
    </div>
  )
}

function Arrow({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-control px-2 py-1 text-ink-muted text-sm transition-colors hover:bg-surface-raised hover:text-ink"
    >
      {children}
    </button>
  )
}
