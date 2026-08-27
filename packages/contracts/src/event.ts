import { z } from 'zod'
import { eventSourceSchema, isoDateTimeSchema, uuidSchema } from './common.js'

/**
 * Evento é compromisso com hora marcada — distinto de tarefa, que é algo a fazer.
 * No planner os dois aparecem na mesma linha do tempo, mas só a tarefa se conclui.
 */

/** O fim vem sempre depois do começo. O banco também garante (`events_range_check`). */
const rangeRefinement = (value: { startsAt?: unknown; endsAt?: unknown }, ctx: z.RefinementCtx) => {
  const { startsAt, endsAt } = value

  if (
    typeof startsAt === 'string' &&
    typeof endsAt === 'string' &&
    new Date(endsAt) <= new Date(startsAt)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'O fim precisa vir depois do início.',
    })
  }
}

const eventFields = {
  title: z.string().trim().min(1, 'Dê um título ao evento.').max(500, 'Título longo demais.'),
  description: z.string().max(10_000, 'Descrição longa demais.').nullish(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  allDay: z.boolean().default(false),
  location: z.string().max(500, 'Local longo demais.').nullish(),
}

export const createEventSchema = z.object(eventFields).superRefine(rangeRefinement)
export type CreateEventInput = z.infer<typeof createEventSchema>

export const updateEventSchema = z
  .object(eventFields)
  .partial()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Envie ao menos um campo para alterar.' })
      return
    }

    // Só compara quando a edição manda os dois; mandar um só é validado no model,
    // que conhece o valor atual do outro.
    rangeRefinement(value, ctx)
  })
export type UpdateEventInput = z.infer<typeof updateEventSchema>

export const listEventsQuerySchema = z.object({
  from: isoDateTimeSchema,
  to: isoDateTimeSchema,
})
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>

export const eventViewSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  allDay: z.boolean(),
  location: z.string().nullable(),
  /** `internal` hoje; `google` quando o sync existir. */
  source: eventSourceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type EventView = z.infer<typeof eventViewSchema>

export const eventListSchema = z.array(eventViewSchema)
