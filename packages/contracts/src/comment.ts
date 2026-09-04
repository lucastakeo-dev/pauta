import { z } from 'zod'

/**
 * Comentário numa tarefa.
 *
 * O corpo é texto puro e nada mais: sem título, sem campos, sem anexo. Um comentário
 * serve para registrar o que mudou em volta da tarefa, e cada campo a mais seria um
 * formulário no caminho de escrever uma frase.
 */
const bodySchema = z
  .string()
  .trim()
  .min(1, 'Escreva o comentário.')
  .max(5000, 'Comentário longo demais.')

export const createCommentSchema = z.object({ body: bodySchema })
export type CreateCommentInput = z.infer<typeof createCommentSchema>

export const updateCommentSchema = z.object({ body: bodySchema })
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>

export const commentViewSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  body: z.string(),
  author: z.object({ id: z.string(), name: z.string() }),
  createdAt: z.string(),
  /** Quando o texto foi reescrito; `null` enquanto ninguém mexeu. */
  editedAt: z.string().nullable(),
})
export type CommentView = z.infer<typeof commentViewSchema>

export const commentListSchema = z.array(commentViewSchema)
