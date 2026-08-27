import {
  apiErrorSchema,
  createTaskSchema,
  listTasksQuerySchema,
  reorderTasksSchema,
  taskListSchema,
  taskViewSchema,
  toggleTaskSchema,
  updateTaskSchema,
} from '@pauta/contracts'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import * as taskController from '../controllers/task.controller.js'

/**
 * O `id` aqui é string, não UUID: uma ocorrência de recorrência ainda não
 * materializada é endereçada por `uuid@AAAA-MM-DD`.
 */
const taskParamsSchema = z.object({ id: z.string().min(1) })

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  const route = app.withTypeProvider<ZodTypeProvider>()

  route.addHook('onRequest', app.authenticate)

  route.get(
    '/tasks',
    {
      schema: {
        tags: ['tasks'],
        summary: 'Lista tarefas; com janela de datas, expande as recorrências',
        querystring: listTasksQuerySchema,
        response: { 200: taskListSchema },
      },
    },
    taskController.index,
  )

  route.post(
    '/tasks',
    {
      schema: {
        tags: ['tasks'],
        summary: 'Cria uma tarefa',
        body: createTaskSchema,
        response: { 201: taskViewSchema, 404: apiErrorSchema, 422: apiErrorSchema },
      },
    },
    taskController.store,
  )

  // Antes de `/tasks/:id` — sem isso, "reorder" seria lido como um id.
  route.post(
    '/tasks/reorder',
    {
      schema: {
        tags: ['tasks'],
        summary: 'Grava a nova ordem das tarefas',
        body: reorderTasksSchema,
        response: { 404: apiErrorSchema },
      },
    },
    taskController.reorder,
  )

  route.get(
    '/tasks/:id',
    {
      schema: {
        tags: ['tasks'],
        summary: 'Detalhe de uma tarefa ou ocorrência',
        params: taskParamsSchema,
        response: { 200: taskViewSchema, 404: apiErrorSchema },
      },
    },
    taskController.show,
  )

  route.patch(
    '/tasks/:id',
    {
      schema: {
        tags: ['tasks'],
        summary: 'Edita a tarefa; materializa a ocorrência se for virtual',
        params: taskParamsSchema,
        body: updateTaskSchema,
        response: { 200: taskViewSchema, 404: apiErrorSchema, 422: apiErrorSchema },
      },
    },
    taskController.patch,
  )

  route.post(
    '/tasks/:id/toggle',
    {
      schema: {
        tags: ['tasks'],
        summary: 'Conclui ou reabre a tarefa',
        params: taskParamsSchema,
        body: toggleTaskSchema,
        response: { 200: taskViewSchema, 404: apiErrorSchema },
      },
    },
    taskController.toggle,
  )

  route.delete(
    '/tasks/:id',
    {
      schema: {
        tags: ['tasks'],
        summary: 'Remove a tarefa',
        params: taskParamsSchema,
        response: { 404: apiErrorSchema, 422: apiErrorSchema },
      },
    },
    taskController.destroy,
  )
}
