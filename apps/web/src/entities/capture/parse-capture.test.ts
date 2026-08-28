import { describe, expect, it } from 'vitest'
import { describeDraft, parseCapture } from './parse-capture.js'

/** Quinta-feira, 27 de agosto de 2026, 14:00. */
const REF = new Date(2026, 7, 27, 14, 0, 0, 0)

describe('parseCapture', () => {
  it('separa tudo de uma linha completa', () => {
    const draft = parseCapture('almoço com a Ana amanhã 13h #pessoal @Casa p2', REF)

    expect(draft.title).toBe('almoço com a Ana')
    expect(draft.priority).toBe(2)
    expect(draft.labels).toEqual(['pessoal'])
    expect(draft.project).toBe('Casa')
    expect(draft.when.date?.getHours()).toBe(13)
  })

  it('texto simples vira só título', () => {
    const draft = parseCapture('comprar café', REF)

    expect(draft).toMatchObject({ title: 'comprar café', priority: 4, labels: [], project: null })
    expect(draft.when.date).toBeNull()
  })

  it('aceita várias etiquetas', () => {
    const draft = parseCapture('revisar contrato #urgente #juridico', REF)

    expect(draft.labels).toEqual(['urgente', 'juridico'])
    expect(draft.title).toBe('revisar contrato')
  })

  it('projeto pode ter nome composto', () => {
    // Parar no primeiro espaço tornaria o atalho inútil para "Casa Nova".
    const draft = parseCapture('pintar parede @Casa Nova', REF)

    expect(draft.project).toBe('Casa Nova')
    expect(draft.title).toBe('pintar parede')
  })

  it('projeto composto seguido de etiqueta para no marcador', () => {
    const draft = parseCapture('pintar parede @Casa Nova #tinta', REF)

    expect(draft.project).toBe('Casa Nova')
    expect(draft.labels).toEqual(['tinta'])
  })

  it('guarda a repetição junto do resto', () => {
    const draft = parseCapture('retrospectiva toda segunda 15h @Trabalho', REF)

    expect(draft.when.rrule).toBe('FREQ=WEEKLY;BYDAY=MO')
    expect(draft.when.date?.getHours()).toBe(15)
    expect(draft.project).toBe('Trabalho')
    expect(draft.title).toBe('retrospectiva')
  })

  it('não confunde e-mail com projeto', () => {
    // O `@` de um e-mail vem colado, sem espaço antes.
    const draft = parseCapture('responder ana@exemplo.dev', REF)

    expect(draft.project).toBeNull()
    expect(draft.title).toBe('responder ana@exemplo.dev')
  })

  it('mantém número que não é data no título', () => {
    const draft = parseCapture('revisar PR 42', REF)

    expect(draft.title).toBe('revisar PR 42')
    expect(draft.when.date).toBeNull()
  })
})

describe('describeDraft', () => {
  it('descreve data e hora em linguagem do dia a dia', () => {
    const draft = parseCapture('almoço amanhã 13h', REF)

    expect(describeDraft(draft, REF)).toEqual(['amanhã às 13:00'])
  })

  it('omite a hora quando não foi informada', () => {
    const draft = parseCapture('ligar amanhã', REF)

    expect(describeDraft(draft, REF)).toEqual(['amanhã'])
  })

  it('descreve a repetição por extenso', () => {
    const draft = parseCapture('retrospectiva toda segunda', REF)

    expect(describeDraft(draft, REF)[0]).toBe('toda segunda')
  })

  it('lista projeto, etiquetas e prioridade', () => {
    const draft = parseCapture('tarefa #casa @Reforma p1', REF)

    expect(describeDraft(draft, REF)).toEqual(['em Reforma', '#casa', 'P1'])
  })

  it('omite P4, que é o padrão', () => {
    const draft = parseCapture('tarefa qualquer', REF)

    expect(describeDraft(draft, REF)).toEqual([])
  })

  it('usa o dia da semana para datas próximas', () => {
    const draft = parseCapture('reunião segunda', REF)

    expect(describeDraft(draft, REF)).toEqual(['segunda'])
  })
})
