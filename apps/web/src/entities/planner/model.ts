import type { EventView, TaskView } from '@pauta/contracts'

/**
 * Geometria da grade do dia. Tudo aqui é função pura de data → pixel: dá para testar
 * sem renderizar nada, que é o ponto — erro de posicionamento é caro de ver a olho.
 *
 * As contas são feitas no **fuso local** de quem está olhando, não em UTC. Um bloco das
 * 9h precisa aparecer na linha das 9h do relógio da pessoa.
 */

export const HOURS_IN_DAY = 24
const MS_PER_MINUTE = 60_000

/** Altura mínima de um bloco. Sem isso, um compromisso de 5 minutos vira um risco. */
export const MIN_BLOCK_MINUTES = 20

/** Onde a grade abre por padrão — o dia útil, sem esconder a madrugada. */
export const WORKDAY_START_HOUR = 7

export type PlannerItem = {
  id: string
  kind: 'task' | 'event'
  title: string
  startsAt: Date
  endsAt: Date
  /** Cor do projeto (tarefa) ou nula (evento herda a cor neutra do tema). */
  color: string | null
  done: boolean
  priority: number | null
  /** `true` quando o bloco começa antes do dia mostrado. */
  continuesFromPreviousDay: boolean
  /** `true` quando o bloco termina depois do dia mostrado. */
  continuesToNextDay: boolean
}

/** Meia-noite local do dia informado, e a meia-noite seguinte. */
export function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Minutos desde a meia-noite do dia — a coordenada base da grade. */
export function minutesFromDayStart(instant: Date, dayStart: Date): number {
  return (instant.getTime() - dayStart.getTime()) / MS_PER_MINUTE
}

/**
 * Converte tarefas agendadas e eventos numa lista só, ordenada por horário.
 *
 * Tarefa sem bloco de tempo não entra: ela vive na lista ao lado, não na grade.
 */
export function toPlannerItems(tasks: TaskView[], events: EventView[], day: Date): PlannerItem[] {
  const { start, end } = dayBounds(day)
  const items: PlannerItem[] = []

  for (const task of tasks) {
    if (!task.scheduledStart || !task.scheduledEnd) continue

    const startsAt = new Date(task.scheduledStart)
    const endsAt = new Date(task.scheduledEnd)

    if (endsAt <= start || startsAt >= end) continue

    items.push({
      id: task.id,
      kind: 'task',
      title: task.title,
      startsAt,
      endsAt,
      color: task.project?.color ?? null,
      done: task.status === 'done',
      priority: task.priority,
      continuesFromPreviousDay: startsAt < start,
      continuesToNextDay: endsAt > end,
    })
  }

  for (const event of events) {
    const startsAt = new Date(event.startsAt)
    const endsAt = new Date(event.endsAt)

    if (endsAt <= start || startsAt >= end) continue

    items.push({
      id: event.id,
      kind: 'event',
      title: event.title,
      startsAt,
      endsAt,
      color: null,
      done: false,
      priority: null,
      continuesFromPreviousDay: startsAt < start,
      continuesToNextDay: endsAt > end,
    })
  }

  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}

/**
 * Posição e altura do bloco em pixels.
 *
 * O bloco é recortado nas bordas do dia: um plantão que começa às 20h de ontem entra
 * colado no topo, em vez de sair da grade com `top` negativo.
 */
export function blockGeometry(
  item: Pick<PlannerItem, 'startsAt' | 'endsAt'>,
  day: Date,
  hourHeight: number,
): { top: number; height: number } {
  const { start, end } = dayBounds(day)

  const visibleStart = item.startsAt < start ? start : item.startsAt
  const visibleEnd = item.endsAt > end ? end : item.endsAt

  const startMinutes = minutesFromDayStart(visibleStart, start)
  const rawMinutes = minutesFromDayStart(visibleEnd, start) - startMinutes
  const minutes = Math.max(rawMinutes, MIN_BLOCK_MINUTES)

  return {
    top: (startMinutes / 60) * hourHeight,
    height: (minutes / 60) * hourHeight,
  }
}

/**
 * Altura do marcador de "agora", ou `null` quando o dia mostrado não é hoje —
 * marcar "agora" num dia que não é hoje seria mentira visual.
 */
export function nowOffset(day: Date, hourHeight: number, now: Date = new Date()): number | null {
  if (!isSameDay(day, now)) return null

  const { start } = dayBounds(day)
  return (minutesFromDayStart(now, start) / 60) * hourHeight
}

/** Rótulo do dia como a pessoa fala: "hoje", "amanhã", ou a data por extenso. */
export function dayLabel(day: Date, now: Date = new Date()): string {
  if (isSameDay(day, now)) return 'Hoje'
  if (isSameDay(day, addDays(now, 1))) return 'Amanhã'
  if (isSameDay(day, addDays(now, -1))) return 'Ontem'

  return day.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })
}

/** `09:00` — sempre dois dígitos, para a coluna de horas alinhar. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function timeLabel(instant: Date): string {
  return instant.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Granularidade do arrastar. Blocos encaixam de 15 em 15 minutos. */
export const SNAP_MINUTES = 15

/** Duração de uma tarefa arrastada para a grade sem duração própria. */
export const DEFAULT_BLOCK_MINUTES = 60

/** Duração mínima ao redimensionar — abaixo disso o bloco fica impossível de pegar. */
export const MIN_DURATION_MINUTES = 15

/**
 * O que viaja no arrastar. Fica aqui, em `entities`, porque as duas features precisam
 * concordar sobre o formato sem uma importar a outra: a lista de tarefas produz, a
 * grade consome.
 */
