import { createRequire } from 'node:module'
import { ValidationError } from './errors.js'

/**
 * O pacote `rrule` (2.8) publica só CommonJS e não declara `exports`, então o loader
 * ESM do Node não consegue extrair os named exports — `import { rrulestr }` quebra em
 * runtime mesmo compilando. O `createRequire` carrega o CJS explicitamente, e o cast
 * preserva a tipagem publicada pelo pacote.
 */
const { rrulestr } = createRequire(import.meta.url)('rrule') as typeof import('rrule')

/**
 * Recorrência: a RRULE (RFC 5545) é guardada uma vez e as ocorrências futuras são
 * geradas na leitura. Só vira linha no banco quando a pessoa mexe naquela ocorrência.
 *
 * Tudo aqui é função pura — dá para testar sem banco e sem servidor, que é o ponto:
 * data é onde mais nasce bug silencioso.
 *
 * LIMITAÇÃO CONHECIDA: a expansão preserva o horário do instante-âncora em UTC.
 * Num fuso com horário de verão, uma recorrência semanal atravessando a virada sairia
 * uma hora deslocada. O fuso padrão do app (America/Sao_Paulo) não tem DST desde 2019,
 * então isso não afeta o uso real hoje — mas é o que precisa mudar se o app atender
 * fusos com DST.
 */

const MAX_OCCURRENCES = 500

/** Valida a regra e devolve o objeto pronto. Lança erro de domínio se não parsear. */
export function parseRecurrence(rrule: string, anchorAt: Date) {
  let rule: ReturnType<typeof rrulestr>

  try {
    rule = rrulestr(rrule.trim(), { dtstart: anchorAt })
  } catch {
    throw new ValidationError('Não entendi essa regra de repetição.', {
      rrule: ['Regra de repetição inválida.'],
    })
  }

  // Uma regra que não gera nenhuma data é sintaticamente válida e inútil — barrar aqui
  // evita uma tarefa recorrente que nunca aparece e ninguém entende por quê.
  if (rule.all((_, index) => index < 1).length === 0) {
    throw new ValidationError('Essa regra de repetição não gera nenhuma data.', {
      rrule: ['A regra não produz ocorrências.'],
    })
  }

  return rule
}

/** Datas geradas pela regra dentro da janela, incluindo os extremos. */
export function occurrencesBetween(rrule: string, anchorAt: Date, from: Date, to: Date): Date[] {
  const rule = parseRecurrence(rrule, anchorAt)
  return rule.between(from, to, true).slice(0, MAX_OCCURRENCES)
}

/**
 * Move um instante para outro dia, preservando a hora.
 *
 * É o que faz a ocorrência de uma tarefa das 9h continuar às 9h na semana seguinte,
 * em vez de herdar a hora que a regra de recorrência devolveu.
 */
export function shiftToDay(original: Date, targetDay: Date): Date {
  const shifted = new Date(targetDay)
  shifted.setUTCHours(
    original.getUTCHours(),
    original.getUTCMinutes(),
    original.getUTCSeconds(),
    original.getUTCMilliseconds(),
  )
  return shifted
}

/** Chave AAAA-MM-DD de uma ocorrência, em UTC. */
export function occurrenceKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Meia-noite UTC do dia informado.
 *
 * `occurrence_on` é coluna DATE, então grava sempre à meia-noite. Comparar uma janela
 * que começa no meio do dia contra ela deixaria de fora a ocorrência daquele mesmo dia.
 */
export function startOfDay(date: Date): Date {
  return new Date(`${occurrenceKey(date)}T00:00:00.000Z`)
}

const VIRTUAL_SEPARATOR = '@'

/** Id de uma ocorrência ainda não materializada: `uuid@AAAA-MM-DD`. */
export function virtualTaskId(templateId: string, date: Date): string {
  return `${templateId}${VIRTUAL_SEPARATOR}${occurrenceKey(date)}`
}

/** Separa um id virtual. Devolve `null` para um id comum de tarefa. */
export function parseVirtualTaskId(
  id: string,
): { templateId: string; occurrenceOn: string } | null {
  const index = id.indexOf(VIRTUAL_SEPARATOR)

  if (index === -1) return null

  const templateId = id.slice(0, index)
  const occurrenceOn = id.slice(index + 1)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceOn)) return null

  return { templateId, occurrenceOn }
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const

/**
 * Descrição em pt-BR da regra, para a tarefa mostrar "toda segunda" em vez da RRULE.
 *
 * Cobre os padrões que o app realmente cria; qualquer outro cai no genérico em vez de
 * arriscar uma frase errada.
 */
export function describeRecurrence(rrule: string, anchorAt: Date): string {
  let rule: ReturnType<typeof rrulestr>

  try {
    rule = rrulestr(rrule.trim(), { dtstart: anchorAt })
  } catch {
    return 'repete'
  }

  const { freq, interval = 1, byweekday, bymonthday } = rule.options
  const days = byweekday ?? []

  // rrule usa 0=segunda; Date usa 0=domingo.
  const nomeDoDia = (weekday: number) => DIAS[(weekday + 1) % 7] ?? ''

  const listar = (nomes: string[]) =>
    nomes.length <= 1
      ? (nomes[0] ?? '')
      : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`

  switch (freq) {
    case 3: // DAILY
      return interval === 1 ? 'todo dia' : `a cada ${interval} dias`

    case 2: {
      // WEEKLY
      if (days.length === 0) {
        return interval === 1 ? 'toda semana' : `a cada ${interval} semanas`
      }

      const nomes = listar(days.map(nomeDoDia))

      if (interval === 1) {
        return days.length === 1 ? `toda ${nomes}` : `${nomes}`
      }

      return `${nomes}, a cada ${interval} semanas`
    }

    case 1: {
      // MONTHLY
      const dia = bymonthday?.[0]
      const base = dia ? `todo dia ${dia}` : 'todo mês'
      return interval === 1 ? base : `${base}, a cada ${interval} meses`
    }

    case 0: // YEARLY
      return interval === 1 ? 'todo ano' : `a cada ${interval} anos`

    default:
      return 'repete'
  }
}
