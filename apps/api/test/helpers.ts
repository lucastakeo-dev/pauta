import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import { buildApp } from '../src/app.js'
import { prisma } from '../src/config/prisma.js'

/**
 * Utilitários compartilhados pelos testes de rota.
 *
 * A aplicação é montada com `buildApp()` e exercitada por `app.inject()`: sem abrir
 * porta, sem rede, mas passando por todo o caminho real — validação Zod, middleware
 * de auth, controller, model, banco e view.
 */

const TABLES = [
  'note_links',
  'notes',
  'task_comments',
  'task_labels',
  'tasks',
  'recurrences',
  'labels',
  'projects',
  'events',
  'users',
] as const

/** Zera as tabelas entre testes. TRUNCATE em vez de DELETE para reiniciar sequências. */
export async function resetDatabase(): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
}

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

export async function closeTestApp(app: FastifyInstance): Promise<void> {
  await app.close()
  await prisma.$disconnect()
}

export const validUser = {
  name: 'Takeo',
  email: 'takeo@exemplo.dev',
  password: 'senha-bem-segura',
  timezone: 'America/Sao_Paulo',
}

/** Registra o usuário padrão e devolve o token, para os testes de rota protegida. */
export async function registerAndLogin(app: FastifyInstance): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: validUser,
  })

  return response.json().token
}

/**
 * Cliente amarrado a um usuário. Deixa os testes lerem como o uso real
 * (`ana.post('/tasks', {...})`) e torna trivial montar dois usuários para provar
 * que um não enxerga o dado do outro.
 */
export type Client = {
  get: (url: string) => Promise<LightMyRequestResponse>
  post: (url: string, payload?: unknown) => Promise<LightMyRequestResponse>
  patch: (url: string, payload?: unknown) => Promise<LightMyRequestResponse>
  delete: (url: string) => Promise<LightMyRequestResponse>
}

export async function createClient(app: FastifyInstance, email = validUser.email): Promise<Client> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { ...validUser, email },
  })

  const { token } = response.json()
  const headers = { authorization: `Bearer ${token}` }

  return {
    get: (url) => app.inject({ method: 'GET', url, headers }),
    post: (url, payload) => app.inject({ method: 'POST', url, headers, payload: payload ?? {} }),
    patch: (url, payload) => app.inject({ method: 'PATCH', url, headers, payload: payload ?? {} }),
    delete: (url) => app.inject({ method: 'DELETE', url, headers }),
  }
}

/** Cria uma tarefa e devolve o corpo já parseado — atalho usado em quase todo teste. */
export async function createTask(
  client: Client,
  payload: Record<string, unknown> = {},
): Promise<Record<string, never> & { id: string; [key: string]: unknown }> {
  const response = await client.post('/tasks', { title: 'Tarefa', ...payload })

  if (response.statusCode !== 201) {
    throw new Error(`Falha ao criar tarefa: ${response.statusCode} ${response.body}`)
  }

  return response.json()
}
