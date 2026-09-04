/**
 * Regras puras sobre comentários. Sem React e sem rede.
 */

const MINUTO = 60_000
const HORA = 60 * MINUTO

/**
 * Quando o comentário foi escrito, em linguagem do dia a dia.
 *
 * Num histórico curto o que importa é a distância — "há 5 min" situa a leitura, e
 * "04/09/2026 10:32" obriga a fazer a conta de cabeça. A data cheia só volta quando o
 * relativo deixa de ajudar: passado uma semana, "há 9 dias" não diz mais quando foi.
 *
 * Datas no futuro não são tratadas como caso especial de propósito: comentário com
 * carimbo à frente do relógio é relógio errado, não um comentário do futuro, e
 * arredondar para "agora" é a leitura mais próxima da verdade.
 */
export function commentTimeLabel(iso: string, now: Date = new Date()): string {
  const escrito = new Date(iso)
  const distancia = now.getTime() - escrito.getTime()

  if (distancia < MINUTO) return 'agora'
  if (distancia < HORA) return `há ${Math.floor(distancia / MINUTO)} min`

  if (distancia < 24 * HORA) {
    const horas = Math.floor(distancia / HORA)
    return `há ${horas} h`
  }

  const dias = Math.floor(distancia / (24 * HORA))
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`

  return escrito.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/** A hora exata, para o `title` — o relativo situa, e isto responde "quando mesmo?". */
export function commentExactLabel(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Iniciais do autor, para o avatar. Duas letras no máximo. */
export function authorInitials(name: string): string {
  const partes = name.trim().split(/\s+/).filter(Boolean)

  if (partes.length === 0) return '?'

  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''

  return (primeira + ultima).toUpperCase()
}
