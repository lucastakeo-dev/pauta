/**
 * Interpreta data, hora e repetição escritas em português, dentro de uma frase solta.
 *
 * POR QUE NÃO USAMOS BIBLIOTECA: o `chrono-node` declara suporte parcial a `pt`, e a
 * medição mostrou algo pior que lacunas — ele erra **em silêncio**. "amanhã 13h" volta
 * como amanhã às 14h (ignora o `13h` e herda a hora de referência); "jantar às 8 da
 * noite" vira 08:00; "depois de amanhã" vira amanhã. Um palpite errado com cara de
 * certo é pior que um "não entendi", porque a pessoa não confere o que parece pronto.
 *
 * A escolha aqui é o contrário: **conjunto explícito de padrões**. O que não casa não
 * é adivinhado — fica sem data, e a tela mostra o que foi entendido antes de confirmar.
 *
 * Tudo é função pura, com a referência de "agora" injetada, então cada padrão tem teste.
 */

export type ParsedWhen = {
  /** Instante resolvido, ou `null` quando nenhuma data foi reconhecida. */
  date: Date | null
  /** RRULE quando o texto pede repetição ("toda segunda"). */
  rrule: string | null
  /** `true` quando um horário explícito foi dado; senão a data vale como dia inteiro. */
  hasTime: boolean
  /** Trechos consumidos do texto, para o chamador removê-los do título. */
  matched: string[]
}

const EMPTY: ParsedWhen = { date: null, rrule: null, hasTime: false, matched: [] }

/**
 * Fronteiras de palavra que funcionam em português.
 *
 * `\b` do JavaScript considera palavra apenas `[A-Za-z0-9_]`, então "amanhã" nunca
 * casa com `/amanh[ãa]\b/` — o `ã` final não é caractere de palavra e a fronteira não
 * existe. Com `\p{L}` e a flag `u`, letra acentuada conta como letra.
 */
const B = '(?<![\\p{L}\\p{N}])'
const E = '(?![\\p{L}\\p{N}])'

/** Monta um regex com as fronteiras e a flag unicode já aplicadas. */
function word(pattern: string, flags = 'iu'): RegExp {
  return new RegExp(`${B}${pattern}${E}`, flags)
}

/** Dias da semana em índice de `Date` (0 = domingo), com as variações escritas. */
const WEEKDAYS: Array<{ index: number; pattern: string; rrule: string }> = [
  { index: 0, pattern: 'domingos?', rrule: 'SU' },
  { index: 1, pattern: 'segundas?(?:[-\\s]feiras?)?', rrule: 'MO' },
  { index: 2, pattern: 'ter[çc]as?(?:[-\\s]feiras?)?', rrule: 'TU' },
  { index: 3, pattern: 'quartas?(?:[-\\s]feiras?)?', rrule: 'WE' },
  { index: 4, pattern: 'quintas?(?:[-\\s]feiras?)?', rrule: 'TH' },
  { index: 5, pattern: 'sextas?(?:[-\\s]feiras?)?', rrule: 'FR' },
  { index: 6, pattern: 's[áa]bados?', rrule: 'SA' },
]

const MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  'mar[çc]o': 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(date: Date, amount: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + amount)
  return copy
}

// ---------------------------------------------------------------------------
// Horário
// ---------------------------------------------------------------------------

type TimeMatch = { hour: number; minute: number; text: string }

/**
 * Reconhece as formas brasileiras de escrever hora.
 *
 * `13h`, `13h30`, `13:30`, `às 13`, `8 da manhã`, `8 da noite`, `meio-dia`, `meia-noite`.
 * O período falado (`da noite`) é o que mais falta nas bibliotecas — e é o que muda
 * 8 para 20.
 */
