import { describe, expect, it } from 'vitest'
import { DomainError } from '../src/lib/errors.js'
import {
  describeRecurrence,
  occurrenceKey,
  occurrencesBetween,
  parseVirtualTaskId,
  shiftToDay,
  virtualTaskId,
} from '../src/lib/recurrence.js'

/** Segunda-feira, 1º de setembro de 2026, 09:00 UTC. */
const ANCHOR = new Date('2026-09-01T09:00:00.000Z')

describe('occurrencesBetween', () => {
  it('expande uma regra semanal dentro da janela', () => {
    const dates = occurrencesBetween(
      'FREQ=WEEKLY;BYDAY=TU',
      ANCHOR,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-30T23:59:59.000Z'),
    )

    // Setembro de 2026 tem cinco terças: 1, 8, 15, 22 e 29.
    expect(dates.map(occurrenceKey)).toEqual([
      '2026-09-01',
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      '2026-09-29',
    ])
  })

  it('preserva a hora da âncora nas ocorrências', () => {
    const [first] = occurrencesBetween(
      'FREQ=DAILY',
      ANCHOR,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-03T23:59:59.000Z'),
    )

    expect(first?.toISOString()).toBe('2026-09-01T09:00:00.000Z')
  })

  it('devolve vazio quando a janela não contém nenhuma ocorrência', () => {
    // 1 a 5 de outubro de 2026 vai de quinta a segunda: não há terça no meio.
    const dates = occurrencesBetween(
      'FREQ=WEEKLY;BYDAY=TU',
      ANCHOR,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-05T23:59:59.000Z'),
    )

    expect(dates).toEqual([])
  })

  it('inclui a ocorrência que cai exatamente na borda da janela', () => {
    // A ocorrência é às 09:00; a janela abre às 09:00 em ponto.
    const dates = occurrencesBetween(
      'FREQ=WEEKLY;BYDAY=TU',
      ANCHOR,
      new Date('2026-10-06T09:00:00.000Z'),
      new Date('2026-10-06T09:00:00.000Z'),
    )

    expect(dates.map(occurrenceKey)).toEqual(['2026-10-06'])
  })

  it('respeita o COUNT da regra', () => {
    const dates = occurrencesBetween(
      'FREQ=DAILY;COUNT=3',
      ANCHOR,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-12-31T23:59:59.000Z'),
    )

    expect(dates).toHaveLength(3)
  })

  it('recusa regra malformada com erro de domínio', () => {
    expect(() => occurrencesBetween('isso não é uma rrule', ANCHOR, ANCHOR, ANCHOR)).toThrow(
      DomainError,
    )
  })

  it('recusa regra que não gera nenhuma data', () => {
    // 30 de fevereiro não existe: a regra é válida na sintaxe e vazia na prática.
    expect(() =>
      occurrencesBetween('FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=30', ANCHOR, ANCHOR, ANCHOR),
    ).toThrow(DomainError)
  })
})

describe('shiftToDay', () => {
  it('leva a hora original para outro dia', () => {
    const original = new Date('2026-09-01T14:30:00.000Z')
    const target = new Date('2026-09-08T00:00:00.000Z')

    expect(shiftToDay(original, target).toISOString()).toBe('2026-09-08T14:30:00.000Z')
  })

  it('não altera o objeto recebido', () => {
    const original = new Date('2026-09-01T14:30:00.000Z')
    const target = new Date('2026-09-08T00:00:00.000Z')

    shiftToDay(original, target)

    expect(target.toISOString()).toBe('2026-09-08T00:00:00.000Z')
  })
})

describe('id de ocorrência virtual', () => {
  const uuid = '01900000-0000-7000-8000-000000000001'

  it('vai e volta', () => {
    const id = virtualTaskId(uuid, new Date('2026-09-08T09:00:00.000Z'))

    expect(id).toBe(`${uuid}@2026-09-08`)
    expect(parseVirtualTaskId(id)).toEqual({ templateId: uuid, occurrenceOn: '2026-09-08' })
  })

  it('devolve null para id comum', () => {
    expect(parseVirtualTaskId(uuid)).toBeNull()
  })

  it('devolve null quando a data não é uma data', () => {
    expect(parseVirtualTaskId(`${uuid}@amanha`)).toBeNull()
  })
})

describe('describeRecurrence', () => {
  const casos: Array<[string, string]> = [
    ['FREQ=DAILY', 'todo dia'],
    ['FREQ=DAILY;INTERVAL=3', 'a cada 3 dias'],
    ['FREQ=WEEKLY;BYDAY=MO', 'toda segunda'],
    ['FREQ=WEEKLY;BYDAY=MO,WE,FR', 'segunda, quarta e sexta'],
    ['FREQ=WEEKLY;BYDAY=SA,SU', 'sábado e domingo'],
    ['FREQ=WEEKLY;INTERVAL=2;BYDAY=TU', 'terça, a cada 2 semanas'],
    ['FREQ=MONTHLY;BYMONTHDAY=15', 'todo dia 15'],
    ['FREQ=YEARLY', 'todo ano'],
  ]

  for (const [rrule, esperado] of casos) {
    it(`descreve ${rrule} como "${esperado}"`, () => {
      expect(describeRecurrence(rrule, ANCHOR)).toBe(esperado)
    })
  }

  it('cai no genérico em vez de arriscar frase errada', () => {
    expect(describeRecurrence('não é rrule', ANCHOR)).toBe('repete')
  })
})
