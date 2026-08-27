import type { TaskView } from '@pauta/contracts'

/**
 * Regras puras sobre tarefas. Sem React e sem rede — o que mora aqui é testável
 * com uma chamada de função, e é reaproveitado pelo planner e pelo console depois.
 */

/** `P1`..`P4` no fim do texto viram prioridade, e saem do título. */
const PRIORITY_SUFFIX = /\s+p([1-4])\s*$/i

/**
 * Separa a prioridade escrita no fim do título.
 *
 * Mora em `entities` e não no componente de entrada porque é regra de domínio pura:
 * o Console da Fase 3 vai interpretar o mesmo sufixo.
 */
export function parsePriority(input: string): { title: string; priority: number } {
  const match = input.match(PRIORITY_SUFFIX)

  if (!match?.[1]) return { title: input.trim(), priority: 4 }

  return {
    title: input.replace(PRIORITY_SUFFIX, '').trim(),
    priority: Number(match[1]),
  }
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Urgente',
  2: 'Alta',
  3: 'Média',
  4: 'Sem prioridade',
}

/** Classe do token de cor da prioridade. P4 não colore: a maioria é P4. */
export function priorityColorClass(priority: number): string {
  switch (priority) {
    case 1:
      return 'bg-p1'
    case 2:
      return 'bg-p2'
    case 3:
      return 'bg-p3'
    default:
      return 'bg-p4/40'
  }
}

export function isDone(task: TaskView): boolean {
  return task.status === 'done'
}

/** Meia-noite do dia da data, no fuso de quem está olhando. */
function startOfLocalDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Diferença em dias inteiros, comparando dias e não instantes. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = startOfLocalDay(new Date(iso))
  const today = startOfLocalDay(now)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/**
 * Texto do prazo em linguagem do dia a dia.
 *
 * "Atrasada 3 dias" comunica muito mais rápido que "12/09" — a data exata só aparece
 * quando o prazo está longe o bastante para o relativo perder o sentido.
 */
export function dueLabel(iso: string, now: Date = new Date()): string {
  const days = daysUntil(iso, now)

  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  if (days === -1) return 'Ontem'
  if (days < -1) return `Atrasada ${Math.abs(days)} dias`
  if (days > 1 && days <= 6) {
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long' })
  }

  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/** Prazo vencido só importa enquanto a tarefa está aberta. */
export function isOverdue(task: TaskView, now: Date = new Date()): boolean {
  if (!task.dueAt || isDone(task)) return false
  return daysUntil(task.dueAt, now) < 0
}

export function timeRangeLabel(task: TaskView): string | null {
  if (!task.scheduledStart || !task.scheduledEnd) return null

  const format = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return `${format(task.scheduledStart)}–${format(task.scheduledEnd)}`
}

export type TaskGroup = { key: string; title: string; tasks: TaskView[] }

/**
 * Agrupa por urgência, na ordem em que a pessoa decide o que fazer:
 * o que está atrasado, o que é de hoje, o que vem depois, e o que não tem data.
 */
export function groupByDue(tasks: TaskView[], now: Date = new Date()): TaskGroup[] {
  const groups: Record<string, TaskView[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    someday: [],
  }

  for (const task of tasks) {
    if (!task.dueAt) {
      groups.someday?.push(task)
      continue
    }

    const days = daysUntil(task.dueAt, now)

    if (days < 0 && !isDone(task)) groups.overdue?.push(task)
    else if (days === 0) groups.today?.push(task)
    else groups.upcoming?.push(task)
  }

  const titles: Record<string, string> = {
    overdue: 'Atrasadas',
    today: 'Hoje',
    upcoming: 'Em breve',
    someday: 'Sem data',
  }

  return Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([key, list]) => ({ key, title: titles[key] ?? key, tasks: list }))
}
