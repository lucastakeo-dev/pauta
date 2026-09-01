import Anthropic from '@anthropic-ai/sdk'
import type { AgentEvent, AgentMessage } from '@pauta/contracts'
import { env } from '../../config/env.js'
import { agentTools, runAgentTool } from './tools.js'

/**
 * Teto de idas ao modelo num turno.
 *
 * Cada ida é uma resposta que pode pedir mais ferramentas. Oito cobre com folga o que
 * um pedido real precisa ("lista o inbox, processa o que é de casa") e impede que uma
 * interpretação ruim vire um laço que gasta sozinho.
 */
const MAX_IDAS = 8

const MODELO = 'claude-opus-5'

/**
 * O que o modelo precisa saber sobre este app.
 *
 * Fica curto de propósito: instrução demais faz o modelo narrar o que vai fazer em vez
 * de fazer. O que ele não tem como adivinhar é o vocabulário do produto — a diferença
 * entre prazo e bloco, o que é a inbox — e a data de hoje, que nenhum modelo sabe.
 */
function systemPrompt(agora: Date, timezone: string): string {
  return [
    'Você é o Agent do Pauta, um app pessoal de planner, tarefas e notas. Fala pt-BR.',
    '',
    `Agora: ${agora.toISOString()} (fuso da pessoa: ${timezone}).`,
    'Toda data que você mandar para uma ferramenta é ISO 8601 com fuso.',
    '',
    'O vocabulário do produto:',
    '- Tarefa é algo a fazer, e se conclui. Compromisso é hora marcada com alguém, e não.',
    '- Prazo (`dueAt`) é a data em que vence, sem hora.',
    '- Bloco (`scheduledStart`/`scheduledEnd`) é o tempo reservado na agenda para fazer.',
    '- A inbox é o que foi capturado e ainda não foi decidido: processar é dar a ela',
    '  projeto, prioridade ou prazo e mudar o status para `todo`.',
    '',
    'Como agir:',
    '- Consulte antes de alterar: os ids vêm de `listar_tarefas` e `listar_projetos`.',
    '- Faça o que foi pedido, sem pedir confirmação para o que é reversível.',
    '- Quando o pedido for ambíguo de um jeito que muda o resultado, pergunte antes.',
    '- Você não apaga nada. Se pedirem para excluir, diga que isso é feito na interface.',
    '- Responda em uma ou duas frases, dizendo o que foi feito. A lista do que mudou já',
    '  aparece na tela; não a repita item por item.',
  ].join('\n')
}

/**
 * A falha em pt-BR, sem o corpo cru da API.
 *
 * O que a pessoa lê precisa dizer o que fazer, e `401 {"type":"error"…}` não diz. O
 * detalhe continua existindo: vai para o log do servidor, que é de quem precisa dele.
 */
function mensagemDoErro(cause: unknown): string {
  if (cause instanceof Anthropic.AuthenticationError) {
    return 'A chave do Agent não foi aceita pela Anthropic.'
  }

  if (cause instanceof Anthropic.RateLimitError) {
    return 'O Agent está sendo usado demais agora. Tente de novo em instantes.'
  }

  if (cause instanceof Anthropic.APIConnectionError) {
    return 'Não consegui falar com o Agent. Verifique a conexão.'
  }

  if (cause instanceof Anthropic.APIError) {
    return `O Agent recusou o pedido (${cause.status}).`
  }

  return 'O Agent falhou no meio do caminho.'
}

type Emitir = (evento: AgentEvent) => void

/**
 * Um turno do agente, do pedido até a resposta final.
 *
 * O laço é manual, e não o tool runner do SDK, porque cada ferramenta executada precisa
 * virar um evento na tela **no instante em que roda** — é isso que deixa a pessoa
 * conferir o que foi mexido sem esperar o texto final.
 *
 * Nada estoura para fora: a falha vira evento de erro e o motivo cru volta no retorno,
 * para o controller registrar no log. Uma exceção subindo aqui derrubaria o SSE no meio
 * e a tela ficaria esperando para sempre.
 */
export async function runAgent({
  userId,
  messages,
  timezone,
  emitir,
  agora = new Date(),
}: {
  userId: string
  messages: AgentMessage[]
  timezone: string
  emitir: Emitir
  agora?: Date
}): Promise<{ erro?: unknown }> {
  if (!env.ANTHROPIC_API_KEY) {
    emitir({ type: 'erro', message: 'O Agent precisa de uma ANTHROPIC_API_KEY configurada.' })
    return {}
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const conversa: Anthropic.MessageParam[] = messages.map((mensagem) => ({
    role: mensagem.role,
    content: mensagem.content,
  }))

  try {
    for (let ida = 0; ida < MAX_IDAS; ida += 1) {
      const stream = client.messages.stream({
        model: MODELO,
        max_tokens: 16_000,
        // O trabalho é pequeno e conversado: consultar, criar, ajustar. Esforço médio
        // responde rápido e continua acertando; `high` só encareceria a espera.
        output_config: { effort: 'medium' },
        thinking: { type: 'adaptive' },
        system: systemPrompt(agora, timezone),
        tools: agentTools,
        messages: conversa,
      })

      stream.on('text', (delta) => emitir({ type: 'texto', delta }))

      const resposta = await stream.finalMessage()

      if (resposta.stop_reason === 'refusal') {
        emitir({ type: 'erro', message: 'Não consigo responder a isso.' })
        return {}
      }

      const chamadas = resposta.content.filter(
        (bloco): bloco is Anthropic.ToolUseBlock => bloco.type === 'tool_use',
      )

      if (chamadas.length === 0) return {}

      conversa.push({ role: 'assistant', content: resposta.content })

      // Em paralelo, e todos os resultados numa mensagem só: separá-los ensina o modelo
      // a parar de pedir ferramentas em paralelo.
      const resultados = await Promise.all(
        chamadas.map(async (chamada) => {
          const saida = await runAgentTool(userId, chamada.name, chamada.input)
          emitir({ type: 'acao', tool: chamada.name, resumo: saida.resumo, ok: saida.ok })

          return {
            type: 'tool_result' as const,
            tool_use_id: chamada.id,
            content: JSON.stringify(saida.resultado),
            ...(saida.ok ? {} : { is_error: true }),
          }
        }),
      )

      conversa.push({ role: 'user', content: resultados })
    }

    emitir({ type: 'erro', message: 'Parei por aqui: o pedido deu voltas demais.' })
    return {}
  } catch (cause) {
    emitir({ type: 'erro', message: mensagemDoErro(cause) })
    return { erro: cause }
  }
}
