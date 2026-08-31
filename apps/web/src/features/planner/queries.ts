import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  createEvent,
  deleteEvent,
  eventKeys,
  listEvents,
  updateEvent,
} from '../../entities/event/index.js'
import {
  type AllDayItem,
  dayBounds,
  type LaidOutItem,
  layoutOverlaps,
  toAllDayItems,
  toPlannerItems,
  weekBounds,
  weekDays,
} from '../../entities/planner/index.js'
import { createTask, listTasks, taskKeys } from '../../entities/task/index.js'
import { ApiRequestError } from '../../shared/api/client.js'
import { useToast } from '../../shared/ui/toast.js'

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
  allDay: AllDayItem[]
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

  const allDay = useMemo(
    () => toAllDayItems(janela.tasks, janela.events, day),
    [janela.tasks, janela.events, day],
  )

  return { items, allDay, isPending: janela.isPending, isError: janela.isError }
}

export type PlannerDay = { day: Date; items: LaidOutItem[]; allDay: AllDayItem[] }

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
        allDay: toAllDayItems(janela.tasks, janela.events, day),
      })),
    [janela.tasks, janela.events, reference],
  )

  return { days, isPending: janela.isPending, isError: janela.isError }
}

const AVISOS = {
  event: { ok: 'Compromisso criado.', erro: 'Não consegui criar o compromisso.' },
  task: { ok: 'Tarefa agendada.', erro: 'Não consegui agendar a tarefa.' },
  editar: { ok: 'Compromisso atualizado.', erro: 'Não consegui salvar o compromisso.' },
  excluir: { ok: 'Compromisso excluído.', erro: 'Não consegui excluir o compromisso.' },
}

type NovoNoSlot = {
  kind: 'event' | 'task'
  title: string
  start: Date
  end: Date
}

/**
 * Cria o que foi escrito num horário da grade.
 *
 * Compromisso vira `event`; tarefa nasce **agendada e já processada** (`todo`), e não
 * na inbox: quem escolheu o horário na agenda já decidiu o que a tarefa é, e mandá-la
 * para a fila de captura seria pedir a mesma decisão de novo.
 */
export function useCreateInSlot() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    // Devolve `void`: quem chama só precisa saber que deu certo, e as duas criações
    // respondem formatos diferentes que ninguém aqui lê.
    mutationFn: async ({ kind, title, start, end }: NovoNoSlot) => {
      if (kind === 'event') {
        await createEvent({
          title,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          allDay: false,
        })
        return
      }

      await createTask({
        title,
        status: 'todo',
        priority: 4,
        labelIds: [],
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      })
    },

    onSuccess: (_data, { kind }) => toast.success(AVISOS[kind].ok),

    onError: (cause, { kind }) =>
      toast.error(cause instanceof ApiRequestError ? cause.message : AVISOS[kind].erro),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
      void queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

/** Depois de escrever no calendário, grade e lista podem ter mudado. */
function useInvalidatePlanner() {
  const queryClient = useQueryClient()

  return () => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.all })
    void queryClient.invalidateQueries({ queryKey: eventKeys.all })
  }
}

export function useUpdateEvent() {
  const invalidate = useInvalidatePlanner()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updateEvent(id, { title }),
    onSuccess: () => toast.success(AVISOS.editar.ok),
    onError: (cause) =>
      toast.error(cause instanceof ApiRequestError ? cause.message : AVISOS.editar.erro),
    onSettled: invalidate,
  })
}

/**
 * Excluir o compromisso.
 *
 * Sem isto, criar na grade era um beco sem saída: o compromisso nascia ali e não havia
 * nenhum caminho na interface para desfazê-lo.
 */
export function useDeleteEvent() {
  const invalidate = useInvalidatePlanner()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => toast.success(AVISOS.excluir.ok),
    onError: (cause) =>
      toast.error(cause instanceof ApiRequestError ? cause.message : AVISOS.excluir.erro),
    onSettled: invalidate,
  })
}
