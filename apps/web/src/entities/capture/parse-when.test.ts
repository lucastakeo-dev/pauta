import { describe, expect, it } from 'vitest'
import { parseWhen, stripMatched } from './parse-when.js'

/**
 * Referência fixa: quinta-feira, 27 de agosto de 2026, 14:00.
 * Sem uma âncora, os testes de "amanhã" e "sexta" quebrariam sozinhos amanhã.
 */
const REF = new Date(2026, 7, 27, 14, 0, 0, 0)

/** `DD/MM HH:MM` — formato compacto para as tabelas de caso abaixo. */
function fmt(date: Date | null): string {
  if (!date) return '—'

  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')

  return `${d}/${m} ${h}:${min}`
}

describe('dias relativos', () => {
  const casos: Array<[string, string]> = [
    ['reunião hoje', '27/08 00:00'],
    ['ligar amanhã', '28/08 00:00'],
    ['comprar pão depois de amanhã', '29/08 00:00'],
    ['era ontem', '26/08 00:00'],
  ]

  for (const [frase, esperado] of casos) {
    it(`"${frase}" → ${esperado}`, () => {
      expect(fmt(parseWhen(frase, REF).date)).toBe(esperado)
    })
  }

  it('"depois de amanhã" não é lido como "amanhã"', () => {
    // O erro clássico: o padrão mais curto casa primeiro e come o mais longo.
    expect(fmt(parseWhen('depois de amanhã', REF).date)).toBe('29/08 00:00')
  })
})

describe('horário no jeito brasileiro', () => {
  const casos: Array<[string, string]> = [
    ['almoço amanhã 13h', '28/08 13:00'],
    ['reunião hoje às 16h', '27/08 16:00'],
    ['jantar amanhã 20h30', '28/08 20:30'],
    ['call amanhã 09:15', '28/08 09:15'],
    ['dentista amanhã às 8', '28/08 08:00'],
  ]

  for (const [frase, esperado] of casos) {
    it(`"${frase}" → ${esperado}`, () => {
      expect(fmt(parseWhen(frase, REF).date)).toBe(esperado)
    })
  }

  it('marca que houve horário explícito', () => {
    expect(parseWhen('amanhã 13h', REF).hasTime).toBe(true)
    expect(parseWhen('amanhã', REF).hasTime).toBe(false)
  })
})

describe('período falado', () => {
  const casos: Array<[string, string]> = [
    ['gym amanhã 7 da manhã', '28/08 07:00'],
    ['jantar amanhã 8 da noite', '28/08 20:00'],
    ['café amanhã 3 da tarde', '28/08 15:00'],
    ['almoço amanhã meio-dia', '28/08 12:00'],
    ['virada amanhã meia-noite', '28/08 00:00'],
  ]

  for (const [frase, esperado] of casos) {
    it(`"${frase}" → ${esperado}`, () => {
      expect(fmt(parseWhen(frase, REF).date)).toBe(esperado)
    })
  }

  it('"8 da noite" é 20h, não 8h', () => {
    // É exatamente onde o chrono errava.
    expect(parseWhen('amanhã 8 da noite', REF).date?.getHours()).toBe(20)
  })

  it('"12 da manhã" é meia-noite', () => {
    expect(parseWhen('amanhã 12 da manhã', REF).date?.getHours()).toBe(0)
  })
})

describe('dias da semana', () => {
  it('pega a próxima ocorrência', () => {
    // Referência é quinta 27/08; a próxima sexta é 28/08.
    expect(fmt(parseWhen('academia sexta', REF).date)).toBe('28/08 00:00')
  })

  it('"que vem" pula para a semana seguinte', () => {
    expect(fmt(parseWhen('academia sexta que vem', REF).date)).toBe('04/09 00:00')
  })

  it('"próxima" também pula', () => {
    expect(fmt(parseWhen('reunião próxima sexta', REF).date)).toBe('04/09 00:00')
  })

  it('o mesmo dia da semana significa a semana que vem', () => {
    // Hoje é quinta; "quinta" solto quer dizer a próxima, senão diria "hoje".
    expect(fmt(parseWhen('retrospectiva quinta', REF).date)).toBe('03/09 00:00')
  })

  it('aceita a forma com -feira', () => {
    expect(fmt(parseWhen('entregar segunda-feira', REF).date)).toBe('31/08 00:00')
  })

  it('aceita acento e a falta dele', () => {
    expect(fmt(parseWhen('call terça', REF).date)).toBe('01/09 00:00')
    expect(fmt(parseWhen('call terca', REF).date)).toBe('01/09 00:00')
    expect(fmt(parseWhen('feira sabado', REF).date)).toBe('29/08 00:00')
  })
})

