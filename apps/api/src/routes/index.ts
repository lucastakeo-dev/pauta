import type { FastifyInstance } from 'fastify'
import { agentRoutes } from './agent.routes.js'
import { authRoutes } from './auth.routes.js'
import { eventRoutes } from './event.routes.js'
import { labelRoutes } from './label.routes.js'
import { noteRoutes } from './note.routes.js'
import { projectRoutes } from './project.routes.js'
import { taskRoutes } from './task.routes.js'

/**
 * Registro único das rotas. Todo grupo novo entra aqui — é o índice do que a API
 * expõe e o lugar para conferir de relance o que é público e o que exige token.
 *
 * Públicas: `/health` e as de `auth`. Todo o resto aplica `app.authenticate`.
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', { schema: { tags: ['meta'], summary: 'Liveness check' } }, async () => ({
    status: 'ok',
  }))

  await app.register(authRoutes)
  await app.register(projectRoutes)
  await app.register(labelRoutes)
  await app.register(eventRoutes)
  await app.register(taskRoutes)
  await app.register(noteRoutes)
  await app.register(agentRoutes)
}
