import { z } from 'zod'
import { hexColorSchema, uuidSchema } from './common.js'

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao projeto.').max(120, 'Nome longo demais.'),
  color: hexColorSchema.default('#6E7BF2'),
  icon: z.string().trim().max(40).optional(),
  /** Projeto que vai conter este. Ausente ou `null` cria na raiz. */
  parentId: uuidSchema.nullish(),
})
export type CreateProjectInput = z.infer<typeof createProjectSchema>

export const updateProjectSchema = createProjectSchema
  .omit({
    // Mover tem rota própria: trocar de pai exige checar ciclo e recalcular a ordem
    // entre irmãos, o que não cabe num PATCH que também renomeia e troca cor.
    parentId: true,
  })
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
  /** Projeto que contém este. `null` = raiz. */
  parentId: uuidSchema.nullable(),
  /** Quantos filhos diretos. A árvore usa para saber se há o que expandir. */
  childCount: z.number().int(),
})
export type ProjectView = z.infer<typeof projectViewSchema>

export const projectListSchema = z.array(projectViewSchema)

/** Reordenação da barra lateral: manda a ordem inteira, não um índice de cada vez. */
export const reorderProjectsSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'Informe a nova ordem dos projetos.'),
})
export type ReorderProjectsInput = z.infer<typeof reorderProjectsSchema>

/**
 * Mover na árvore.
 *
 * Rota própria e não um campo do PATCH porque a operação é outra: além de gravar o novo
 * pai, ela precisa recusar mover um projeto para dentro de um descendente dele — o que
 * desligaria a subárvore inteira da raiz.
 */
export const moveProjectSchema = z.object({
  /** Novo pai. `null` leva para a raiz. */
  parentId: uuidSchema.nullable(),
  /** Posição entre os irmãos. Ausente joga para o fim. */
  position: z.number().int().min(0).optional(),
})
export type MoveProjectInput = z.infer<typeof moveProjectSchema>