describe('datas explícitas', () => {
  const casos: Array<[string, string]> = [
    ['consulta dia 30', '30/08 00:00'],
    ['dentista 15/09', '15/09 00:00'],
    ['reunião 15/09 às 10h', '15/09 10:00'],
    ['aniversário 15 de setembro', '15/09 00:00'],
    ['prazo 05/12/2026', '05/12 00:00'],
  ]

  for (const [frase, esperado] of casos) {
    it(`"${frase}" → ${esperado}`, () => {
      expect(fmt(parseWhen(frase, REF).date)).toBe(esperado)
    })
  }

  it('"dia 5" com o dia já passado vai para o mês seguinte', () => {
    // Hoje é 27/08, então "dia 5" é setembro.
    expect(fmt(parseWhen('pagar aluguel dia 5', REF).date)).toBe('05/09 00:00')
  })

  it('data sem ano que já passou vai para o ano seguinte', () => {
    expect(parseWhen('festa 10/01', REF).date?.getFullYear()).toBe(2027)
  })

  it('recusa data impossível', () => {
    expect(parseWhen('reunião 31/02', REF).date).toBeNull()
  })
})

describe('deslocamentos', () => {
  const casos: Array<[string, string]> = [
    ['revisar daqui a 3 dias', '30/08 00:00'],
    ['call daqui 2 semanas', '10/09 00:00'],
    ['follow-up em 5 dias', '01/09 00:00'],
    ['pausa daqui a 30 minutos', '27/08 14:30'],
    ['reunião daqui a 2 horas', '27/08 16:00'],
  ]

  for (const [frase, esperado] of casos) {
    it(`"${frase}" → ${esperado}`, () => {
      expect(fmt(parseWhen(frase, REF).date)).toBe(esperado)
    })
  }

  it('deslocamento em minutos conta como horário definido', () => {
    expect(parseWhen('pausa daqui a 30 minutos', REF).hasTime).toBe(true)
  })
})

describe('repetição', () => {
  const casos: Array<[string, string]> = [
    ['retrospectiva toda segunda', 'FREQ=WEEKLY;BYDAY=MO'],
    ['reunião todas as sextas', 'FREQ=WEEKLY;BYDAY=FR'],
    ['standup todo dia', 'FREQ=DAILY'],
    ['revisão toda semana', 'FREQ=WEEKLY'],
    ['aluguel todo mês', 'FREQ=MONTHLY'],
  ]

  for (const [frase, esperado] of casos) {
    it(`"${frase}" → ${esperado}`, () => {
      expect(parseWhen(frase, REF).rrule).toBe(esperado)
    })
  }

  it('"toda segunda" não é lido como a próxima segunda', () => {
    // É uma regra de repetição, não uma data solta.
    const resultado = parseWhen('retrospectiva toda segunda', REF)

    expect(resultado.rrule).toBe('FREQ=WEEKLY;BYDAY=MO')
    expect(resultado.matched).toContain('toda segunda')
  })

  it('repetição com horário mantém os dois', () => {
    const resultado = parseWhen('standup todo dia 9h', REF)

    expect(resultado.rrule).toBe('FREQ=DAILY')
    expect(resultado.date?.getHours()).toBe(9)
  })
})

describe('horário sozinho', () => {
  it('vale para hoje quando ainda não passou', () => {
    expect(fmt(parseWhen('reunião 16h', REF).date)).toBe('27/08 16:00')
  })

  it('vai para amanhã quando a hora já passou', () => {
    // São 14h; "9h" só pode ser amanhã.
    expect(fmt(parseWhen('reunião 9h', REF).date)).toBe('28/08 09:00')
  })
})

describe('quando não há data', () => {
  it('devolve vazio para texto sem tempo nenhum', () => {
    const resultado = parseWhen('comprar café', REF)

    expect(resultado.date).toBeNull()
    expect(resultado.rrule).toBeNull()
    expect(resultado.matched).toEqual([])
  })

  it('não inventa data a partir de número solto', () => {
    // O risco de adivinhar: "revisar PR 42" não é dia 42 nem 42h.
    expect(parseWhen('revisar PR 42', REF).date).toBeNull()
  })

  it('não confunde nome de projeto com dia da semana', () => {
    expect(parseWhen('comprar café', REF).date).toBeNull()
  })
})

describe('stripMatched', () => {
  it('deixa só o título', () => {
    const resultado = parseWhen('almoço com a Ana amanhã 13h', REF)

    expect(stripMatched('almoço com a Ana amanhã 13h', resultado.matched)).toBe('almoço com a Ana')
  })

  it('limpa também a repetição', () => {
    const resultado = parseWhen('retrospectiva toda segunda 15h', REF)

    expect(stripMatched('retrospectiva toda segunda 15h', resultado.matched)).toBe('retrospectiva')
  })

  it('devolve o texto intacto quando nada casou', () => {
    expect(stripMatched('comprar café', [])).toBe('comprar café')
  })
})
