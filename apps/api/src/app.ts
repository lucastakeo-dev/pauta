import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import Fastify, { type FastifyInstance } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from './config/env.js'
import { authenticate } from './middlewares/authenticate.js'
import { registerErrorHandler } from './middlewares/error-handler.js'
import { registerRoutes } from './routes/index.js'

/**
 * Monta a aplicação sem subir o servidor.
 *
 * A separação existe para os testes: o Vitest usa `app.inject()` sobre esta instância,
 * sem abrir porta nem depender de rede.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { level: 'info', transport: { target: 'pino-pretty' } }
        : env.NODE_ENV === 'test'
          ? false
          : { level: 'info' },
  }).withTypeProvider<ZodTypeProvider>()

  // Zod passa a ser a fonte única: valida a entrada e serializa a saída.
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  registerErrorHandler(app)

  // Os métodos são declarados explicitamente: o padrão do plugin não inclui PATCH, e
  // sem isto o preflight recusa toda edição de tarefa — falha que só aparece no
  // navegador, porque `app.inject()` dos testes não passa por CORS.
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization'],
  })

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })

  // Declarado antes das rotas para que `onRequest: [app.authenticate]` exista quando elas montarem.
  app.decorate('authenticate', authenticate)
  app.decorateRequest('userId', '')

  await app.register(registerRoutes)

  return app
}