function parseTime(text: string): TimeMatch | null {
  const meioDia = word('(meio[-\\s]dia)').exec(text)
  if (meioDia?.[1]) return { hour: 12, minute: 0, text: meioDia[1] }

  const meiaNoite = word('(meia[-\\s]noite)').exec(text)
  if (meiaNoite?.[1]) return { hour: 0, minute: 0, text: meiaNoite[1] }

  // "8 da noite", "3 da tarde", "7 da manhã" — o período reposiciona a hora.
  const periodo = word(
    '(?:[àa]s\\s+)?(\\d{1,2})(?:[h:](\\d{2}))?\\s+da\\s+(manh[ãa]|tarde|noite)',
  ).exec(text)

  if (periodo?.[1] && periodo[3]) {
    let hour = Number(periodo[1])
    const suffix = periodo[3].toLowerCase()

    if (suffix.startsWith('manh')) {
      if (hour === 12) hour = 0
    } else if (hour < 12) {
      // tarde e noite empurram para o período da tarde/noite
      hour += 12
    }

    return { hour, minute: Number(periodo[2] ?? 0), text: periodo[0] }
  }

  // "13h", "13h30", "13:30", "às 13"
  const relogio = word('(?:[àa]s\\s+)?(\\d{1,2})(?:[h:](\\d{2})|h)').exec(text)
  if (relogio?.[1]) {
    const hour = Number(relogio[1])
    const minute = Number(relogio[2] ?? 0)

    if (hour <= 23 && minute <= 59) {
      return { hour, minute, text: relogio[0] }
    }
  }

  // "às 13" sem o "h" — exige o "às" para não confundir com um número qualquer.
  const comAs = word('[àa]s\\s+(\\d{1,2})').exec(text)
  if (comAs?.[1]) {
    const hour = Number(comAs[1])
    if (hour <= 23) return { hour, minute: 0, text: comAs[0] }
  }

  return null
}

// ---------------------------------------------------------------------------
// Repetição
// ---------------------------------------------------------------------------

type RecurrenceMatch = { rrule: string; text: string }

