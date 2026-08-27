import type { SessionView, UserView } from '@pauta/contracts'
import type { UserRecord } from '../models/user.model.js'

/**
 * View: monta o JSON que sai na resposta.
 *
 * O mapeamento é explícito de propósito. Campo novo no banco só aparece na API se
 * alguém escrever a linha aqui — é o que impede vazamento acidental a cada migration.
 */
export function renderUser(user: UserRecord): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  }
}

export function renderSession(user: UserRecord, token: string): SessionView {
  return {
    token,
    user: renderUser(user),
  }
}
