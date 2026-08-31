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

describe('criação de tarefa', () => {
  it('cria com os padrões certos', async () => {
    const response = await ana.post('/tasks', { title: 'Comprar café' })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      title: 'Comprar café',
      status: 'inbox',
      priority: 4,
      isVirtual: false,
      labels: [],
      subtaskCount: 0,
    })
  })

  it('recusa título vazio', async () => {
    const response = await ana.post('/tasks', { title: '   ' })

    expect(response.statusCode).toBe(400)
    expect(JSON.stringify(response.json().details)).toContain('título')
  })

  it('aceita um bloco de tempo completo', async () => {
    const task = await createTask(ana, {
      scheduledStart: '2026-09-01T12:00:00.000Z',
      scheduledEnd: '2026-09-01T13:00:00.000Z',
    })

    expect(task.scheduledStart).toBe('2026-09-01T12:00:00.000Z')
  })

  it('recusa bloco pela metade', async () => {
    const response = await ana.post('/tasks', {
      title: 'x',
      scheduledStart: '2026-09-01T12:00:00.000Z',
    })

    expect(response.statusCode).toBe(400)
    expect(JSON.stringify(response.json().details)).toContain('início e fim')
  })

  it('recusa bloco invertido', async () => {
    const response = await ana.post('/tasks', {
      title: 'x',
      scheduledStart: '2026-09-01T13:00:00.000Z',
      scheduledEnd: '2026-09-01T12:00:00.000Z',
    })

    expect(response.statusCode).toBe(400)
    expect(JSON.stringify(response.json().details)).toContain('depois do início')
  })

  it('recusa prioridade fora de 1..4', async () => {
    const response = await ana.post('/tasks', { title: 'x', priority: 9 })
    expect(response.statusCode).toBe(400)
  })
})

describe('propriedade dos dados', () => {
  it('não lista tarefa de outra pessoa', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    await createTask(bruno, { title: 'Segredo do Bruno' })

    const response = await ana.get('/tasks')

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([])
  })

  it('responde 404 ao ler tarefa alheia', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const dele = await createTask(bruno)

    const response = await ana.get(`/tasks/${dele.id}`)

    // 404 e não 403: dizer "existe mas não é sua" já entregaria informação.
    expect(response.statusCode).toBe(404)
  })

  it('não deixa editar tarefa alheia', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const dele = await createTask(bruno)

    const response = await ana.patch(`/tasks/${dele.id}`, { title: 'invadida' })

    expect(response.statusCode).toBe(404)
  })

  it('não deixa vincular projeto de outra pessoa', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const projeto = (await bruno.post('/projects', { name: 'Projeto do Bruno' })).json()

    const response = await ana.post('/tasks', { title: 'x', projectId: projeto.id })

    expect(response.statusCode).toBe(404)
  })

  it('não deixa vincular etiqueta de outra pessoa', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const etiqueta = (await bruno.post('/labels', { name: 'dele' })).json()

    const response = await ana.post('/tasks', { title: 'x', labelIds: [etiqueta.id] })

    expect(response.statusCode).toBe(404)
  })
})

describe('subtarefas', () => {
  it('cria subtarefa e conta na tarefa pai', async () => {
    const pai = await createTask(ana, { title: 'Mudança' })
    await createTask(ana, { title: 'Comprar caixas', parentId: pai.id })
    await createTask(ana, { title: 'Contratar frete', parentId: pai.id })

    const response = await ana.get(`/tasks/${pai.id}`)

    expect(response.json()).toMatchObject({ subtaskCount: 2, completedSubtaskCount: 0 })
  })

  it('conta as subtarefas concluídas', async () => {
    const pai = await createTask(ana, { title: 'Mudança' })
    const filha = await createTask(ana, { title: 'Caixas', parentId: pai.id })

    await ana.post(`/tasks/${filha.id}/toggle`, { done: true })

    expect((await ana.get(`/tasks/${pai.id}`)).json()).toMatchObject({
      subtaskCount: 1,
      completedSubtaskCount: 1,
    })
  })

  it('esconde subtarefas da lista raiz', async () => {
    const pai = await createTask(ana, { title: 'Mudança' })
    await createTask(ana, { title: 'Caixas', parentId: pai.id })

    const raiz = (await ana.get('/tasks')).json()

    expect(raiz).toHaveLength(1)
    expect(raiz[0].title).toBe('Mudança')
  })

  it('lista as subtarefas quando pedidas', async () => {
    const pai = await createTask(ana, { title: 'Mudança' })
    await createTask(ana, { title: 'Caixas', parentId: pai.id })

    const filhas = (await ana.get(`/tasks?parentId=${pai.id}`)).json()

    expect(filhas).toHaveLength(1)
    expect(filhas[0].title).toBe('Caixas')
  })

  it('recusa subtarefa de subtarefa', async () => {
    const pai = await createTask(ana)
    const filha = await createTask(ana, { parentId: pai.id })

    const response = await ana.post('/tasks', { title: 'neta', parentId: filha.id })

    expect(response.statusCode).toBe(422)
    expect(response.json().message).toContain('Subtarefa não pode ter subtarefa')
  })

  it('recusa tarefa como subtarefa de si mesma', async () => {
    const tarefa = await createTask(ana)

    const response = await ana.patch(`/tasks/${tarefa.id}`, { parentId: tarefa.id })

    expect(response.statusCode).toBe(422)
  })
})

