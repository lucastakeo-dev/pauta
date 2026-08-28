import { describe, expect, it } from 'vitest'
import { collectText, extractLinkedTitles, normalizeTitle } from '../src/lib/note-links.js'

/** Documento no formato do Tiptap, que é o que o front manda. */
function doc(...paragrafos: string[]) {
  return {
    type: 'doc',
    content: paragrafos.map((texto) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: texto }],
    })),
  }
}

describe('collectText', () => {
  it('junta o texto de um documento aninhado', () => {
    expect(collectText(doc('primeira', 'segunda'))).toEqual(['primeira', 'segunda'])
  })

  it('ignora os campos de estrutura', () => {
    // `type` e `attrs` não são conteúdo; incluí-los criaria links fantasma.
    const node = { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'oi' }] }

    expect(collectText(node)).toEqual(['oi'])
  })

  it('aguenta documento vazio', () => {
    expect(collectText({})).toEqual([])
    expect(collectText(null)).toEqual([])
  })
})

describe('extractLinkedTitles', () => {
  it('acha um link simples', () => {
    expect(extractLinkedTitles(doc('ver [[Casa]] depois'))).toEqual(['Casa'])
  })

  it('acha vários links, na ordem em que aparecem', () => {
    expect(extractLinkedTitles(doc('[[Casa]] e [[Trabalho]]'))).toEqual(['Casa', 'Trabalho'])
  })

  it('atravessa parágrafos', () => {
    expect(extractLinkedTitles(doc('ver [[Casa]]', 'e também [[Trabalho]]'))).toEqual([
      'Casa',
      'Trabalho',
    ])
  })

  it('não repete a mesma nota citada duas vezes', () => {
    // A tabela note_links tem chave composta: duplicar quebraria a inserção.
    expect(extractLinkedTitles(doc('[[Casa]] e de novo [[Casa]]'))).toEqual(['Casa'])
  })

  it('trata variação de acento e caixa como a mesma nota', () => {
    expect(extractLinkedTitles(doc('[[Reunião]] e [[reuniao]]'))).toEqual(['Reunião'])
  })

  it('tira os espaços das bordas', () => {
    expect(extractLinkedTitles(doc('[[  Casa  ]]'))).toEqual(['Casa'])
  })

  it('ignora colchete solto', () => {
    expect(extractLinkedTitles(doc('[[sem fechar'))).toEqual([])
    expect(extractLinkedTitles(doc('[nao é link]'))).toEqual([])
  })

  it('ignora link vazio', () => {
    expect(extractLinkedTitles(doc('[[]] e [[   ]]'))).toEqual([])
  })

  it('não atravessa quebra de linha', () => {
    // Colchete aberto no fim de um parágrafo não deve capturar o parágrafo seguinte.
    expect(extractLinkedTitles(doc('[[Casa', 'Trabalho]]'))).toEqual([])
  })

  it('devolve vazio para nota sem link', () => {
    expect(extractLinkedTitles(doc('só um texto comum'))).toEqual([])
  })
})

describe('normalizeTitle', () => {
  it('iguala acento e caixa', () => {
    expect(normalizeTitle('Reunião')).toBe(normalizeTitle('reuniao'))
    expect(normalizeTitle('  Casa  ')).toBe('casa')
  })
})
