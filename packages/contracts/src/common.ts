import { z } from 'zod'

/**
 * Primitivos e enums do domínio, compartilhados entre API e front.
 * Toda mensagem de validação nasce aqui em pt-BR — a tela não reescreve texto de erro.
 */

export const uuidSchema = z.uuid('Identificador inválido.')

export const isoDateTimeSchema = z.iso.datetime({
  offset: true,
  error: 'Data e hora inválidas.',
})

/** Data sem hora, no formato YYYY-MM-DD — usada pela nota diária. */
export const isoDateSchema = z.iso.date('Data inválida.')

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve estar no formato #RRGGBB.')

export const TASK_STATUSES = ['inbox', 'todo', 'doing', 'done', 'canceled'] as const
export const taskStatusSchema = z.enum(TASK_STATUSES, {
  error: 'Situação da tarefa inválida.',
})
export type TaskStatus = z.infer<typeof taskStatusSchema>

/** 1 = mais urgente, 4 = sem prioridade. Espelha o padrão de P1..P4. */
export const prioritySchema = z
  .int('Prioridade deve ser um número inteiro.')
  .min(1, 'Prioridade vai de 1 a 4.')
  .max(4, 'Prioridade vai de 1 a 4.')

export const EVENT_SOURCES = ['internal', 'google'] as const
export const eventSourceSchema = z.enum(EVENT_SOURCES, {
  error: 'Origem do evento inválida.',
})
export type EventSource = z.infer<typeof eventSourceSchema>

/** Paginação por cursor — estável mesmo com escrita concorrente. */
export const paginationSchema = z.object({
  cursor: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
export type Pagination = z.infer<typeof paginationSchema>

/** Formato único de erro da API. O front sabe ler só este shape. */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.array(z.string())).optional(),
})
export type ApiError = z.infer<typeof apiErrorSchema>