describe('concluir e reabrir', () => {
  it('concluir marca status e carimbo juntos', async () => {
    const tarefa = await createTask(ana)

    const body = (await ana.post(`/tasks/${tarefa.id}/toggle`, { done: true })).json()

    expect(body.status).toBe('done')
    expect(body.completedAt).not.toBeNull()
  })

  it('reabrir limpa o carimbo', async () => {
    const tarefa = await createTask(ana)
    await ana.post(`/tasks/${tarefa.id}/toggle`, { done: true })

    const body = (await ana.post(`/tasks/${tarefa.id}/toggle`, { done: false })).json()

    expect(body.status).toBe('todo')
    expect(body.completedAt).toBeNull()
  })

  it('esconde concluídas da lista por padrão', async () => {
    const tarefa = await createTask(ana)
    await ana.post(`/tasks/${tarefa.id}/toggle`, { done: true })

    expect((await ana.get('/tasks')).json()).toEqual([])
    expect((await ana.get('/tasks?includeDone=true')).json()).toHaveLength(1)
  })

  it('mudar o status pela edição também acerta o carimbo', async () => {
    const tarefa = await createTask(ana)

    const body = (await ana.patch(`/tasks/${tarefa.id}`, { status: 'done' })).json()

    expect(body.completedAt).not.toBeNull()
  })
})

describe('filtros', () => {
  beforeEach(async () => {
    const projeto = (await ana.post('/projects', { name: 'Casa' })).json()
    const etiqueta = (await ana.post('/labels', { name: 'urgente' })).json()

    await createTask(ana, { title: 'Pintar parede', projectId: projeto.id })
    await createTask(ana, { title: 'Ligar para o dentista', labelIds: [etiqueta.id] })
    await createTask(ana, { title: 'Ler artigo', status: 'doing' })
  })

  it('filtra por projeto', async () => {
    const projetos = (await ana.get('/projects')).json()
    const tarefas = (await ana.get(`/tasks?projectId=${projetos[0].id}`)).json()

    expect(tarefas).toHaveLength(1)
    expect(tarefas[0].title).toBe('Pintar parede')
  })

  it('filtra por etiqueta', async () => {
    const etiquetas = (await ana.get('/labels')).json()
    const tarefas = (await ana.get(`/tasks?labelId=${etiquetas[0].id}`)).json()

    expect(tarefas).toHaveLength(1)
    expect(tarefas[0].title).toBe('Ligar para o dentista')
  })

  it('filtra por status', async () => {
    const tarefas = (await ana.get('/tasks?status=doing')).json()

    expect(tarefas).toHaveLength(1)
    expect(tarefas[0].title).toBe('Ler artigo')
  })

  it('busca por título, ignorando maiúsculas', async () => {
    const tarefas = (await ana.get('/tasks?search=DENTISTA')).json()

    expect(tarefas).toHaveLength(1)
    expect(tarefas[0].title).toBe('Ligar para o dentista')
  })
})

