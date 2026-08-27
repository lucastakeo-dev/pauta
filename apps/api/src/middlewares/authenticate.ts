import type { FastifyReply, FastifyRequest } from 'fastify'
import { UnauthorizedError } from '../lib/errors.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string }
    user: { sub: string }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Dono dos dados da request. Todo model filtra por ele — é a fronteira dos dados. */
    userId: string
  }
  interface FastifyInstance {
    authenticate: typeof authenticate
  }
}

/**
 * Aplicado como `onRequest` em toda rota não-pública.
 *
 * Deixa `request.userId` pronto para os controllers, de modo que nenhum controller
 * precise mexer em token. Rotas públicas são a exceção listável: health, auth e docs.
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    throw new UnauthorizedError()
  }

  const subject = request.user?.sub

  if (!subject) {
    throw new UnauthorizedError()
  }

  request.userId = subject
}