function parseRecurrence(text: string): RecurrenceMatch | null {
  for (const day of WEEKDAYS) {
    const regex = word(`(tod[oa]s?\\s+(?:as?\\s+)?${day.pattern})`)
    const match = regex.exec(text)

    if (match?.[1]) {
      return { rrule: `FREQ=WEEKLY;BYDAY=${day.rrule}`, text: match[1] }
    }
  }

  const diario = word('(tod[oa]s?\\s+(?:os\\s+)?dias?)').exec(text)
  if (diario?.[1]) return { rrule: 'FREQ=DAILY', text: diario[1] }

  const semanal = word('(tod[oa]s?\\s+(?:as\\s+)?semanas?)').exec(text)
  if (semanal?.[1]) return { rrule: 'FREQ=WEEKLY', text: semanal[1] }

  const mensal = word('(tod[oa]s?\\s+(?:os\\s+)?m[êe]s(?:es)?)').exec(text)
  if (mensal?.[1]) return { rrule: 'FREQ=MONTHLY', text: mensal[1] }

  return null
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type DateMatch = { date: Date; text: string }

function parseDate(text: string, now: Date): DateMatch | null {
  const hoje = startOfDay(now)

  // A ordem importa: "depois de amanhã" contém "amanhã", e precisa ser testada antes.
  const depoisDeAmanha = word('(depois\\s+de\\s+amanh[ãa])').exec(text)
  if (depoisDeAmanha?.[1]) return { date: addDays(hoje, 2), text: depoisDeAmanha[1] }

  const amanha = word('(amanh[ãa])').exec(text)
  if (amanha?.[1]) return { date: addDays(hoje, 1), text: amanha[1] }

  const hojeMatch = word('(hoje)').exec(text)
  if (hojeMatch?.[1]) return { date: hoje, text: hojeMatch[1] }

  const ontem = word('(ontem)').exec(text)
  if (ontem?.[1]) return { date: addDays(hoje, -1), text: ontem[1] }

  // "daqui a 2 semanas", "daqui 3 dias", "em 30 minutos"
  const deslocamento = word(
    '((?:daqui\\s+(?:a\\s+)?|em\\s+)(\\d{1,3})\\s+(minutos?|horas?|dias?|semanas?|m[êe]s(?:es)?))',
  ).exec(text)

  if (deslocamento?.[1] && deslocamento[2] && deslocamento[3]) {
    const amount = Number(deslocamento[2])
    const unit = deslocamento[3].toLowerCase()
    const base = new Date(now)

    if (unit.startsWith('minuto')) base.setMinutes(base.getMinutes() + amount)
    else if (unit.startsWith('hora')) base.setHours(base.getHours() + amount)
    else if (unit.startsWith('dia')) return { date: addDays(hoje, amount), text: deslocamento[1] }
    else if (unit.startsWith('semana'))
      return { date: addDays(hoje, amount * 7), text: deslocamento[1] }
    else {
      const mes = startOfDay(now)
      mes.setMonth(mes.getMonth() + amount)
      return { date: mes, text: deslocamento[1] }
    }

    // Minutos e horas carregam horário próprio, então não zeramos o dia.
    return { date: base, text: deslocamento[1] }
  }

  // Dia da semana, com ou sem "que vem" / "próxima".
  for (const day of WEEKDAYS) {
    const regex = word(`((?:(pr[óo]xim[ao]|nest[ae])\\s+)?${day.pattern}(?:\\s+(que\\s+vem))?)`)
    const match = regex.exec(text)

    if (!match?.[1]) continue

    // "toda segunda" é repetição, não uma data — deixa para o parseRecurrence.
    if (/tod[oa]s?\s+$/iu.test(text.slice(0, match.index))) continue

    const proxima = Boolean(match[2] || match[3])
    let delta = (day.index - hoje.getDay() + 7) % 7

    // Sem qualificador, "segunda" hoje sendo segunda significa hoje mesmo? Não:
    // quem escreve o nome do dia quer o próximo, senão teria escrito "hoje".
    if (delta === 0) delta = 7

    // "que vem" / "próxima" pula para a semana seguinte à ocorrência natural.
    if (proxima && delta < 7) delta += 7

    return { date: addDays(hoje, delta), text: match[1] }
  }

  // "15/09", "15/09/2026"
  const barra = word('((\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?)', 'u').exec(text)
  if (barra?.[1] && barra[2] && barra[3]) {
    const day = Number(barra[2])
    const month = Number(barra[3]) - 1
    const yearRaw = barra[4] ? Number(barra[4]) : now.getFullYear()
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw

    const candidate = new Date(year, month, day, 0, 0, 0, 0)

    if (candidate.getMonth() === month && candidate.getDate() === day) {
      // Sem ano informado e a data já passou: assume o ano seguinte.
      if (!barra[4] && candidate < hoje) candidate.setFullYear(year + 1)
      return { date: candidate, text: barra[1] }
    }
  }

  // "15 de setembro"
  for (const [name, index] of Object.entries(MONTHS)) {
    const regex = word(`((\\d{1,2})\\s+de\\s+${name})`)
    const match = regex.exec(text)

    if (match?.[1] && match[2]) {
      const day = Number(match[2])
      const candidate = new Date(now.getFullYear(), index, day, 0, 0, 0, 0)

      if (candidate.getDate() === day) {
        if (candidate < hoje) candidate.setFullYear(now.getFullYear() + 1)
        return { date: candidate, text: match[1] }
      }
    }
  }

  // "dia 15" — o mês é o corrente, ou o próximo se o dia já passou.
  const diaDoMes = word('(dia\\s+(\\d{1,2}))').exec(text)
  if (diaDoMes?.[1] && diaDoMes[2]) {
    const day = Number(diaDoMes[2])

    if (day >= 1 && day <= 31) {
      const candidate = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0, 0)

      if (candidate.getDate() === day) {
        if (candidate < hoje) candidate.setMonth(candidate.getMonth() + 1)
        return { date: candidate, text: diaDoMes[1] }
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------

/**
 * Extrai quando algo acontece a partir do texto livre.
 *
 * Repetição é procurada antes da data: "toda segunda" é uma regra, não o próximo dia
 * da semana. Um horário sozinho ("reunião 15h") vale para hoje — ou amanhã, se a hora
 * já passou, que é o que a pessoa quer dizer ao escrever isso à noite.
 */
export function parseWhen(text: string, now: Date = new Date()): ParsedWhen {
  const matched: string[] = []

  const recurrence = parseRecurrence(text)
  if (recurrence) matched.push(recurrence.text)

  const restForDate = recurrence ? text.replace(recurrence.text, ' ') : text
  const date = parseDate(restForDate, now)
  if (date) matched.push(date.text)

  const restForTime = date ? restForDate.replace(date.text, ' ') : restForDate
  const time = parseTime(restForTime)
  if (time) matched.push(time.text)

  if (!recurrence && !date && !time) return EMPTY

  let resolved: Date | null = null

  if (date) {
    resolved = new Date(date.date)

    if (time) {
      resolved.setHours(time.hour, time.minute, 0, 0)
    }
  } else if (time) {
    // Só horário: hoje, ou amanhã se já passou.
    resolved = startOfDay(now)
    resolved.setHours(time.hour, time.minute, 0, 0)

    if (resolved <= now) resolved = addDays(resolved, 1)
  } else if (recurrence) {
    resolved = startOfDay(now)
  }

  return {
    date: resolved,
    rrule: recurrence?.rrule ?? null,
    // Deslocamento em minutos/horas já traz horário próprio.
    hasTime: Boolean(time) || Boolean(date && /minuto|hora/i.test(date.text)),
    matched,
  }
}

/** Remove do texto os trechos que viraram data, sobrando o título. */
export function stripMatched(text: string, matched: string[]): string {
  let result = text

  for (const piece of matched) {
    result = result.replace(piece, ' ')
  }

  return result.replace(/\s{2,}/g, ' ').trim()
}
