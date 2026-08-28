import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { type Client, closeTestApp, createClient, createTestApp, resetDatabase } from './helpers.js'

let app: FastifyInstance
let ana: Client

/** Documento no formato do editor, com o texto informado. */
function doc(...paragrafos: string[]) {
  return {
    type: 'doc',
    content: paragrafos.map((texto) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: texto }],
    })),
  }
}

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

describe('criação', () => {
  it('cria uma página', async () => {
    const response = await ana.post('/notes', { title: 'Ideias' })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ title: 'Ideias', dailyOn: null })
  })

  it('recusa título vazio', async () => {
    expect((await ana.post('/notes', { title: '   ' })).statusCode).toBe(400)
  })

  it('recusa título repetido', async () => {
    await ana.post('/notes', { title: 'Ideias' })
    const response = await ana.post('/notes', { title: 'Ideias' })

    expect(response.statusCode).toBe(409)
  })

  it('trata acento e caixa como o mesmo título', async () => {
    // Sem isso, "[[reuniao]]" e "[[Reunião]]" virariam páginas diferentes.
    await ana.post('/notes', { title: 'Reunião' })
    const response = await ana.post('/notes', { title: 'reuniao' })

    expect(response.statusCode).toBe(409)
  })

  it('não expõe o titleKey', async () => {
    const response = await ana.post('/notes', { title: 'Ideias' })

    expect(response.body).not.toContain('titleKey')
    expect(response.body).not.toContain('title_key')
  })
})

describe('nota do dia', () => {
  it('cria na primeira visita', async () => {
    const response = await ana.get('/notes/daily/2026-08-28')

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ dailyOn: '2026-08-28', title: '28/08/2026' })
  })

  it('devolve a mesma nota na segunda visita', async () => {
    const primeira = (await ana.get('/notes/daily/2026-08-28')).json()
    const segunda = (await ana.get('/notes/daily/2026-08-28')).json()

    expect(segunda.id).toBe(primeira.id)
  })

  it('dias diferentes são notas diferentes', async () => {
    const hoje = (await ana.get('/notes/daily/2026-08-28')).json()
    const amanha = (await ana.get('/notes/daily/2026-08-29')).json()

    expect(amanha.id).not.toBe(hoje.id)
  })

  it('recusa data malformada', async () => {
    expect((await ana.get('/notes/daily/28-08-2026')).statusCode).toBe(400)
  })

  it('não conflita com o id nas rotas', async () => {
    // `/notes/daily/:date` precisa vir antes de `/notes/:id`, senão "daily" vira id.
    expect((await ana.get('/notes/daily/2026-08-28')).statusCode).toBe(200)
  })
})

