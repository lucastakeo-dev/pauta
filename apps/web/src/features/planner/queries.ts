import { useQuery } from '@tanstack/react-query'
import { eventKeys, listEvents } from '../../entities/event/index.js'
import { dayBounds, type PlannerItem, toPlannerItems } from '../../entities/planner/index.js'
import { listTasks, taskKeys } from '../../entities/task/index.js'

/**
 * Dados do dia mostrado na grade.
 *
 * As chaves vêm de `entities`, as mesmas usadas pela lista de tarefas — concluir uma
 * tarefa na lista precisa refletir na grade, e é a chave compartilhada que garante isso.
 */
export function useDayPlanner(day: Date): {
  items: PlannerItem[]
  isPending: boolean
  isError: boolean
} {
  const { start, end } = dayBounds(day)
  const from = start.toISOString()
  const to = end.toISOString()

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
    items: toPlannerItems(tasks.data ?? [], events.data ?? [], day),
    isPending: tasks.isPending || events.isPending,
    isError: tasks.isError || events.isError,
  }
}
