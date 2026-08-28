import { describe, expect, it } from 'vitest'
import { completionFor, findWikiLinkQuery } from './wiki-link.js'

describe('findWikiLinkQuery', () => {
  it('encontra logo após abrir o colchete', () => {
    expect(findWikiLinkQuery('falar com [[')).toEqual({ query: '', start: 10 })
  })

  it('devolve o que já foi digitado', () => {
    expect(findWikiLinkQuery('falar com [[Ca')).toEqual({ query: 'Ca', start: 10 })
  })

  it('aceita espaço no meio do título', () => {
    expect(findWikiLinkQuery('ver [[Casa No')?.query).toBe('Casa No')
  })

  it('para quando o link foi fechado', () => {
    // Cursor logo depois de `]]` não é mais busca.
    expect(findWikiLinkQuery('ver [[Casa]]')).toBeNull()
  })

  it('para no primeiro colchete de fechamento', () => {
    expect(findWikiLinkQuery('ver [[Casa]')).toBeNull()
  })

  it('usa o último [[ quando há dois na linha', () => {
    const resultado = findWikiLinkQuery('ver [[Casa]] e [[Tra')

    expect(resultado?.query).toBe('Tra')
    expect(resultado?.start).toBe(15)
  })

  it('não atravessa quebra de linha', () => {
    // Mesma regra da extração no servidor: link não cruza parágrafo.
    expect(findWikiLinkQuery('ver [[Casa\ne agora')).toBeNull()
  })

  it('colchete triplo abre a busca no último par', () => {
    // Consistente com o servidor: o regex de extração casaria `[[Casa]]` dentro de
    // `[[[Casa]]`, então a busca também deve começar no segundo colchete.
    expect(findWikiLinkQuery('ver [[[')).toEqual({ query: '', start: 5 })
  })

  it('para quando um colchete de abertura aparece no meio do título', () => {
    // `[[Ca[` o servidor não extrairia — a busca também não deve seguir.
    expect(findWikiLinkQuery('ver [[Ca[')).toBeNull()
  })

  it('devolve null sem colchete nenhum', () => {
    expect(findWikiLinkQuery('só um texto')).toBeNull()
    expect(findWikiLinkQuery('')).toBeNull()
  })

  it('colchete simples não abre busca', () => {
    expect(findWikiLinkQuery('ver [Casa')).toBeNull()
  })
})

describe('completionFor', () => {
  it('monta o link completo', () => {
    expect(completionFor('Casa Nova')).toBe('[[Casa Nova]]')
  })
})
