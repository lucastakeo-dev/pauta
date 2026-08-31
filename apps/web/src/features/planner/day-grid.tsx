import { useRef } from 'react'
import { dayKey, HOURS_IN_DAY, isSameDay } from '../../entities/planner/index.js'
import {
  DayColumn,
  HOUR_HEIGHT,
  HourLines,
  RULER_WIDTH,
  useNowTick,
  useOpenAtWorkday,
} from './grid-parts.js'
import { useDayPlanner } from './queries.js'

const COPY = {
  carregando: 'Carregando o dia…',
  erro: 'Não consegui carregar o dia.',
}

/** A grade de um dia: a régua de horas e uma coluna. */
export function DayGrid({ day }: { day: Date }) {
  const { items, isPending, isError } = useDayPlanner(day)
  const scrollRef = useRef<HTMLDivElement>(null)
  const now = useNowTick()

  useOpenAtWorkday(scrollRef, dayKey(day), isSameDay(day, new Date()))

  if (isError) {
    return (
      <p role="alert" className="px-4 py-8 text-danger text-sm">
        {COPY.erro}
      </p>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {isPending ? (
        <p role="status" aria-live="polite" className="sr-only">
          {COPY.carregando}
        </p>
      ) : null}

      <div ref={scrollRef} data-planner-scroll className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative" style={{ height: HOURS_IN_DAY * HOUR_HEIGHT }}>
          <HourLines />

          {/* Deslocada para não passar por cima dos rótulos de hora. */}
          <DayColumn
            day={day}
            items={items}
            now={now}
            showEmpty={!isPending}
            className="absolute top-0 right-0 bottom-0"
            style={{ left: RULER_WIDTH }}
          />
        </div>
      </div>
    </div>
  )
}
