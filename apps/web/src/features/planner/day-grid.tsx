import { useEffect, useRef, useState } from 'react'
import {
  HOURS_IN_DAY,
  hourLabel,
  isSameDay,
  nowOffset,
  WORKDAY_START_HOUR,
} from '../../entities/planner/index.js'
import { cn } from '../../shared/lib/cn.js'
import { useDayPlanner } from './queries.js'
import { TimeBlock } from './time-block.js'

const COPY = {
  carregando: 'Carregando o dia…',
  erro: 'Não consegui carregar o dia.',
  vazio: 'Nenhum compromisso neste dia.',
}

/** Altura de uma hora em pixels — espelha o token `--spacing-hour` (3.5rem). */
const HOUR_HEIGHT = 56

/** Lista fixa 0..23. Existe como valores para a `key` ser a hora, e não o índice. */
const HOURS = Array.from({ length: HOURS_IN_DAY }, (_, index) => index)

/** De quanto em quanto tempo o marcador de "agora" se move. */
const NOW_TICK_MS = 60_000

type DayGridProps = {
  day: Date
}

export function DayGrid({ day }: DayGridProps) {
  const { items, isPending, isError } = useDayPlanner(day)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => new Date())

  // O marcador precisa andar sozinho: sem isto ele congela na hora em que a aba abriu.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), NOW_TICK_MS)
    return () => clearInterval(timer)
  }, [])

  // Abre focada no dia útil. As 24 horas existem e rolam — só não começamos na
  // madrugada, que costuma estar vazia.
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const target = isSameDay(day, new Date())
      ? Math.max(new Date().getHours() - 1, 0)
      : WORKDAY_START_HOUR

    container.scrollTop = target * HOUR_HEIGHT
  }, [day])

  const marker = nowOffset(day, HOUR_HEIGHT, now)

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

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative" style={{ height: HOURS_IN_DAY * HOUR_HEIGHT }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-0 left-0 border-line border-t"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <span className="tabular -top-2 absolute left-0 w-12 bg-canvas pr-2 text-right text-[11px] text-ink-subtle">
                {hour === 0 ? '' : hourLabel(hour)}
              </span>
            </div>
          ))}

          {/* Coluna dos blocos, deslocada para não passar por cima dos rótulos. */}
          <div className="absolute top-0 bottom-0 left-12 right-0">
            {items.map((item) => (
              <TimeBlock key={item.id} item={item} day={day} hourHeight={HOUR_HEIGHT} />
            ))}

            {items.length === 0 && !isPending ? (
              <p
                className="absolute top-0 left-2 text-ink-subtle text-xs"
                style={{ top: WORKDAY_START_HOUR * HOUR_HEIGHT + 8 }}
              >
                {COPY.vazio}
              </p>
            ) : null}
          </div>

          {marker !== null ? (
            // Decorativo de propósito: uma linha numa posição não comunica nada a
            // quem usa leitor de tela, e a hora atual já vem do relógio do sistema.
            <div
              aria-hidden="true"
              className={cn('pointer-events-none absolute right-0 left-10 z-20 flex items-center')}
              style={{ top: marker }}
            >
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-danger" />
              <span aria-hidden="true" className="h-px flex-1 bg-danger" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
