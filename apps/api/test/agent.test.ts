import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { agentTools, runAgentTool } from '../src/lib/agent/tools.js'
import { closeTestApp, createTestApp, resetDatabase, validUser } from './helpers.js'

/**
 * As ferramentas do Agent, sem o modelo no meio.
 *
 * O laço que conversa com a Anthropic precisa de chave e de rede; estas ferramentas
 * não. E é nelas que mora o risco real: elas escrevem no banco da pessoa. Testadas
 * aqui, o que sobra sem cobertura é a interpretação da frase — não o efeito dela.
 */
let app: FastifyInstance
let userId: string

beforeAll(async () => {
  app = await createTestApp()
})

afterAll(async () => {
  await closeTestApp(app)
})

beforeEach(async () => {
  await resetDatabase()

  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: validUser,
  })

  userId = response.json().user.id
})

describe('definições', () => {
  it('descreve as seis ferramentas, cada uma com schema de entrada', () => {
    expect(agentTools.map((tool) => tool.name)).toEqual([
      'listar_tarefas',
      'criar_tarefa',
      'atualizar_tarefa',
      'listar_projetos',
      'criar_projeto',
      'criar_compromisso',
    ])

    for (const tool of agentTools) {
      expect(tool.input_schema.type).toBe('object')
      expect(tool.description?.length ?? 0).toBeGreaterThan(20)
    }
  })

  // A ausência é a decisão: um agente que apaga o projeto errado custa o histórico.
  it('não expõe nenhuma ferramenta que apaga', () => {
    const nomes = agentTools.map((tool) => tool.name).join(' ')

    expect(nomes).not.toMatch(/excluir|apagar|remover|delet/i)
  })
})

describe('criar e consultar', () => {
  it('cria tarefa e devolve o resumo que a pessoa lê', async () => {
    const saida = await runAgentTool(userId, 'criar_tarefa', {
      title: 'Pagar condomínio',
      priority: 1,
    })

    expect(saida.ok).toBe(true)
    expect(saida.resumo).toBe('Criou a tarefa "Pagar condomínio"')

    const lista = await runAgentTool(userId, 'listar_tarefas', {})
    expect(lista.resultado).toHaveLength(1)
  })

  it('cria projeto e compromisso', async () => {
    const projeto = await runAgentTool(userId, 'criar_projeto', { name: 'Casa' })
    expect(projeto.ok).toBe(true)

    const evento = await runAgentTool(userId, 'criar_compromisso', {
      title: 'Reunião',
      startsAt: '2026-09-10T14:00:00.000Z',
      endsAt: '2026-09-10T15:00:00.000Z',
    })

    expect(evento.ok).toBe(true)
    expect(evento.resumo).toContain('Reunião')
  })

  it('filtra por status, que é como o agente enxerga a inbox', async () => {
    await runAgentTool(userId, 'criar_tarefa', { title: 'Capturada', status: 'inbox' })
    await runAgentTool(userId, 'criar_tarefa', { title: 'Decidida', status: 'todo' })

    const inbox = await runAgentTool(userId, 'listar_tarefas', { status: ['inbox'] })

    expect(inbox.resultado).toHaveLength(1)
    expect((inbox.resultado as { title: string }[])[0]?.title).toBe('Capturada')
  })
})

describe('alterar', () => {
  it('processa uma captura: dá projeto e tira da inbox', async () => {
    const projeto = await runAgentTool(userId, 'criar_projeto', { name: 'Casa' })
    await runAgentTool(userId, 'criar_tarefa', { title: 'Trocar filtro', status: 'inbox' })

    const [tarefa] = (await runAgentTool(userId, 'listar_tarefas', { status: ['inbox'] }))
      .resultado as { id: string }[]

    const saida = await runAgentTool(userId, 'atualizar_tarefa', {
      id: tarefa?.id,
      projectId: (projeto.resultado as { id: string }).id,
      status: 'todo',
    })

    expect(saida.ok).toBe(true)
    expect((await runAgentTool(userId, 'listar_tarefas', { status: ['inbox'] })).resultado).toEqual(
      [],
    )
  })

  it('conclui pelo status', async () => {
    await runAgentTool(userId, 'criar_tarefa', { title: 'Ler artigo' })
    const [tarefa] = (await runAgentTool(userId, 'listar_tarefas', {})).resultado as {
      id: string
    }[]

    await runAgentTool(userId, 'atualizar_tarefa', { id: tarefa?.id, status: 'done' })

    const abertas = await runAgentTool(userId, 'listar_tarefas', {})
    expect(abertas.resultado).toEqual([])
  })
})

describe('quando dá errado', () => {
  /*
    O erro volta como resultado, não como exceção: assim o modelo lê o que aconteceu e
    corrige o próprio pedido. Derrubar o turno faria a pessoa reescrever a frase por
    causa de um id errado.
  */
  it('devolve a mensagem do model em vez de estourar', async () => {
    const saida = await runAgentTool(userId, 'atualizar_tarefa', {
      id: '00000000-0000-4000-8000-000000000000',
      title: 'Não existe',
    })

    expect(saida.ok).toBe(false)
    expect(saida.resumo).toMatch(/não encontrad/i)
  })

  it('recusa entrada que não bate com o schema', async () => {
    const saida = await runAgentTool(userId, 'criar_tarefa', { title: '' })

    expect(saida.ok).toBe(false)
  })

  it('não inventa ferramenta', async () => {
    const saida = await runAgentTool(userId, 'apagar_tudo', {})

    expect(saida.ok).toBe(false)
    expect(saida.resumo).toContain('desconhecida')
  })

  it('não vaza dado de outra pessoa', async () => {
    await runAgentTool(userId, 'criar_tarefa', { title: 'Minha' })

    const outro = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { ...validUser, email: 'bruno@exemplo.dev' },
    })

    const lista = await runAgentTool(outro.json().user.id, 'listar_tarefas', {})
    expect(lista.resultado).toEqual([])
  })
})
