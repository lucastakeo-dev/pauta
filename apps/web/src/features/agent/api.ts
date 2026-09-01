import { type AgentEvent, type AgentMessage, agentEventSchema } from '@pauta/contracts'
import { readToken } from '../../shared/api/token-storage.js'
import { env } from '../../shared/config/env.js'

/**
 * Um turno do Agent, lendo o SSE conforme ele chega.
 *
 * Não dá para usar `EventSource`: ela só faz GET e não manda cabeçalho, e este pedido
 * precisa de POST com o token. Então é `fetch` com o corpo lido em pedaços — que é o
 * que o `EventSource` faz por baixo, sem as duas limitações.
 */
export async function askAgent(
  messages: AgentMessage[],
  aoEvento: (evento: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const resposta = await fetch(`${env.apiUrl}/agent/ask`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${readToken() ?? ''}`,
    },
    // O fuso vai junto: é o que faz "amanhã 9h" virar 9h no relógio de quem pediu.
    body: JSON.stringify({
      messages,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    signal: signal ?? null,
  })

  if (!resposta.ok || !resposta.body) {
    const erro = await resposta.json().catch(() => null)
    throw new Error(erro?.message ?? 'O Agent não respondeu.')
  }

  const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader()
  let sobra = ''

  while (true) {
    const { done, value } = await leitor.read()
    if (done) break

    sobra += value

    // Eventos SSE são separados por linha em branco; o resto fica para o próximo pedaço.
    const partes = sobra.split('\n\n')
    sobra = partes.pop() ?? ''

    for (const parte of partes) {
      const linha = parte.split('\n').find((texto) => texto.startsWith('data: '))
      if (!linha) continue

      const evento = agentEventSchema.safeParse(JSON.parse(linha.slice('data: '.length)))
      if (evento.success) aoEvento(evento.data)
    }
  }
}
