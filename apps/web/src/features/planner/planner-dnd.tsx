import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { eventKeys } from '../../entities/event/index.js'
import {
  type DragPayload,
  durationInMinutes,
  fitBlockInDay,
  snapMinutes,
  timeFromOffset,
} from '../../entities/planner/index.js'
import { taskKeys, updateTask } from '../../entities/task/index.js'

/** Id do alvo de soltura — a área de conteúdo da grade. */
export const GRID_DROPPABLE_ID = 'planner-grid'

/**
 * O ponteiro precisa andar um pouco antes de virar arrasto. Sem isso, clicar para
 * editar o título de uma tarefa seria interpretado como início de arraste.
 */
const DRAG_ACTIVATION_DISTANCE_PX = 6

type PlannerDndProviderProps = {
  day: Date
  hourHeight: number
  children: ReactNode
}

/**
 * Coordena o arrastar entre a lista de tarefas e a grade.
 *
 * Mora em `features/planner` — e não na página — porque a regra de "onde isto caiu
 * vira que horário" é do planner. A lista de tarefas não conhece esta feature: ela só
 * publica um `DragPayload` (tipo definido em `entities`), e o dnd-kit faz a ponte.
 */
export function PlannerDndProvider({ day, hourHeight, children }: PlannerDndProviderProps) {
  const queryClient = useQueryClient()

  const schedule = useMutation({
    mutationFn: ({ id, start, end }: { id: string; start: Date; end: Date }) =>
      updateTask(id, { scheduledStart: start.toISOString(), scheduledEnd: end.toISOString() }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
      void queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX },
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over, delta } = event

    if (!over || over.id !== GRID_DROPPABLE_ID) return

    const payload = active.data.current as DragPayload | undefined
    if (!payload) return

    if (payload.kind === 'task') {
      // Veio da lista: o início é onde o PONTEIRO soltou.
      //
      // Usar o retângulo do elemento arrastado erraria por meia altura da alça — e a
      // pessoa mira com o cursor, não com a borda de cima do que está arrastando.
      const activator = event.activatorEvent
      if (!(activator instanceof PointerEvent) && !(activator instanceof MouseEvent)) return

      const pointerY = activator.clientY + delta.y
      const start = timeFromOffset(pointerY - over.rect.top, day, hourHeight)
      const { start: fitted, end } = fitBlockInDay(start, payload.durationMinutes, day)

      schedule.mutate({ id: payload.taskId, start: fitted, end })
      return
    }

    // Já estava na grade: movemos pelo deslocamento, que preserva onde a pessoa pegou
    // o bloco melhor do que recalcular a partir da borda.
    const deltaMinutes = snapMinutes((delta.y / hourHeight) * 60)
    if (deltaMinutes === 0) return

    const start = new Date(payload.startsAt.getTime() + deltaMinutes * 60_000)
    const { start: fitted, end } = fitBlockInDay(
      start,
      durationInMinutes(payload.startsAt, payload.endsAt),
      day,
    )

    schedule.mutate({ id: payload.taskId, start: fitted, end })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  )
}
