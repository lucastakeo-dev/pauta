import {
  apiErrorSchema,
  createNoteSchema,
  dailyNoteParamsSchema,
  listNotesQuerySchema,
  noteListSchema,
  noteViewSchema,
  updateNoteSchema,
  uuidSchema,
} from '@pauta/contracts'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import * as noteController from '../controllers/note.controller.js'

const paramsSchema = z.object({ id: uuidSchema })

export async function noteRoutes(app: FastifyInstance): Promise<void> {
  const route = app.withTypeProvider<ZodTypeProvider>()

  route.addHook('onRequest', app.authenticate)

  route.get(
    '/notes',
    {
      schema: {
        tags: ['notes'],
        summary: 'Lista notas, da mais recente para a mais antiga',
        querystring: listNotesQuerySchema,
        response: { 200: noteListSchema },
      },
    },
    noteController.index,
  )

  route.post(
    '/notes',
    {
      schema: {
        tags: ['notes'],
        summary: 'Cria uma página',
        body: createNoteSchema,
        response: { 201: noteViewSchema, 409: apiErrorSchema },
      },
    },
    noteController.store,
  )

  // Antes de `/notes/:id` — senão "daily" seria lido como um id.
  route.get(
    '/notes/daily/:date',
    {
      schema: {
        tags: ['notes'],
        summary: 'Abre a nota do dia, criando na primeira visita',
        params: dailyNoteParamsSchema,
        response: { 200: noteViewSchema },
      },
    },
    noteController.daily,
  )

  route.get(
    '/notes/:id',
    {
      schema: {
        tags: ['notes'],
        summary: 'Detalhe da nota, com links e backlinks',
        params: paramsSchema,
        response: { 200: noteViewSchema, 404: apiErrorSchema },
      },
    },
    noteController.show,
  )

  route.patch(
    '/notes/:id',
    {
      schema: {
        tags: ['notes'],
        summary: 'Edita a nota e reescreve seus links',
        params: paramsSchema,
        body: updateNoteSchema,
        response: { 200: noteViewSchema, 404: apiErrorSchema, 409: apiErrorSchema },
      },
    },
    noteController.patch,
  )

  route.delete(
    '/notes/:id',
    {
      schema: {
        tags: ['notes'],
        summary: 'Remove a nota',
        params: paramsSchema,
        response: { 404: apiErrorSchema },
      },
    },
    noteController.destroy,
  )
}
