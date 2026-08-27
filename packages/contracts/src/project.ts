import { z } from 'zod'
import { hexColorSchema, uuidSchema } from './common.js'

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao projeto.').max(120, 'Nome longo demais.'),
  color: hexColorSchema.default('#6E7BF2'),
  icon: z.string().trim().max(40).optional(),
})
export type CreateProjectInput = z.infer<typeof createProjectSchema>

export const updateProjectSchema = createProjectSchema
  .partial()
  .extend({
    /** Arquivar tira o projeto das listas sem apagar o histórico das tarefas. */
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Envie ao menos um campo para alterar.',
  })
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

export const projectViewSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  color: z.string(),
  icon: z.string().nullable(),
  position: z.number().int(),
  archivedAt: z.string().nullable(),
  /** Quantas tarefas em aberto — o número que a barra lateral mostra. */
  openTaskCount: z.number().int(),
})
export type ProjectView = z.infer<typeof projectViewSchema>

export const projectListSchema = z.array(projectViewSchema)

/** Reordenação da barra lateral: manda a ordem inteira, não um índice de cada vez. */
export const reorderProjectsSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'Informe a nova ordem dos projetos.'),
})
export type ReorderProjectsInput = z.infer<typeof reorderProjectsSchema>
