import { useDroppable } from '@dnd-kit/core'
import { useEffect, useState } from 'react'
import {
  dayKey,
  HOURS_IN_DAY,
  hourLabel,
  type LaidOutItem,
  nowOffset,
  WORKDAY_START_HOUR,
} from '../../entities/planner/index.js'
import { cn } from '../../shared/lib/cn.js'
import { plannerDropId } from './planner-dnd.js'
import { TimeBlock } from './time-block.js'

const COPY = {
  vazio: 'Nenhum compromisso neste dia.',
}

/** Altura de uma hora em pixels — espelha o token `--spacing-hour` (3.5rem). */
export const HOUR_HEIGHT = 56

/** Largura da coluna de rótulos de hora. O dia e a semana usam a mesma. */
export const RULER_WIDTH = 48

/** De quanto em quanto tempo o marcador de "agora" se move. */
const NOW_TICK_MS = 60_000

/** Lista fixa 0..23. Existe como valores para a `key` ser a hora, e não o índice. */
const HOURS = Array.from({ length: HOURS_IN_DAY }, (_, index) => index)

/**
 * O relógio da grade.
 *
 * Um intervalo só, no topo, e não um por coluna: na semana seriam sete temporizadores
 * acordando a cada minuto para mover uma linha que existe em uma coluna só.
 */
export function useNowTick(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), NOW_TICK_MS)
    return () => clearInterval(timer)
  }, [])

  return now
}

/**
 * Abre a grade no dia útil ao trocar de dia ou de semana.
 *
 * As 24 horas existem e rolam — só não começamos na madrugada, que costuma estar vazia.
 * Quando o que está na tela inclui hoje, abre uma hora antes de agora: o que interessa
 * ali é o que vem a seguir, não o começo do expediente que já passou.
 *
 * Recebe a chave do período (`2026-08-31`) e não a data: o objeto `Date` é recriado a
 * cada render, e a grade rolaria sozinha de volta ao topo enquanto se lê.
 */
export function useOpenAtWorkday(
  ref: React.RefObject<HTMLDivElement | null>,
  chave: string,
  contemHoje: boolean,
): void {
  // `chave` é gatilho, não valor lido: é ela que diz "o período mudou, reancore".
  // Sem ela na lista, trocar de dia manteria a rolagem onde o dia anterior estava.
  // biome-ignore lint/correctness/useExhaustiveDependencies: gatilho de período.
  useEffect(() => {
    const container = ref.current
    if (!container) return

    const hora = contemHoje ? Math.max(new Date().getHours() - 1, 0) : WORKDAY_START_HOUR
    container.scrollTop = hora * HOUR_HEIGHT
  }, [ref, chave, contemHoje])
}

/**
 * As linhas de hora, atrás das colunas.
 *
 * Ficam num plano só, cruzando a largura inteira, em vez de repetidas por coluna: na
 * semana, sete conjuntos de linhas nunca casariam exatamente e a grade ficaria trêmula.
 */
export function HourLines() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute right-0 border-line border-t"
          // Começa depois da régua: cruzando os rótulos, o traço passava no meio do
          // texto da hora e os dois disputavam a mesma linha de pixels.
          style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT, left: RULER_WIDTH }}
        >
          <span
            className="tabular -top-2 absolute right-full pr-2 text-right text-[11px] text-ink-subtle"
            style={{ width: RULER_WIDTH }}
          >
            {hour === 0 ? '' : hourLabel(hour)}
          </span>
        </div>
      ))}
    </div>
  )
}

type DayColumnProps = {
  day: Date
  items: LaidOutItem[]
  now: Date
  /** Some quando a grade ainda está carregando: "vazio" e "ainda não chegou" são coisas diferentes. */
  showEmpty: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * Uma coluna de um dia: o alvo de soltura, os blocos e o marcador de agora.
 *
 * Cada coluna é um alvo próprio, com o dia no id. É isso que faz a semana funcionar sem
 * uma segunda regra de arrastar: quem recebe a soltura já sabe em que dia caiu.
 */
export function DayColumn({ day, items, now, showEmpty, className, style }: DayColumnProps) {
  // O alvo é a área de 24h, não o container com rolagem: assim `over.rect.top` já
  // desconta a rolagem, e a conta de "onde caiu" vale em qualquer posição do scroll.
  const { setNodeRef } = useDroppable({ id: plannerDropId(day) })
  const marker = nowOffset(day, HOUR_HEIGHT, now)

  return (
    <div
      ref={setNodeRef}
      data-planner-grid
      data-day={dayKey(day)}
      className={cn('relative', className)}
      style={style}
    >
      {items.map((item) => (
        <TimeBlock key={item.id} item={item} day={day} hourHeight={HOUR_HEIGHT} />
      ))}

      {showEmpty && items.length === 0 ? (
        <p
          className="absolute left-2 truncate text-ink-subtle text-xs"
          style={{ top: WORKDAY_START_HOUR * HOUR_HEIGHT + 8 }}
        >
          {COPY.vazio}
        </p>
      ) : null}

      {marker !== null ? (
        // Decorativo de propósito: uma linha numa posição não comunica nada a quem usa
        // leitor de tela, e a hora atual já vem do relógio do sistema.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
          style={{ top: marker }}
        >
          <span className="-ml-1 size-2 shrink-0 rounded-full bg-danger" />
          <span className="h-px flex-1 bg-danger" />
        </div>
      ) : null}
    </div>
  )
}
