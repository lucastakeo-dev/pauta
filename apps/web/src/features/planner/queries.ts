import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { eventKeys, listEvents } from '../../entities/event/index.js'
import {
  dayBounds,
  type LaidOutItem,
  layoutOverlaps,
  toPlannerItems,
  weekBounds,
  weekDays,
} from '../../entities/planner/index.js'
import { listTasks, taskKeys } from '../../entities/task/index.js'

/**
 * Tarefas e eventos de uma janela de tempo.
 *
 * As chaves vêm de `entities`, as mesmas usadas pela lista de tarefas — concluir uma
 * tarefa na lista precisa refletir na grade, e é a chave compartilhada que garante isso.
 */
function useWindow(from: string, to: string) {
  // A janela faz o servidor expandir as ocorrências das recorrências.
  const taskQuery = { scheduledFrom: from, scheduledTo: to, rootOnly: false, includeDone: true }

  const tasks = useQuery({
    queryKey: taskKeys.list(taskQuery),
    queryFn: () => listTasks(taskQuery),
  })

  const events = useQuery({
    queryKey: eventKeys.window(from, to),
    queryFn: () => listEvents(from, to),
  })

  return {
    tasks: tasks.data ?? [],
    events: events.data ?? [],
    isPending: tasks.isPending || events.isPending,
    isError: tasks.isError || events.isError,
  }
}

/** Dados de um dia. */
export function useDayPlanner(day: Date): {
  items: LaidOutItem[]
  isPending: boolean
  isError: boolean
} {
  const { start, end } = dayBounds(day)
  const janela = useWindow(start.toISOString(), end.toISOString())

  const items = useMemo(
    // A distribuição em colunas acontece aqui, uma vez, e não dentro de cada bloco:
    // um item só sabe sua coluna olhando todos os outros.
    () => layoutOverlaps(toPlannerItems(janela.tasks, janela.events, day)),
    [janela.tasks, janela.events, day],
  )

  return { items, isPending: janela.isPending, isError: janela.isError }
}

export type PlannerDay = { day: Date; items: LaidOutItem[] }

/**
 * Dados de uma semana, já separados por coluna.
 *
 * Uma consulta só para os sete dias, e não sete consultas: a janela é a mesma que o
 * servidor já sabe expandir, e sete requisições para desenhar uma tela seriam sete
 * chances de a semana aparecer em pedaços.
 */
export function useWeekPlanner(reference: Date): {
  days: PlannerDay[]
  isPending: boolean
  isError: boolean
} {
  const { start, end } = weekBounds(reference)
  const janela = useWindow(start.toISOString(), end.toISOString())

  const days = useMemo(
    () =>
      weekDays(reference).map((day) => ({
        day,
        items: layoutOverlaps(toPlannerItems(janela.tasks, janela.events, day)),
      })),
    [janela.tasks, janela.events, reference],
  )

  return { days, isPending: janela.isPending, isError: janela.isError }
}
