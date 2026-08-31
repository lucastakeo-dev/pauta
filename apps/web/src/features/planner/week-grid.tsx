import { useRef } from 'react'
import {
  dayKey,
  HOURS_IN_DAY,
  isSameDay,
  startOfWeek,
  weekdayLabel,
} from '../../entities/planner/index.js'
import { cn } from '../../shared/lib/cn.js'
import { AllDayBand, AllDayGutter } from './all-day-band.js'
import {
  DayColumn,
  HOUR_HEIGHT,
  HourLines,
  RULER_WIDTH,
  useNowTick,
  useOpenAtWorkday,
} from './grid-parts.js'
import { useWeekPlanner } from './queries.js'

const COPY = {
  carregando: 'Carregando a semana…',
  erro: 'Não consegui carregar a semana.',
  vazio: 'Nenhum compromisso nesta semana.',
}

/**
 * A semana inteira numa grade só: a régua de horas à esquerda e sete colunas.
 *
 * Cada coluna é um alvo de soltura próprio, então arrastar de terça para quinta é o
 * mesmo gesto de arrastar dentro do dia — quem recebe a soltura já sabe o dia.
 */
export function WeekGrid({ reference }: { reference: Date }) {
  const { days, isPending, isError } = useWeekPlanner(reference)
  const scrollRef = useRef<HTMLDivElement>(null)
  const now = useNowTick()

  const hoje = new Date()
  const contemHoje = isSameDay(startOfWeek(reference), startOfWeek(hoje))

  useOpenAtWorkday(scrollRef, dayKey(startOfWeek(reference)), contemHoje)

  if (isError) {
    return (
      <p role="alert" className="px-4 py-8 text-danger text-sm">
        {COPY.erro}
      </p>
    )
  }

  const vazia = !isPending && days.every((dia) => dia.items.length === 0)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {isPending ? (
        <p role="status" aria-live="polite" className="sr-only">
          {COPY.carregando}
        </p>
      ) : null}

      {/* Fica fora da rolagem: rolar até as 18h não pode custar saber que dia é cada coluna. */}
      <div className="flex shrink-0 border-line border-b" style={{ paddingLeft: RULER_WIDTH }}>
        {days.map(({ day }) => (
          <Cabecalho key={dayKey(day)} day={day} hoje={isSameDay(day, hoje)} />
        ))}
      </div>

      {/* A faixa acompanha o cabeçalho fora da rolagem, e só existe quando algum dia
          da semana tem prazo ou evento de dia inteiro. Quando existe, existe para os
          sete: uma coluna vazia aqui é informação — não vence nada naquele dia. */}
      {days.some((dia) => dia.allDay.length > 0) ? (
        <div data-planner-allday className="flex shrink-0 border-line border-b">
          <AllDayGutter width={RULER_WIDTH} />
          {days.map(({ day, allDay }) => (
            <AllDayBand
              key={dayKey(day)}
              items={allDay}
              className="min-w-0 flex-1 border-line border-l"
            />
          ))}
        </div>
      ) : null}

      <div ref={scrollRef} data-planner-scroll className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: HOURS_IN_DAY * HOUR_HEIGHT }}>
          <HourLines />

          <div className="shrink-0" style={{ width: RULER_WIDTH }} />

          {days.map(({ day, items }) => (
            <DayColumn
              key={dayKey(day)}
              day={day}
              items={items}
              now={now}
              // Sete vezes "nenhum compromisso neste dia" é ruído, não informação: a
              // semana vazia fala uma vez só, no lugar da grade.
              showEmpty={false}
              className="min-w-0 flex-1 border-line border-l"
            />
          ))}
        </div>

        {vazia ? (
          <p className="pointer-events-none absolute inset-x-0 top-24 text-center text-ink-subtle text-xs">
            {COPY.vazio}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Cabecalho({ day, hoje }: { day: Date; hoje: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2">
      <span className="text-[11px] text-ink-subtle capitalize">{weekdayLabel(day)}</span>

      {/* Hoje ganha o acento, que neste app é a cor do foco — é a coluna que se procura
          ao abrir a semana. */}
      <span
        className={cn(
          'tabular flex size-6 items-center justify-center rounded-full text-[13px]',
          hoje ? 'bg-iris font-medium text-canvas' : 'text-ink-muted',
        )}
      >
        {day.getDate()}
      </span>
    </div>
  )
}
