import { agentAskSchema, apiErrorSchema } from '@pauta/contracts'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import * as agentController from '../controllers/agent.controller.js'

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  const route = app.withTypeProvider<ZodTypeProvider>()

  route.addHook('onRequest', app.authenticate)

  route.post(
    '/agent/ask',
    {
      schema: {
        tags: ['agent'],
        summary: 'Conversa com o Agent; responde em SSE',
        body: agentAskSchema,
        // A resposta é `text/event-stream`, escrita direto no socket — não há schema de
        // corpo para declarar aqui além do erro de quando o Agent não está configurado.
        response: { 503: apiErrorSchema },
      },
    },
    agentController.ask,
  )
}
