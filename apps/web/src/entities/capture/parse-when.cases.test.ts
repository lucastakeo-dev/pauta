import { describe, expect, it } from 'vitest'
import { parseWhen, stripMatched } from './parse-when.js'

/**
 * Suíte de referência: são exatamente as frases usadas para medir o `chrono-node`
 * antes de decidir escrever este parser.
 *
 * O chrono acertava 13 de 20 — e, pior, errava a hora em silêncio em vários dos que
 * "acertava" ("amanhã 13h" virava 14h). Este arquivo existe para que uma regressão
 * nesses casos apareça imediatamente, e para deixar registrado por que a biblioteca
 * foi descartada.
 */
const REF = new Date(2026, 7, 27, 14, 0, 0, 0)

const CASOS: Array<[string, string]> = [
  ['almoço amanhã 13h', '28/08 13:00'],
  ['reunião hoje às 16h', '27/08 16:00'],
  ['ligar para o dentista amanhã', '28/08 00:00'],
  ['academia sexta que vem', '04/09 00:00'],
  ['entregar relatório segunda', '31/08 00:00'],
  ['consulta dia 30', '30/08 00:00'],
  ['pagar aluguel dia 5 às 9h', '05/09 09:00'],
  ['call daqui 2 semanas', '10/09 00:00'],
  ['revisar em 3 dias', '30/08 00:00'],
  ['jantar sábado 20h30', '29/08 20:30'],
  ['dentista 15/09', '15/09 00:00'],
  ['reunião 15/09 às 10h', '15/09 10:00'],
  ['comprar pão depois de amanhã', '29/08 00:00'],
  ['planejamento próxima terça', '08/09 00:00'],
  // 28/08 e não 27/08: são 14h na referência, então o próximo standup das 9h é amanhã.
  ['standup todo dia 9h', '28/08 09:00'],
  ['gym às 7 da manhã', '28/08 07:00'],
  ['jantar às 8 da noite', '27/08 20:00'],
  ['daqui a 30 minutos', '27/08 14:30'],
]

function fmt(d: Date | null): string {
  if (!d) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

describe('paridade com as frases que mediram o chrono', () => {
  for (const [frase, esperado] of CASOS) {
    it(`"${frase}" → ${esperado}`, () => {
      expect(fmt(parseWhen(frase, REF).date)).toBe(esperado)
    })
  }

  it('o título sobra limpo em todos os casos', () => {
    for (const [frase] of CASOS) {
      const { matched } = parseWhen(frase, REF)
      const titulo = stripMatched(frase, matched)

      expect(titulo, frase).not.toMatch(/\d{1,2}h|amanh|hoje|daqui|toda/i)
    }
  })
})
