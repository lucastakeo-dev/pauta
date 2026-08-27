import {
  apiErrorSchema,
  createProjectSchema,
  projectListSchema,
  projectViewSchema,
  reorderProjectsSchema,
  updateProjectSchema,
  uuidSchema,
} from '@pauta/contracts'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import * as projectController from '../controllers/project.controller.js'

const paramsSchema = z.object({ id: uuidSchema })

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  const route = app.withTypeProvider<ZodTypeProvider>()

  route.addHook('onRequest', app.authenticate)

  route.get(
    '/projects',
    {
      schema: {
        tags: ['projects'],
        summary: 'Lista projetos com a contagem de tarefas em aberto',
        querystring: z.object({ includeArchived: z.stringbool().default(false) }),
        response: { 200: projectListSchema },
      },
    },
    projectController.index,
  )

  route.post(
    '/projects',
    {
      schema: {
        tags: ['projects'],
        summary: 'Cria um projeto',
        body: createProjectSchema,
        response: { 201: projectViewSchema, 409: apiErrorSchema },
      },
    },
    projectController.store,
  )

  route.post(
    '/projects/reorder',
    {
      schema: {
        tags: ['projects'],
        summary: 'Grava a nova ordem da barra lateral',
        body: reorderProjectsSchema,
        response: { 200: projectListSchema, 404: apiErrorSchema },
      },
    },
    projectController.reorder,
  )

  route.patch(
    '/projects/:id',
    {
      schema: {
        tags: ['projects'],
        summary: 'Edita ou arquiva um projeto',
        params: paramsSchema,
        body: updateProjectSchema,
        response: { 200: projectViewSchema, 404: apiErrorSchema, 409: apiErrorSchema },
      },
    },
    projectController.patch,
  )

  route.delete(
    '/projects/:id',
    {
      schema: {
        tags: ['projects'],
        summary: 'Remove o projeto; as tarefas voltam para a inbox',
        params: paramsSchema,
        response: { 404: apiErrorSchema },
      },
    },
    projectController.destroy,
  )
}
