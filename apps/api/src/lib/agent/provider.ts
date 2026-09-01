import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { env } from '../../config/env.js'

/**
 * De quem o Agent fala, e com que chave.
 *
 * A escolha vive no ambiente porque é decisão de quem hospeda, não do código: a mesma
 * conversa, as mesmas ferramentas e a mesma tela funcionam com qualquer um dos três.
 * Cada adaptador lê a chave com o nome canônico do provedor (`ANTHROPIC_API_KEY`,
 * `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`) — é a convenção da biblioteca, e
 * segui-la evita repassar segredo à mão.
 */
export function agentModel(): LanguageModel {
  switch (env.AI_PROVIDER) {
    case 'openai':
      return openai(env.AI_MODEL)
    case 'google':
      return google(env.AI_MODEL)
    default:
      return anthropic(env.AI_MODEL)
  }
}

/** A chave que o provedor escolhido precisa. Sem ela, o Agent não abre a boca. */
export function agentKeyPresente(): boolean {
  switch (env.AI_PROVIDER) {
    case 'openai':
      return Boolean(env.OPENAI_API_KEY)
    case 'google':
      return Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY)
    default:
      return Boolean(env.ANTHROPIC_API_KEY)
  }
}

/** O nome da variável que falta, para a mensagem de erro dizer o que fazer. */
export function agentKeyName(): string {
  switch (env.AI_PROVIDER) {
    case 'openai':
      return 'OPENAI_API_KEY'
    case 'google':
      return 'GOOGLE_GENERATIVE_AI_API_KEY'
    default:
      return 'ANTHROPIC_API_KEY'
  }
}
