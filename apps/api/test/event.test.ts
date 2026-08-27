import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { type Client, closeTestApp, createClient, createTestApp, resetDatabase } from './helpers.js'

let app: FastifyInstance
let ana: Client

const MANHA = {
  title: 'Reunião de time',
  startsAt: '2026-09-15T12:00:00.000Z',
  endsAt: '2026-09-15T13:00:00.000Z',
}

/** Janela de um dia inteiro, em UTC. */
const DIA = 'from=2026-09-15T00:00:00.000Z&to=2026-09-15T23:59:59.000Z'

beforeAll(async () => {
  app = await createTestApp()
})

afterAll(async () => {
  await closeTestApp(app)
})

beforeEach(async () => {
  await resetDatabase()
  ana = await createClient(app, 'ana@exemplo.dev')
})

describe('criação de evento', () => {
  it('cria com os padrões certos', async () => {
    const response = await ana.post('/events', MANHA)

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      title: MANHA.title,
      allDay: false,
      source: 'internal',
    })
  })

  it('recusa evento que termina antes de começar', async () => {
    const response = await ana.post('/events', {
      ...MANHA,
      startsAt: '2026-09-15T13:00:00.000Z',
      endsAt: '2026-09-15T12:00:00.000Z',
    })

    expect(response.statusCode).toBe(400)
    expect(JSON.stringify(response.json().details)).toContain('depois do início')
  })

  it('recusa título vazio', async () => {
    const response = await ana.post('/events', { ...MANHA, title: '   ' })
    expect(response.statusCode).toBe(400)
  })

  it('não expõe o externalId do sync', async () => {
    const response = await ana.post('/events', MANHA)

    // O campo existe na tabela e é reservado para o Google; a view não o publica.
    expect(response.body).not.toContain('externalId')
    expect(response.body).not.toContain('external_id')
  })
})

describe('listagem por janela', () => {
  it('traz o evento do dia', async () => {
    await ana.post('/events', MANHA)

    const eventos = (await ana.get(`/events?${DIA}`)).json()

    expect(eventos).toHaveLength(1)
    expect(eventos[0].title).toBe(MANHA.title)
  })

  it('ignora evento de outro dia', async () => {
    await ana.post('/events', {
      title: 'Outro dia',
      startsAt: '2026-09-20T12:00:00.000Z',
      endsAt: '2026-09-20T13:00:00.000Z',
    })

    expect((await ana.get(`/events?${DIA}`)).json()).toEqual([])
  })

  it('inclui evento que começou antes e ainda está acontecendo', async () => {
    await ana.post('/events', {
      title: 'Maratona',
      startsAt: '2026-09-14T20:00:00.000Z',
      endsAt: '2026-09-15T04:00:00.000Z',
    })

    // Filtrar só por `startsAt` faria a reunião sumir do dia em que ela ocorre.
    const eventos = (await ana.get(`/events?${DIA}`)).json()

    expect(eventos).toHaveLength(1)
    expect(eventos[0].title).toBe('Maratona')
  })

  it('inclui evento que atravessa a janela inteira', async () => {
    await ana.post('/events', {
      title: 'Viagem',
      startsAt: '2026-09-10T00:00:00.000Z',
      endsAt: '2026-09-20T00:00:00.000Z',
    })

    expect((await ana.get(`/events?${DIA}`)).json()).toHaveLength(1)
  })

  it('devolve em ordem cronológica', async () => {
    await ana.post('/events', { ...MANHA, title: 'Segundo' })
    await ana.post('/events', {
      title: 'Primeiro',
      startsAt: '2026-09-15T09:00:00.000Z',
      endsAt: '2026-09-15T10:00:00.000Z',
    })

    const eventos = (await ana.get(`/events?${DIA}`)).json()

    expect(eventos.map((e: { title: string }) => e.title)).toEqual(['Primeiro', 'Segundo'])
  })

  it('exige a janela', async () => {
    expect((await ana.get('/events')).statusCode).toBe(400)
  })
})

describe('edição', () => {
  it('move o evento no tempo', async () => {
    const evento = (await ana.post('/events', MANHA)).json()

    const body = (
      await ana.patch(`/events/${evento.id}`, {
        startsAt: '2026-09-15T15:00:00.000Z',
        endsAt: '2026-09-15T16:00:00.000Z',
      })
    ).json()

    expect(body.startsAt).toBe('2026-09-15T15:00:00.000Z')
  })

  it('recusa mover só o início para depois do fim atual', async () => {
    const evento = (await ana.post('/events', MANHA)).json()

    // O schema sozinho não pega: só o início foi enviado. Quem compara é o model,
    // que conhece o fim que já está gravado.
    const response = await ana.patch(`/events/${evento.id}`, {
      startsAt: '2026-09-15T20:00:00.000Z',
    })

    expect(response.statusCode).toBe(422)
    expect(response.json().message).toContain('depois do início')
  })

  it('aceita mover só o início para antes do fim atual', async () => {
    const evento = (await ana.post('/events', MANHA)).json()

    const response = await ana.patch(`/events/${evento.id}`, {
      startsAt: '2026-09-15T11:00:00.000Z',
    })

    expect(response.statusCode).toBe(200)
  })
})

describe('propriedade dos dados', () => {
  it('não lista evento de outra pessoa', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    await bruno.post('/events', MANHA)

    expect((await ana.get(`/events?${DIA}`)).json()).toEqual([])
  })

  it('responde 404 ao ler evento alheio', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const dele = (await bruno.post('/events', MANHA)).json()

    expect((await ana.get(`/events/${dele.id}`)).statusCode).toBe(404)
  })

  it('não deixa apagar evento alheio', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const dele = (await bruno.post('/events', MANHA)).json()

    expect((await ana.delete(`/events/${dele.id}`)).statusCode).toBe(404)
    expect((await bruno.get(`/events/${dele.id}`)).statusCode).toBe(200)
  })

  it('exige token', async () => {
    expect((await app.inject({ method: 'GET', url: `/events?${DIA}` })).statusCode).toBe(401)
  })
})

describe('remoção', () => {
  it('remove o evento', async () => {
    const evento = (await ana.post('/events', MANHA)).json()

    expect((await ana.delete(`/events/${evento.id}`)).statusCode).toBe(204)
    expect((await ana.get(`/events/${evento.id}`)).statusCode).toBe(404)
  })
})
