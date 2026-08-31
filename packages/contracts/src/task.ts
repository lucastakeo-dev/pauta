import { z } from 'zod'
import {
  isoDateTimeSchema,
  prioritySchema,
  TASK_STATUSES,
  taskStatusSchema,
  uuidSchema,
} from './common.js'
import { labelViewSchema } from './label.js'

/**
 * Recorrência entra como RRULE (RFC 5545). Aqui validamos só o formato geral —
 * a checagem de verdade (a regra realmente gera datas?) é feita no servidor, que
 * tem o parser. A tela explica, o servidor garante.
 */
export const recurrenceInputSchema = z.object({
  rrule: z
    .string()
    .trim()
    .min(1, 'Informe a regra de repetição.')
    .max(500)
    .regex(/FREQ=/i, 'Regra de repetição inválida.'),
  /** A partir de quando a repetição vale. Sem isso, assume-se agora. */
  anchorAt: isoDateTimeSchema.optional(),
})
export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>

/** Início e fim do bloco andam juntos: ou os dois, ou nenhum, e o fim vem depois. */
const timeBlockRefinement = <T extends { scheduledStart?: unknown; scheduledEnd?: unknown }>(
  value: T,
  ctx: z.RefinementCtx,
) => {
  const { scheduledStart, scheduledEnd } = value

  if ((scheduledStart == null) !== (scheduledEnd == null)) {
    ctx.addIssue({
      code: 'custom',
      path: ['scheduledEnd'],
      message: 'Um bloco de tempo precisa de início e fim.',
    })
    return
  }

  if (
    typeof scheduledStart === 'string' &&
    typeof scheduledEnd === 'string' &&
    new Date(scheduledEnd) <= new Date(scheduledStart)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['scheduledEnd'],
      message: 'O fim precisa vir depois do início.',
    })
  }
}

const taskFields = {
  title: z.string().trim().min(1, 'Dê um título à tarefa.').max(500, 'Título longo demais.'),
  notes: z.string().max(10_000, 'Anotação longa demais.').nullish(),
  status: taskStatusSchema.default('inbox'),
  priority: prioritySchema.default(4),
  dueAt: isoDateTimeSchema.nullish(),
  scheduledStart: isoDateTimeSchema.nullish(),
  scheduledEnd: isoDateTimeSchema.nullish(),
  estimateMin: z.int().positive('A estimativa precisa ser maior que zero.').max(1440).nullish(),
  projectId: uuidSchema.nullish(),
  parentId: uuidSchema.nullish(),
  labelIds: z.array(uuidSchema).max(20, 'Muitas etiquetas numa tarefa só.').default([]),
}

export const createTaskSchema = z
  .object({ ...taskFields, recurrence: recurrenceInputSchema.nullish() })
  .superRefine(timeBlockRefinement)
export type CreateTaskInput = z.infer<typeof createTaskSchema>

export const updateTaskSchema = z
  .object({
    ...taskFields,
    recurrence: recurrenceInputSchema.nullish(),
  })
  .partial()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Envie ao menos um campo para alterar.' })
      return
    }

    // Só validamos o par quando a edição mexe em pelo menos um dos dois.
    if ('scheduledStart' in value || 'scheduledEnd' in value) {
      timeBlockRefinement(value, ctx)
    }
  })
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

/** Concluir/reabrir tem rota própria: é a ação mais frequente do app. */
export const toggleTaskSchema = z.object({
  done: z.boolean(),
})
export type ToggleTaskInput = z.infer<typeof toggleTaskSchema>

export const listTasksQuerySchema = z.object({
  status: z
    .union([taskStatusSchema, z.array(taskStatusSchema)])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    ),
  projectId: uuidSchema.optional(),
  labelId: uuidSchema.optional(),
  parentId: uuidSchema.optional(),
  /** Só tarefas de primeiro nível — o padrão das listas, já que subtask aparece aninhada. */
  rootOnly: z.stringbool().default(true),
  search: z.string().trim().min(1).max(200).optional(),
  dueBefore: isoDateTimeSchema.optional(),
  /** Janela do planner. Quando presente, expande as ocorrências das recorrências. */
  scheduledFrom: isoDateTimeSchema.optional(),
  scheduledTo: isoDateTimeSchema.optional(),
  includeDone: z.stringbool().default(false),
  limit: z.coerce.number().int().min(1).max(500).default(200),
})
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>

export const taskViewSchema = z.object({
  /** UUID normalmente; nas ocorrências geradas é `uuid@AAAA-MM-DD`. */
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  status: z.enum(TASK_STATUSES),
  priority: z.number().int(),
  dueAt: z.string().nullable(),
  scheduledStart: z.string().nullable(),
  scheduledEnd: z.string().nullable(),
  estimateMin: z.number().int().nullable(),
  completedAt: z.string().nullable(),
  projectId: z.string().nullable(),
  project: z
    .object({
      id: z.string(),
      name: z.string(),
      /** Ainda pinta o bloco no planner. A lista e a barra lateral usam o ícone. */
      color: z.string(),
      icon: z.string().nullable(),
    })
    .nullable(),
  parentId: z.string().nullable(),
  labels: z.array(labelViewSchema),
  subtaskCount: z.number().int(),
  completedSubtaskCount: z.number().int(),
  recurrence: z.object({ id: z.string(), rrule: z.string(), summary: z.string() }).nullable(),
  /** Data desta ocorrência, quando a tarefa vem de uma recorrência. */
  occurrenceOn: z.string().nullable(),
  /** `true` quando a ocorrência ainda não existe como linha no banco. */
  isVirtual: z.boolean(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type TaskView = z.infer<typeof taskViewSchema>

export const taskListSchema = z.array(taskViewSchema)

export const reorderTasksSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'Informe a nova ordem das tarefas.'),
})
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>
