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
  dayKey,
  durationInMinutes,
  fitBlockInDay,
  fromDateTimeInputs,
  isSameDay,
  snapMinutes,
  timeFromOffset,
  withSameTime,
} from '../../entities/planner/index.js'
import { taskKeys, updateTask } from '../../entities/task/index.js'
import { ApiRequestError } from '../../shared/api/client.js'
import { useToast } from '../../shared/ui/toast.js'

const AVISOS = {
  agendar: { ok: 'Tarefa agendada.', erro: 'Não consegui agendar a tarefa.' },
}

const PREFIXO_ALVO = 'planner-grid'

/**
 * Id do alvo de soltura: um por dia, com a data dentro.
 *
 * É o que faz a semana funcionar sem uma segunda regra de arrastar. Enquanto havia um
 * alvo só, o dia de destino vinha de fora — de quem renderizava a grade — e numa tela
 * com sete colunas essa informação não existe mais em lugar nenhum além do alvo.
 */
export function plannerDropId(day: Date): string {
  return `${PREFIXO_ALVO}:${dayKey(day)}`
}

/** O dia de volta, a partir do id. `null` quando a soltura foi fora de qualquer coluna. */
export function dayFromDropId(id: unknown): Date | null {
  if (typeof id !== 'string' || !id.startsWith(`${PREFIXO_ALVO}:`)) return null

  // Meia-noite local: a mesma conversão dos campos nativos, com o mesmo teste por trás.
  return fromDateTimeInputs(id.slice(PREFIXO_ALVO.length + 1), '00:00')
}

/**
 * O ponteiro precisa andar um pouco antes de virar arrasto. Sem isso, clicar para
 * editar o título de uma tarefa seria interpretado como início de arraste.
 */
const DRAG_ACTIVATION_DISTANCE_PX = 6

type PlannerDndProviderProps = {
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
export function PlannerDndProvider({ hourHeight, children }: PlannerDndProviderProps) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const schedule = useMutation({
    mutationFn: ({ id, start, end }: { id: string; start: Date; end: Date }) =>
      updateTask(id, { scheduledStart: start.toISOString(), scheduledEnd: end.toISOString() }),

    onSuccess: () => toast.success(AVISOS.agendar.ok),

    // Sem isto, um arrasto que falha desfaz o bloco na revalidação e não explica nada.
    onError: (cause) =>
      toast.error(cause instanceof ApiRequestError ? cause.message : AVISOS.agendar.erro),

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

    // O dia vem do alvo, não de fora: na semana, é a coluna que diz onde caiu.
    const day = dayFromDropId(over?.id)
    if (!day) return

    const payload = active.data.current as DragPayload | undefined
    if (!payload || !over) return

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

    // Já estava na grade: o horário se move pelo deslocamento vertical, que preserva
    // onde a pessoa pegou o bloco melhor do que recalcular a partir da borda.
    const mudouDeDia = !isSameDay(payload.startsAt, day)
    const deltaMinutes = snapMinutes((delta.y / hourHeight) * 60)
    if (deltaMinutes === 0 && !mudouDeDia) return

    const movido = new Date(payload.startsAt.getTime() + deltaMinutes * 60_000)

    // Trocar de coluna leva o horário junto: as 14h de terça arrastadas para quinta
    // viram 14h de quinta. Recalcular pela posição do ponteiro perderia o ponto onde
    // o bloco foi pego, e ele saltaria para debaixo do cursor.
    const start = mudouDeDia ? withSameTime(day, movido) : movido

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
