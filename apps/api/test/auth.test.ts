import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  closeTestApp,
  createTestApp,
  registerAndLogin,
  resetDatabase,
  validUser,
} from './helpers.js'

let app: FastifyInstance

beforeAll(async () => {
  app = await createTestApp()
})

afterAll(async () => {
  await closeTestApp(app)
})

beforeEach(async () => {
  await resetDatabase()
})

describe('POST /auth/register', () => {
  it('cria a conta e já devolve a sessão', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: validUser })

    expect(response.statusCode).toBe(201)

    const body = response.json()
    expect(body.token).toBeTypeOf('string')
    expect(body.user).toMatchObject({ name: validUser.name, email: validUser.email })
  })

  it('nunca devolve o hash da senha', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: validUser })

    // A view monta o JSON campo a campo — este teste é o alarme se alguém trocar
    // isso por um spread do registro do banco.
    expect(response.body).not.toContain('passwordHash')
    expect(response.body).not.toContain('password_hash')
    expect(response.json().user).not.toHaveProperty('passwordHash')
  })

  it('recusa e-mail já cadastrado com 409', async () => {
    await app.inject({ method: 'POST', url: '/auth/register', payload: validUser })
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: validUser })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ code: 'email_taken' })
  })

  it('normaliza o e-mail antes de gravar', async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { ...validUser, email: '  TAKEO@Exemplo.DEV  ' },
    })

    // Sem normalização, o mesmo e-mail digitado de dois jeitos viraria duas contas.
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: validUser })
    expect(response.statusCode).toBe(409)
  })

  it('rejeita senha curta com mensagem em pt-BR', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { ...validUser, password: '123' },
    })

    expect(response.statusCode).toBe(400)

    const body = response.json()
    expect(body.code).toBe('validation_error')
    expect(JSON.stringify(body.details)).toContain('8 caracteres')
  })

  it('rejeita e-mail malformado', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { ...validUser, email: 'nao-e-email' },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await app.inject({ method: 'POST', url: '/auth/register', payload: validUser })
  })

  it('autentica com credenciais corretas', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: validUser.email, password: validUser.password },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().token).toBeTypeOf('string')
  })

  it('devolve a mesma resposta para senha errada e para e-mail inexistente', async () => {
    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: validUser.email, password: 'senha-errada-mesmo' },
    })

    const unknownEmail = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ninguem@exemplo.dev', password: 'senha-errada-mesmo' },
    })

    // Respostas distintas revelariam quais e-mails têm conta.
    expect(wrongPassword.statusCode).toBe(401)
    expect(unknownEmail.statusCode).toBe(401)
    expect(wrongPassword.json()).toEqual(unknownEmail.json())
  })
})

describe('GET /auth/me', () => {
  it('devolve o usuário da sessão', async () => {
    const token = await registerAndLogin(app)

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ email: validUser.email })
  })

  it('recusa requisição sem token', async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/me' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ code: 'unauthorized' })
  })

  it('recusa token adulterado', async () => {
    const token = await registerAndLogin(app)

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}corrompido` },
    })

    expect(response.statusCode).toBe(401)
  })
})

describe('infraestrutura', () => {
  it('responde no /health', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('devolve 404 no formato ApiError', async () => {
    const response = await app.inject({ method: 'GET', url: '/rota-que-nao-existe' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ code: 'route_not_found' })
  })
})