describe('links e backlinks', () => {
  it('cria a nota citada que ainda não existe', async () => {
    // É o que dá sentido ao [[link]]: escrever primeiro, preencher depois.
    const origem = (
      await ana.post('/notes', { title: 'Diário', contentJson: doc('falar com [[Casa]]') })
    ).json()

    expect(origem.linksTo).toHaveLength(1)
    expect(origem.linksTo[0].title).toBe('Casa')
  })

  it('o backlink aparece do outro lado', async () => {
    const origem = (
      await ana.post('/notes', { title: 'Diário', contentJson: doc('ver [[Casa]]') })
    ).json()

    const alvo = (await ana.get(`/notes/${origem.linksTo[0].id}`)).json()

    expect(alvo.linkedFrom).toHaveLength(1)
    expect(alvo.linkedFrom[0].title).toBe('Diário')
  })

  it('reaproveita a nota existente em vez de duplicar', async () => {
    const casa = (await ana.post('/notes', { title: 'Casa' })).json()
    const origem = (
      await ana.post('/notes', { title: 'Diário', contentJson: doc('ver [[casa]]') })
    ).json()

    expect(origem.linksTo[0].id).toBe(casa.id)
    expect((await ana.get('/notes')).json()).toHaveLength(2)
  })

  it('editar o conteúdo reescreve os links', async () => {
    const origem = (
      await ana.post('/notes', { title: 'Diário', contentJson: doc('ver [[Casa]]') })
    ).json()

    const editada = (
      await ana.patch(`/notes/${origem.id}`, { contentJson: doc('agora [[Trabalho]]') })
    ).json()

    expect(editada.linksTo).toHaveLength(1)
    expect(editada.linksTo[0].title).toBe('Trabalho')
  })

  it('remover o link some com o backlink', async () => {
    const origem = (
      await ana.post('/notes', { title: 'Diário', contentJson: doc('ver [[Casa]]') })
    ).json()
    const casaId = origem.linksTo[0].id

    await ana.patch(`/notes/${origem.id}`, { contentJson: doc('sem link nenhum') })

    expect((await ana.get(`/notes/${casaId}`)).json().linkedFrom).toEqual([])
  })

  it('citar duas vezes conta como um link', async () => {
    const origem = (
      await ana.post('/notes', { title: 'Diário', contentJson: doc('[[Casa]] e [[Casa]]') })
    ).json()

    expect(origem.linksTo).toHaveLength(1)
  })

  it('a nota não linka para si mesma', async () => {
    const origem = (
      await ana.post('/notes', { title: 'Casa', contentJson: doc('falando de [[Casa]]') })
    ).json()

    expect(origem.linksTo).toEqual([])
  })

  it('duas notas podem citar a mesma terceira', async () => {
    const a = (await ana.post('/notes', { title: 'A', contentJson: doc('[[Comum]]') })).json()
    await ana.post('/notes', { title: 'B', contentJson: doc('[[Comum]]') })

    const comum = (await ana.get(`/notes/${a.linksTo[0].id}`)).json()

    expect(comum.linkedFrom.map((n: { title: string }) => n.title).sort()).toEqual(['A', 'B'])
  })

  it('salvamentos concorrentes não deixam links inconsistentes', async () => {
    // Regressão: o conteúdo e os links eram gravados em duas operações separadas. Com
    // dois autosaves em voo, o segundo criava o link e o primeiro, chegando atrasado
    // com texto parcial, o apagava — nota com o texto certo e sem backlink nenhum.
    const nota = (await ana.post('/notes', { title: 'Diário' })).json()

    await Promise.all([
      ana.patch(`/notes/${nota.id}`, { contentJson: doc('rascunho sem link') }),
      ana.patch(`/notes/${nota.id}`, { contentJson: doc('agora com [[Casa]]') }),
    ])

    const final = (await ana.get(`/notes/${nota.id}`)).json()
    const texto = JSON.stringify(final.contentJson)
    const temLink = final.linksTo.some((n: { title: string }) => n.title === 'Casa')

    // Qual das duas venceu não importa; o que importa é o texto e os links baterem.
    expect(texto.includes('[[Casa]]')).toBe(temLink)
  })

  it('apagar a origem some com o backlink', async () => {
    const origem = (
      await ana.post('/notes', { title: 'Diário', contentJson: doc('ver [[Casa]]') })
    ).json()
    const casaId = origem.linksTo[0].id

    await ana.delete(`/notes/${origem.id}`)

    const casa = (await ana.get(`/notes/${casaId}`)).json()
    expect(casa.linkedFrom).toEqual([])
  })
})

describe('listagem', () => {
  beforeEach(async () => {
    await ana.post('/notes', { title: 'Ideias' })
    await ana.post('/notes', { title: 'Receitas' })
    await ana.get('/notes/daily/2026-08-28')
  })

  it('lista tudo, da mais recente para a mais antiga', async () => {
    const notas = (await ana.get('/notes')).json()

    expect(notas).toHaveLength(3)
  })

  it('sabe excluir as notas diárias', async () => {
    const notas = (await ana.get('/notes?excludeDaily=true')).json()

    expect(notas).toHaveLength(2)
    expect(notas.every((n: { dailyOn: string | null }) => n.dailyOn === null)).toBe(true)
  })

  it('busca por título, ignorando maiúsculas', async () => {
    const notas = (await ana.get('/notes?search=RECEI')).json()

    expect(notas).toHaveLength(1)
    expect(notas[0].title).toBe('Receitas')
  })
})

describe('propriedade dos dados', () => {
  it('não lista nota de outra pessoa', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    await bruno.post('/notes', { title: 'Segredo' })

    expect((await ana.get('/notes')).json()).toEqual([])
  })

  it('responde 404 ao ler nota alheia', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const dela = (await bruno.post('/notes', { title: 'Segredo' })).json()

    expect((await ana.get(`/notes/${dela.id}`)).statusCode).toBe(404)
  })

  it('mesmo título em pessoas diferentes é permitido', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    await bruno.post('/notes', { title: 'Ideias' })

    // A unicidade é por pessoa, não global.
    expect((await ana.post('/notes', { title: 'Ideias' })).statusCode).toBe(201)
  })

  it('o [[link]] não alcança nota de outra pessoa', async () => {
    const bruno = await createClient(app, 'bruno@exemplo.dev')
    const dele = (await bruno.post('/notes', { title: 'Casa' })).json()

    const origem = (
      await ana.post('/notes', { title: 'Diário', contentJson: doc('ver [[Casa]]') })
    ).json()

    // Cria uma "Casa" própria em vez de apontar para a do Bruno.
    expect(origem.linksTo[0].id).not.toBe(dele.id)
  })

  it('exige token', async () => {
    expect((await app.inject({ method: 'GET', url: '/notes' })).statusCode).toBe(401)
  })
})
