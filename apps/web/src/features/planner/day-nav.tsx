import {
  addDays,
  DAYS_IN_WEEK,
  dayLabel,
  isSameDay,
  startOfWeek,
  weekLabel,
} from '../../entities/planner/index.js'
import { cn } from '../../shared/lib/cn.js'

const COPY = {
  diaAnterior: 'Dia anterior',
  diaProximo: 'Próximo dia',
  semanaAnterior: 'Semana anterior',
  semanaProxima: 'Próxima semana',
  hoje: 'Hoje',
}

type DayNavProps = {
  day: Date
  onChange: (day: Date) => void
  /** Um dia por vez, ou uma semana por vez. Muda o passo, o rótulo e o subtítulo. */
  unit?: 'dia' | 'semana'
}

/**
 * O cabeçalho da grade: onde se está no tempo, e como andar.
 *
 * A mesma peça serve dia e semana porque o gesto é o mesmo — voltar, hoje, avançar. O
 * que muda é o passo, e um segundo componente só para trocar `1` por `7` duplicaria o
 * botão "Hoje" e o estado de desabilitado junto.
 */
export function DayNav({ day, onChange, unit = 'dia' }: DayNavProps) {
  const today = new Date()
  const semana = unit === 'semana'

  const passo = semana ? DAYS_IN_WEEK : 1
  const isToday = semana ? isSameDay(startOfWeek(day), startOfWeek(today)) : isSameDay(day, today)

  return (
    <div className="flex items-center justify-between gap-2 pb-3">
      <div className="flex min-w-0 flex-col">
        {/* `first-letter` e não `capitalize`: este maiusculiza toda palavra, e a semana
            virava "31 De Ago – 6 De Set". */}
        <h2 className="truncate font-semibold text-ink first-letter:uppercase">
          {semana ? weekLabel(day) : dayLabel(day, today)}
        </h2>
        <p className="tabular text-ink-subtle text-xs">
          {semana
            ? day.toLocaleDateString('pt-BR', { year: 'numeric' })
            : day.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Arrow
          label={semana ? COPY.semanaAnterior : COPY.diaAnterior}
          onClick={() => onChange(addDays(day, -passo))}
        >
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

        <Arrow
          label={semana ? COPY.semanaProxima : COPY.diaProximo}
          onClick={() => onChange(addDays(day, passo))}
        >
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
