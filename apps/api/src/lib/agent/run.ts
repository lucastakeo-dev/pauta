import type { AgentEvent, AgentMessage } from '@pauta/contracts'
import { isStepCount, type ModelMessage, streamText } from 'ai'
import { agentKeyName, agentKeyPresente, agentModel } from './provider.js'
import { buildAgentTools } from './tools.js'

/**
 * Teto de passos num turno.
 *
 * Cada passo é uma resposta que pode pedir mais ferramentas. Oito cobre com folga o que
 * um pedido real precisa ("lista o inbox, processa o que é de casa") e impede que uma
 * interpretação ruim vire um laço que gasta sozinho.
 */
const MAX_PASSOS = 8

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
 * O status HTTP que veio junto do erro, quando veio.
 *
 * Lido por forma e não por classe do provedor: a AI SDK embrulha o erro de cada um num
 * tipo próprio, e depender do nome da classe faria a mensagem certa depender de qual
 * adaptador está instalado.
 */
function statusDoErro(cause: unknown): number | undefined {
  if (typeof cause !== 'object' || cause === null) return undefined

  const status = (cause as { statusCode?: unknown }).statusCode
  return typeof status === 'number' ? status : undefined
}

/**
 * A falha em pt-BR, sem o corpo cru da resposta.
 *
 * O que a pessoa lê precisa dizer o que fazer, e `401 {"type":"error"…}` não diz. O
 * detalhe continua existindo: vai para o log do servidor, que é de quem precisa dele.
 */
function mensagemDoErro(cause: unknown): string {
  const status = statusDoErro(cause)

  if (status === 401 || status === 403)
    return `A chave do Agent (${agentKeyName()}) não foi aceita.`
  if (status === 429) return 'O Agent está sendo usado demais agora. Tente de novo em instantes.'
  if (status !== undefined && status >= 500) return 'O provedor do Agent está fora do ar.'
  if (status !== undefined) return `O Agent recusou o pedido (${status}).`

  return 'Não consegui falar com o Agent. Verifique a conexão.'
}

type Emitir = (evento: AgentEvent) => void

/**
 * Um turno do agente, do pedido até a resposta final.
 *
 * A AI SDK cuida do laço — pedir, executar ferramenta, pedir de novo — e nós lemos o
 * `fullStream` para transformar cada pedaço no evento que a tela entende. Foi essa
 * camada que tornou o provedor uma escolha de ambiente: trocar de modelo não mexe em
 * nada daqui para baixo.
 *
 * Nada estoura para fora: a falha vira evento de erro e o motivo cru volta no retorno,
 * para o controller registrar. Uma exceção subindo aqui derrubaria o SSE no meio e a
 * tela ficaria esperando para sempre.
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
  if (!agentKeyPresente()) {
    emitir({ type: 'erro', message: `O Agent precisa de uma ${agentKeyName()} configurada.` })
    return {}
  }

  const conversa: ModelMessage[] = messages.map((mensagem) => ({
    role: mensagem.role,
    content: mensagem.content,
  }))

  try {
    const stream = streamText({
      model: agentModel(),
      system: systemPrompt(agora, timezone),
      messages: conversa,
      tools: buildAgentTools(userId, ({ tool, resumo, ok }) =>
        emitir({ type: 'acao', tool, resumo, ok }),
      ),
      stopWhen: isStepCount(MAX_PASSOS),
    })

    let falha: unknown

    for await (const parte of stream.fullStream) {
      if (parte.type === 'text-delta') emitir({ type: 'texto', delta: parte.text })

      // O erro chega como pedaço do fluxo, não como exceção: o turno pode ter escrito
      // metade da resposta antes de quebrar, e essa metade já está na tela.
      if (parte.type === 'error') falha = parte.error
    }

    if (falha) {
      emitir({ type: 'erro', message: mensagemDoErro(falha) })
      return { erro: falha }
    }

    return {}
  } catch (cause) {
    emitir({ type: 'erro', message: mensagemDoErro(cause) })
    return { erro: cause }
  }
}
