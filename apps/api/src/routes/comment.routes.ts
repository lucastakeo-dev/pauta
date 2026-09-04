import {
  apiErrorSchema,
  commentListSchema,
  commentViewSchema,
  createCommentSchema,
  updateCommentSchema,
  uuidSchema,
} from '@pauta/contracts'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import * as commentController from '../controllers/comment.controller.js'

/**
 * O `taskId` é string, não UUID, pelo mesmo motivo das rotas de tarefa: uma ocorrência
 * de recorrência é endereçada por `uuid@AAAA-MM-DD`. O `id` do comentário é UUID de
 * verdade — comentário só existe depois de gravado.
 */
const taskParamsSchema = z.object({ taskId: z.string().min(1) })
const commentParamsSchema = taskParamsSchema.extend({ id: uuidSchema })

export async function commentRoutes(app: FastifyInstance): Promise<void> {
  const route = app.withTypeProvider<ZodTypeProvider>()

  route.addHook('onRequest', app.authenticate)

  route.get(
    '/tasks/:taskId/comments',
    {
      schema: {
        tags: ['comments'],
        summary: 'Lista os comentários da tarefa, do mais antigo para o mais novo',
        params: taskParamsSchema,
        response: { 200: commentListSchema, 404: apiErrorSchema },
      },
    },
    commentController.index,
  )

  route.post(
    '/tasks/:taskId/comments',
    {
      schema: {
        tags: ['comments'],
        summary: 'Comenta na tarefa; materializa a ocorrência se for virtual',
        params: taskParamsSchema,
        body: createCommentSchema,
        response: { 201: commentViewSchema, 404: apiErrorSchema, 422: apiErrorSchema },
      },
    },
    commentController.store,
  )

  route.patch(
    '/tasks/:taskId/comments/:id',
    {
      schema: {
        tags: ['comments'],
        summary: 'Edita o texto do comentário',
        params: commentParamsSchema,
        body: updateCommentSchema,
        response: { 200: commentViewSchema, 404: apiErrorSchema, 422: apiErrorSchema },
      },
    },
    commentController.patch,
  )

  route.delete(
    '/tasks/:taskId/comments/:id',
    {
      schema: {
        tags: ['comments'],
        summary: 'Remove o comentário',
        params: commentParamsSchema,
        response: { 404: apiErrorSchema },
      },
    },
    commentController.destroy,
  )
}
