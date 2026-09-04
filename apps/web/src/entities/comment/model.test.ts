import { describe, expect, it } from 'vitest'
import { authorInitials, commentTimeLabel } from './model.js'

const AGORA = new Date('2026-09-04T12:00:00.000Z')

/** Um instante `minutos` antes de AGORA, em ISO. */
function atras(minutos: number): string {
  return new Date(AGORA.getTime() - minutos * 60_000).toISOString()
}

describe('commentTimeLabel', () => {
  it('chama de "agora" o que acabou de ser escrito', () => {
    expect(commentTimeLabel(atras(0), AGORA)).toBe('agora')
    expect(commentTimeLabel(atras(0.5), AGORA)).toBe('agora')
  })

  it('conta em minutos dentro da primeira hora', () => {
    expect(commentTimeLabel(atras(1), AGORA)).toBe('há 1 min')
    expect(commentTimeLabel(atras(59), AGORA)).toBe('há 59 min')
  })

  it('conta em horas dentro do primeiro dia', () => {
    expect(commentTimeLabel(atras(60), AGORA)).toBe('há 1 h')
    expect(commentTimeLabel(atras(60 * 23), AGORA)).toBe('há 23 h')
  })

  it('diz "ontem" no dia seguinte', () => {
    expect(commentTimeLabel(atras(60 * 24), AGORA)).toBe('ontem')
  })

  it('conta em dias até a primeira semana', () => {
    expect(commentTimeLabel(atras(60 * 24 * 3), AGORA)).toBe('há 3 dias')
    expect(commentTimeLabel(atras(60 * 24 * 6), AGORA)).toBe('há 6 dias')
  })

  it('volta para a data quando o relativo deixa de ajudar', () => {
    // Uma semana atrás: "há 7 dias" já não situa ninguém.
    expect(commentTimeLabel(atras(60 * 24 * 7), AGORA)).toMatch(/ago/)
  })

  it('trata carimbo no futuro como agora, sem inventar "daqui a"', () => {
    const futuro = new Date(AGORA.getTime() + 60_000).toISOString()
    expect(commentTimeLabel(futuro, AGORA)).toBe('agora')
  })
})

describe('authorInitials', () => {
  it('usa a primeira e a última palavra', () => {
    expect(authorInitials('Lucas Takeo Mori')).toBe('LM')
  })

  it('usa uma letra só quando há um nome só', () => {
    expect(authorInitials('Takeo')).toBe('T')
  })

  it('não quebra com espaço sobrando nem com nome vazio', () => {
    expect(authorInitials('  Ana   Paula  ')).toBe('AP')
    expect(authorInitials('   ')).toBe('?')
  })
})
