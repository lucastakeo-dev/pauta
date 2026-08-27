import {
  apiErrorSchema,
  createLabelSchema,
  labelListSchema,
  labelViewSchema,
  updateLabelSchema,
  uuidSchema,
} from '@pauta/contracts'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import * as labelController from '../controllers/label.controller.js'

const paramsSchema = z.object({ id: uuidSchema })

export async function labelRoutes(app: FastifyInstance): Promise<void> {
  const route = app.withTypeProvider<ZodTypeProvider>()

  route.addHook('onRequest', app.authenticate)

  route.get(
    '/labels',
    {
      schema: { tags: ['labels'], summary: 'Lista etiquetas', response: { 200: labelListSchema } },
    },
    labelController.index,
  )

  route.post(
    '/labels',
    {
      schema: {
        tags: ['labels'],
        summary: 'Cria uma etiqueta',
        body: createLabelSchema,
        response: { 201: labelViewSchema, 409: apiErrorSchema },
      },
    },
    labelController.store,
  )

  route.patch(
    '/labels/:id',
    {
      schema: {
        tags: ['labels'],
        summary: 'Edita uma etiqueta',
        params: paramsSchema,
        body: updateLabelSchema,
        response: { 200: labelViewSchema, 404: apiErrorSchema, 409: apiErrorSchema },
      },
    },
    labelController.patch,
  )

  route.delete(
    '/labels/:id',
    {
      schema: {
        tags: ['labels'],
        summary: 'Remove a etiqueta e seus vínculos',
        params: paramsSchema,
        response: { 404: apiErrorSchema },
      },
    },
    labelController.destroy,
  )
}
