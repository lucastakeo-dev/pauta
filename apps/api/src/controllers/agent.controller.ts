import type { AgentAskInput, AgentEvent } from '@pauta/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../config/env.js'
import { runAgent } from '../lib/agent/run.js'

/**
 * O turno do agente, em SSE.
 *
 * Streaming e não JSON de uma vez porque o turno pode levar dezenas de segundos: sem o
 * texto saindo aos poucos, a tela ficaria parada num spinner sem saber se algo está
 * acontecendo. E as ferramentas viram evento assim que rodam, então a pessoa vê o que
 * mudou antes mesmo da frase final.
 */
export async function ask(request: FastifyRequest<{ Body: AgentAskInput }>, reply: FastifyReply) {
  if (!env.ANTHROPIC_API_KEY) {
    return reply.status(503).send({
      code: 'agent_unavailable',
      message: 'O Agent precisa de uma ANTHROPIC_API_KEY configurada no servidor.',
    })
  }

  reply.raw.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    // Sem isto, um proxy pode segurar o corpo inteiro e o streaming vira uma entrega só.
    'x-accel-buffering': 'no',
  })

  const emitir = (evento: AgentEvent) => {
    reply.raw.write(`data: ${JSON.stringify(evento)}\n\n`)
  }

  const { erro } = await runAgent({
    userId: request.userId,
    messages: request.body.messages,
    timezone: request.body.timezone,
    emitir,
  })

  // A pessoa já recebeu a versão legível do erro; o motivo cru fica no log, que é de
  // quem vai investigar.
  if (erro) request.log.error({ err: erro }, 'agent falhou')

  emitir({ type: 'fim' })
  reply.raw.end()
}
