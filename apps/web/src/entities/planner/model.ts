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
