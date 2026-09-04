import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  type Client,
  closeTestApp,
  createClient,
  createTask,
  createTestApp,
  resetDatabase,
} from './helpers.js'

let app: FastifyInstance
let ana: Client

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

async function comentar(client: Client, taskId: string, body: string) {
  const response = await client.post(`/tasks/${taskId}/comments`, { body })

  if (response.statusCode !== 201) {
    throw new Error(`Falha ao comentar: ${response.statusCode} ${response.body}`)
  }

  return response.json()
}

describe('criação de comentário', () => {
  it('grava o texto, o autor e nasce sem edição', async () => {
    const task = await createTask(ana)

    const response = await ana.post(`/tasks/${task.id}/comments`, { body: 'Cliente adiou.' })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      taskId: task.id,
      body: 'Cliente adiou.',
      author: { name: 'Takeo' },
      editedAt: null,
    })
  })

  it('recusa comentário vazio', async () => {
    const task = await createTask(ana)

    const response = await ana.post(`/tasks/${task.id}/comments`, { body: '   ' })

    expect(response.statusCode).toBe(400)
    expect(JSON.stringify(response.json().details)).toContain('Escreva o comentário')
  })

  it('recusa texto longo demais', async () => {
    const task = await createTask(ana)

    const response = await ana.post(`/tasks/${task.id}/comments`, { body: 'x'.repeat(5001) })

    expect(response.statusCode).toBe(400)
  })

  it('apara o espaço em volta', async () => {
    const task = await createTask(ana)
    const comment = await comentar(ana, task.id, '  com espaço  ')

    expect(comment.body).toBe('com espaço')
  })
})

describe('leitura', () => {
  it('lista do mais antigo para o mais novo', async () => {
    const task = await createTask(ana)

    await comentar(ana, task.id, 'primeiro')
    await comentar(ana, task.id, 'segundo')
    await comentar(ana, task.id, 'terceiro')

    const response = await ana.get(`/tasks/${task.id}/comments`)

    expect(response.statusCode).toBe(200)
    expect(response.json().map((item: { body: string }) => item.body)).toEqual([
      'primeiro',
      'segundo',
      'terceiro',
    ])
  })

  it('não mistura o comentário de outra tarefa', async () => {
    const uma = await createTask(ana, { title: 'Uma' })
    const outra = await createTask(ana, { title: 'Outra' })

    await comentar(ana, uma.id, 'da primeira')

    const response = await ana.get(`/tasks/${outra.id}/comments`)

    expect(response.json()).toEqual([])
  })
})

describe('edição', () => {
  it('reescreve o corpo e carimba a edição', async () => {
    const task = await createTask(ana)
    const comment = await comentar(ana, task.id, 'texto antigo')

    const response = await ana.patch(`/tasks/${task.id}/comments/${comment.id}`, {
      body: 'texto novo',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().body).toBe('texto novo')
    expect(response.json().editedAt).not.toBeNull()
  })

  it('recusa o comentário de outra tarefa pela URL', async () => {
    const uma = await createTask(ana, { title: 'Uma' })
    const outra = await createTask(ana, { title: 'Outra' })
    const comment = await comentar(ana, uma.id, 'da primeira')

    const response = await ana.patch(`/tasks/${outra.id}/comments/${comment.id}`, { body: 'x' })

    expect(response.statusCode).toBe(404)
  })
})

describe('remoção', () => {
  it('apaga o comentário', async () => {
    const task = await createTask(ana)
    const comment = await comentar(ana, task.id, 'some')

    const response = await ana.delete(`/tasks/${task.id}/comments/${comment.id}`)

    expect(response.statusCode).toBe(204)
    expect((await ana.get(`/tasks/${task.id}/comments`)).json()).toEqual([])
  })

  it('some junto com a tarefa', async () => {
    const task = await createTask(ana)
    await comentar(ana, task.id, 'some junto')

    await ana.delete(`/tasks/${task.id}`)

    expect((await ana.get(`/tasks/${task.id}/comments`)).statusCode).toBe(404)
  })
})

describe('isolamento entre pessoas', () => {
  it('não lê nem comenta na tarefa de outra pessoa', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const task = await createTask(ana)

    expect((await bruno.get(`/tasks/${task.id}/comments`)).statusCode).toBe(404)
    expect((await bruno.post(`/tasks/${task.id}/comments`, { body: 'oi' })).statusCode).toBe(404)
  })

  it('não apaga o comentário de outra pessoa', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const task = await createTask(ana)
    const comment = await comentar(ana, task.id, 'meu')

    const response = await bruno.delete(`/tasks/${task.id}/comments/${comment.id}`)

    expect(response.statusCode).toBe(404)
    expect((await ana.get(`/tasks/${task.id}/comments`)).json()).toHaveLength(1)
  })
})

describe('ocorrência de recorrência', () => {
  const RECORRENTE = {
    title: 'Reunião semanal',
    recurrence: { rrule: 'FREQ=WEEKLY;BYDAY=MO', anchorAt: '2026-09-07T12:00:00.000Z' },
  }

  it('lista vazio sem materializar a ocorrência', async () => {
    const molde = await createTask(ana, RECORRENTE)
    const virtualId = `${molde.id}@2026-09-14`

    const response = await ana.get(`/tasks/${virtualId}/comments`)

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([])

    // A leitura não pode ter criado linha: a ocorrência continua virtual.
    const detalhe = await ana.get(`/tasks/${virtualId}`)
    expect(detalhe.json().isVirtual).toBe(true)
  })

  it('comentar materializa a ocorrência, e o comentário fica nela', async () => {
    const molde = await createTask(ana, RECORRENTE)
    const virtualId = `${molde.id}@2026-09-14`

    const comment = await comentar(ana, virtualId, 'adiantar em uma hora')

    // O comentário nasce na linha da ocorrência, não no molde que a gera.
    expect(comment.taskId).not.toBe(molde.id)
    expect((await ana.get(`/tasks/${molde.id}/comments`)).json()).toEqual([])
    expect((await ana.get(`/tasks/${virtualId}/comments`)).json()).toHaveLength(1)
  })

  it('recusa data que não é ocorrência da regra', async () => {
    const molde = await createTask(ana, RECORRENTE)

    // 2026-09-15 é uma terça; a regra é toda segunda.
    const response = await ana.post(`/tasks/${molde.id}@2026-09-15/comments`, { body: 'x' })

    expect(response.statusCode).toBe(404)
  })
})
