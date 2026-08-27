import { z } from 'zod'
import { hexColorSchema, uuidSchema } from './common.js'

export const createLabelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Dê um nome à etiqueta.')
    .max(60, 'Nome longo demais.')
    // Etiqueta é para filtrar rápido; espaço no meio atrapalha a digitação no console.
    .regex(/^[^\s]+$/, 'A etiqueta não pode ter espaços.'),
  color: hexColorSchema.default('#8E8E93'),
})
export type CreateLabelInput = z.infer<typeof createLabelSchema>

export const updateLabelSchema = createLabelSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Envie ao menos um campo para alterar.',
  })
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>

export const labelViewSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  color: z.string(),
})
export type LabelView = z.infer<typeof labelViewSchema>

export const labelListSchema = z.array(labelViewSchema)
