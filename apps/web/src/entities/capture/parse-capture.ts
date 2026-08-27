import { parsePriority } from '../task/index.js'
import { type ParsedWhen, parseWhen, stripMatched } from './parse-when.js'

/**
 * Interpreta uma linha de captura inteira.
 *
 * A ideia do Console é escrever numa linha só o que normalmente exigiria um formulário:
 *
 *     almoço com a Ana amanhã 13h #pessoal @Casa p2
 *
 * Cada pedaço tem marcador próprio — `#` etiqueta, `@` projeto, `p1..p4` prioridade —
 * e o resto vira título. Nada é adivinhado: o que não tem marcador nem casa com um
 * padrão de data continua sendo título.
 */
export type CaptureDraft = {
  title: string
  priority: number
  when: ParsedWhen
  /** Nomes das etiquetas escritas com `#`. Resolver para id é trabalho de quem salva. */
  labels: string[]
  /** Nome do projeto escrito com `@`, se houver. */
  project: string | null
}

/** `#etiqueta` — sem espaço, como a validação de etiqueta já exige no servidor. */
const LABEL_PATTERN = /(?:^|\s)#([^\s#@]+)/gu

/**
 * `@projeto` — aceita nome com espaço até o próximo marcador.
 *
 * Projeto costuma ter nome composto ("Casa Nova"), então parar no primeiro espaço
 * tornaria o atalho inútil justamente nos casos em que ele ajuda.
 */
const PROJECT_PATTERN = /(?:^|\s)@([^#@]+?)(?=\s+[#@]|\s+p[1-4]\s*$|$)/u

export function parseCapture(input: string, now: Date = new Date()): CaptureDraft {
  let rest = input

  const labels: string[] = []
  for (const match of input.matchAll(LABEL_PATTERN)) {
    if (match[1]) labels.push(match[1])
  }
  rest = rest.replace(LABEL_PATTERN, ' ')

  const projectMatch = PROJECT_PATTERN.exec(rest)
  const project = projectMatch?.[1]?.trim() ?? null
  if (projectMatch) rest = rest.replace(projectMatch[0], ' ')

  // Prioridade antes da data: `p2` no fim não deve ser confundido com nada temporal.
  const { title: withoutPriority, priority } = parsePriority(rest.replace(/\s{2,}/g, ' ').trim())

  const when = parseWhen(withoutPriority, now)
  const title = stripMatched(withoutPriority, when.matched)

  return { title, priority, when, labels, project }
}

/**
 * Frase curta descrevendo o que foi entendido, para a tela mostrar antes de confirmar.
 *
 * É a contrapartida de não adivinhar: a pessoa vê a interpretação e corrige na hora,
 * em vez de descobrir depois que a tarefa foi para o dia errado.
 */
export function describeDraft(draft: CaptureDraft, now: Date = new Date()): string[] {
  const partes: string[] = []

  if (draft.when.rrule) {
    partes.push(describeRrule(draft.when.rrule))
  }

  if (draft.when.date) {
    partes.push(describeDate(draft.when.date, draft.when.hasTime, now))
  }

  if (draft.project) partes.push(`em ${draft.project}`)
  for (const label of draft.labels) partes.push(`#${label}`)
  if (draft.priority !== 4) partes.push(`P${draft.priority}`)

  return partes
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const

function describeDate(date: Date, hasTime: boolean, now: Date): string {
  const dia = new Date(date)
  dia.setHours(0, 0, 0, 0)

  const hoje = new Date(now)
  hoje.setHours(0, 0, 0, 0)

  const diffDias = Math.round((dia.getTime() - hoje.getTime()) / 86_400_000)

  let quando: string
  if (diffDias === 0) quando = 'hoje'
  else if (diffDias === 1) quando = 'amanhã'
  else if (diffDias === -1) quando = 'ontem'
  else if (diffDias > 1 && diffDias < 7) quando = (DIAS[date.getDay()] ?? '').toString()
  else quando = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  if (!hasTime) return quando

  const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${quando} às ${hora}`
}

function describeRrule(rrule: string): string {
  if (rrule === 'FREQ=DAILY') return 'todo dia'
  if (rrule === 'FREQ=WEEKLY') return 'toda semana'
  if (rrule === 'FREQ=MONTHLY') return 'todo mês'

  const byday = /BYDAY=(\w{2})/.exec(rrule)?.[1]
  const nomes: Record<string, string> = {
    SU: 'todo domingo',
    MO: 'toda segunda',
    TU: 'toda terça',
    WE: 'toda quarta',
    TH: 'toda quinta',
    FR: 'toda sexta',
    SA: 'todo sábado',
  }

  return (byday && nomes[byday]) || 'repete'
}