describe('janela do planner', () => {
  const JANELA =
    'scheduledFrom=2026-09-15T00:00:00.000Z&scheduledTo=2026-09-15T23:59:59.000Z&includeDone=true'

  it('traz o bloco que cai na janela', async () => {
    await createTask(ana, {
      title: 'Reunião',
      scheduledStart: '2026-09-15T12:00:00.000Z',
      scheduledEnd: '2026-09-15T13:00:00.000Z',
    })

    const janela = (await ana.get(`/tasks?${JANELA}`)).json()

    expect(janela.map((t: { title: string }) => t.title)).toEqual(['Reunião'])
  })

  // O calendário desenha prazo na faixa de dia inteiro. Enquanto a janela filtrava só
  // por `scheduledStart`, a tarefa que vence no dia nunca chegava à tela.
  it('traz também o que vence na janela, sem hora marcada', async () => {
    await createTask(ana, { title: 'Pagar condomínio', dueAt: '2026-09-15T12:00:00.000Z' })

    const janela = (await ana.get(`/tasks?${JANELA}`)).json()

    expect(janela.map((t: { title: string }) => t.title)).toEqual(['Pagar condomínio'])
  })

  it('deixa de fora prazo e bloco de outro dia', async () => {
    await createTask(ana, { title: 'Vence depois', dueAt: '2026-09-20T12:00:00.000Z' })
    await createTask(ana, {
      title: 'Agendada depois',
      scheduledStart: '2026-09-20T12:00:00.000Z',
      scheduledEnd: '2026-09-20T13:00:00.000Z',
    })

    const janela = (await ana.get(`/tasks?${JANELA}`)).json()

    expect(janela).toEqual([])
  })

  it('não repete a tarefa que tem bloco e prazo na mesma janela', async () => {
    await createTask(ana, {
      title: 'Revisar contrato',
      dueAt: '2026-09-15T23:00:00.000Z',
      scheduledStart: '2026-09-15T12:00:00.000Z',
      scheduledEnd: '2026-09-15T13:00:00.000Z',
    })

    const janela = (await ana.get(`/tasks?${JANELA}`)).json()

    expect(janela).toHaveLength(1)
  })
})

describe('recorrência', () => {
  const JANELA = 'scheduledFrom=2026-09-01T00:00:00.000Z&scheduledTo=2026-09-30T23:59:59.000Z'

  async function criarSemanal() {
    return createTask(ana, {
      title: 'Reunião semanal',
      scheduledStart: '2026-09-01T12:00:00.000Z',
      scheduledEnd: '2026-09-01T13:00:00.000Z',
      recurrence: { rrule: 'FREQ=WEEKLY;BYDAY=TU' },
    })
  }

  it('guarda a regra e devolve a descrição em pt-BR', async () => {
    const tarefa = await criarSemanal()

    expect(tarefa.recurrence).toMatchObject({ summary: 'toda terça' })
  })

  it('recusa regra de repetição inválida', async () => {
    const response = await ana.post('/tasks', {
      title: 'x',
      recurrence: { rrule: 'FREQ=NUNCA' },
    })

    // 422, não 400: o formato passa no schema (tem "FREQ="), quem recusa é o model,
    // que tenta parsear a regra de verdade.
    expect(response.statusCode).toBe(422)
    expect(response.json().code).toBe('validation_error')
  })

  it('expande as ocorrências dentro da janela', async () => {
    await criarSemanal()

    const tarefas = (await ana.get(`/tasks?${JANELA}`)).json()

    // Cinco terças em setembro de 2026.
    expect(tarefas).toHaveLength(5)
    expect(tarefas.every((t: { isVirtual: boolean }) => t.isVirtual)).toBe(true)
  })

  it('mantém a hora do bloco em cada ocorrência', async () => {
    await criarSemanal()

    const tarefas = (await ana.get(`/tasks?${JANELA}`)).json()

    expect(tarefas[1].scheduledStart).toBe('2026-09-08T12:00:00.000Z')
    expect(tarefas[1].scheduledEnd).toBe('2026-09-08T13:00:00.000Z')
  })

  it('não mostra o molde da recorrência dentro da janela', async () => {
    await criarSemanal()

    const tarefas = (await ana.get(`/tasks?${JANELA}`)).json()

    // O molde apareceria como não-virtual e duplicaria a primeira ocorrência.
    expect(tarefas.filter((t: { isVirtual: boolean }) => !t.isVirtual)).toEqual([])
  })

  it('sem janela, mostra o molde uma vez só', async () => {
    await criarSemanal()

    const tarefas = (await ana.get('/tasks')).json()

    expect(tarefas).toHaveLength(1)
    expect(tarefas[0].isVirtual).toBe(false)
  })

  it('concluir uma ocorrência materializa só aquela', async () => {
    await criarSemanal()
    const antes = (await ana.get(`/tasks?${JANELA}`)).json()

    const concluida = (await ana.post(`/tasks/${antes[1].id}/toggle`, { done: true })).json()

    expect(concluida.isVirtual).toBe(false)
    expect(concluida.status).toBe('done')
    expect(concluida.occurrenceOn).toBe('2026-09-08')

    // As outras quatro continuam virtuais e em aberto.
    const depois = (await ana.get(`/tasks?${JANELA}`)).json()
    expect(depois).toHaveLength(4)
    expect(depois.every((t: { isVirtual: boolean }) => t.isVirtual)).toBe(true)
  })

  it('a ocorrência materializada não vira duplicata na janela', async () => {
    await criarSemanal()
    const antes = (await ana.get(`/tasks?${JANELA}`)).json()

    await ana.patch(`/tasks/${antes[2].id}`, { title: 'Reunião adiada' })

    const depois = (await ana.get(`/tasks?${JANELA}&includeDone=true`)).json()

    expect(depois).toHaveLength(5)
    expect(depois.filter((t: { title: string }) => t.title === 'Reunião adiada')).toHaveLength(1)
  })

  it('recusa ocorrência numa data que a regra não gera', async () => {
    const tarefa = await criarSemanal()

    // 2026-09-09 é quarta; a regra é toda terça.
    const response = await ana.post(`/tasks/${tarefa.id}@2026-09-09/toggle`, { done: true })

    expect(response.statusCode).toBe(404)
  })

  it('não deixa materializar ocorrência de tarefa alheia', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const dele = await createTask(bruno, {
      title: 'Dele',
      recurrence: { rrule: 'FREQ=DAILY' },
    })

    const response = await ana.post(`/tasks/${dele.id}@2026-09-08/toggle`, { done: true })

    expect(response.statusCode).toBe(404)
  })
})

