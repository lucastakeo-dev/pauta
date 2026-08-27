import {
  apiErrorSchema,
  loginSchema,
  registerSchema,
  sessionViewSchema,
  userViewSchema,
} from '@pauta/contracts'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import * as authController from '../controllers/auth.controller.js'

/**
 * Rotas de autenticação.
 *
 * `/register` e `/login` são públicas por definição — são a porta de entrada.
 * `/me` exige token e serve para o front reidratar a sessão ao abrir o app.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  const route = app.withTypeProvider<ZodTypeProvider>()

  route.post(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Cria a conta e já devolve a sessão',
        body: registerSchema,
        response: {
          201: sessionViewSchema,
          409: apiErrorSchema,
        },
      },
    },
    authController.register,
  )

  route.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Autentica e devolve o token',
        body: loginSchema,
        response: {
          200: sessionViewSchema,
          401: apiErrorSchema,
        },
      },
    },
    authController.login,
  )

  route.get(
    '/auth/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Usuário da sessão atual',
        response: {
          200: userViewSchema,
          401: apiErrorSchema,
        },
      },
    },
    authController.me,
  )
}