export type DragPayload =
  /** Veio da lista: ainda não tem horário, então carrega só a duração desejada. */
  | { kind: 'task'; taskId: string; durationMinutes: number }
  /** Já está na grade: carrega o intervalo atual, para o movimento ser relativo. */
  | { kind: 'block'; taskId: string; startsAt: Date; endsAt: Date }

/** Arredonda para o encaixe mais próximo. */
export function snapMinutes(minutes: number, snap: number = SNAP_MINUTES): number {
  return Math.round(minutes / snap) * snap
}

/**
 * Converte uma posição vertical na grade em horário, já encaixado.
 *
 * O resultado é limitado ao próprio dia: soltar acima do topo vira meia-noite, e não
 * o dia anterior.
 */
export function timeFromOffset(offsetY: number, day: Date, hourHeight: number): Date {
  const { start } = dayBounds(day)
  const rawMinutes = (offsetY / hourHeight) * 60
  const minutes = Math.min(Math.max(snapMinutes(rawMinutes), 0), HOURS_IN_DAY * 60)

  return new Date(start.getTime() + minutes * MS_PER_MINUTE)
}

/**
 * Encaixa um bloco de `durationMinutes` começando em `start`, sem deixá-lo vazar
 * para o dia seguinte — um bloco de 1h solto às 23h30 recua para terminar à meia-noite.
 */
export function fitBlockInDay(
  start: Date,
  durationMinutes: number,
  day: Date,
): { start: Date; end: Date } {
  const { start: dayStart, end: dayEnd } = dayBounds(day)
  const duration = Math.max(durationMinutes, MIN_DURATION_MINUTES) * MS_PER_MINUTE

  const maxStart = new Date(dayEnd.getTime() - duration)
  const clamped = new Date(
    Math.min(
      Math.max(start.getTime(), dayStart.getTime()),
      Math.max(maxStart.getTime(), dayStart.getTime()),
    ),
  )

  const end = new Date(Math.min(clamped.getTime() + duration, dayEnd.getTime()))

  return { start: clamped, end }
}

/** Duração de um bloco em minutos. */
export function durationInMinutes(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MS_PER_MINUTE
}

/**
 * Novo fim ao redimensionar pela borda de baixo, encaixado e com piso de duração.
 * Nunca passa da meia-noite.
 */
export function resizeEnd(start: Date, offsetY: number, day: Date, hourHeight: number): Date {
  const { end: dayEnd } = dayBounds(day)
  const candidate = timeFromOffset(offsetY, day, hourHeight)

  const minEnd = new Date(start.getTime() + MIN_DURATION_MINUTES * MS_PER_MINUTE)
  const target = candidate < minEnd ? minEnd : candidate

  return new Date(Math.min(target.getTime(), dayEnd.getTime()))
}

/** Um item já com a coluna que ocupa quando há sobreposição. */
export type LaidOutItem = PlannerItem & {
  /** Coluna que este item ocupa, de 0 a `columnCount - 1`. */
  columnIndex: number
  /** Quantas colunas o grupo sobreposto usa. 1 quando o item está sozinho. */
  columnCount: number
}

/**
 * Distribui itens sobrepostos em colunas lado a lado.
 *
 * Sem isto, dois compromissos no mesmo horário se empilham e só o de cima é clicável.
 *
 * O algoritmo é o de sempre em calendário, em dois passos:
 * 1. agrupa em "blocos" de itens que se tocam em cadeia (A toca B, B toca C → um grupo);
 * 2. dentro do grupo, cada item vai para a primeira coluna livre naquele horário.
 *
 * Todos no grupo dividem a mesma largura, para as colunas ficarem alinhadas em vez de
 * cada item ter uma largura própria.
 */
export function layoutOverlaps(items: PlannerItem[]): LaidOutItem[] {
  const ordered = [...items].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  const result: LaidOutItem[] = []

  let group: PlannerItem[] = []
  let groupEnd = Number.NEGATIVE_INFINITY

  const flush = () => {
    if (group.length === 0) return

    // Fim de cada coluna, para saber onde o próximo item cabe.
    const columnEnds: number[] = []
    const assigned = group.map((item) => {
      let columnIndex = columnEnds.findIndex((end) => end <= item.startsAt.getTime())

      if (columnIndex === -1) {
        columnIndex = columnEnds.length
      }

      columnEnds[columnIndex] = item.endsAt.getTime()
      return { item, columnIndex }
    })

    for (const { item, columnIndex } of assigned) {
      result.push({ ...item, columnIndex, columnCount: columnEnds.length })
    }

    group = []
    groupEnd = Number.NEGATIVE_INFINITY
  }

  for (const item of ordered) {
    // Começa depois do fim de todo o grupo: é um grupo novo.
    if (item.startsAt.getTime() >= groupEnd) {
      flush()
    }

    group.push(item)
    groupEnd = Math.max(groupEnd, item.endsAt.getTime())
  }

  flush()

  return result
}

/**
 * Conversões para os campos nativos `<input type="date">` e `<input type="time">`.
 *
 * Eles falam em horário local e em texto, não em ISO. Fazer isso na mão em cada tela
 * é onde nasce erro de fuso — por isso mora aqui, com teste.
 */
export function toDateInputValue(instant: Date): string {
  const year = instant.getFullYear()
  const month = String(instant.getMonth() + 1).padStart(2, '0')
  const day = String(instant.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function toTimeInputValue(instant: Date): string {
  const hours = String(instant.getHours()).padStart(2, '0')
  const minutes = String(instant.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

/**
 * Junta o que veio dos dois campos num instante local.
 *
 * Devolve `null` para entrada incompleta ou inválida — o formulário decide o que
 * fazer, em vez de receber uma data silenciosamente errada.
 */
export function fromDateTimeInputs(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)

  if (!dateMatch || !timeMatch) return null

  const instant = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0,
  )

  return Number.isNaN(instant.getTime()) ? null : instant
}