describe('remoção', () => {
  it('remove a tarefa', async () => {
    const tarefa = await createTask(ana)

    expect((await ana.delete(`/tasks/${tarefa.id}`)).statusCode).toBe(204)
    expect((await ana.get(`/tasks/${tarefa.id}`)).statusCode).toBe(404)
  })

  it('remover a tarefa pai leva as subtarefas junto', async () => {
    const pai = await createTask(ana)
    const filha = await createTask(ana, { parentId: pai.id })

    await ana.delete(`/tasks/${pai.id}`)

    expect((await ana.get(`/tasks/${filha.id}`)).statusCode).toBe(404)
  })

  it('explica que não dá para apagar uma ocorrência solta', async () => {
    const tarefa = await createTask(ana, { recurrence: { rrule: 'FREQ=DAILY' } })
    const janela = (
      await ana.get(
        '/tasks?scheduledFrom=2026-01-01T00:00:00.000Z&scheduledTo=2027-01-01T00:00:00.000Z',
      )
    ).json()

    const alvo = janela.find((t: { isVirtual: boolean }) => t.isVirtual) ?? {
      id: `${tarefa.id}@2026-09-08`,
    }
    const response = await ana.delete(`/tasks/${alvo.id}`)

    expect(response.statusCode).toBe(422)
    expect(response.json().message).toContain('apague a tarefa que a gera')
  })
})

describe('projetos', () => {
  it('conta as tarefas em aberto', async () => {
    const projeto = (await ana.post('/projects', { name: 'Casa' })).json()
    const t1 = await createTask(ana, { projectId: projeto.id })
    await createTask(ana, { projectId: projeto.id })
    await ana.post(`/tasks/${t1.id}/toggle`, { done: true })

    const projetos = (await ana.get('/projects')).json()

    expect(projetos[0].openTaskCount).toBe(1)
  })

  it('recusa dois projetos com o mesmo nome', async () => {
    await ana.post('/projects', { name: 'Casa' })
    const response = await ana.post('/projects', { name: 'Casa' })

    expect(response.statusCode).toBe(409)
  })

  it('apagar o projeto devolve as tarefas para a inbox, sem apagá-las', async () => {
    const projeto = (await ana.post('/projects', { name: 'Casa' })).json()
    const tarefa = await createTask(ana, { projectId: projeto.id })

    await ana.delete(`/projects/${projeto.id}`)

    const body = (await ana.get(`/tasks/${tarefa.id}`)).json()
    expect(body.projectId).toBeNull()
  })

  it('arquivar tira o projeto da lista padrão', async () => {
    const projeto = (await ana.post('/projects', { name: 'Casa' })).json()

    await ana.patch(`/projects/${projeto.id}`, { archived: true })

    expect((await ana.get('/projects')).json()).toEqual([])
    expect((await ana.get('/projects?includeArchived=true')).json()).toHaveLength(1)
  })
})

