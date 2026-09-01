import { z } from 'zod'

/**
 * O Agent.
 *
 * A conversa mora no cliente e vai inteira a cada pedido: o servidor não guarda sessão.
 * É a escolha mais simples que atende o caso — um app de uma pessoa, conversas curtas e
 * descartáveis — e evita uma tabela de mensagens que ninguém pediu para ler depois.
 */
export const agentRoleSchema = z.enum(['user', 'assistant'])

export const agentMessageSchema = z.object({
  role: agentRoleSchema,
  content: z.string().min(1, 'Mensagem vazia.').max(10_000, 'Mensagem longa demais.'),
})
export type AgentMessage = z.infer<typeof agentMessageSchema>

export const agentAskSchema = z.object({
  messages: z
    .array(agentMessageSchema)
    .min(1, 'Envie ao menos uma mensagem.')
    .max(40, 'Conversa longa demais — comece outra.'),
  /*
    O fuso de quem pede, para "amanhã 9h" virar 9h no relógio certo. Vai no corpo e não
    num cabeçalho: cabeçalho fora da lista padrão dispara preflight, e o CORS teria de
    liberá-lo — custo de transporte para um dado que é do pedido.
  */
  timezone: z.string().min(1).max(60).default('America/Sao_Paulo'),
})
export type AgentAskInput = z.infer<typeof agentAskSchema>

/**
 * O que chega de volta, em SSE.
 *
 * `texto` é a resposta saindo em pedaços; `acao` é uma ferramenta que já rodou e mudou
 * dado de verdade — o painel a mostra como uma linha própria, porque é o que a pessoa
 * precisa conferir depois; `fim` fecha o turno; `erro` explica por que parou.
 */
export const agentEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('texto'), delta: z.string() }),
  z.object({
    type: z.literal('acao'),
    /** Nome da ferramenta, como `criar_tarefa`. */
    tool: z.string(),
    /** Uma linha em pt-BR: "Criou a tarefa \"Pagar conta\"". */
    resumo: z.string(),
    ok: z.boolean(),
  }),
  z.object({ type: z.literal('fim') }),
  z.object({ type: z.literal('erro'), message: z.string() }),
])
export type AgentEvent = z.infer<typeof agentEventSchema>
