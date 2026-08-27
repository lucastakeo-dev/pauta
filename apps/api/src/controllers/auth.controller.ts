import type { LoginInput, RegisterInput } from '@pauta/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { UnauthorizedError } from '../lib/errors.js'
import * as userModel from '../models/user.model.js'
import { renderSession, renderUser } from '../views/user.view.js'

/**
 * Controller: lê a request, chama o model, entrega para a view.
 *
 * Sem regra de negócio aqui — decidir se o e-mail já existe ou se a senha confere é
 * trabalho do model. O que é legítimo neste arquivo é o que é HTTP: status code,
 * assinatura do token e leitura do usuário autenticado.
 */

function signToken(request: FastifyRequest, userId: string): string {
  return request.server.jwt.sign({ sub: userId })
}

export async function register(
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply,
) {
  const user = await userModel.register(request.body)
  const token = signToken(request, user.id)

  return reply.status(201).send(renderSession(user, token))
}

export async function login(request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) {
  const { email, password } = request.body
  const user = await userModel.authenticate(email, password)
  const token = signToken(request, user.id)

  return reply.status(200).send(renderSession(user, token))
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const user = await userModel.findById(request.userId)

  // O token é válido, mas a conta sumiu (apagada em outra sessão).
  if (!user) {
    throw new UnauthorizedError()
  }

  return reply.status(200).send(renderUser(user))
}