describe('etiquetas', () => {
  it('recusa etiqueta com espaço', async () => {
    const response = await ana.post('/labels', { name: 'muito urgente' })

    expect(response.statusCode).toBe(400)
    expect(JSON.stringify(response.json().details)).toContain('espaços')
  })

  it('substitui as etiquetas na edição', async () => {
    const a = (await ana.post('/labels', { name: 'casa' })).json()
    const b = (await ana.post('/labels', { name: 'trabalho' })).json()
    const tarefa = await createTask(ana, { labelIds: [a.id] })

    const body = (await ana.patch(`/tasks/${tarefa.id}`, { labelIds: [b.id] })).json()

    expect(body.labels).toHaveLength(1)
    expect(body.labels[0].name).toBe('trabalho')
  })

  it('apagar a etiqueta desfaz o vínculo sem apagar a tarefa', async () => {
    const etiqueta = (await ana.post('/labels', { name: 'casa' })).json()
    const tarefa = await createTask(ana, { labelIds: [etiqueta.id] })

    await ana.delete(`/labels/${etiqueta.id}`)

    const body = (await ana.get(`/tasks/${tarefa.id}`)).json()
    expect(body.labels).toEqual([])
  })
})

describe('edição parcial da tarefa', () => {
  /*
    Regressão de perda de dado. `updateTaskSchema` nascia dos mesmos campos da criação,
    onde `status`, `priority` e `labelIds` têm `.default()`. `.partial()` torna o campo
    opcional mas **não** remove o padrão — então todo PATCH chegava ao model com os três
    definidos, e mexer só no título desfazia o resto.
  */
  it('mexer só no título não mexe em mais nada', async () => {
    const etiqueta = (await ana.post('/labels', { name: 'urgente' })).json()
    const tarefa = await createTask(ana, {
      title: 'Antes',
      status: 'todo',
      priority: 1,
      labelIds: [etiqueta.id],
    })

    const body = (await ana.patch(`/tasks/${tarefa.id}`, { title: 'Depois' })).json()

    expect(body.title).toBe('Depois')
    expect(body.status).toBe('todo')
    expect(body.priority).toBe(1)
    expect(body.labels.map((l: { name: string }) => l.name)).toEqual(['urgente'])
  })

  it('editar uma tarefa concluída não a reabre', async () => {
    // `status` arrasta o carimbo de conclusão junto: com o padrão vazando, renomear
    // uma tarefa pronta a devolvia para a inbox e apagava o `completedAt`.
    const tarefa = await createTask(ana, { title: 'Feita' })
    await ana.post(`/tasks/${tarefa.id}/toggle`, { done: true })

    const body = (await ana.patch(`/tasks/${tarefa.id}`, { title: 'Feita mesmo' })).json()

    expect(body.status).toBe('done')
    expect(body.completedAt).not.toBeNull()
  })

  it('ainda dá para limpar as etiquetas de propósito', async () => {
    // A distinção que o conserto precisa preservar: ausente é "não mexa", lista vazia
    // é "apague todas".
    const etiqueta = (await ana.post('/labels', { name: 'casa' })).json()
    const tarefa = await createTask(ana, { labelIds: [etiqueta.id] })

    expect((await ana.patch(`/tasks/${tarefa.id}`, { labelIds: [] })).json().labels).toEqual([])
  })

  it('recusa PATCH sem campo nenhum', async () => {
    const tarefa = await createTask(ana, {})

    expect((await ana.patch(`/tasks/${tarefa.id}`, {})).statusCode).toBe(400)
  })

  it('a criação continua com os padrões', async () => {
    const body = (await ana.post('/tasks', { title: 'Nova' })).json()

    expect(body).toMatchObject({ status: 'inbox', priority: 4 })
    expect(body.labels).toEqual([])
  })
})

describe('autenticação', () => {
  it('todas as rotas de tarefa exigem token', async () => {
    for (const [method, url] of [
      ['GET', '/tasks'],
      ['POST', '/tasks'],
      ['GET', '/projects'],
      ['POST', '/labels'],
    ] as const) {
      const response = await app.inject({ method, url, payload: {} })
      expect(response.statusCode, `${method} ${url}`).toBe(401)
    }
  })
})
