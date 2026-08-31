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

/** Cria e já devolve o corpo — a hierarquia exige encadear vários. */
async function projeto(client: Client, name: string, parentId?: string) {
  const response = await client.post('/projects', {
    name,
    ...(parentId ? { parentId } : {}),
  })

  expect(response.statusCode).toBe(201)
  return response.json()
}

describe('hierarquia de projetos', () => {
  it('nasce na raiz quando não recebe pai', async () => {
    const casa = await projeto(ana, 'Casa')

    expect(casa.parentId).toBeNull()
    expect(casa.childCount).toBe(0)
  })

  it('cria dentro de outro projeto', async () => {
    const trabalho = await projeto(ana, 'Trabalho')
    const api = await projeto(ana, 'API pública', trabalho.id)

    expect(api.parentId).toBe(trabalho.id)

    const lista = (await ana.get('/projects')).json()
    const pai = lista.find((p: { id: string }) => p.id === trabalho.id)
    expect(pai.childCount).toBe(1)
  })

  it('aninha em mais de um nível', async () => {
    const a = await projeto(ana, 'Trabalho')
    const b = await projeto(ana, 'Plataforma', a.id)
    const c = await projeto(ana, 'Fase 1', b.id)

    expect(c.parentId).toBe(b.id)
  })

  it('recusa pai de outra pessoa', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const dele = (await bruno.post('/projects', { name: 'Projeto do Bruno' })).json()

    const response = await ana.post('/projects', { name: 'Meu', parentId: dele.id })

    expect(response.statusCode).toBe(404)
  })

  it('irmãos entram no fim da fila, cada pai com sua contagem', async () => {
    const pai = await projeto(ana, 'Trabalho')
    const primeiro = await projeto(ana, 'A', pai.id)
    const segundo = await projeto(ana, 'B', pai.id)

    // A posição é por pai: o primeiro filho começa em 0, mesmo já havendo um projeto
    // na raiz ocupando a posição 0.
    expect(primeiro.position).toBe(0)
    expect(segundo.position).toBe(1)
  })
})

describe('mover projeto', () => {
  it('muda de pai', async () => {
    const trabalho = await projeto(ana, 'Trabalho')
    const pessoal = await projeto(ana, 'Pessoal')
    const saude = await projeto(ana, 'Saúde', trabalho.id)

    const response = await ana.post(`/projects/${saude.id}/move`, { parentId: pessoal.id })

    expect(response.statusCode).toBe(200)
    expect(response.json().parentId).toBe(pessoal.id)
  })

  it('volta para a raiz com parentId nulo', async () => {
    const trabalho = await projeto(ana, 'Trabalho')
    const api = await projeto(ana, 'API pública', trabalho.id)

    const response = await ana.post(`/projects/${api.id}/move`, { parentId: null })

    expect(response.json().parentId).toBeNull()
  })

  it('recusa mover um projeto para dentro de si mesmo', async () => {
    const trabalho = await projeto(ana, 'Trabalho')

    const response = await ana.post(`/projects/${trabalho.id}/move`, { parentId: trabalho.id })

    expect(response.statusCode).toBe(422)
    expect(response.json().code).toBe('project_cycle')
  })

  it('recusa mover um projeto para dentro de um descendente', async () => {
    // Sem esta regra, os três sumiriam da barra lateral sem terem sido apagados.
    const a = await projeto(ana, 'Trabalho')
    const b = await projeto(ana, 'Plataforma', a.id)
    const c = await projeto(ana, 'Fase 1', b.id)

    const response = await ana.post(`/projects/${a.id}/move`, { parentId: c.id })

    expect(response.statusCode).toBe(422)
    expect(response.json().code).toBe('project_cycle')
  })

  it('permite mover para um irmão do próprio pai', async () => {
    const a = await projeto(ana, 'Trabalho')
    const b = await projeto(ana, 'Plataforma', a.id)
    const c = await projeto(ana, 'Produto', a.id)

    const response = await ana.post(`/projects/${b.id}/move`, { parentId: c.id })

    expect(response.statusCode).toBe(200)
  })

  it('recusa mover para pai de outra pessoa', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const dele = (await bruno.post('/projects', { name: 'Projeto do Bruno' })).json()
    const meu = await projeto(ana, 'Meu')

    const response = await ana.post(`/projects/${meu.id}/move`, { parentId: dele.id })

    expect(response.statusCode).toBe(404)
  })
})

describe('apagar projeto com filhos', () => {
  it('promove os filhos à raiz em vez de apagá-los', async () => {
    const trabalho = await projeto(ana, 'Trabalho')
    const api = await projeto(ana, 'API pública', trabalho.id)

    await ana.delete(`/projects/${trabalho.id}`)

    const lista = (await ana.get('/projects')).json()
    const sobrevivente = lista.find((p: { id: string }) => p.id === api.id)

    expect(sobrevivente).toBeDefined()
    expect(sobrevivente.parentId).toBeNull()
  })

  it('as tarefas do filho continuam vinculadas a ele', async () => {
    const trabalho = await projeto(ana, 'Trabalho')
    const api = await projeto(ana, 'API pública', trabalho.id)
    const tarefa = await createTask(ana, { projectId: api.id })

    await ana.delete(`/projects/${trabalho.id}`)

    expect((await ana.get(`/tasks/${tarefa.id}`)).json().projectId).toBe(api.id)
  })
})

describe('edição parcial do projeto', () => {
  it('trocar um campo não repinta o projeto', async () => {
    // `updateProjectSchema` herdava o `.default()` da cor, e `.partial()` não desfaz
    // isso: todo PATCH chegava ao model carregando a cor azul padrão.
    const casa = (await ana.post('/projects', { name: 'Casa', color: '#4FB477' })).json()

    await ana.patch(`/projects/${casa.id}`, { icon: 'coffee' })

    expect((await ana.get('/projects')).json()[0]).toMatchObject({
      color: '#4FB477',
      icon: 'coffee',
    })
  })

  it('recusa PATCH sem campo nenhum', async () => {
    // Pelo mesmo motivo o "envie ao menos um campo" nunca disparava — o corpo vazio
    // já chegava ao refine com uma chave dentro.
    const casa = await projeto(ana, 'Casa')

    expect((await ana.patch(`/projects/${casa.id}`, {})).statusCode).toBe(400)
  })
})
