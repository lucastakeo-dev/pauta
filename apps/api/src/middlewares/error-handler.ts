import type { ApiError } from '@pauta/contracts'
import type { FastifyError, FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { env } from '../config/env.js'
import { isDomainError } from '../lib/errors.js'

/**
 * Tradutor único de erro para HTTP. Toda resposta de erro da API sai no mesmo shape
 * (`ApiError`), então o front só precisa saber ler um formato.
 *
 * Erro cru do Prisma nunca chega ao cliente: a mensagem original costuma trazer nome
 * de tabela, coluna e trecho de query.
 */

/** Erros do Prisma são detectados pelo formato, não pelo tipo: importar `@prisma/client`
 *  aqui quebraria a regra de que só o model conhece o ORM. */
function isPrismaError(error: unknown): error is { code: string; meta?: unknown } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'clientVersion' in error &&
    typeof (error as { code: unknown }).code === 'string'
  )
}

/** Códigos do Prisma que representam conflito real de dados e merecem 409. */
const PRISMA_CONFLICT_CODES = new Set(['P2002', 'P2003', 'P2014'])

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((fastifyError: FastifyError, request, reply) => {
    // As type guards abaixo recebem `unknown` e, ao estreitar, apagariam o tipo do
    // Fastify para os casos 4 e 5. Por isso testamos num alias e guardamos o original.
    const error: unknown = fastifyError

    // 1. Erro de validação do Zod: o corpo não bate com o contrato.
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details: Record<string, string[]> = {}

      for (const issue of error.validation) {
        const field = issue.instancePath.replace(/^\//, '') || 'body'
        details[field] = [...(details[field] ?? []), issue.message ?? 'Valor inválido.']
      }

      const body: ApiError = {
        code: 'validation_error',
        message: 'Alguns campos precisam de atenção.',
        details,
      }
      return reply.status(400).send(body)
    }

    // 2. Erro de domínio: previsto, com mensagem já escrita para a pessoa ler.
    if (isDomainError(error)) {
      const body: ApiError = {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      }
      return reply.status(error.httpStatus).send(body)
    }

    // 3. Erro do Prisma que escapou do model — respondemos genérico e registramos.
    if (isPrismaError(error)) {
      request.log.error({ err: error }, 'erro do prisma não tratado pelo model')

      const conflict = PRISMA_CONFLICT_CODES.has(error.code)
      const body: ApiError = conflict
        ? { code: 'conflict', message: 'Esta operação conflita com um dado já existente.' }
        : { code: 'internal_error', message: 'Algo deu errado. Tente novamente.' }

      return reply.status(conflict ? 409 : 500).send(body)
    }

    // 4. Erros que o próprio Fastify classifica (payload grande, JSON malformado...).
    const status = fastifyError.statusCode ?? 500

    if (status < 500) {
      const body: ApiError = {
        code: fastifyError.code ?? 'bad_request',
        message: fastifyError.message,
      }
      return reply.status(status).send(body)
    }

    // 5. Desconhecido: log completo do lado do servidor, resposta opaca do lado de fora.
    request.log.error({ err: fastifyError }, 'erro não tratado')

    const body: ApiError = {
      code: 'internal_error',
      message: 'Algo deu errado. Tente novamente.',
      ...(env.NODE_ENV === 'development' ? { details: { debug: [fastifyError.message] } } : {}),
    }
    return reply.status(500).send(body)
  })

  app.setNotFoundHandler((request, reply) => {
    const body: ApiError = {
      code: 'route_not_found',
      message: `Rota não encontrada: ${request.method} ${request.url}`,
    }
    return reply.status(404).send(body)
  })
}
