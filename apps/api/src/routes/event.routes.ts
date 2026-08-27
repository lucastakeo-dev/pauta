import {
  apiErrorSchema,
  createEventSchema,
  eventListSchema,
  eventViewSchema,
  listEventsQuerySchema,
  updateEventSchema,
  uuidSchema,
} from '@pauta/contracts'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import * as eventController from '../controllers/event.controller.js'

const paramsSchema = z.object({ id: uuidSchema })

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  const route = app.withTypeProvider<ZodTypeProvider>()

  route.addHook('onRequest', app.authenticate)

  route.get(
    '/events',
    {
      schema: {
        tags: ['events'],
        summary: 'Eventos que cruzam a janela informada',
        querystring: listEventsQuerySchema,
        response: { 200: eventListSchema },
      },
    },
    eventController.index,
  )

  route.post(
    '/events',
    {
      schema: {
        tags: ['events'],
        summary: 'Cria um evento',
        body: createEventSchema,
        response: { 201: eventViewSchema },
      },
    },
    eventController.store,
  )

  route.get(
    '/events/:id',
    {
      schema: {
        tags: ['events'],
        summary: 'Detalhe do evento',
        params: paramsSchema,
        response: { 200: eventViewSchema, 404: apiErrorSchema },
      },
    },
    eventController.show,
  )

  route.patch(
    '/events/:id',
    {
      schema: {
        tags: ['events'],
        summary: 'Edita o evento',
        params: paramsSchema,
        body: updateEventSchema,
        response: { 200: eventViewSchema, 404: apiErrorSchema, 422: apiErrorSchema },
      },
    },
    eventController.patch,
  )

  route.delete(
    '/events/:id',
    {
      schema: {
        tags: ['events'],
        summary: 'Remove o evento',
        params: paramsSchema,
        response: { 404: apiErrorSchema },
      },
    },
    eventController.destroy,
  )
}
